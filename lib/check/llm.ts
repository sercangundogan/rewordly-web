import OpenAI from 'openai';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import { approved, type JudgeVerdict } from './judge';
import { locateIssues } from './locate';
import type { TokenUsage } from './costs';
import type { CheckParagraph, CheckParagraphResult, RawIssue } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Live checks run on every typing pause, so they always use the fast model. */
export const LIVE_CHECK_MODEL = 'gpt-4o-mini';

/** Bump when the prompt or output format changes: it is part of every cache key. */
const PROMPT_VERSION = '5';

/**
 * Second pass. The fast model finds candidate mistakes, then this model confirms each one
 * before it is shown. Alone, a bigger checker does not help (measured: it over-corrects just
 * as much); a judge that only sees the suggestions and is told to reject when in doubt does.
 * Only sentences that have suggestions are judged, which is a minority.
 * LIVE_CHECK_JUDGE_MODEL=off turns it off; any other chat model id replaces the default.
 */
export const JUDGE_MODEL = process.env.LIVE_CHECK_JUDGE_MODEL || 'gpt-5-mini';
const JUDGE_ENABLED = JUDGE_MODEL !== 'off';

const JUDGE_PROMPT = `You review proposed corrections to text a user wrote. Input: {"items":[{"id","text","edits":[{"i","o","r","m"}]}]} where o is the original word(s) and r the suggested replacement.
For every edit answer keep=true only if o is definitely wrong in the text's language and r is the right fix.
Answer keep=false if: o is a valid word or form in its language (including formal or polite forms, e.g. Turkish "Bilginize"); o is a loanword, technical term or jargon used on purpose (e.g. English tech words such as review, merge, staging, push, PR, deploy inside Turkish text, even with Turkish suffixes); o is a name, handle, brand or abbreviation; or the change is only style, tone or preference.
When in doubt, keep=false.`;

const JUDGE_SCHEMA = {
  name: 'judge',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['v'],
    properties: {
      v: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'i', 'keep'],
          properties: { id: { type: 'string' }, i: { type: 'integer' }, keep: { type: 'boolean' } },
        },
      },
    },
  },
} as const;

// Kept short on purpose: this prompt (plus the schema) is paid for on every request,
// and typical inputs are a sentence or two.
const SYSTEM_PROMPT = `You proofread text a user is typing, like Grammarly. Input: {"p":[{"id","text"}]}.
For each item detect its language and list only CLEAR mistakes:
spelling (typos, and missing diacritics or special letters such as ç ğ ı ö ş ü ß é, even in casual text), grammar (agreement, tense, word form, missing/extra words, articles, prepositions), punctuation (clearly wrong or missing, e.g. "dont").
Never flag: style, tone, word choice, preferences; names, brands, @mentions, #tags, URLs, emails, code, numbers, emoji; slang, informal words or casual chat style (kinda, gonna, wanna, gotta, lol, u, lowercase starts); a missing final period. When unsure, skip it.
Per issue: o = the wrong word(s) copied exactly, whole words only; b = the 1-4 words right before o, copied exactly ("" at start); r = replacement for o; m = the reason, max 8 words, same language as the text (e.g. "subject-verb agreement", never the corrected text), "" for obvious typos; t = "spelling"|"grammar"|"punctuation".
Return every id once, in order; issues [] when clean.`;

