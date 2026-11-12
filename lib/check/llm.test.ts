import { beforeEach, describe, expect, it, vi } from 'vitest';

// A scripted OpenAI client: each call takes the next reply.
const replies: Array<{ finish: string; content: string; out?: number; takes?: number; timeout?: boolean }> = [];
const create = vi.fn(async (..._args: unknown[]) => {
  const next = replies.shift()!;
  // A slow call: moves the clock (only Date is faked in the tests that use it).
  if (next.takes) vi.setSystemTime(Date.now() + next.takes);
  // A call that timed out on our side (OpenAI ran it anyway).
  if (next.timeout) throw new APIConnectionTimeoutError();
  return {
    choices: [{ finish_reason: next.finish, message: { content: next.content } }],
    usage: { prompt_tokens: 100, completion_tokens: next.out ?? 20, prompt_tokens_details: { cached_tokens: 0 } },
  };
});
const { APIError, APIConnectionTimeoutError } = vi.hoisted(() => {
  class APIError extends Error {}
  class APIConnectionTimeoutError extends APIError {
    constructor() {
      super('Request timed out.');
    }
  }
  return { APIError, APIConnectionTimeoutError };
});
vi.mock('openai', () => {
  class OpenAI {
    static APIError = APIError;
    static APIConnectionTimeoutError = APIConnectionTimeoutError;
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

describe('a failed check still reports what it cost', () => {
  beforeEach(() => {
    replies.length = 0;
    create.mockClear();
    upsert.mockClear();
    vi.unstubAllEnvs();
  });

  async function runWithJudge() {
    vi.stubEnv('OPENAI_API_KEY', 'test');
    vi.stubEnv('LIVE_CHECK_JUDGE_MODEL', 'gpt-5-mini');
    vi.resetModules();
    return import('./llm');
  }

  it('three looping attempts: every attempt is in the failure, so the budget guard sees it', async () => {
    replies.push({ finish: 'length', content: LOOPING, out: 450 }, { finish: 'length', content: LOOPING, out: 450 }, { finish: 'length', content: LOOPING, out: 450 });
    const error = (await run().catch((e) => e)) as InstanceType<Awaited<typeof import('./llm')>['CheckFailure']>;
    expect(error.name).toBe('CheckFailure');
    expect(error.usage).toEqual({ inputTokens: 300, cachedInputTokens: 0, outputTokens: 1350 });
    expect(error.judge).toBeUndefined();
  });

  it('a judge that answers with garbage: the judge call is reported too, and nothing is cached', async () => {
    replies.push({ finish: 'stop', content: GOOD }, { finish: 'stop', content: 'not json', out: 7 });
    const { checkWithModel, CheckFailure } = await runWithJudge();
    const error = (await checkWithModel([{ id: 'a', text: 'I know teh answer.' }]).catch((e) => e)) as InstanceType<typeof CheckFailure>;
    expect(error).toBeInstanceOf(CheckFailure);
    expect(error.usage.inputTokens).toBe(100);
    expect(error.judge).toEqual({ model: 'gpt-5-mini', usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 7 } });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('a judge reply without verdicts is a failure, not "everything approved"', async () => {
    replies.push({ finish: 'stop', content: GOOD }, { finish: 'stop', content: '{}' });
    const { checkWithModel } = await runWithJudge();
    await expect(checkWithModel([{ id: 'a', text: 'I know teh answer.' }])).rejects.toThrow('unusable output');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('after a slow first attempt no further attempt is started (the platform would cut the request off unlogged)', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      replies.push({ finish: 'length', content: LOOPING, takes: 25_000 }, { finish: 'stop', content: GOOD });
      await expect(run()).rejects.toThrow('unusable output');
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('no SDK retries: a retry after a timeout would be a second billed call', async () => {
    replies.push({ finish: 'stop', content: GOOD });
    await run();
    const options = create.mock.calls[0]![1] as { timeout: number; maxRetries: number };
    expect(options.maxRetries).toBe(0);
    expect(options.timeout).toBeLessThanOrEqual(20_000);
  });

  it('a checker call that timed out is counted at a pessimistic estimate (OpenAI still bills it)', async () => {
    replies.push({ finish: 'stop', content: '', timeout: true });
    const error = (await run().catch((e) => e)) as InstanceType<Awaited<typeof import('./llm')>['CheckFailure']>;
    expect(error.name).toBe('CheckFailure');
    expect(error.usage.inputTokens).toBeGreaterThan(300); // the whole prompt, not just the sentence
    expect(error.usage.outputTokens).toBe(600); // the output cap for one paragraph
  });

  it('a judge call that timed out is reported as judge spend', async () => {
    replies.push({ finish: 'stop', content: GOOD }, { finish: 'stop', content: '', timeout: true });
    const { checkWithModel, CheckFailure } = await runWithJudge();
    const error = (await checkWithModel([{ id: 'a', text: 'I know teh answer.' }]).catch((e) => e)) as InstanceType<typeof CheckFailure>;
    expect(error).toBeInstanceOf(CheckFailure);
    expect(error.usage.inputTokens).toBe(100);
    expect(error.judge?.model).toBe('gpt-5-mini');
    expect(error.judge?.usage.outputTokens).toBe(2000);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not start the judge when the request is nearly out of time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      replies.push({ finish: 'stop', content: GOOD, takes: 41_000 }, { finish: 'stop', content: '{"v":[]}' });
      const { checkWithModel } = await runWithJudge();
      await expect(checkWithModel([{ id: 'a', text: 'I know teh answer.' }])).rejects.toThrow('No time left');
      expect(create).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
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

describe('answers the model gets wrong in ways users noticed', () => {
  beforeEach(() => {
    replies.length = 0;
    create.mockClear();
  });

  it('merges an id the model answered twice: "Heyyyy there" came back as an empty entry, then the real one', async () => {
    replies.push({
      finish: 'stop',
      content: JSON.stringify({
        r: [
          { id: 'a', lang: 'en', issues: [] },
          { id: 'a', lang: 'en', issues: [{ o: 'Heyyyy', b: '', r: 'Hey', m: 'excessive letters', t: 'spelling' }] },
        ],
      }),
    });
    const { results } = await run('Heyyyy there, thanks for the things.');
    expect(results).toHaveLength(1);
    expect(results[0]!.issues.map((i) => [i.offset, i.original, i.replacements[0]])).toEqual([[0, 'Heyyyy', 'Hey']]);
  });

  it('the same mistake reported in both entries is shown once', async () => {
    const same = { o: 'teh', b: 'know', r: 'the', m: '', t: 'spelling' };
    replies.push({ finish: 'stop', content: JSON.stringify({ r: [{ id: 'a', lang: 'en', issues: [same] }, { id: 'a', lang: 'en', issues: [same] }] }) });
    expect((await run()).results[0]!.issues).toHaveLength(1);
  });

});
