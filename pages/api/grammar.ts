import { NextApiRequest, NextApiResponse } from 'next';
import { correctGrammar, GrammarRequest, GrammarResponse, ApiError } from '../../lib/openai';

// CORS headers for Chrome Extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GrammarResponse | ApiError>
) {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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
    // Parse and validate request body
    const { text }: GrammarRequest = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Text field is required and cannot be empty'
      });
      return;
    }

    // Call OpenAI to correct grammar
    const result = await correctGrammar(text);
    
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
