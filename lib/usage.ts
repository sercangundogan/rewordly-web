import { getSupabaseAdmin } from './supabase';
import { LIMITS, type LimitTier } from './limits';

const USAGE_TABLE = 'usage';

function todayUtc(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/**
 * Identity for usage: either user id (uuid) or anonymous id (prefixed so we don't mix).
 */
function usageIdentity(userId: string | null, anonymousId: string | undefined): string {
  if (userId) return `user:${userId}`;
  if (anonymousId) return `anon:${anonymousId}`;
  return `anon:unknown`;
}

export interface UsageRow {
  id: string;
  identity: string;
  date: string;
  rewrite_count: number;
  grammar_count: number;
}

/**
 * Get today's usage for the given identity.
 */
export async function getUsage(
  userId: string | null,
  anonymousId: string | undefined
): Promise<{ rewrite: number; grammar: number }> {
  const identity = usageIdentity(userId, anonymousId);
  const date = todayUtc();
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from(USAGE_TABLE)
    .select('rewrite_count, grammar_count')
    .eq('identity', identity)
    .eq('date', date)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Usage get error:', error);
    return { rewrite: 0, grammar: 0 };
  }
  if (!data) return { rewrite: 0, grammar: 0 };
  return {
    rewrite: (data as { rewrite_count: number }).rewrite_count ?? 0,
    grammar: (data as { grammar_count: number }).grammar_count ?? 0,
  };
}

/**
 * Increment usage for the given identity and type. Uses upsert to create or update row.
 */
export async function incrementUsage(
  userId: string | null,
  anonymousId: string | undefined,
  type: 'rewrite' | 'grammar'
): Promise<void> {
  const identity = usageIdentity(userId, anonymousId);
  const date = todayUtc();
  const supabase = getSupabaseAdmin();

  const column = type === 'rewrite' ? 'rewrite_count' : 'grammar_count';

  const { data: existing } = await supabase
    .from(USAGE_TABLE)
    .select('id, rewrite_count, grammar_count')
    .eq('identity', identity)
    .eq('date', date)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const row = existing as { id: string; rewrite_count: number; grammar_count: number };
    const current = (row[column as keyof typeof row] ?? 0) as number;
    await supabase
      .from(USAGE_TABLE)
      .update({
        [column]: current + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', row.id);
  } else {
    await supabase.from(USAGE_TABLE).insert({
      identity,
      date,
      rewrite_count: type === 'rewrite' ? 1 : 0,
      grammar_count: type === 'grammar' ? 1 : 0,
    });
  }
}

/**
 * Check if the user can perform one more rewrite/grammar. Returns true if allowed.
 */
export function canUse(
  tier: LimitTier,
  type: 'rewrite' | 'grammar',
  used: { rewrite: number; grammar: number }
): boolean {
  const limits = LIMITS[tier];
  const limit = type === 'rewrite' ? limits.rewrite : limits.grammar;
  const current = type === 'rewrite' ? used.rewrite : used.grammar;
  return current < limit;
}

/**
 * Get limit info for response (remaining, limit, requireLogin, requirePayment).
 */
export function getLimitInfo(
  tier: LimitTier,
  type: 'rewrite' | 'grammar',
  used: { rewrite: number; grammar: number }
): {
  used: number;
  limit: number;
  remaining: number;
  requireLogin: boolean;
  requirePayment: boolean;
} {
  const limits = LIMITS[tier];
  const limit = type === 'rewrite' ? limits.rewrite : limits.grammar;
  const usedCount = type === 'rewrite' ? used.rewrite : used.grammar;
  const remaining = Math.max(0, limit === Infinity ? 999 : limit - usedCount);
  return {
    used: usedCount,
    limit: limit === Infinity ? -1 : limit,
    remaining: limit === Infinity ? -1 : remaining,
    requireLogin: tier === 'anonymous',
    requirePayment: tier === 'free',
  };
}
