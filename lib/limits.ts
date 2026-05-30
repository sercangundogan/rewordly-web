/**
 * Usage limits for Rewordly
 * - Anonymous: limited daily rewrites + grammar
 * - Logged in (free): higher daily limits
 * - Pro (paid): unlimited
 */

export const LIMITS = {
  /** Anonymous users: per day */
  anonymous: {
    rewrite: 5,
    grammar: 5,
  },
  /** Logged-in free users: per day */
  free: {
    rewrite: 10,
    grammar: 10,
  },
  /** Pro subscribers: no limit (use Infinity or skip check) */
  pro: {
    rewrite: Infinity,
    grammar: Infinity,
  },
} as const;

export type LimitTier = 'anonymous' | 'free' | 'pro';

/** One-off limit boosts for specific users (Supabase user UUID). */
export const CUSTOM_USER_LIMITS: Record<string, { rewrite: number; grammar: number }> = {
  // ahmedgabr1989@gmail.com
  '7fcdede8-aa92-4c7c-af89-f50a0488ca31': { rewrite: 25, grammar: 25 },
};

export function getLimitsForUser(
  tier: LimitTier,
  userId: string | null
): { rewrite: number; grammar: number } {
  if (userId && CUSTOM_USER_LIMITS[userId]) {
    return CUSTOM_USER_LIMITS[userId];
  }
  return LIMITS[tier];
}

export function hasCustomUserLimits(userId: string | null): boolean {
  return userId !== null && userId in CUSTOM_USER_LIMITS;
}
