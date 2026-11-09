import type { NextApiRequest } from 'next';
import { addDailyCount, ipIdentity, quotaIdentity, readDailyCount } from './check/quota';
import { isLegacyBudgetExhausted, logUsage, type TokenUsage } from './check/costs';
import type { LimitTier } from './limits';

/**
 * Cost guards for the older endpoints (rewrite, grammar, proactive check), on top of the per-identity
 * daily limits in lib/usage.ts. Those limits count per X-Anonymous-Id, which the client chooses: a new
 * id is a new allowance. So:
 *
 * - anonymous calls are also counted per IP (salted hash), generously enough for an office or a school;
 * - the proactive check, which free accounts call on every typing pause, has a daily request cap
 *   (its teaser only counts checks that find something against the grammar limit);
 * - free and anonymous use pauses when the day's spend reaches LEGACY_DAILY_BUDGET_USD (Pro keeps working);
 * - every completion's tokens are logged to ai_usage_log, so the budget sees them.
 *
 * Counters live in auto_quota (supabase-live-check.sql); no new table.
 */

/** Per IP per day, anonymous only: 4× the per-install limit (5), so a few people behind one address are fine. */
export const ANON_IP_DAILY_CALLS = { rewrite: 20, grammar: 20, proactive_check: 600 } as const;
/** Proactive checks per identity per day, free and anonymous. Typing all day stays well below. */
export const PROACTIVE_DAILY_CALLS = 300;

export type LegacyFeature = keyof typeof ANON_IP_DAILY_CALLS;

export function clientIp(req: Pick<NextApiRequest, 'headers' | 'socket'>): string {
  const forwarded = req.headers['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
  return first || req.socket?.remoteAddress || 'unknown';
}

export interface GuardContext {
  tier: LimitTier;
  /** 'user:…' or 'anon:…' (validated), for logs and counters. */
  identity: string;
  /** Salted IP hash for anonymous callers, null otherwise. */
  ipId: string | null;
}

export function guardContext(req: Pick<NextApiRequest, 'headers' | 'socket'>, userId: string | null, anonymousId: string | undefined, tier: LimitTier): GuardContext {
  return { tier, identity: quotaIdentity(userId, anonymousId), ipId: tier === 'anonymous' ? ipIdentity(clientIp(req)) : null };
}

/** Why this call may not run now, or null. Reads only; counting happens in countCall after a call. */
export async function blockedReason(ctx: GuardContext, feature: LegacyFeature): Promise<'budget' | 'ip' | 'requests' | null> {
  if (ctx.tier === 'pro') return null;
  const [budget, ipCalls, ownCalls] = await Promise.all([
    isLegacyBudgetExhausted(),
    ctx.ipId ? readDailyCount(ctx.ipId, feature) : Promise.resolve(0),
    feature === 'proactive_check' ? readDailyCount(ctx.identity, feature) : Promise.resolve(0),
  ]);
  if (budget) return 'budget';
  if (ctx.ipId && ipCalls >= ANON_IP_DAILY_CALLS[feature]) return 'ip';
  if (feature === 'proactive_check' && ownCalls >= PROACTIVE_DAILY_CALLS) return 'requests';
  return null;
}

/** Counts a call that reached the model (per IP for anonymous callers; per identity for proactive checks). */
export async function countCall(ctx: GuardContext, feature: LegacyFeature): Promise<void> {
  if (ctx.tier === 'pro') return;
  await Promise.all([
    ctx.ipId ? addDailyCount(ctx.ipId, feature) : Promise.resolve(),
    feature === 'proactive_check' ? addDailyCount(ctx.identity, feature) : Promise.resolve(),
  ]);
}

/** Message for a blocked call, in the shape the extension already shows (402 LIMIT_REACHED). */
export function blockedResponse(reason: 'budget' | 'ip' | 'requests', tier: LimitTier) {
  const message =
    reason === 'budget'
      ? 'Free use is paused for today. Please try again tomorrow, or upgrade to Pro.'
      : reason === 'ip'
        ? 'Daily limit reached. Log in for more uses.'
        : 'Daily limit reached. Upgrade to Pro for unlimited checks as you type.';
  return {
    code: 'LIMIT_REACHED' as const,
    message,
    requireLogin: reason === 'ip' && tier === 'anonymous',
    requirePayment: reason !== 'ip',
  };
}

/**
 * Collects the tokens of the completions made for one request and logs them, also when the request
 * fails afterwards. Pass `onUsage` to the completion, then await `flush()` in a finally block.
 */
export function spendTracker(ctx: GuardContext, feature: LegacyFeature, chars: number) {
  const spent: Array<{ usage: TokenUsage; model: string }> = [];
  return {
    onUsage: (usage: TokenUsage, model: string) => {
      spent.push({ usage, model });
    },
    flush: async () => {
      await Promise.all(spent.map(({ usage, model }) => logUsage({ identity: ctx.identity, tier: ctx.tier, model, chars, usage, feature })));
    },
  };
}
