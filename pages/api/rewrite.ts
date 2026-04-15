import { NextApiRequest, NextApiResponse } from 'next';
import { rewriteText, RewriteRequest, RewriteResponse, ApiError, RewriteTone } from '../../lib/openai';
import { checkLimitAndMaybeRespond, recordUsage } from '../../lib/apiLimit';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RewriteResponse | ApiError>
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anonymous-Id');
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed'
    });
    return;
  }

  // Set CORS headers for all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const limitResult = await checkLimitAndMaybeRespond(req, res, 'rewrite');
    if (!limitResult) return;

    const { text, tone }: RewriteRequest = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text field is required and cannot be empty'
      });
      return;
    }

    const validTones: RewriteTone[] = ['standard', 'formal', 'casual', 'concise', 'elaborate'];
    const safeTone: RewriteTone = tone && validTones.includes(tone) ? tone : 'standard';

    const result = await rewriteText(text, safeTone);
    await recordUsage(limitResult.userId, limitResult.anonymousId, 'rewrite');
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