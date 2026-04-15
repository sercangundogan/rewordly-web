import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseAdmin } from '../../../lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
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
    const body = req.body as { code?: string };
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!code || code.length !== 6) {
      res.status(400).json({ error: 'Bad Request', message: 'Valid 6-character code required.' });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchError } = await supabase
      .from('connection_codes')
      .select('access_token, refresh_token, expires_at, token_expires_at')
      .eq('code', code)
      .limit(1)
      .maybeSingle();

    if (fetchError || !row) {
      res.status(404).json({ error: 'Invalid code', message: 'Code not found or expired.' });
      return;
    }

    type CodeRow = { access_token: string; refresh_token?: string; expires_at: string; token_expires_at?: number };
    const typedRow = row as CodeRow;

    const expired = new Date(typedRow.expires_at) <= new Date();
    if (expired) {
      await supabase.from('connection_codes').delete().eq('code', code);
      res.status(404).json({ error: 'Invalid code', message: 'Code expired.' });
      return;
    }

    await supabase.from('connection_codes').delete().eq('code', code);

    res.status(200).json({
      access_token:  typedRow.access_token,
      refresh_token: typedRow.refresh_token ?? null,
      expires_at:    typedRow.token_expires_at ?? null,
    });
  } catch (e) {
    console.error('exchange-connection-code error:', e);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: 'Internal Server Error',
      message: e instanceof Error ? e.message : 'Unknown error',
    });
  }
}
