import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getAuthFromRequest } from '../../../lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  try {
    const auth = req.headers.authorization;
    const { userId } = await getAuthFromRequest(auth, undefined);
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Log in first.' });
      return;
    }

    const body = req.body as { access_token?: string; refresh_token?: string; token_expires_at?: number };
    const accessToken = body?.access_token;
    if (!accessToken || typeof accessToken !== 'string') {
      res.status(400).json({ error: 'Bad Request', message: 'access_token required.' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
    if (userError || !user || user.id !== userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'Invalid token.' });
      return;
    }

    // Codes that were never exchanged still hold an access and a refresh token: remove them once expired.
    const { error: purgeError } = await supabase.from('connection_codes').delete().lt('expires_at', new Date().toISOString());
    if (purgeError) console.error('connection_codes cleanup failed:', purgeError.message);

    const code = randomCode();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
    await supabase.from('connection_codes').insert({
      code,
      access_token:    accessToken,
      refresh_token:   body.refresh_token ?? null,
      token_expires_at: body.token_expires_at ?? null,
      expires_at:      expiresAt,
    });

    res.status(200).json({ code, expires_at: expiresAt });
  } catch (e) {
    console.error('create-connection-code error:', e);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: 'Internal Server Error',
      message: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
