import { NextApiResponse } from 'next';
import { getAuthFromRequest } from './auth';
import { getUsage, incrementUsage, canUse, getLimitInfo } from './usage';
import type { LimitTier } from './limits';

export interface LimitCheckResult {
  allowed: boolean;
  userId: string | null;
  anonymousId: string | undefined;
  tier: LimitTier;
  type: 'rewrite' | 'grammar';
}

/**
 * Check if the request is within limits. If not, send 402 and return null.
 * If allowed, return identity info for later incrementUsage.
 */
export async function checkLimitAndMaybeRespond(
  req: { headers: { authorization?: string; 'x-anonymous-id'?: string } },
  res: NextApiResponse,
  type: 'rewrite' | 'grammar'
): Promise<LimitCheckResult | null> {
  const auth = req.headers.authorization;
  const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
  const { userId, tier } = await getAuthFromRequest(auth, anonymousId);
  const usage = await getUsage(userId, anonymousId);

  if (!canUse(tier, type, usage)) {
    const info = getLimitInfo(tier, type, usage);
    res.status(402).json({
      code: 'LIMIT_REACHED',
      message:
        tier === 'anonymous'
          ? 'Daily limit reached. Log in for more uses.'
          : 'Your daily limit has been reached. Until paid plans are available, you can email sercangundogan35@gmail.com to request free additional limits.',
      requireLogin: info.requireLogin,
      requirePayment: info.requirePayment,
      rewriteUsed: usage.rewrite,
      rewriteLimit: info.limit === -1 ? null : info.limit,
      grammarUsed: usage.grammar,
      grammarLimit: type === 'grammar' ? (info.limit === -1 ? null : info.limit) : undefined,
    });
    return null;
  }

  return { allowed: true, userId, anonymousId, tier, type };
}

/**
 * Call after successful rewrite/grammar to increment usage.
 */
export async function recordUsage(
  userId: string | null,
  anonymousId: string | undefined,
  type: 'rewrite' | 'grammar'
): Promise<void> {
  await incrementUsage(userId, anonymousId, type);
}
