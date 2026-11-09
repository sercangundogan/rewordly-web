import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import type { LimitTier } from '../limits';

/**
 * Live check quotas, counted in characters actually sent to the model
 * (cache hits are free), because characters track cost; requests don't.
 *
 * - anonymous: a one-time trial, so cost per install is bounded. Logging in
 *   (free) is the way to keep going. An extra per-IP daily cap stops the trial
 *   from being reset by reinstalling.
 * - free: a daily allowance.
 * - pro: "unlimited", with a monthly fair-use ceiling against abuse.
 *
 * Storage: table auto_quota + function add_auto_quota (supabase-live-check.sql).
 * If those don't exist yet, quotas are not enforced and an error is logged.
 */

export type QuotaPeriod = 'lifetime' | 'day' | 'month';

export const LIVE_CHECK_QUOTA: Record<LimitTier, { chars: number; period: QuotaPeriod }> = {
  anonymous: { chars: 15_000, period: 'lifetime' },
  free: { chars: 60_000, period: 'day' },
  pro: { chars: 3_000_000, period: 'month' },
};

/** Per IP per day, for anonymous traffic only (generous: offices and schools share IPs). */
export const ANON_IP_DAILY_CHARS = 40_000;

export interface QuotaState {
  tier: LimitTier;
  period: QuotaPeriod;
  used: number;
  limit: number;
}

function periodKey(period: QuotaPeriod, now = new Date()): string {
  if (period === 'lifetime') return 'lifetime';
  const iso = now.toISOString();
  return period === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}

/** What the extension generates is 32 hex characters; anything else (or an endless header) is not stored as an identity. */
const ANONYMOUS_ID = /^[A-Za-z0-9_-]{8,64}$/;

/** The anonymous id when it looks like one the extension made, else 'unknown' (one shared identity). */
export function validAnonymousId(anonymousId: string | undefined): string {
  return anonymousId && ANONYMOUS_ID.test(anonymousId) ? anonymousId : 'unknown';
}

export function quotaIdentity(userId: string | null, anonymousId: string | undefined): string {
  if (userId) return `user:${userId}`;
  return `anon:${validAnonymousId(anonymousId)}`;
}

/**
 * A plain daily counter on the same table (auto_quota), for limits counted in requests rather than
 * characters. `name` keeps counters apart, e.g. 'rewrite'. The add is atomic in the database.
 */
export async function readDailyCount(identity: string, name: string): Promise<number> {
  return readChars(identity, `${periodKey('day')}:${name}`);
}

export async function addDailyCount(identity: string, name: string): Promise<void> {
  await addChars(identity, `${periodKey('day')}:${name}`, 1);
}

/** Salted so raw IPs are never stored. */
export function ipIdentity(ip: string): string {
  const salt = process.env.IP_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || 'rewordly';
  return `ip:${createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32)}`;
}

async function readChars(identity: string, period: string): Promise<number> {
  const { data, error } = await getSupabaseAdmin()
    .from('auto_quota')
    .select('chars')
    .eq('identity', identity)
    .eq('period', period)
    .maybeSingle();
  if (error) {
    console.error('auto_quota read failed (has supabase-live-check.sql been run?):', error.message);
    return 0;
  }
  return (data as { chars: number } | null)?.chars ?? 0;
}

async function addChars(identity: string, period: string, chars: number): Promise<void> {
  const { error } = await getSupabaseAdmin().rpc('add_auto_quota', {
    p_identity: identity,
    p_period: period,
    p_chars: chars,
  });
  if (error) console.error('add_auto_quota failed (has supabase-live-check.sql been run?):', error.message);
}

export async function getQuota(tier: LimitTier, identity: string): Promise<QuotaState> {
  const { chars: limit, period } = LIVE_CHECK_QUOTA[tier];
  const used = await readChars(identity, periodKey(period));
  return { tier, period, used, limit };
}

export async function isIpOverLimit(ipId: string): Promise<boolean> {
  return (await readChars(ipId, periodKey('day'))) >= ANON_IP_DAILY_CHARS;
}

export async function recordQuota(tier: LimitTier, identity: string, ipId: string | null, chars: number): Promise<void> {
  if (chars <= 0) return;
  const period = LIVE_CHECK_QUOTA[tier].period;
  await Promise.all([
    addChars(identity, periodKey(period), chars),
    tier === 'anonymous' && ipId ? addChars(ipId, periodKey('day'), chars) : Promise.resolve(),
  ]);
}
