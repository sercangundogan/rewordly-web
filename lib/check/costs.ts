import { getSupabaseAdmin } from '../supabase';
import type { LimitTier } from '../limits';

/**
 * Token accounting and the global daily budget guard for live checks.
 * Storage: table ai_usage_log + function ai_spend_today (supabase-live-check.sql).
 */

/** USD per 1M tokens. Check https://openai.com/api/pricing when changing models. */
const PRICING: Record<string, { input: number; cachedInput: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, cachedInput: 0.075, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, cachedInput: 0.1, output: 1.6 },
  'gpt-5-mini': { input: 0.25, cachedInput: 0.025, output: 2 },
};

export interface TokenUsage {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
}

export function costUsd(model: string, usage: TokenUsage): number {
  const price = PRICING[model];
  if (!price) return 0;
  const uncached = Math.max(0, usage.inputTokens - usage.cachedInputTokens);
  return (uncached * price.input + usage.cachedInputTokens * price.cachedInput + usage.outputTokens * price.output) / 1e6;
}

export async function logUsage(entry: {
  identity: string;
  tier: LimitTier;
  model: string;
  chars: number;
  usage: TokenUsage;
  /** Site the check came from (normalized hostname), when the extension sent one. */
  host?: string | null;
}): Promise<void> {
  const cost = costUsd(entry.model, entry.usage);
  spentToday.value += cost;
  const row = {
    feature: 'live_check',
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
