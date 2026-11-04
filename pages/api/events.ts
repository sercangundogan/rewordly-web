import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';
import { quotaIdentity } from '../../lib/check/quota';
import { parseUsageRows, recordSiteUsage } from '../../lib/metrics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

/**
 * Feature usage counters from the extension, batched about once a minute:
 * { version, events: [{ host, event, count, chars }] }. See lib/metrics.ts.
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

  const rows = parseUsageRows(req.body);
  if (rows.length === 0) {
    res.status(204).end();
    return;
  }

  try {
    const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
    const { userId, tier } = await getAuthFromRequest(req.headers.authorization, anonymousId);
    const rawVersion = (req.body as { version?: unknown }).version;
    const version = typeof rawVersion === 'string' && /^[\w.-]{1,20}$/.test(rawVersion) ? rawVersion : null;
    await recordSiteUsage(quotaIdentity(userId, anonymousId), tier, version, rows);
    res.status(204).end();
  } catch (error) {
    console.error('Events API error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: 'Could not record events' });
  }
}
