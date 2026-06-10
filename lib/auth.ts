import { getSupabaseAdmin } from './supabase';
import { LIMITS, type LimitTier } from './limits';

export interface AuthResult {
  userId: string | null;
  tier: LimitTier;
  email?: string;
}

/**
 * Resolve auth from request: Authorization Bearer <jwt> or X-Anonymous-Id.
 * Returns userId (Supabase auth id) if valid JWT, else null for anonymous.
 */
export async function getAuthFromRequest(
  authorization: string | undefined,
  anonymousId: string | undefined
): Promise<AuthResult> {
  const token = authorization?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return { userId: null, tier: 'anonymous' };
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { userId: null, tier: 'anonymous' };
    }

    const isPro = await checkSubscription(user.id);
    return {
      userId: user.id,
      tier: isPro ? 'pro' : 'free',
      email: user.email,
    };
  } catch {
    return { userId: null, tier: 'anonymous' };
  }
}

export interface SubscriptionInfo {
  isPro: boolean;
  status: string | null;
  plan: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Fetch the user's Dodo Payments subscription and resolve Pro access.
 * Pro = status 'active', or a cancelled subscription whose paid period
 * hasn't ended yet (cancel at period end keeps access until then).
 */
export async function getSubscriptionInfo(userId: string): Promise<SubscriptionInfo> {
  const none: SubscriptionInfo = {
    isPro: false,
    status: null,
    plan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status, plan, current_period_end, cancel_at_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return none;

  const periodEnd = data.current_period_end as string | null;
  const periodActive = periodEnd ? new Date(periodEnd).getTime() > Date.now() : false;
  const isPro =
    data.status === 'active' ||
    (data.status === 'cancelled' && periodActive);

  return {
    isPro,
    status: data.status ?? null,
    plan: (data.plan as 'monthly' | 'yearly' | null) ?? null,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: data.cancel_at_period_end === true,
  };
}

/**
 * Check if user has an active Pro subscription (Dodo Payments).
 */
export async function checkSubscription(userId: string): Promise<boolean> {
  const info = await getSubscriptionInfo(userId);
  return info.isPro;
}
