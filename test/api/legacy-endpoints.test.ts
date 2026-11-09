import { beforeEach, describe, expect, it, vi } from 'vitest';

// In-memory stand-ins for the database: per-identity usage (lib/usage.ts), daily counters (auto_quota), cost log.
const { counters, usageRows, logged, model, budget } = vi.hoisted(() => ({
  counters: new Map<string, number>(),
  usageRows: new Map<string, { rewrite: number; grammar: number }>(),
  logged: [] as Array<{ feature?: string; model: string; identity: string; usage: { inputTokens: number; outputTokens: number } }>,
  model: { calls: 0, fail: false, issues: 0 },
  budget: { exhausted: false },
}));

vi.mock('../../lib/supabase', () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock('../../lib/auth', () => ({
  getAuthFromRequest: async (auth?: string) =>
    auth === 'Bearer pro' ? { userId: 'p1', tier: 'pro' } : auth === 'Bearer free' ? { userId: 'f1', tier: 'free' } : { userId: null, tier: 'anonymous' },
}));
vi.mock('../../lib/check/quota', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/check/quota')>();
  return {
    ...real,
    readDailyCount: async (identity: string, name: string) => counters.get(`${identity}|${name}`) ?? 0,
    addDailyCount: async (identity: string, name: string) => {
      counters.set(`${identity}|${name}`, (counters.get(`${identity}|${name}`) ?? 0) + 1);
    },
  };
});
vi.mock('../../lib/usage', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../lib/usage')>();
  const id = real.usageIdentity;
  return {
    ...real,
    getUsage: async (userId: string | null, anon?: string) => ({ ...(usageRows.get(id(userId, anon)) ?? { rewrite: 0, grammar: 0 }) }),
    incrementUsage: async (userId: string | null, anon: string | undefined, type: 'rewrite' | 'grammar') => {
      const row = usageRows.get(id(userId, anon)) ?? { rewrite: 0, grammar: 0 };
      row[type]++;
      usageRows.set(id(userId, anon), row);
    },
  };
});
vi.mock('../../lib/check/costs', () => ({
  isLegacyBudgetExhausted: async () => budget.exhausted,
  logUsage: async (entry: (typeof logged)[number]) => void logged.push(entry),
}));
vi.mock('../../lib/openai', () => {
  type Options = { onUsage?: (u: object, m: string) => void; model?: string };
  const spend = (o: Options) => {
    model.calls++;
    o.onUsage?.({ inputTokens: 100, cachedInputTokens: 0, outputTokens: 50 }, o.model ?? 'gpt-4o-mini');
    if (model.fail) throw new Error('No response received from OpenAI');
  };
  return {
    rewriteText: async (text: string, _tone: string, o: Options) => (spend(o), { rewritten: text, variants: [text] }),
    correctGrammar: async (text: string, o: Options) => (spend(o), { corrected: text }),
    proactiveCheck: async (text: string, o: Options) => (spend(o), { hasIssues: model.issues > 0, issueCount: model.issues, corrected: text }),
  };
});

import rewrite from '../../pages/api/rewrite';
import grammar from '../../pages/api/grammar';
import proactive from '../../pages/api/proactive-check';

type Handler = (req: never, res: never) => Promise<void>;

async function call(handler: Handler, body: object, headers: Record<string, string> = {}, ip = '203.0.113.7') {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
    setHeader: () => undefined,
    end: () => undefined,
  };
  await handler({ method: 'POST', headers: { 'x-forwarded-for': ip, ...headers }, body, socket: {} } as never, res as never);
  return res;
}

const randomId = () => Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

