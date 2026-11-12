/**
 * Live check quality against the real models (checker + judge). Spends OpenAI tokens, so it is not part
 * of `npm test`: run it with `npm run eval:live` after changing a prompt or a model (needs OPENAI_API_KEY,
 * e.g. `set -a; source .env.local; set +a`). About 25 sentences × EVAL_RUNS, roughly 1-2 cents per run.
 *
 * Every sentence is checked EVAL_RUNS times because the judge (a reasoning model) is not deterministic:
 * a mistake found 2 times out of 3 is still one users will see missing.
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

const RUNS = Math.max(1, Number(process.env.EVAL_RUNS) || 3);

describe.skipIf(!process.env.OPENAI_API_KEY)('live check against the real models', () => {
  it('finds every obvious mistake and leaves clean sentences alone', async () => {
    const missed: string[] = [];
    const wrong: string[] = [];
    const failed: string[] = [];
    let expected = 0;
    let found = 0;

    // One request per case and run, all in parallel: each starts from an empty cache (fresh module).
    const jobs = CASES.flatMap((c) =>
      Array.from({ length: RUNS }, async (_, run) => {
        vi.resetModules();
        const { checkWithModel } = await import('../../lib/check/llm');
        try {
          const { results } = await checkWithModel([{ id: 'a', text: c.text }]);
          return { c, run, issues: results[0]!.issues };
        } catch (error) {
          // The user sees nothing for this sentence (the extension retries later): count it, don't abort.
          failed.push(`#${run} ${JSON.stringify(c.text)}: ${error instanceof Error ? error.message : error}`);
          return { c, run, issues: [] };
        }
      })
    );
    for (const { c, run, issues } of await Promise.all(jobs)) {
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
    expect(found / expected).toBeGreaterThanOrEqual(Number(process.env.EVAL_MIN_RECALL) || 0.9);
    expect(wrong.length).toBeLessThanOrEqual(Number(process.env.EVAL_MAX_UNEXPECTED) || 2);
  }, 600_000);
});