const RESPONSE_SCHEMA = {
  name: 'live_check',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['r'],
    properties: {
      r: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['id', 'lang', 'issues'],
          properties: {
            id: { type: 'string' },
            lang: { type: 'string' },
            issues: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['o', 'b', 'r', 'm', 't'],
                properties: {
                  o: { type: 'string' },
                  b: { type: 'string' },
                  r: { type: 'string' },
                  m: { type: 'string' },
                  t: { type: 'string', enum: ['spelling', 'grammar', 'punctuation'] },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

/**
 * A check that failed after the model was already paid for (a looping answer, an unusable one, a
 * judge that did not answer). Carries the tokens spent so the caller can still log them: a failure
 * that costs money but never reaches the budget guard would be a hole in it.
 */
export class CheckFailure extends Error {
  constructor(
    message: string,
    readonly usage: TokenUsage,
    readonly judge?: { model: string; usage: TokenUsage }
  ) {
    super(message);
    this.name = 'CheckFailure';
  }
}

/** Past this, another attempt is not started: the platform would cut the request off and the spend would go unlogged. */
const ATTEMPTS_DEADLINE_MS = 20_000;

interface ModelOutput {
  r: Array<{ id: string; lang: string; issues: Array<{ o: string; b: string; r: string; m: string; t: RawIssue['type'] }> }>;
}

type CachedResult = Omit<CheckParagraphResult, 'id'>;

function cacheKey(text: string): string {
  // The judge is part of the key: results checked by a different judge (or none) are not reused.
  return createHash('sha1').update(`${PROMPT_VERSION}\n${LIVE_CHECK_MODEL}\n${JUDGE_ENABLED ? JUDGE_MODEL : 'nojudge'}\n${text}`).digest('hex');
}

/**
 * How long a cached answer is served. After that it is checked again (and the row rewritten), so a
 * wrong answer cannot live forever and a better model or prompt shows up on its own.
 * supabase-live-check.sql removes the expired rows (purge_check_cache).
 */
export const CACHE_TTL_DAYS = Math.max(1, Number(process.env.CHECK_CACHE_TTL_DAYS) || 30);
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
/** Per-instance memory never outlives this, so every instance follows the shared cache within hours. */
const MEMORY_TTL_MS = Math.min(CACHE_TTL_MS, 6 * 60 * 60 * 1000);

/** Per-instance memory in front of the shared Supabase cache. */
const MEMORY_LIMIT = 2000;
const memory = new Map<string, { value: CachedResult; at: number }>();

function remember(key: string, value: CachedResult, at = Date.now()): void {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next();
    if (!oldest.done) memory.delete(oldest.value);
  }
  memory.set(key, { value, at });
}

function recall(key: string): CachedResult | undefined {
  const hit = memory.get(key);
  if (!hit) return undefined;
  if (Date.now() - hit.at > MEMORY_TTL_MS) {
    memory.delete(key);
    return undefined;
  }
  return hit.value;
}

async function readSharedCache(keys: string[]): Promise<Map<string, CachedResult>> {
  const found = new Map<string, CachedResult>();
  if (keys.length === 0) return found;
  const { data, error } = await getSupabaseAdmin()
    .from('check_cache')
    .select('key, result')
    .in('key', keys)
    .gte('created_at', new Date(Date.now() - CACHE_TTL_MS).toISOString());
  if (error) {
    console.error('check_cache read failed (has supabase-live-check.sql been run?):', error.message);
    return found;
  }
  for (const row of (data ?? []) as Array<{ key: string; result: CachedResult }>) found.set(row.key, row.result);
  return found;
}

async function writeSharedCache(entries: Array<{ key: string; result: CachedResult }>): Promise<void> {
  if (entries.length === 0) return;
  // created_at is rewritten on purpose: an expired row that is checked again starts a new life.
  const createdAt = new Date().toISOString();
  const rows = entries.map((e) => ({ ...e, created_at: createdAt }));
  const { error } = await getSupabaseAdmin().from('check_cache').upsert(rows, { onConflict: 'key' });
  if (error) console.error('check_cache write failed:', error.message);
}

export interface CheckOutcome {
  results: CheckParagraphResult[];
  /** Paragraphs that need a model call (not cached anywhere). */
  pending: CheckParagraph[];
}

/** Resolves what can be answered from cache. Never calls the model. */
export async function lookupCached(paragraphs: CheckParagraph[]): Promise<CheckOutcome> {
  const keys = paragraphs.map((p) => cacheKey(p.text));
  const missing = keys.filter((k) => !recall(k));
  const shared = await readSharedCache(missing);
  shared.forEach((value, key) => remember(key, value));

  const results: CheckParagraphResult[] = [];
  const pending: CheckParagraph[] = [];
  paragraphs.forEach((p, i) => {
    const hit = recall(keys[i]!);
    if (hit) results.push({ id: p.id, ...hit });
    else pending.push(p);
  });
  return { results, pending };
}

/** Checks uncached paragraphs with the model, caches the results and reports token usage. Failures are CheckFailure. */
export async function checkWithModel(
  paragraphs: CheckParagraph[]
): Promise<{ results: CheckParagraphResult[]; usage: TokenUsage; judge?: { model: string; usage: TokenUsage } }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }
  const usage: TokenUsage = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
  const judgeSpent: { value: { model: string; usage: TokenUsage } | undefined } = { value: undefined };
  try {
    return await runCheck(paragraphs, usage, judgeSpent);
  } catch (error) {
    throw new CheckFailure(error instanceof Error ? error.message : 'Check failed', usage, judgeSpent.value);
  }
}

async function runCheck(
  paragraphs: CheckParagraph[],
  usage: TokenUsage,
  judgeSpent: { value: { model: string; usage: TokenUsage } | undefined }
): Promise<{ results: CheckParagraphResult[]; usage: TokenUsage; judge?: { model: string; usage: TokenUsage } }> {

  // The model sometimes repeats the same result object until it runs out of tokens, which leaves broken
  // JSON (seen on short inputs, about one call in forty, and the same input does it again at temperature 0).
  // So: a token cap that fits the input (a loop ends early and cheap), and up to two more tries a little
  // less deterministic. Every attempt's tokens are counted.
  let output: ModelOutput | null = null;
  const started = Date.now();
  try {
    for (let attempt = 0; attempt < 3 && !output; attempt++) {
      if (attempt > 0 && Date.now() - started > ATTEMPTS_DEADLINE_MS) break;
      const completion = await openai.chat.completions.create(
        {
          model: LIVE_CHECK_MODEL,
          temperature: attempt === 0 ? 0 : 0.3,
          max_tokens: Math.min(3000, 400 + 200 * paragraphs.length),
          response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: JSON.stringify({ p: paragraphs }) },
          ],
        },
        { timeout: 20000, maxRetries: 1 }
      );
      usage.inputTokens += completion.usage?.prompt_tokens ?? 0;
      usage.cachedInputTokens += completion.usage?.prompt_tokens_details?.cached_tokens ?? 0;
      usage.outputTokens += completion.usage?.completion_tokens ?? 0;
      const choice = completion.choices[0];
      if (choice?.finish_reason === 'length') continue;
      try {
        output = JSON.parse(choice?.message?.content ?? '') as ModelOutput;
      } catch {
        // broken JSON: ask again
      }
    }
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
  if (!output) throw new Error('The model returned unusable output');

  const staged: Array<{ p: CheckParagraph; value: CachedResult }> = [];
  const results: CheckParagraphResult[] = [];
  for (const p of paragraphs) {
    const modelResult = output.r.find((r) => r.id === p.id);
    // A paragraph the model skipped is reported clean but not cached, so it is retried next time.
    if (!modelResult) {
      results.push({ id: p.id, language: '', issues: [] });
      continue;
    }
    const raw: RawIssue[] = modelResult.issues.map((i) => ({
      original: i.o,
      before: i.b,
      replacement: i.r,
      message: i.m,
      type: i.t,
    }));
    staged.push({ p, value: { language: modelResult.lang.toLowerCase().slice(0, 5), issues: locateIssues(p.text, raw) } });
  }

  // Second pass. If it fails the whole request fails (the extension retries later): never show, or cache,
  // suggestions that were not confirmed.
  let judge: { model: string; usage: TokenUsage } | undefined;
  const toJudge = staged.filter((s) => s.value.issues.length > 0);
  if (JUDGE_ENABLED && toJudge.length > 0) {
    const judged = await judgeIssues(toJudge.map((s) => ({ id: s.p.id, text: s.p.text, edits: s.value.issues.map((x, i) => ({ i, o: x.original, r: x.replacements[0] ?? '', m: x.message })) })), (spent) => {
      // Known as soon as the reply arrives, so it is still reported when the reply turns out to be unusable.
      judgeSpent.value = { model: JUDGE_MODEL, usage: spent };
    });
    judge = { model: JUDGE_MODEL, usage: judged.usage };
    for (const s of toJudge) s.value.issues = approved(s.p.id, s.value.issues, judged.verdicts);
  }

  const toCache: Array<{ key: string; result: CachedResult }> = [];
  for (const { p, value } of staged) {
    const key = cacheKey(p.text);
    remember(key, value);
    toCache.push({ key, result: value });
    results.push({ id: p.id, ...value });
  }
  await writeSharedCache(toCache);

  return { results, usage, ...(judge ? { judge } : {}) };
}

