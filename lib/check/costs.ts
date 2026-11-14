import { getSupabaseAdmin } from '../supabase';
import type { LimitTier } from '../limits';

/**
 * Token accounting and the global daily budget guard for live checks.
 * Storage: table ai_usage_log + function ai_spend_today (supabase-live-check.sql).
 */

/** USD per 1M tokens. Check https://openai.com/api/pricing when changing models. */
const PRICING: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-6-luna': { input: 0.1, cachedInput: 0.01, output: 0.5 },
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2 },
  'gpt-4o': { input: 2.5, cachedInput: 1.25, output: 10 },
};
/** A model missing above is counted at the most expensive price we know, never as free. */
const UNKNOWN_MODEL_PRICE = PRICING['gpt-4o']!;

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

/**
 * Live checks run in OpenAI's Fast mode (service_tier "priority"): the user waits for every one of them.
 * Measured on 2026-11-14 with test/eval/service-tier.eval.ts (gpt-6-luna, 72 pairs): the checker's median
 * went from 1016 ms to 657 ms, at twice the token price. LIVE_CHECK_SERVICE_TIER=default goes back to the
 * standard tier. The older endpoints (rewrite, grammar, proactive check) stay on the standard tier.
 */
export const LIVE_CHECK_SERVICE_TIER: 'priority' | 'default' = process.env.LIVE_CHECK_SERVICE_TIER === 'default' ? 'default' : 'priority';
/** Fast mode is billed at twice the standard rate (OpenAI pricing page, 2026-11-13). */
export const LIVE_CHECK_PRICE_FACTOR = LIVE_CHECK_SERVICE_TIER === 'priority' ? 2 : 1;

/** `factor` multiplies the standard price, e.g. LIVE_CHECK_PRICE_FACTOR for calls made in Fast mode. */
export function costUsd(model: string, usage: TokenUsage, factor = 1): number {
  const price = PRICING[model] ?? UNKNOWN_MODEL_PRICE;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (factor * (uncached * price.input + usage.cachedInputTokens * price.cachedInput + usage.outputTokens * price.output)) / 1e6;
}

export async function logUsage(entry: {
  identity: string;
  tier: LimitTier;
  model: string;
  chars: number;
  usage: TokenUsage;
  /** Site the check came from (normalized hostname), when the extension sent one. */
  host?: string | null;
  /** Defaults to 'live_check'. The older endpoints log as 'rewrite', 'grammar' and 'proactive_check'. */
  feature?: string;
}): Promise<void> {
  // A failed call that never reached the model spent nothing: no row.
  if (entry.usage.inputTokens + entry.usage.outputTokens === 0) return;
  const feature = entry.feature ?? 'live_check';
  const cost = costUsd(entry.model, entry.usage, feature === 'live_check' ? LIVE_CHECK_PRICE_FACTOR : 1);
  if (feature === 'live_check') spentToday.value += cost;
  else legacySpent.value += cost;
  const row = {
    feature,
    identity: entry.identity,
    tier: entry.tier,
    model: entry.model,
    chars: entry.chars,
    input_tokens: entry.usage.inputTokens,
    cached_input_tokens: entry.usage.cachedInputTokens,
    output_tokens: entry.usage.outputTokens,
    cost_usd: cost,
  };
  const insert = (values: object) => getSupabaseAdmin().from('ai_usage_log').insert(values);
  let { error } = await insert(entry.host ? { ...row, host: entry.host } : row);
  // Before supabase-site-usage.sql adds the host column: keep logging cost without it.
  if (error && entry.host && /host/.test(error.message)) ({ error } = await insert(row));
  if (error) console.error('ai_usage_log insert failed (has supabase-live-check.sql been run?):', error.message);
}

/**
 * Daily spend cap for non-Pro live checks (LIVE_CHECK_DAILY_BUDGET_USD, default $20).
 * When reached, free/anonymous checks pause until the next UTC day; Pro keeps working.
 * The total is read from the database at most once a minute per server instance.
 */
const BUDGET_REFRESH_MS = 60_000;
const spentToday = { value: 0, day: '', fetchedAt: 0 };

export async function isBudgetExhausted(): Promise<boolean> {
  const budget = Number(process.env.LIVE_CHECK_DAILY_BUDGET_USD ?? 20);
  if (!Number.isFinite(budget) || budget <= 0) return false;

  const day = new Date().toISOString().slice(0, 10);
  if (spentToday.day !== day || Date.now() - spentToday.fetchedAt > BUDGET_REFRESH_MS) {
    const { data, error } = await getSupabaseAdmin().rpc('ai_spend_today', { p_feature: 'live_check' });
    if (!error) spentToday.value = Number(data ?? 0);
    else if (spentToday.day !== day) spentToday.value = 0;
    spentToday.day = day;
    spentToday.fetchedAt = Date.now();
  }
  return spentToday.value >= budget;
}

/**
 * Same guard for the older endpoints (rewrite, grammar, proactive check), with its own budget
 * (LEGACY_DAILY_BUDGET_USD, default $2): free and anonymous use pauses until the next UTC day.
 */
export const LEGACY_FEATURES = ['rewrite', 'grammar', 'proactive_check'] as const;
const legacySpent = { value: 0, day: '', fetchedAt: 0 };

export async function isLegacyBudgetExhausted(): Promise<boolean> {
  const budget = Number(process.env.LEGACY_DAILY_BUDGET_USD ?? 2);
  if (!Number.isFinite(budget) || budget <= 0) return false;

  const day = new Date().toISOString().slice(0, 10);
  if (legacySpent.day !== day || Date.now() - legacySpent.fetchedAt > BUDGET_REFRESH_MS) {
    const totals = await Promise.all(
      LEGACY_FEATURES.map((feature) => getSupabaseAdmin().rpc('ai_spend_today', { p_feature: feature }))
    );
    if (totals.every((t) => !t.error)) legacySpent.value = totals.reduce((sum, t) => sum + Number(t.data ?? 0), 0);
    else if (legacySpent.day !== day) legacySpent.value = 0;
    legacySpent.day = day;
    legacySpent.fetchedAt = Date.now();
  }
  return legacySpent.value >= budget;
}

/** For tests. */
export function resetBudgetCache(): void {
  spentToday.value = 0;
  spentToday.day = '';
  spentToday.fetchedAt = 0;
  legacySpent.value = 0;
  legacySpent.day = '';
  legacySpent.fetchedAt = 0;
}
