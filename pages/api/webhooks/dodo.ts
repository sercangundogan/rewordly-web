import { NextApiRequest, NextApiResponse } from 'next';
import { Webhook } from 'standardwebhooks';
import { getSupabaseAdmin } from '../../../lib/supabase';
import { getPlanForProductId } from '../../../lib/dodo';

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

type DodoSubscriptionPayload = {
  payload_type?: string;
  subscription_id?: string;
  status?: string;
  product_id?: string;
  next_billing_date?: string;
  cancel_at_next_billing_date?: boolean;
  customer?: { customer_id?: string; email?: string };
  metadata?: Record<string, string>;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const secret = process.env.DODO_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing DODO_WEBHOOK_SECRET');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  try {
    const rawBody = await getRawBody(req);

    try {
      const webhook = new Webhook(secret);
      webhook.verify(rawBody, {
        'webhook-id': (req.headers['webhook-id'] as string) || '',
        'webhook-timestamp': (req.headers['webhook-timestamp'] as string) || '',
        'webhook-signature': (req.headers['webhook-signature'] as string) || '',
      });
    } catch {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventType = payload?.type as string | undefined;
    const data = (payload?.data || {}) as DodoSubscriptionPayload;

    if (!eventType) {
      res.status(400).json({ error: 'Missing event type' });
      return;
    }

    // Only subscription lifecycle events mutate our DB; everything else is a no-op.
    if (!eventType.startsWith('subscription.') || data.payload_type !== 'Subscription') {
      res.status(200).json({ received: true });
      return;
    }

    const subscriptionId = data.subscription_id;
    const userId = data.metadata?.user_id;
    const status = data.status || 'active';
    const plan = getPlanForProductId(data.product_id) || data.metadata?.plan || null;

    const record = {
      status,
      dodo_subscription_id: subscriptionId || null,
      dodo_customer_id: data.customer?.customer_id || null,
      dodo_product_id: data.product_id || null,
      plan,
      current_period_end: data.next_billing_date || null,
      cancel_at_period_end: data.cancel_at_next_billing_date === true,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();

    if (userId) {
      const { error } = await supabase
        .from('subscriptions')
        .upsert({ user_id: userId, ...record }, { onConflict: 'user_id' });
      if (error) {
        console.error('Dodo webhook upsert error:', error);
        res.status(500).json({ error: 'Database error' });
        return;
      }
    } else if (subscriptionId) {
      // Fallback for events without metadata: match the existing row by subscription id.
      const { error } = await supabase
        .from('subscriptions')
        .update(record)
        .eq('dodo_subscription_id', subscriptionId);
      if (error) {
        console.error('Dodo webhook update error:', error);
        res.status(500).json({ error: 'Database error' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Missing user_id and subscription_id' });
      return;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Dodo webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
