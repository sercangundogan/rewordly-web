import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuthFromRequest } from './auth';
import { getUsage, incrementUsage, canUse, getLimitInfo } from './usage';
import type { LimitTier } from './limits';
import { blockedReason, blockedResponse, guardContext, type GuardContext } from './legacyGuard';

export interface LimitCheckResult {
  allowed: boolean;
  userId: string | null;
  anonymousId: string | undefined;
  tier: LimitTier;
  type: 'rewrite' | 'grammar';
  /** For the cost guards in lib/legacyGuard.ts (countCall, spendTracker). */
  guard: GuardContext;
}

/**
 * Check if the request is within limits. If not, send 402 and return null.
 * If allowed, return identity info for later incrementUsage.
 */
export async function checkLimitAndMaybeRespond(
  req: Pick<NextApiRequest, 'headers' | 'socket'>,
  res: NextApiResponse,
  type: 'rewrite' | 'grammar'
): Promise<LimitCheckResult | null> {
  const auth = req.headers.authorization;
  const anonymousId = req.headers['x-anonymous-id'] as string | undefined;
  const { userId, tier } = await getAuthFromRequest(auth, anonymousId);
  const usage = await getUsage(userId, anonymousId);

  if (!canUse(tier, type, usage, userId)) {
    const info = getLimitInfo(tier, type, usage, userId);
    res.status(402).json({
      code: 'LIMIT_REACHED',
      message:
        tier === 'anonymous'
          ? 'Daily limit reached. Log in for more uses.'
          : 'Your daily limit has been reached. Upgrade to Pro for unlimited rewrites and grammar checks.',
      requireLogin: info.requireLogin,
      requirePayment: info.requirePayment,
      rewriteUsed: usage.rewrite,
      rewriteLimit: info.limit === -1 ? null : info.limit,
      grammarUsed: usage.grammar,
      grammarLimit: type === 'grammar' ? (info.limit === -1 ? null : info.limit) : undefined,
    });
    return null;
  }

  // The per-identity limit above is per client-chosen id; these count per IP and against the day's budget.
  const guard = guardContext(req, userId, anonymousId, tier);
  const blocked = await blockedReason(guard, type);
  if (blocked) {
    res.status(402).json({
      ...blockedResponse(blocked, tier),
      rewriteUsed: usage.rewrite,
      grammarUsed: usage.grammar,
    });
    return null;
  }

  return { allowed: true, userId, anonymousId, tier, type, guard };
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
