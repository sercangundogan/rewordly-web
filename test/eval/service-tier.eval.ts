/**
 * Does OpenAI's Fast mode (service_tier "priority", twice the price) make the live check faster?
 * Every sentence is checked with both tiers back to back, in alternating order, so the time of day
 * affects both the same. Spends OpenAI tokens: it only runs with EVAL_TIERS=1, e.g.
 *   set -a; source .env.local; set +a; EVAL_TIERS=1 npx vitest run --config vitest.eval.config.ts test/eval/service-tier.eval.ts
 * 24 sentences × EVAL_RUNS (default 3) × 2 tiers, about 150 calls and $0.015.
 */
import { describe, expect, it, vi } from 'vitest';

import type { AsyncLocalStorage } from 'node:async_hooks';

/** Set up by the openai mock below (a mock factory may not use variables of this file). */
interface Shared {
  tier: AsyncLocalStorage<string>;
  served: Array<{ asked: string; got: string }>;
}
const shared = () => (globalThis as unknown as { __serviceTierEval: Shared }).__serviceTierEval;

// The real client; only the service tier of the request is set, from the tier the check runs under.
vi.mock('openai', async (importActual) => {
  const actual = await importActual<typeof import('openai')>();
  const Real = actual.default;
  const { AsyncLocalStorage: Storage } = await import('node:async_hooks');
  const state: Shared = { tier: new Storage<string>(), served: [] };
  (globalThis as unknown as { __serviceTierEval: Shared }).__serviceTierEval = state;
  class Patched extends Real {
    constructor(options?: ConstructorParameters<typeof Real>[0]) {
      super(options);
      const completions = this.chat.completions as unknown as { create: (params: Record<string, unknown>, options?: unknown) => Promise<any> };
      const create = completions.create.bind(completions);
      completions.create = async (params, requestOptions) => {
        const asked = state.tier.getStore() ?? 'default';
        const completion = await create(asked === 'default' ? params : { ...params, service_tier: asked }, requestOptions);
        state.served.push({ asked, got: String(completion.service_tier) });
        return completion;
      };
    }
  }
  return { ...actual, default: Patched };
});

vi.mock('../../lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({ in: () => ({ gte: async () => ({ data: [], error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  }),
}));

const SENTENCES = [
  'I relly like this, but teh price is high.',
  'Can you sendd me the fille today?',
  'She dont know were the keys are.',
  'Thanks for youre help with the reportt.',
  'He go to work every day by bus.',
  'Their going to the meeting tomorow morning.',
  'Could you please review the attached proposal by Friday?',
  'We shipped v2.3.1 yesterday; the changelog is on GitHub.',
  'The data shows that fewer people signed up this week.',
  "I'd rather not, to be honest.",
  'ok cool, see u tmrw',
  'Please find the invoice attached and let me know if anything is missing from it.',
  'Benlikk bir şey kaldı mı burdsa?',
  'Bu akşam sinemya gidelim mi?',
  'Toplantı saat üçte başlıycak, lütfen geç kalmayın.',
  'Merhabaa, dosyayı gönderdimm.',
  'Yarın toplantıya gelicek misin?',
  'Cok teşekkür ederim, yardımın için.',
  'Ekteki dosyayı incelemenizi rica ederim.',
  'Öyle bir yağmur yağdı ki her yer sular altında kaldı.',
  "Branch'i rebase ettim, conflict kalmadı.",
  'Yalnız kalmak istemiyorum bu akşam.',
  'Ben de geliyorum, beni bekleyin.',
  'Hiçbir şey anlamadım, tekrar anlatır mısın?',
];

const RUNS = Math.max(1, Number(process.env.EVAL_RUNS) || 3);
const CONCURRENCY = Math.max(1, Number(process.env.EVAL_CONCURRENCY) || 4);
const TIERS = ['default', 'priority'] as const;
/** Fast mode costs twice the standard rate for gpt-6-luna (OpenAI pricing page, 2026-11-13). */
const PRICE_FACTOR = { default: 1, priority: 2 };

function stats(values: number[]): string {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const average = Math.round(sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1));
  return `n ${sorted.length}, average ${average} ms, median ${at(0.5)} ms, p90 ${at(0.9)} ms, fastest ${sorted[0] ?? 0} ms, slowest ${at(1)} ms`;
}

describe.skipIf(!process.env.OPENAI_API_KEY || !process.env.EVAL_TIERS)('service tier: standard against Fast mode', () => {
  it('measures the time and the cost of both tiers on the same sentences', async () => {
    const { costUsd } = await import('../../lib/check/costs');
    const { LIVE_CHECK_MODEL } = await import('../../lib/check/llm');
    const checker = { default: [] as number[], priority: [] as number[] };
    const judge = { default: [] as number[], priority: [] as number[] };
    const spent = { default: 0, priority: 0 };
    const pairs: number[] = [];
    const failed: string[] = [];
    let calls = 0;

    const todo = SENTENCES.flatMap((text, s) => Array.from({ length: RUNS }, (_, run) => ({ text, first: (s + run) % 2 })));
    const worker = async () => {
      for (let job = todo.shift(); job; job = todo.shift()) {
        const took: Partial<Record<(typeof TIERS)[number], number>> = {};
        for (const name of job.first === 0 ? TIERS : [...TIERS].reverse()) {
          vi.resetModules();
          const { checkWithModel } = await import('../../lib/check/llm');
          try {
            const result = await shared().tier.run(name, () => checkWithModel([{ id: 'a', text: job!.text }]));
            checker[name].push(result.timing.checkerMs);
            calls += result.timing.attempts;
            spent[name] += PRICE_FACTOR[name] * costUsd(LIVE_CHECK_MODEL, result.usage);
            if (result.judge) {
              judge[name].push(result.timing.judgeMs);
              calls++;
              spent[name] += PRICE_FACTOR[name] * costUsd(result.judge.model, result.judge.usage);
            }
            took[name] = result.timing.checkerMs + result.timing.judgeMs;
          } catch (error) {
            failed.push(`${name} ${JSON.stringify(job.text)}: ${error instanceof Error ? error.message : error}`);
          }
        }
        if (took.default !== undefined && took.priority !== undefined) pairs.push(took.default - took.priority);
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const got = (asked: string) => {
      const counts = new Map<string, number>();
      for (const s of shared().served.filter((x) => x.asked === asked)) counts.set(s.got, (counts.get(s.got) ?? 0) + 1);
      return Array.from(counts, ([name, n]) => `${name} × ${n}`).join(', ');
    };
    const faster = pairs.filter((d) => d > 0).length;
    console.log(
      `model ${LIVE_CHECK_MODEL}, ${SENTENCES.length} sentences × ${RUNS} runs, ${calls} calls\n` +
        `tier the API reports: asked default -> ${got('default')}; asked priority -> ${got('priority')}\n` +
        `checker standard: ${stats(checker.default)}\n` +
        `checker fast:     ${stats(checker.priority)}\n` +
        `judge standard:   ${stats(judge.default)}\n` +
        `judge fast:       ${stats(judge.priority)}\n` +
        `same sentence, standard minus fast: ${stats(pairs)}; fast was quicker in ${faster} of ${pairs.length}\n` +
        `cost standard $${spent.default.toFixed(4)}, fast $${spent.priority.toFixed(4)} (fast counted at twice the standard rate)\n` +
        `failed (${failed.length}):\n  ${failed.join('\n  ')}`
    );
    expect(checker.default.length + checker.priority.length).toBeGreaterThan(0);
  }, 900_000);
});
