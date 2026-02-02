import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { getSupabaseAdmin } from '../../../lib/supabase';

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

function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');
  const sigBuf = Buffer.from(signature, 'utf8');
  const digestBuf = Buffer.from(digest, 'utf8');
  if (sigBuf.length !== digestBuf.length) return false;
  return crypto.timingSafeEqual(digestBuf, sigBuf);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('Missing LEMONSQUEEZY_WEBHOOK_SECRET');
    res.status(500).json({ error: 'Webhook not configured' });
    return;
  }

  try {
    const rawBody = await getRawBody(req);
    const signature = (req.headers['x-signature'] as string) || '';
    if (!verifySignature(rawBody, signature, secret)) {
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }

    const payload = JSON.parse(rawBody.toString('utf8'));
    const eventName = payload?.meta?.event_name;
    const customData = payload?.meta?.custom_data || {};
    const userId = customData.user_id as string | undefined;
    const data = payload?.data;
    const subId = data?.id;
    const attrs = data?.attributes || {};
    const status = attrs.status as string | undefined;
    const orderId = attrs.order_id?.toString();
    const variantId = attrs.variant_id?.toString();

    if (!eventName) {
      res.status(400).json({ error: 'Missing event_name' });
      return;
    }

    const supabase = getSupabaseAdmin();

    switch (eventName) {
      case 'subscription_created':
      case 'subscription_updated':
      case 'subscription_resumed': {
        if (!userId || !subId) {
          res.status(400).json({ error: 'Missing user_id or subscription id' });
          return;
        }
        const { error } = await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              lemon_subscription_id: subId.toString(),
              lemon_order_id: orderId || null,
              lemon_variant_id: variantId || null,
              status: status || 'active',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        if (error) {
          console.error('Subscription upsert error:', error);
          res.status(500).json({ error: 'Database error' });
          return;
        }
        break;
      }
      case 'subscription_cancelled':
      case 'subscription_expired':
      case 'subscription_paused': {
        if (!subId) break;
        const { error } = await supabase
          .from('subscriptions')
          .update({
            status: status || 'cancelled',
            updated_at: new Date().toISOString(),
          })
          .eq('lemon_subscription_id', subId.toString());
        if (error) {
          console.error('Subscription update error:', error);
        }
        break;
      }
      default:
        // order_created etc. – no op for now
        break;
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('LemonSqueezy webhook error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
