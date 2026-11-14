import { beforeEach, describe, expect, it, vi } from 'vitest';

const { spend, inserts } = vi.hoisted(() => ({ spend: {} as Record<string, number>, inserts: [] as Array<Record<string, unknown>> }));
vi.mock('../supabase', () => ({
  getSupabaseAdmin: () => ({
    rpc: async (_fn: string, args: { p_feature: string }) => ({ data: spend[args.p_feature] ?? 0, error: null }),
    from: () => ({ insert: async (row: Record<string, unknown>) => (inserts.push(row), { error: null }) }),
  }),
}));

import { costUsd, isBudgetExhausted, isLegacyBudgetExhausted, logUsage, resetBudgetCache } from './costs';

const usage = { inputTokens: 1_000_000, cachedInputTokens: 0, outputTokens: 0 };

beforeEach(() => {
  for (const k of Object.keys(spend)) delete spend[k];
  inserts.length = 0;
  resetBudgetCache();
  vi.unstubAllEnvs();
});

describe('costUsd', () => {
  it('prices gpt-4o (Pro rewrites)', () => {
    expect(costUsd('gpt-4o', usage)).toBeCloseTo(2.5);
  });

  it('a model missing from the table is never free', () => {
    expect(costUsd('gpt-9-ultra', usage)).toBeGreaterThan(0);
  });
});

describe('legacy budget', () => {
  it('adds up rewrite, grammar and proactive check, and leaves live check out', async () => {
    vi.stubEnv('LEGACY_DAILY_BUDGET_USD', '2');
    Object.assign(spend, { rewrite: 0.9, grammar: 0.6, proactive_check: 0.4, live_check: 50 });
    expect(await isLegacyBudgetExhausted()).toBe(false);
    resetBudgetCache();
    spend.proactive_check = 0.6;
    expect(await isLegacyBudgetExhausted()).toBe(true);
  });

  it('live check has its own budget, not touched by legacy spend', async () => {
    vi.stubEnv('LIVE_CHECK_DAILY_BUDGET_USD', '2');
    Object.assign(spend, { rewrite: 100 });
    expect(await isBudgetExhausted()).toBe(false);
  });

  it('spend logged in this instance counts at once, before the next database read', async () => {
    vi.stubEnv('LEGACY_DAILY_BUDGET_USD', '1');
    expect(await isLegacyBudgetExhausted()).toBe(false);
    await logUsage({ identity: 'anon:x', tier: 'anonymous', model: 'gpt-4o', chars: 10, usage: { inputTokens: 500_000, cachedInputTokens: 0, outputTokens: 0 }, feature: 'rewrite' });
    expect(await isLegacyBudgetExhausted()).toBe(true);
    expect(inserts[0]).toMatchObject({ feature: 'rewrite', model: 'gpt-4o' });
  });

  it('counts a live check at the Fast mode price, twice the standard one, and a rewrite at the standard price', async () => {
    const million = { inputTokens: 1_000_000, cachedInputTokens: 0, outputTokens: 0 };
    await logUsage({ identity: 'anon:x', tier: 'anonymous', model: 'gpt-6-luna', chars: 10, usage: million });
    await logUsage({ identity: 'anon:x', tier: 'anonymous', model: 'gpt-6-luna', chars: 10, usage: million, feature: 'rewrite' });
    expect(inserts[0]!.cost_usd).toBeCloseTo(0.2);
    expect(inserts[1]!.cost_usd).toBeCloseTo(0.1);
  });

  it('a call that used no tokens writes no row', async () => {
    await logUsage({ identity: 'anon:x', tier: 'anonymous', model: 'gpt-4o-mini', chars: 0, usage: { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 } });
    expect(inserts).toHaveLength(0);
  });
});
