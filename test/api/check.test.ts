import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logUsage, recordQuota, checkWithModel } = vi.hoisted(() => ({
  logUsage: vi.fn(async (..._a: unknown[]) => undefined),
  recordQuota: vi.fn(async (..._a: unknown[]) => undefined),
  checkWithModel: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock('openai', () => ({ default: class {} }));
vi.mock('../../lib/auth', () => ({ getAuthFromRequest: async () => ({ userId: null, tier: 'anonymous' }) }));
vi.mock('../../lib/check/quota', () => ({
  getQuota: async () => ({ tier: 'anonymous', period: 'lifetime', used: 0, limit: 15000 }),
  ipIdentity: () => 'ip:x',
  isIpOverLimit: async () => false,
  quotaIdentity: () => 'anon:test',
  recordQuota: (...a: unknown[]) => recordQuota(...a),
}));
vi.mock('../../lib/check/costs', () => ({ isBudgetExhausted: async () => false, logUsage: (...a: unknown[]) => logUsage(...a) }));
vi.mock('../../lib/check/feedback', () => ({ decorateResults: async (_p: unknown, r: unknown) => r }));
vi.mock('../../lib/check/llm', () => {
  class CheckFailure extends Error {
    constructor(message: string, readonly usage: unknown, readonly judge?: unknown) {
      super(message);
    }
  }
  return { CheckFailure, LIVE_CHECK_MODEL: 'gpt-4o-mini', lookupCached: async (p: unknown[]) => ({ results: [], pending: p }), checkWithModel };
});

import handler from '../../pages/api/check';
import { CheckFailure } from '../../lib/check/llm';

function call(body: unknown) {
  const res = {
    statusCode: 0,
    json: vi.fn(function (this: typeof res) {
      return this;
    }),
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader: vi.fn(),
    end: vi.fn(),
  };
  const req = { method: 'POST', headers: {}, body, socket: { remoteAddress: '1.2.3.4' } };
  return handler(req as never, res as never).then(() => res);
}

describe('POST /api/check when the check fails after the model was paid for', () => {
  beforeEach(() => {
    logUsage.mockClear();
    recordQuota.mockClear();
    checkWithModel.mockReset();
  });

  it('logs the checker and judge spend, charges the user nothing, and answers 500', async () => {
    const spent = { inputTokens: 300, cachedInputTokens: 0, outputTokens: 1350 };
    const judge = { model: 'gpt-5-mini', usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 7 } };
    checkWithModel.mockRejectedValue(new CheckFailure('unusable', spent, judge));
    const res = await call({ paragraphs: [{ id: 'a', text: 'I know teh answer.' }], host: 'example.com' });
    expect(res.statusCode).toBe(500);
    expect(logUsage).toHaveBeenCalledTimes(2);
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-4o-mini', usage: spent, chars: 0 }));
    expect(logUsage).toHaveBeenCalledWith(expect.objectContaining({ model: 'gpt-5-mini', usage: judge.usage, chars: 0 }));
    expect(recordQuota).not.toHaveBeenCalled();
  });

  it('a failure that cost nothing (e.g. no API key) logs nothing', async () => {
    checkWithModel.mockRejectedValue(new Error('OPENAI_API_KEY is not configured'));
    const res = await call({ paragraphs: [{ id: 'a', text: 'I know teh answer.' }] });
    expect(res.statusCode).toBe(500);
    expect(logUsage).not.toHaveBeenCalled();
  });

  it('rejects repeated paragraph ids before anything is spent', async () => {
    const res = await call({ paragraphs: [{ id: 'a', text: 'One.' }, { id: 'a', text: 'Two.' }] });
    expect(res.statusCode).toBe(400);
    expect(checkWithModel).not.toHaveBeenCalled();
  });
});
