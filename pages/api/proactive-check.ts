import { NextApiRequest, NextApiResponse } from 'next';
import { proactiveCheck, ProactiveCheckResponse, ApiError } from '../../lib/openai';
import { getAuthFromRequest } from '../../lib/auth';
import { getFeaturesForTier } from '../../lib/features';
import { recordUsage } from '../../lib/apiLimit';
import { getUsage, canUse } from '../../lib/usage';

const MAX_TEXT_LENGTH = 5000;

/**
 * Non-Pro response: the text was scanned but the correction itself is withheld.
 * The extension shows an occasional "N fixes found — go Pro" teaser badge instead.
 */
interface ProactiveTeaserResponse {
  teaser: true;
  hasIssues: boolean;
  issueCount: number;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

/**
 * Proactive (check-while-typing) endpoint for the extension.
 * - Pro: full corrected text, unlimited.
 * - Free/anonymous: teaser mode within the daily grammar limit (5 anon / 10 free).
 *   The scan runs but only issue counts are returned; a check consumes one
 *   grammar use only when it actually surfaces a teaser badge (hasIssues).
 *   At the limit the endpoint returns 402 so the extension goes quiet.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<
    ProactiveCheckResponse | ProactiveTeaserResponse | ApiError | { code: string; message: string }
  >
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anonymous-Id');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed',
    });
    return;
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const auth = req.headers.authorization;
    const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
    const { userId, tier } = await getAuthFromRequest(auth, anonymousId);
    const isPro = getFeaturesForTier(tier).proactiveCheck;

    const { text } = req.body as { text?: unknown };

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text field is required and cannot be empty',
      });
      return;
    }

    if (text.length > MAX_TEXT_LENGTH) {
      res.status(400).json({
        error: 'Bad Request',
        message: `Text is too long. Maximum length is ${MAX_TEXT_LENGTH} characters.`,
      });
      return;
    }

    if (isPro) {
      const result = await proactiveCheck(text);
      // Pro is unlimited; recorded only so usage stays visible in analytics.
      await recordUsage(userId, anonymousId, 'grammar');
      res.status(200).json(result);
      return;
    }

    // Teaser mode: shares the daily grammar limit with manual checks.
    const usage = await getUsage(userId, anonymousId);
    if (!canUse(tier, 'grammar', usage, userId)) {
      res.status(402).json({
        code: 'LIMIT_REACHED',
        message:
          tier === 'anonymous'
            ? 'Daily grammar limit reached. Log in for more, or upgrade to Pro for unlimited checks.'
            : 'Daily grammar limit reached. Upgrade to Pro for unlimited checks as you type.',
      });
      return;
    }

    const result = await proactiveCheck(text);
    if (result.hasIssues) {
      // Only checks that surface a teaser badge consume the daily grammar limit.
      await recordUsage(userId, anonymousId, 'grammar');
    }
    res.status(200).json({
      teaser: true,
      hasIssues: result.hasIssues,
      issueCount: result.issueCount,
    });
  } catch (error) {
    console.error('Proactive check API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMessage,
    });
  }
}