beforeEach(() => {
  counters.clear();
  usageRows.clear();
  logged.length = 0;
  model.calls = 0;
  model.fail = false;
  model.issues = 0;
  budget.exhausted = false;
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('rewrite and grammar: a new anonymous id is not a new allowance', () => {
  it.each([
    ['rewrite', rewrite],
    ['grammar', grammar],
  ] as const)('%s: rotating X-Anonymous-Id stops at the per-IP cap (20 a day)', async (_name, handler) => {
    const statuses: number[] = [];
    for (let i = 0; i < 60; i++) statuses.push((await call(handler as Handler, { text: 'Some text here.' }, { 'x-anonymous-id': randomId() })).statusCode);
    expect(statuses.filter((s) => s === 200)).toHaveLength(20);
    expect(model.calls).toBe(20);
    const blocked = await call(handler as Handler, { text: 'Some text here.' }, { 'x-anonymous-id': randomId() });
    expect(blocked.statusCode).toBe(402);
    expect(blocked.body).toMatchObject({ code: 'LIMIT_REACHED', requireLogin: true });
  });

  it('another address is not affected by one that hit the cap', async () => {
    for (let i = 0; i < 25; i++) await call(rewrite as Handler, { text: 'x y z' }, { 'x-anonymous-id': randomId() }, '198.51.100.1');
    expect((await call(rewrite as Handler, { text: 'x y z' }, { 'x-anonymous-id': randomId() }, '198.51.100.2')).statusCode).toBe(200);
  });

  it('the per-install limit (5) still applies first, as before', async () => {
    const id = randomId();
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) statuses.push((await call(rewrite as Handler, { text: 'Some text.' }, { 'x-anonymous-id': id })).statusCode);
    expect(statuses).toEqual([200, 200, 200, 200, 200, 402, 402]);
  });

  it('a logged-in free user is not limited by the address they share', async () => {
    for (let i = 0; i < 25; i++) await call(rewrite as Handler, { text: 'x y z' }, { 'x-anonymous-id': randomId() });
    expect((await call(rewrite as Handler, { text: 'x y z' }, { authorization: 'Bearer free' })).statusCode).toBe(200);
  });

  it('junk ids all share one allowance instead of each getting their own', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      statuses.push((await call(rewrite as Handler, { text: 'x' }, { 'x-anonymous-id': `bad id ${i}!` }, `192.0.2.${i}`)).statusCode);
    }
    expect(statuses.filter((s) => s === 200)).toHaveLength(5);
  });
});

describe('rewrite: input size', () => {
  it('a whole page is refused before the model is called', async () => {
    const res = await call(rewrite as Handler, { text: 'x'.repeat(10_001) }, { 'x-anonymous-id': randomId() });
    expect(res.statusCode).toBe(400);
    expect(model.calls).toBe(0);
  });
});

describe('proactive check: clean text is no longer free and unlimited', () => {
  it('free accounts: capped at 300 a day even when nothing is found (which never touched the grammar limit)', async () => {
    let ok = 0;
    for (let i = 0; i < 320; i++) if ((await call(proactive as Handler, { text: 'All good here.' }, { authorization: 'Bearer free' })).statusCode === 200) ok++;
    expect(ok).toBe(300);
    expect(model.calls).toBe(300);
  });

  it('anonymous callers rotating ids: capped per address', async () => {
    let ok = 0;
    for (let i = 0; i < 650; i++) if ((await call(proactive as Handler, { text: 'All good here.' }, { 'x-anonymous-id': randomId() })).statusCode === 200) ok++;
    expect(ok).toBe(600);
  });

  it('Pro is not capped', async () => {
    for (let i = 0; i < 320; i++) await call(proactive as Handler, { text: 'All good.' }, { authorization: 'Bearer pro' });
    expect(model.calls).toBe(320);
  });
});

describe('spend is logged and the daily budget is enforced', () => {
  it.each([
    ['rewrite', rewrite, 'rewrite'],
    ['grammar', grammar, 'grammar'],
    ['proactive', proactive, 'proactive_check'],
  ] as const)('%s logs its tokens under its own feature', async (_n, handler, feature) => {
    await call(handler as Handler, { text: 'Some text.' }, { 'x-anonymous-id': randomId() });
    expect(logged).toEqual([expect.objectContaining({ feature, usage: expect.objectContaining({ inputTokens: 100, outputTokens: 50 }) })]);
  });

  it('a call that fails after the model answered is still logged (and not counted against the user)', async () => {
    model.fail = true;
    const id = randomId();
    const res = await call(rewrite as Handler, { text: 'Some text.' }, { 'x-anonymous-id': id });
    expect(res.statusCode).toBe(500);
    expect(logged).toHaveLength(1);
    expect(usageRows.get(`anon:${id}`)).toBeUndefined();
    expect(usageRows.size).toBe(0);
  });

  it('when the budget is used up, free and anonymous calls pause; Pro goes on', async () => {
    budget.exhausted = true;
    for (const handler of [rewrite, grammar, proactive]) {
      const res = await call(handler as Handler, { text: 'Some text.' }, { 'x-anonymous-id': randomId() });
      expect(res.statusCode).toBe(402);
      expect(res.body).toMatchObject({ code: 'LIMIT_REACHED', requirePayment: true, requireLogin: false });
      expect((await call(handler as Handler, { text: 'Some text.' }, { authorization: 'Bearer free' })).statusCode).toBe(402);
      expect((await call(handler as Handler, { text: 'Some text.' }, { authorization: 'Bearer pro' })).statusCode).toBe(200);
    }
    expect(model.calls).toBe(3);
  });
});
