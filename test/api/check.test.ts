import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logUsage, recordQuota, checkWithModel, getAuth, lookupCached, waitUntil } = vi.hoisted(() => ({
  logUsage: vi.fn(async (..._a: unknown[]) => undefined),
  recordQuota: vi.fn(async (..._a: unknown[]): Promise<void> => undefined),
  checkWithModel: vi.fn(),
  getAuth: vi.fn(async () => ({ userId: null, tier: 'anonymous' })),
  lookupCached: vi.fn(async (p: unknown[]): Promise<{ results: unknown[]; pending: unknown[] }> => ({ results: [], pending: p })),
  waitUntil: vi.fn((_work: Promise<unknown>) => undefined),
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock('openai', () => ({ default: class {} }));
vi.mock('@vercel/functions', () => ({ waitUntil }));
vi.mock('../../lib/auth', () => ({ getAuthFromRequest: () => getAuth() }));
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
  return { CheckFailure, LIVE_CHECK_MODEL: 'gpt-4o-mini', lookupCached: (p: unknown[]) => lookupCached(p), checkWithModel };
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

describe('POST /api/check timing log', () => {
  it('writes one check_timing line with the steps in milliseconds, and no text or identity', async () => {
    const text = 'I know teh answer.';
    checkWithModel.mockReset();
    checkWithModel.mockResolvedValue({
      results: [{ id: 'a', language: 'en', issues: [] }],
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20 },
      timing: { checkerMs: 1200, attempts: 1, judgeMs: 900 },
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const res = await call({ paragraphs: [{ id: 'a', text }], host: 'example.com' });
    const lines = log.mock.calls.map(([line]) => String(line)).filter((line) => line.includes('check_timing'));
    log.mockRestore();

    expect(res.statusCode).toBe(200);
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]!);
    expect(entry).toMatchObject({ evt: 'check_timing', checkerMs: 1200, attempts: 1, judgeMs: 900, sentences: 1, chars: text.length, tier: 'anonymous' });
    for (const key of ['totalMs', 'cacheMs', 'authMs', 'quotaMs', 'waitMs', 'modelMs', 'finishMs']) expect(typeof entry[key]).toBe('number');
    expect(lines[0]).not.toContain('teh');
    expect(lines[0]).not.toContain('anon:');
    expect(lines[0]).not.toContain('example.com');
  });
});

describe('POST /api/check does not make the user wait for bookkeeping', () => {
  const GOOD = {
    results: [{ id: 'a', language: 'en', issues: [] }],
    usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 20 },
    timing: { checkerMs: 1200, attempts: 1, judgeMs: 0 },
  };
  const body = { paragraphs: [{ id: 'a', text: 'I know teh answer.' }] };

  beforeEach(() => {
    logUsage.mockClear();
    recordQuota.mockReset();
    recordQuota.mockResolvedValue(undefined);
    waitUntil.mockClear();
    getAuth.mockClear();
    lookupCached.mockReset();
    lookupCached.mockImplementation(async (p: unknown[]) => ({ results: [], pending: p }));
    checkWithModel.mockReset();
    checkWithModel.mockResolvedValue(GOOD);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  it('answers while the quota row is still being written, and hands that work to the platform', async () => {
    let written = false;
    let finish = () => undefined as void;
    recordQuota.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = () => {
            written = true;
            resolve();
          };
        })
    );
    const res = await call(body);
    expect(res.statusCode).toBe(200);
    expect(written).toBe(false);
    // The quota is still charged and the spend still logged: Vercel keeps the function alive for it.
    expect(recordQuota).toHaveBeenCalledTimes(1);
    expect(logUsage).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledTimes(1);
    finish();
    await waitUntil.mock.calls[0]![0];
    expect(written).toBe(true);
  });

  it('a record that fails after the answer is logged, not thrown', async () => {
    recordQuota.mockRejectedValue(new Error('database is down'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await call(body);
    await waitUntil.mock.calls[0]![0];
    expect(res.statusCode).toBe(200);
    expect(errors.mock.calls.some(([line]) => String(line).includes('quota and usage record failed'))).toBe(true);
    errors.mockRestore();
  });

  it('looks up who is asking while the cache is still being read', async () => {
    let release = () => undefined as void;
    lookupCached.mockImplementation((p: unknown[]) => new Promise((resolve) => (release = () => resolve({ results: [], pending: p }))));
    const pending = call(body);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(checkWithModel).not.toHaveBeenCalled();
    release();
    expect((await pending).statusCode).toBe(200);
  });

  it('a cached answer is returned even when the account lookup fails', async () => {
    getAuth.mockRejectedValueOnce(new Error('auth is down'));
    lookupCached.mockImplementation(async () => ({ results: [{ id: 'a', language: 'en', issues: [] }], pending: [] }));
    const res = await call(body);
    expect(res.statusCode).toBe(200);
    expect(checkWithModel).not.toHaveBeenCalled();
  });
});
