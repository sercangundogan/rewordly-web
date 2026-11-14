/**
 * Live check quality against the real models (checker + judge). Spends OpenAI tokens, so it is not part
 * of `npm test`: run it with `npm run eval:live` after changing a prompt or a model (needs OPENAI_API_KEY,
 * e.g. `set -a; source .env.local; set +a`). 31 sentences × EVAL_RUNS (default 3), about 100 calls and
 * $0.01 per run; it prints the time per check, the number of calls and the cost.
 *
 * Every sentence is checked EVAL_RUNS times because the models are not deterministic: a mistake found
 * 2 times out of 3 is still one users will see missing. EVAL_SET=clean runs the false-alarm set instead;
 * EVAL_CONCURRENCY (default 8) limits the requests in flight so the timings are not skewed by rate limits.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({ in: () => ({ gte: async () => ({ data: [], error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
  }),
}));

interface Case {
  text: string;
  /** Words that must be underlined; [] means the sentence is clean and nothing may be underlined. */
  flag: string[];
}

const CASES: Case[] = [
  // Reported by users.
  { text: 'Heyyyy there, thanks for the things.', flag: ['Heyyyy'] },
  { text: 'Benlikk bir şey kaldı mı burdsa?', flag: ['Benlikk', 'burdsa'] },
  { text: 'Benlikk bir şey kaldı mı burada?', flag: ['Benlikk'] },
  { text: 'Belikk bir şey kaldı mı burada?', flag: ['Belikk'] },
  { text: 'Bir şey kaldı mı burdsa?', flag: ['burdsa'] },
  // Obvious typos, several per sentence.
  { text: 'I relly like this, but teh price is high.', flag: ['relly', 'teh'] },
  { text: 'Can you sendd me the fille today?', flag: ['sendd', 'fille'] },
  { text: 'She dont know were the keys are.', flag: ['dont', 'were'] },
  { text: 'Bu akşam sinemya gidelim mi?', flag: ['sinemya'] },
  { text: 'Yarın toplantıya gelicek misin?', flag: ['gelicek'] },
  { text: 'Toplantı saat üçte başlıycak, lütfen geç kalmayın.', flag: ['başlıycak'] },
  { text: 'Cok teşekkür ederim, yardımın için.', flag: ['Cok'] },
  { text: 'Merhabaa, dosyayı gönderdimm.', flag: ['Merhabaa', 'gönderdimm'] },
  { text: 'Thanks for youre help with the reportt.', flag: ['youre', 'reportt'] },
  // Clean: nothing may be underlined.
  { text: "PR'ı review ettim, staging'e deploy edebiliriz.", flag: [] },
  { text: 'Bilginize sunarım.', flag: [] },
  { text: 'gonna grab lunch, wanna come?', flag: [] },
  { text: "lol that's kinda funny", flag: [] },
  { text: 'Hey there, thanks for the help.', flag: [] },
  { text: 'Toplantıyı yarına erteleyelim mi?', flag: [] },
  { text: "Ahmet'e söyledim, @mehmet de biliyor.", flag: [] },
  { text: 'Can you send me the file today?', flag: [] },
  { text: 'Sabah erkenden yola çıktık.', flag: [] },
  { text: 'Bende bir şey kalmadı, sen al.', flag: [] },
  { text: 'Merge request hazır, CI yeşil.', flag: [] },
  // A name or brand starting the sentence (the model sees it lowercased, see lowerStart in lib/check/locate.ts).
  { text: 'Ahmet yarın gelcek mi?', flag: ['gelcek'] },
  { text: 'Mehmet toplantıya geldi.', flag: [] },
  { text: 'Vercel deploy tamamlandı.', flag: [] },
  { text: 'Ankara’ya yarın gidiyoruz.', flag: [] },
  { text: 'London is lovely in spring.', flag: [] },
  { text: 'Google Docs açılmıyor, bakar mısın?', flag: [] },
];

/**
 * EVAL_SET=clean: only correct sentences, to measure false alarms on their own (formal and casual text,
 * tech terms, names, and pairs that are easy to "correct" wrongly, such as Turkish de/da and ki).
 */
const CLEAN_CASES: Case[] = [
  'Ben de geliyorum, beni bekleyin.',
  'Evde kimse yok, anahtar bende.',
  'Sen de mi oradaydın?',
  'Kitap masada duruyor.',
  'Öyle bir yağmur yağdı ki her yer sular altında kaldı.',
  'Seninki daha güzel olmuş.',
  'Herkes geldi, bir tek o gelmedi.',
  "Yarın saat 14.30'da müsait misiniz?",
  'Gereğini bilgilerinize arz ederim.',
  'Ekteki dosyayı incelemenizi rica ederim.',
  'Abi ya çok yoruldum bugün.',
  'Tamamdır, hallederim.',
  'Aynen, bence de öyle.',
  "Branch'i rebase ettim, conflict kalmadı.",
  "Sprint planning yarın sabah 10'da.",
  'Fatura TL olarak mı kesilecek, USD mi?',
  "İstanbul'dan İzmir'e uçakla gideceğiz.",
  'Ayşe Hanım, toplantı notlarını paylaşır mısınız?',
  "Slack'ten yazdım ama görmedi galiba.",
  'Hiçbir şey anlamadım, tekrar anlatır mısın?',
  'Yalnız kalmak istemiyorum bu akşam.',
  'Herhangi bir sorun olursa haber verin.',
  'Pek çok kişi bu fikre katılıyor.',
  'Teşekkürler, iyi çalışmalar 🙂',
  "Let me know if it's still on its way.",
  "Their team is already there, so they're waiting for us.",
  "I'd rather not, to be honest.",
  "Who's coming to dinner, and whose car are we taking?",
  'The data shows that fewer people signed up this week.',
  'ngl that movie was pretty mid',
  'brb, grabbing coffee',
  'Could you please review the attached proposal by Friday?',
  'We shipped v2.3.1 yesterday; the changelog is on GitHub.',
  "I'm at the café near St. Paul's, see you at 5 p.m.",
  "Thanks, Priya! Zoltán said he'd handle the rest.",
  'It affects everyone, and the effect is huge.',
  "You're right, your idea was better than mine.",
  'ok cool, see u tmrw',
  'Please find the invoice attached.',
  "The kids' toys are everywhere, but it's fine.",
].map((text) => ({ text, flag: [] }));

