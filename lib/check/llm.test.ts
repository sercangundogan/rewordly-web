import { beforeEach, describe, expect, it, vi } from 'vitest';

// A scripted OpenAI client: each call takes the next reply.
const replies: Array<{ finish: string; content: string; out?: number }> = [];
const create = vi.fn(async () => {
  const next = replies.shift()!;
  return {
    choices: [{ finish_reason: next.finish, message: { content: next.content } }],
    usage: { prompt_tokens: 100, completion_tokens: next.out ?? 20, prompt_tokens_details: { cached_tokens: 0 } },
  };
});
vi.mock('openai', () => {
  class APIError extends Error {}
  class OpenAI {
    static APIError = APIError;
    chat = { completions: { create } };
  }
  return { default: OpenAI };
});
const gte = vi.fn(async (..._args: unknown[]) => ({ data: [] as unknown[], error: null }));
const upsert = vi.fn(async (..._args: unknown[]) => ({ error: null }));
vi.mock('../supabase', () => ({
  getSupabaseAdmin: () => ({ from: () => ({ select: () => ({ in: () => ({ gte }) }), upsert }) }),
}));

const GOOD = JSON.stringify({ r: [{ id: 'a', lang: 'en', issues: [{ o: 'teh', b: 'know', r: 'the', m: '', t: 'spelling' }] }] });
const LOOPING = '{"r":[{"id":"a","lang":"tr","issues":[]},{"id":"a","lang":"tr","issues":[]},{"id":"a","lang":"tr","iss';

async function run(text = 'I know teh answer.') {
  vi.stubEnv('OPENAI_API_KEY', 'test');
  vi.stubEnv('LIVE_CHECK_JUDGE_MODEL', 'off');
  vi.resetModules();
  const { checkWithModel } = await import('./llm');
  return checkWithModel([{ id: 'a', text }]);
}

describe('checkWithModel: a model that repeats itself until it is cut off', () => {
  beforeEach(() => {
    replies.length = 0;
    create.mockClear();
  });

  it('asks again, a little less deterministic, and counts every attempt', async () => {
    replies.push({ finish: 'length', content: LOOPING, out: 450 }, { finish: 'stop', content: GOOD });
    const { results, usage } = await run();
    expect(results[0]!.issues.map((i) => i.original)).toEqual(['teh']);
    expect(create).toHaveBeenCalledTimes(2);
    const calls = create.mock.calls as unknown as Array<[{ temperature: number; max_tokens: number }]>;
    expect(calls[0]![0].temperature).toBe(0);
    expect(calls[1]![0].temperature).toBeGreaterThan(0);
    // The cap fits the input: a loop ends early instead of running to 1500 tokens.
    expect(calls[0]![0].max_tokens).toBeLessThanOrEqual(600);
    expect(usage.outputTokens).toBe(470);
  });

  it('also retries when the JSON is broken without being cut off', async () => {
    replies.push({ finish: 'stop', content: '{"r":[{"id"' }, { finish: 'stop', content: GOOD });
    expect((await run()).results[0]!.issues).toHaveLength(1);
  });

  it('gives up after three attempts instead of showing nothing silently', async () => {
    replies.push({ finish: 'length', content: LOOPING }, { finish: 'length', content: LOOPING }, { finish: 'length', content: LOOPING });
    await expect(run()).rejects.toThrow('unusable output');
    expect(create).toHaveBeenCalledTimes(3);
  });
});

describe('cache lifetime', () => {
  beforeEach(() => {
    replies.length = 0;
    gte.mockClear();
    upsert.mockClear();
    vi.unstubAllEnvs();
  });

  it('only reads shared cache rows younger than the TTL (30 days by default)', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test');
    vi.resetModules();
    const { lookupCached } = await import('./llm');
    await lookupCached([{ id: 'a', text: 'Some sentence.' }]);
    const cutoff = new Date(gte.mock.calls[0]![1] as string).getTime();
    const days = (Date.now() - cutoff) / 86_400_000;
    expect(days).toBeGreaterThan(29.99);
    expect(days).toBeLessThan(30.01);
  });

  it('follows CHECK_CACHE_TTL_DAYS', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'test');
    vi.stubEnv('CHECK_CACHE_TTL_DAYS', '7');
    vi.resetModules();
    const { lookupCached } = await import('./llm');
    await lookupCached([{ id: 'a', text: 'Some sentence.' }]);
    const days = (Date.now() - new Date(gte.mock.calls[0]![1] as string).getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(7);
  });

  it('rewrites created_at when a sentence is cached again, so an expired row gets a new life', async () => {
    replies.push({ finish: 'stop', content: GOOD });
    await run();
    const rows = upsert.mock.calls[0]![0] as Array<{ created_at: string }>;
    expect(Date.now() - new Date(rows[0]!.created_at).getTime()).toBeLessThan(5000);
  });

  it('does not serve a memory entry past its lifetime', async () => {
    vi.useFakeTimers();
    try {
      replies.push({ finish: 'stop', content: GOOD });
      vi.stubEnv('OPENAI_API_KEY', 'test');
      vi.stubEnv('LIVE_CHECK_JUDGE_MODEL', 'off');
      vi.resetModules();
      const { checkWithModel, lookupCached } = await import('./llm');
      const p = [{ id: 'a', text: 'I know teh answer.' }];
      await checkWithModel(p);
      expect((await lookupCached(p)).pending).toHaveLength(0);
      vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
      expect((await lookupCached(p)).pending).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
