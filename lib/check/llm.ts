import OpenAI from 'openai';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import { afterResponse } from './after';
import { approved, type JudgeVerdict } from './judge';
import { locateIssues, lowerStart, restoreStart } from './locate';
import { LIVE_CHECK_SERVICE_TIER, type TokenUsage } from './costs';
import type { CheckParagraph, CheckParagraphResult, RawIssue } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Live checks run on every typing pause, so they always use the fast model (reasoning off). */
export const LIVE_CHECK_MODEL = 'gpt-6-luna';

/** Bump when the prompt, the output format or the judge rule changes: it is part of every cache key. */
const PROMPT_VERSION = '7';

/**
 * Second pass. The fast model finds candidate mistakes, then this model confirms the grammar and
 * punctuation ones before they are shown; spelling fixes are shown as they are (see needsJudge).
 * Measured on 2026-11-13 with `npm run eval:live`: without a judge the checker raised a false alarm on
 * about 3% of clean sentences, all of them grammar or punctuation; judging every suggestion removed
 * them but cost a second call (about 1 s) on every sentence with a typo and rejected a real typo once.
 * LIVE_CHECK_JUDGE_MODEL=off turns it off; any other chat model id replaces the default.
 */
export const JUDGE_MODEL = process.env.LIVE_CHECK_JUDGE_MODEL || 'gpt-6-luna';
const JUDGE_ENABLED = JUDGE_MODEL !== 'off';

/** Spelling fixes skip the judge: they are the bulk of what users wait for, and the checker gets them right. */
function needsJudge(issue: { type: RawIssue['type'] }): boolean {
  return issue.type !== 'spelling';
}

/**
 * Request fields that differ by model family: gpt-6 and gpt-5.x take reasoning effort `none`, the first
 * gpt-5 models and the o-series only go down to `minimal`, older chat models have no reasoning at all.
 */
function modelParams(model: string, maxTokens: number): Record<string, unknown> {
  if (/^gpt-(6|5\.)/.test(model)) return { reasoning_effort: 'none', max_completion_tokens: maxTokens };
  if (model.startsWith('gpt-5') || model.startsWith('o')) return { reasoning_effort: 'minimal', max_completion_tokens: maxTokens };
  return { temperature: 0, max_tokens: maxTokens };
}

