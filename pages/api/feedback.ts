import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';
import { quotaIdentity } from '../../lib/check/quota';
import { parseFingerprints, recordIgnores } from '../../lib/check/feedback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

/**
 * "I ignored this suggestion": { fps: [fingerprint, ...] }, the fingerprints the live check
 * returned with its issues. Enough different people ignoring one suggestion removes it
 * (lib/check/feedback.ts). No text is sent.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed', message: 'Only POST requests are allowed' });
    return;
  }

  const fps = parseFingerprints(req.body);
  if (fps.length === 0) {
    res.status(204).end();
    return;
  }

  try {
    const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
    const { userId } = await getAuthFromRequest(req.headers.authorization, anonymousId);
    await recordIgnores(quotaIdentity(userId, anonymousId), fps);
    res.status(204).end();
  } catch (error) {
    console.error('Feedback API error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Could not record feedback' });
  }
}
