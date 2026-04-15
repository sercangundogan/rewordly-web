import { NextApiRequest, NextApiResponse } from 'next';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    res.status(500).json({ error: 'Auth not configured' });
    return;
  }

  const { refresh_token } = req.body as { refresh_token?: string };
  if (!refresh_token || typeof refresh_token !== 'string') {
    res.status(400).json({ error: 'Bad Request', message: 'refresh_token is required' });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify({ refresh_token }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error ?? 'Refresh failed', message: data.error_description ?? '' });
      return;
    }

    res.status(200).json({
      access_token:  data.access_token,
      refresh_token: data.refresh_token,
      expires_in:    data.expires_in,
      expires_at:    Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600),
    });
  } catch (e) {
    console.error('refresh token error:', e);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
