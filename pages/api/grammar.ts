import { NextApiRequest, NextApiResponse } from 'next';
import { checkGrammarWithOpenAI } from '../../lib/services/grammarService';
import { GrammarRequest, GrammarCheckResponse, ApiError } from '../../lib/types/grammar';
import { checkLimitAndMaybeRespond, recordUsage } from '../../lib/apiLimit';
import { getFeaturesForTier } from '../../lib/features';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GrammarCheckResponse | ApiError>
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
      message: 'Only POST requests are allowed'
    });
    return;
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const limitResult = await checkLimitAndMaybeRespond(req, res, 'grammar');
    if (!limitResult) return;

    const { text }: GrammarRequest = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text field is required and cannot be empty'
      });
      return;
    }

    if (text.length > 10000) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text is too long. Maximum length is 10,000 characters.'
      });
      return;
    }

    const features = getFeaturesForTier(limitResult.tier);
    const result = await checkGrammarWithOpenAI(text, { model: features.model });
    await recordUsage(limitResult.userId, limitResult.anonymousId, 'grammar');
    res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({
      error: 'Internal Server Error',
      message: errorMessage
    });
  }
}
