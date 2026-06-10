import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';
import { getSupabaseAdmin } from '../../lib/supabase';
import { getDodoClient } from '../../lib/dodo';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const auth = req.headers.authorization;
    const { userId } = await getAuthFromRequest(auth, undefined);
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to manage billing.',
      });
      return;
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('dodo_customer_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (error || !data?.dodo_customer_id) {
      res.status(404).json({
        error: 'Not Found',
        message: 'No subscription found for this account.',
      });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rewordly.store';
    const client = getDodoClient();
    const session = await client.customers.customerPortal.create(
      data.dodo_customer_id,
      { return_url: `${baseUrl}/dashboard` }
    );

    res.status(200).json({ url: session.link });
  } catch (error) {
    console.error('Portal API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not open the billing portal. Please try again.',
    });
  }
}
