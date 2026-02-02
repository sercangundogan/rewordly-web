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
    rewrite: 25,
    grammar: 25,
  },
  /** Pro subscribers: no limit (use Infinity or skip check) */
  pro: {
    rewrite: Infinity,
    grammar: Infinity,
  },
} as const;

export type LimitTier = 'anonymous' | 'free' | 'pro';
