import { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest, getSubscriptionInfo } from '../../lib/auth';
import { getUsage } from '../../lib/usage';
import { getLimitsForUser, hasCustomUserLimits, type LimitTier } from '../../lib/limits';
import { getQuota, quotaIdentity } from '../../lib/check/quota';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Anonymous-Id',
  'Content-Type': 'application/json',
};

function limitValue(
  tier: LimitTier,
  type: 'rewrite' | 'grammar',
  userId: string | null
): number {
  const l = getLimitsForUser(tier, userId)[type];
  return l === Infinity ? -1 : l;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Anonymous-Id');
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const auth = req.headers.authorization;
    const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
    const { userId, tier, email } = await getAuthFromRequest(auth, anonymousId);
    const [usage, autoCheck] = await Promise.all([
      getUsage(userId, anonymousId),
      getQuota(tier, quotaIdentity(userId, anonymousId)),
    ]);

    const rewriteLimit = limitValue(tier, 'rewrite', userId);
    const grammarLimit = limitValue(tier, 'grammar', userId);

    const payload: Record<string, unknown> = {
      rewriteUsed: usage.rewrite,
      rewriteLimit: rewriteLimit === -1 ? null : rewriteLimit,
      grammarUsed: usage.grammar,
      grammarLimit: grammarLimit === -1 ? null : grammarLimit,
      isSubscribed: tier === 'pro',
      requireLogin: tier === 'anonymous',
      requirePayment: tier === 'free' && !hasCustomUserLimits(userId),
      // Live check-as-you-type quota, in characters (lib/check/quota.ts).
      autoCheck: { used: autoCheck.used, limit: autoCheck.limit, period: autoCheck.period },
    };
    if (email) payload.user = { email };
    if (userId && tier === 'pro') {
      const sub = await getSubscriptionInfo(userId);
      payload.subscription = {
        plan: sub.plan,
        currentPeriodEnd: sub.currentPeriodEnd,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
      };
    }
    res.status(200).json(payload);
  } catch (error) {
    console.error('Usage API error:', error);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