const JUDGE_PROMPT = `You review proposed corrections to text a user wrote. Input: {"items":[{"id","text","edits":[{"i","o","r","m"}]}]} where o is the original word(s) and r the suggested replacement.
For every edit answer keep=true only if o is definitely wrong in the text's language and r is the right fix.
A misspelled word is always definitely wrong, also in casual text: keep=true when o is not a word of the language (extra, missing, swapped or stretched letters, e.g. "recieve", "yarınn", "toplantıa", "Hellooo"; missing diacritics, e.g. Turkish "tesekkur") and r is the word the writer meant. That is never style or slang.
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
spelling (typos, stretched letters like "heyyyy", and missing diacritics or special letters such as ç ğ ı ö ş ü ß é, even in casual text), grammar (agreement, tense, word form, missing/extra words, articles, prepositions), punctuation (clearly wrong or missing, e.g. "dont").
Never flag: style, tone, word choice, preferences; names, brands, @mentions, #tags, URLs, emails, code, numbers, emoji; slang, informal words or casual chat style (kinda, gonna, wanna, gotta, lol, u, lowercase starts); a missing final period. When unsure, skip it.
Per issue: o = the wrong word(s) copied exactly, whole words only; b = the 1-4 words right before o, copied exactly ("" at start); r = replacement for o; m = the reason, max 8 words, same language as the text (e.g. "subject-verb agreement", never the corrected text), "" for obvious typos; t = "spelling"|"grammar"|"punctuation".
Read every word: a sentence often has more than one mistake, list each of them.
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
/**
 * All model calls of one request end by then (checker attempts and judge together), which leaves time
 * to log the spend before the platform stops the function (maxDuration in pages/api/check.ts).
 */
const REQUEST_DEADLINE_MS = 45_000;
const CALL_TIMEOUT_MS = 20_000;
/** A judge call is not started with less time than this left: it would only time out, and still be billed. */
const MIN_JUDGE_TIME_MS = 5_000;

/**
 * Request options for every model call. No SDK retries: a retry after a timeout is a second billed call,
 * and our own attempts loop already retries what is worth retrying.
 */
function callOptions(deadline: number): { timeout: number; maxRetries: number } {
  return { timeout: Math.max(1_000, Math.min(CALL_TIMEOUT_MS, deadline - Date.now())), maxRetries: 0 };
}

/**
 * A call that timed out on our side was most likely still run, and billed, by OpenAI, but its usage
 * never reaches us. Count it at a pessimistic estimate (about 3 characters per input token, the full
 * output cap), so the budget guard and ai_usage_log see it. Other errors return null.
 */
export function timedOutUsage(error: unknown, promptChars: number, maxOutputTokens: number): TokenUsage | null {
  if (!(error instanceof OpenAI.APIConnectionTimeoutError)) return null;
  return { inputTokens: Math.ceil(promptChars / 3), cachedInputTokens: 0, outputTokens: maxOutputTokens };
}

function addUsage(total: TokenUsage, more: TokenUsage): void {
  total.inputTokens += more.inputTokens;
  total.cachedInputTokens += more.cachedInputTokens;
  total.outputTokens += more.outputTokens;
}

interface ModelOutput {
  r: Array<{ id: string; lang: string; issues: Array<{ o: string; b: string; r: string; m: string; t: RawIssue['type'] }> }>;
}

type CachedResult = Omit<CheckParagraphResult, 'id'>;

/**
 * The model sometimes answers for the same id more than once: an empty entry first, then one with the
 * mistakes ("Heyyyy there" came back as `[{issues: []}, {issues: [Heyyyy]}]`, every time at temperature 0).
 * Taking the first entry dropped real mistakes, so all entries are merged; locateIssues drops repeats.
 */
export function mergeEntries(entries: ModelOutput['r']): ModelOutput['r'][number] | undefined {
  if (entries.length <= 1) return entries[0];
  return {
    id: entries[0]!.id,
    lang: entries.find((e) => e.lang)?.lang ?? '',
    issues: entries.flatMap((e) => e.issues),
  };
}

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

/** How long the model calls of one request took, for the timing log in pages/api/check.ts. */
export interface ModelTiming {
  /** All checker attempts together. */
  checkerMs: number;
  attempts: number;
  /** 0 when the judge did not run. */
  judgeMs: number;
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
): Promise<{ results: CheckParagraphResult[]; usage: TokenUsage; judge?: { model: string; usage: TokenUsage }; timing: ModelTiming }> {
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
): Promise<{ results: CheckParagraphResult[]; usage: TokenUsage; judge?: { model: string; usage: TokenUsage }; timing: ModelTiming }> {

  // The model sometimes repeats the same result object until it runs out of tokens, which leaves broken
  // JSON (seen with gpt-4o-mini on short inputs, about one call in forty). So: a token cap that fits the
  // input (a loop ends early and cheap), and up to two more tries. Every attempt's tokens are counted.
  let output: ModelOutput | null = null;
  const timing: ModelTiming = { checkerMs: 0, attempts: 0, judgeMs: 0 };
  const started = Date.now();
  const deadline = started + REQUEST_DEADLINE_MS;
  const userContent = JSON.stringify({ p: paragraphs.map((p) => ({ id: p.id, text: lowerStart(p.text) })) });
  const maxTokens = Math.min(3000, 400 + 200 * paragraphs.length);
  try {
    for (let attempt = 0; attempt < 3 && !output; attempt++) {
      if (attempt > 0 && Date.now() - started > ATTEMPTS_DEADLINE_MS) break;
      timing.attempts++;
      let completion: OpenAI.Chat.Completions.ChatCompletion;
      try {
        completion = await openai.chat.completions.create(
          {
            model: LIVE_CHECK_MODEL,
            ...modelParams(LIVE_CHECK_MODEL, maxTokens),
            service_tier: LIVE_CHECK_SERVICE_TIER,
            response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: userContent },
            ],
          } as Parameters<typeof openai.chat.completions.create>[0],
          callOptions(deadline)
        ) as OpenAI.Chat.Completions.ChatCompletion;
      } catch (error) {
        const lost = timedOutUsage(error, SYSTEM_PROMPT.length + JSON.stringify(RESPONSE_SCHEMA).length + userContent.length, maxTokens);
        if (lost) addUsage(usage, lost);
        throw error;
      }
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
  timing.checkerMs = Date.now() - started;
  if (!output) throw new Error('The model returned unusable output');

  const staged: Array<{ p: CheckParagraph; value: CachedResult }> = [];
  const results: CheckParagraphResult[] = [];
  for (const p of paragraphs) {
    const modelResult = mergeEntries(output.r.filter((r) => r.id === p.id));
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
    const language = modelResult.lang.toLowerCase().slice(0, 5);
    // The model saw the sentence with its first capital lowered (see lowerStart): locate there, then map back.
    const shown = lowerStart(p.text);
    staged.push({ p, value: { language, issues: restoreStart(p.text, shown, locateIssues(shown, raw), language) } });
  }

  // Second pass. If it fails the whole request fails (the extension retries later): never show, or cache,
  // suggestions that were not confirmed.
  let judge: { model: string; usage: TokenUsage } | undefined;
  const toJudge = staged.filter((s) => s.value.issues.some(needsJudge));
  if (JUDGE_ENABLED && toJudge.length > 0) {
    if (deadline - Date.now() < MIN_JUDGE_TIME_MS) throw new Error('No time left for the judge');
    const judgeStarted = Date.now();
    // i is the issue's place in the sentence's list, so a verdict finds its issue among the unjudged ones.
    const items = toJudge.map((s) => ({
      id: s.p.id,
      text: s.p.text,
      edits: s.value.issues.map((x, i) => ({ i, o: x.original, r: x.replacements[0] ?? '', m: x.message })).filter((_, i) => needsJudge(s.value.issues[i]!)),
    }));
    const judged = await judgeIssues(items, deadline, (spent) => {
      // Known as soon as the reply arrives, so it is still reported when the reply turns out to be unusable.
      judgeSpent.value = { model: JUDGE_MODEL, usage: spent };
    });
    timing.judgeMs = Date.now() - judgeStarted;
    judge = { model: JUDGE_MODEL, usage: judged.usage };
    for (const s of toJudge) {
      const kept = new Set(approved(s.p.id, s.value.issues.map((_, i) => i), judged.verdicts));
      s.value.issues = s.value.issues.filter((issue, i) => !needsJudge(issue) || kept.has(i));
    }
  }

  const toCache: Array<{ key: string; result: CachedResult }> = [];
  for (const { p, value } of staged) {
    const key = cacheKey(p.text);
    remember(key, value);
    toCache.push({ key, result: value });
    results.push({ id: p.id, ...value });
  }
  // The answer does not wait for the shared cache: this instance already remembers it (see remember above).
  afterResponse(writeSharedCache(toCache), 'check_cache write');

  return { results, usage, ...(judge ? { judge } : {}), timing };
}

async function judgeIssues(
  items: Array<{ id: string; text: string; edits: Array<{ i: number; o: string; r: string; m: string }> }>,
  deadline: number,
  spent: (usage: TokenUsage) => void
): Promise<{ verdicts: JudgeVerdict[]; usage: TokenUsage }> {
  // Models that cannot turn reasoning off spend part of the cap on it.
  const maxTokens = modelParams(JUDGE_MODEL, 0).reasoning_effort === 'minimal' ? 2000 : 1000;
  const userContent = JSON.stringify({ items });
  try {
    let completion: OpenAI.Chat.Completions.ChatCompletion;
    try {
      completion = await openai.chat.completions.create(
        {
          model: JUDGE_MODEL,
          ...modelParams(JUDGE_MODEL, maxTokens),
          service_tier: LIVE_CHECK_SERVICE_TIER,
          response_format: { type: 'json_schema', json_schema: JUDGE_SCHEMA },
          messages: [
            { role: 'system', content: JUDGE_PROMPT },
            { role: 'user', content: userContent },
          ],
        } as Parameters<typeof openai.chat.completions.create>[0],
        callOptions(deadline)
      ) as OpenAI.Chat.Completions.ChatCompletion;
    } catch (error) {
      const lost = timedOutUsage(error, JUDGE_PROMPT.length + JSON.stringify(JUDGE_SCHEMA).length + userContent.length, maxTokens);
      if (lost) spent(lost);
      throw error;
    }
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