async function judgeIssues(
  items: Array<{ id: string; text: string; edits: Array<{ i: number; o: string; r: string; m: string }> }>,
  spent: (usage: TokenUsage) => void
): Promise<{ verdicts: JudgeVerdict[]; usage: TokenUsage }> {
  const reasoning = JUDGE_MODEL.startsWith('gpt-5') || JUDGE_MODEL.startsWith('o');
  try {
    const completion = await openai.chat.completions.create(
      {
        model: JUDGE_MODEL,
        ...(reasoning ? { reasoning_effort: 'minimal', max_completion_tokens: 2000 } : { temperature: 0, max_tokens: 1000 }),
        response_format: { type: 'json_schema', json_schema: JUDGE_SCHEMA },
        messages: [
          { role: 'system', content: JUDGE_PROMPT },
          { role: 'user', content: JSON.stringify({ items }) },
        ],
      } as Parameters<typeof openai.chat.completions.create>[0],
      { timeout: 20000, maxRetries: 1 }
    ) as OpenAI.Chat.Completions.ChatCompletion;
    const usage: TokenUsage = {
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      cachedInputTokens: completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
    spent(usage);
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No response received from the judge');
    const verdicts = (JSON.parse(raw) as { v?: JudgeVerdict[] }).v;
    if (!Array.isArray(verdicts)) throw new Error('The judge returned unusable output');
    return { verdicts, usage };
  } catch (error) {
    if (error instanceof OpenAI.APIError) throw new Error(`OpenAI judge error: ${error.message}`);
    throw error;
  }
}
