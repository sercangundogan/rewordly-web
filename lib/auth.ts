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

/**
 * Check if user has an active Pro subscription (LemonSqueezy).
 */
export async function checkSubscription(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'on_trial'])
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}
