import type { LimitTier } from './limits';

/**
 * Plan-based feature gates.
 *
 * Limits (lib/limits.ts) control HOW MUCH a user can do per day;
 * features control WHAT a plan gets. New Pro-only capabilities
 * (proactive checking, translation, custom tones, ...) should be
 * added here so all API routes resolve them the same way.
 */
export interface PlanFeatures {
  /** OpenAI model used for rewrite/grammar completions. */
  model: string;
  /** Number of rewrite alternatives returned per request. */
  rewriteVariants: number;
  /** Background "check while typing" support (badge + hover preview in the extension). */
  proactiveCheck: boolean;
  /** User-defined style instruction for rewrites ("write like ..."). */
  customTone: boolean;
  /** Maximum input length for the summarize endpoint. */
  summarizeMaxChars: number;
}

export const PLAN_FEATURES: Record<LimitTier, PlanFeatures> = {
  anonymous: {
    model: 'gpt-4o-mini',
    rewriteVariants: 1,
    proactiveCheck: false,
    customTone: false,
    summarizeMaxChars: 1500,
  },
  free: {
    model: 'gpt-4o-mini',
    rewriteVariants: 1,
    proactiveCheck: false,
    customTone: false,
    summarizeMaxChars: 1500,
  },
  pro: {
    model: 'gpt-4o',
    rewriteVariants: 3,
    proactiveCheck: true,
    customTone: true,
    summarizeMaxChars: 10000,
  },
};

export function getFeaturesForTier(tier: LimitTier): PlanFeatures {
  return PLAN_FEATURES[tier];
}
