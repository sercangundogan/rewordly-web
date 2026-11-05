import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';
import { checkWithModel, lookupCached, LIVE_CHECK_MODEL } from '../../lib/check/llm';
import { getQuota, ipIdentity, isIpOverLimit, quotaIdentity, recordQuota, type QuotaState } from '../../lib/check/quota';
import { isBudgetExhausted, logUsage } from '../../lib/check/costs';
import type { CheckParagraph, CheckParagraphResult } from '../../lib/check/types';
import type { ApiError } from '../../lib/openai';
import { normalizeHost } from '../../lib/metrics';
import { decorateResults } from '../../lib/check/feedback';

const MAX_PARAGRAPHS = 30;
const MAX_PARAGRAPH_LENGTH = 3000;
const MAX_TOTAL_LENGTH = 12000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

interface CheckApiResponse {
  results: CheckParagraphResult[];
  /** Quota after this request; null when nothing was charged (all answers came from cache). */
  quota: QuotaState | null;
}

interface LimitResponse {
  code: 'LIMIT_REACHED' | 'PAUSED';
  message: string;
  requireLogin: boolean;
  requirePayment: boolean;
  /** Cached answers are free, so they are returned even when the quota is used up. */
  results: CheckParagraphResult[];
  quota: QuotaState | null;
}

function parseParagraphs(body: unknown): CheckParagraph[] | string {
  const paragraphs = (body as { paragraphs?: unknown } | null)?.paragraphs;
  if (!Array.isArray(paragraphs) || paragraphs.length === 0) return 'paragraphs must be a non-empty array';
  if (paragraphs.length > MAX_PARAGRAPHS) return `At most ${MAX_PARAGRAPHS} paragraphs per request`;

  let total = 0;
  const parsed: CheckParagraph[] = [];
  for (const p of paragraphs) {
    const { id, text } = (p ?? {}) as { id?: unknown; text?: unknown };
    if (typeof id !== 'string' || !id || id.length > 64) return 'Each paragraph needs a string id (max 64 chars)';
    if (typeof text !== 'string' || !text.trim()) return 'Each paragraph needs non-empty text';
    if (text.length > MAX_PARAGRAPH_LENGTH) return `Paragraph too long (max ${MAX_PARAGRAPH_LENGTH} chars)`;
    total += text.length;
    parsed.push({ id, text });
  }
  if (total > MAX_TOTAL_LENGTH) return `Request too long (max ${MAX_TOTAL_LENGTH} chars)`;
  return parsed;
}

function clientIp(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket.remoteAddress || 'unknown';
}

/**
 * Live check-as-you-type endpoint used by the extension's underline feature.
 *
 * Cost control, in order:
 * 1. Cached answers (memory, then the shared Supabase cache) are free and always returned.
 * 2. Only the uncached text counts against the quota, in characters (see lib/check/quota.ts).
 * 3. A global daily budget pauses free/anonymous checks when reached (lib/check/costs.ts).
 * 4. Every model call's real token usage is logged.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckApiResponse | LimitResponse | ApiError>
) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed', message: 'Only POST requests are allowed' });
    return;
  }

  const paragraphs = parseParagraphs(req.body);
  if (typeof paragraphs === 'string') {
    res.status(400).json({ error: 'Bad Request', message: paragraphs });
    return;
  }

  try {
    const { results: cachedRaw, pending } = await lookupCached(paragraphs);
    // Suppressed suggestions are dropped and the rest tagged for feedback (lib/check/feedback.ts).
    const cached = await decorateResults(paragraphs, cachedRaw);
    if (pending.length === 0) {
      res.status(200).json({ results: cached, quota: null });
      return;
    }

    const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
    const { userId, tier } = await getAuthFromRequest(req.headers.authorization, anonymousId);
    const identity = quotaIdentity(userId, anonymousId);
    const ipId = tier === 'anonymous' ? ipIdentity(clientIp(req)) : null;

    const [quota, ipOver, budgetOver] = await Promise.all([
      getQuota(tier, identity),
      ipId ? isIpOverLimit(ipId) : Promise.resolve(false),
      tier === 'pro' ? Promise.resolve(false) : isBudgetExhausted(),
    ]);

    if (budgetOver) {
      res.status(402).json({
        code: 'PAUSED',
        message: 'Auto-check is paused for free accounts right now. Please try again later.',
        requireLogin: false,
        requirePayment: true,
        results: cached,
        quota,
      });
      return;
    }
    if (quota.used >= quota.limit || ipOver) {
      res.status(402).json({
        code: 'LIMIT_REACHED',
        message:
          tier === 'anonymous'
            ? 'Your free trial is over. Log in to keep checking for free.'
            : tier === 'free'
              ? "You've used today's free checks. Upgrade to Pro for unlimited checks."
              : "You've reached this month's fair-use limit.",
        requireLogin: tier === 'anonymous',
        requirePayment: tier === 'free',
        results: cached,
        quota,
      });
      return;
    }

    const { results: fresh, usage, judge } = await checkWithModel(pending);
    const chars = pending.reduce((sum, p) => sum + p.text.length, 0);
    await Promise.all([
      recordQuota(tier, identity, ipId, chars),
      logUsage({ identity, tier, model: LIVE_CHECK_MODEL, chars, usage, host: normalizeHost((req.body as { host?: unknown }).host) }),
      // The judge's cost counts towards the daily budget too (same feature, its own model).
      judge ? logUsage({ identity, tier, model: judge.model, chars: 0, usage: judge.usage, host: normalizeHost((req.body as { host?: unknown }).host) }) : Promise.resolve(),
    ]);

    const byId = new Map([...cached, ...(await decorateResults(paragraphs, fresh))].map((r) => [r.id, r]));
    res.status(200).json({
      results: paragraphs.map((p) => byId.get(p.id) ?? { id: p.id, language: '', issues: [] }),
      quota: { ...quota, used: quota.used + chars },
    });
  } catch (error) {
    console.error('Check API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    });
  }
}