const SET = process.env.EVAL_SET === 'clean' ? CLEAN_CASES : CASES;
const RUNS = Math.max(1, Number(process.env.EVAL_RUNS) || 3);
const CONCURRENCY = Math.max(1, Number(process.env.EVAL_CONCURRENCY) || 8);

function average(values: number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) / (values.length || 1));
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

describe.skipIf(!process.env.OPENAI_API_KEY)('live check against the real models', () => {
  it('finds every obvious mistake and leaves clean sentences alone', async () => {
    const missed: string[] = [];
    const wrong: string[] = [];
    const failed: string[] = [];
    let expected = 0;
    let found = 0;

    // One request per case and run, each from an empty cache (fresh module), a few at a time.
    const { costUsd, LIVE_CHECK_PRICE_FACTOR } = await import('../../lib/check/costs');
    const { LIVE_CHECK_MODEL, JUDGE_MODEL } = await import('../../lib/check/llm');
    const totals: number[] = [];
    const checkerTimes: number[] = [];
    const judgeTimes: number[] = [];
    let calls = 0;
    let spentUsd = 0;
    const todo = SET.flatMap((c) => Array.from({ length: RUNS }, (_, run) => ({ c, run })));
    const done: Array<{ c: Case; run: number; issues: Array<{ original: string; replacements: string[] }> }> = [];
    const worker = async () => {
      for (let job = todo.shift(); job; job = todo.shift()) {
        const { c, run } = job;
        vi.resetModules();
        const { checkWithModel } = await import('../../lib/check/llm');
        try {
          const { results, usage, judge, timing } = await checkWithModel([{ id: 'a', text: c.text }]);
          totals.push(timing.checkerMs + timing.judgeMs);
          checkerTimes.push(timing.checkerMs);
          calls += timing.attempts;
          spentUsd += costUsd(LIVE_CHECK_MODEL, usage, LIVE_CHECK_PRICE_FACTOR);
          // The judge only runs for grammar and punctuation suggestions.
          if (judge) {
            judgeTimes.push(timing.judgeMs);
            calls++;
            spentUsd += costUsd(judge.model, judge.usage, LIVE_CHECK_PRICE_FACTOR);
          }
          done.push({ c, run, issues: results[0]!.issues });
        } catch (error) {
          // The user sees nothing for this sentence (the extension retries later): count it, don't abort.
          failed.push(`#${run} ${JSON.stringify(c.text)}: ${error instanceof Error ? error.message : error}`);
          done.push({ c, run, issues: [] });
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    console.log(
      `checker ${LIVE_CHECK_MODEL}, judge ${JUDGE_MODEL}, set ${process.env.EVAL_SET === 'clean' ? 'clean' : 'default'}, ${RUNS} runs\n` +
        `time per check: average ${average(totals)} ms, median ${median(totals)} ms, slowest ${Math.max(0, ...totals)} ms\n` +
        `checker: average ${average(checkerTimes)} ms; judge: ${judgeTimes.length} runs, average ${average(judgeTimes)} ms\n` +
        `calls ${calls}, cost $${spentUsd.toFixed(4)} (failed requests not counted)`
    );
    for (const { c, run, issues } of done) {
      const got = issues.map((i) => i.original.toLowerCase());
      for (const word of c.flag) {
        expected++;
        if (got.includes(word.toLowerCase())) found++;
        else missed.push(`#${run} ${JSON.stringify(c.text)}: missed "${word}"`);
      }
      for (const issue of issues) {
        if (!c.flag.some((w) => w.toLowerCase() === issue.original.toLowerCase())) {
          wrong.push(`#${run} ${JSON.stringify(c.text)}: "${issue.original}" -> "${issue.replacements[0]}"`);
        }
      }
    }

    console.log(`recall ${found}/${expected}`);
    console.log(`missed (${missed.length}):\n  ${missed.join('\n  ')}`);
    console.log(`unexpected (${wrong.length}):\n  ${wrong.join('\n  ')}`);
    console.log(`failed requests (${failed.length}):\n  ${failed.join('\n  ')}`);
    // A few misses across all runs are tolerated (the models are not deterministic); a regression is not.
    expect(expected === 0 ? 1 : found / expected).toBeGreaterThanOrEqual(Number(process.env.EVAL_MIN_RECALL) || 0.9);
    expect(wrong.length).toBeLessThanOrEqual(Number(process.env.EVAL_MAX_UNEXPECTED) || 2);
  }, 600_000);
});
