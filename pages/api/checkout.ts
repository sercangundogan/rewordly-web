import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';
import { getDodoClient, getProductIdForPlan, type ProPlan } from '../../lib/dodo';

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
    const { userId, email } = await getAuthFromRequest(auth, undefined);
    if (!userId) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'You must be logged in to start checkout.',
      });
      return;
    }

    const plan: ProPlan = req.body?.plan === 'yearly' ? 'yearly' : 'monthly';
    const productId = getProductIdForPlan(plan);

    if (!process.env.DODO_PAYMENTS_API_KEY || !productId) {
      console.error('Missing DODO_PAYMENTS_API_KEY or product id for plan:', plan);
      res.status(500).json({
        error: 'Configuration Error',
        message: 'Checkout is not configured.',
      });
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rewordly.store';
    const client = getDodoClient();

    const session = await client.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      customer: email ? { email } : undefined,
      metadata: { user_id: userId, plan },
      return_url: `${baseUrl}/dashboard?checkout=success`,
      show_saved_payment_methods: true,
    });

    if (!session.checkout_url) {
      res.status(502).json({
        error: 'Checkout Error',
        message: 'Invalid response from payment provider.',
      });
      return;
    }

    res.status(200).json({ url: session.checkout_url });
  } catch (error) {
    console.error('Checkout API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Could not create checkout. Please try again.',
    });
  }
}
