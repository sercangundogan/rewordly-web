import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from '../../lib/auth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const LEMON_API = 'https://api.lemonsqueezy.com/v1/checkouts';

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

    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const variantId = process.env.LEMON_VARIANT_ID;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://rewordly.store';

    if (!apiKey || !storeId || !variantId) {
      console.error('Missing LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, or LEMON_VARIANT_ID');
      res.status(500).json({
        error: 'Configuration Error',
        message: 'Checkout is not configured.',
      });
      return;
    }

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          product_options: {
            redirect_url: `${baseUrl}/?checkout=success`,
            enabled_variants: [parseInt(variantId, 10)],
          },
          checkout_data: {
            custom: { user_id: userId },
            email: email || undefined,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: variantId } },
        },
      },
    };

    const response = await fetch(LEMON_API, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('LemonSqueezy checkout error:', response.status, errText);
      res.status(502).json({
        error: 'Checkout Error',
        message: 'Could not create checkout. Please try again.',
      });
      return;
    }

    const data = await response.json();
    const checkoutUrl = data?.data?.attributes?.url;
    if (!checkoutUrl) {
      res.status(502).json({
        error: 'Checkout Error',
        message: 'Invalid response from payment provider.',
      });
      return;
    }

    res.status(200).json({ url: checkoutUrl });
  } catch (error) {
    console.error('Checkout API error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
