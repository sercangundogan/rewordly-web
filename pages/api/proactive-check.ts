import { NextApiRequest, NextApiResponse } from 'next';
import { proactiveCheck, ProactiveCheckResponse, ApiError } from '../../lib/openai';
import { getAuthFromRequest } from '../../lib/auth';
import { getFeaturesForTier } from '../../lib/features';
import { recordUsage } from '../../lib/apiLimit';

const MAX_TEXT_LENGTH = 5000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

/**
 * Proactive (check-while-typing) endpoint for the extension.
 * Pro-only: free/anonymous users get 403 PRO_REQUIRED so the extension
 * can silently disable the feature instead of showing errors.
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProactiveCheckResponse | ApiError | { code: string; message: string }>
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

    if (!getFeaturesForTier(tier).proactiveCheck) {
      res.status(403).json({
        code: 'PRO_REQUIRED',
        message: 'Proactive corrections are a Pro feature. Upgrade to enable check-while-typing.',
      });
      return;
    }

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

    const result = await proactiveCheck(text);
    // Pro is unlimited; recorded only so usage stays visible in analytics.
    await recordUsage(userId, anonymousId, 'grammar');
    res.status(200).json(result);
  } catch (error) {
    console.error('Proactive check API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMessage,
    });
  }
}
