import OpenAI from 'openai';
import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import { locateIssues } from './locate';
import type { TokenUsage } from './costs';
import type { CheckParagraph, CheckParagraphResult, RawIssue } from './types';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/** Live checks run on every typing pause, so they always use the fast model. */
export const LIVE_CHECK_MODEL = 'gpt-4o-mini';

/** Bump when the prompt or output format changes: it is part of every cache key. */
const PROMPT_VERSION = '4';

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

interface ModelOutput {
  r: Array<{ id: string; lang: string; issues: Array<{ o: string; b: string; r: string; m: string; t: RawIssue['type'] }> }>;
}

type CachedResult = Omit<CheckParagraphResult, 'id'>;

function cacheKey(text: string): string {
  return createHash('sha1').update(`${PROMPT_VERSION}\n${LIVE_CHECK_MODEL}\n${text}`).digest('hex');
}

/** Per-instance memory in front of the shared Supabase cache. */
const MEMORY_LIMIT = 2000;
const memory = new Map<string, CachedResult>();

function remember(key: string, value: CachedResult): void {
  if (memory.size >= MEMORY_LIMIT) {
    const oldest = memory.keys().next();
    if (!oldest.done) memory.delete(oldest.value);
  }
  memory.set(key, value);
}

async function readSharedCache(keys: string[]): Promise<Map<string, CachedResult>> {
  const found = new Map<string, CachedResult>();
  if (keys.length === 0) return found;
  const { data, error } = await getSupabaseAdmin().from('check_cache').select('key, result').in('key', keys);
  if (error) {
    console.error('check_cache read failed (has supabase-live-check.sql been run?):', error.message);
    return found;
  }
  for (const row of (data ?? []) as Array<{ key: string; result: CachedResult }>) found.set(row.key, row.result);
  return found;
}

async function writeSharedCache(entries: Array<{ key: string; result: CachedResult }>): Promise<void> {
  if (entries.length === 0) return;
  const { error } = await getSupabaseAdmin().from('check_cache').upsert(entries, { onConflict: 'key' });
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
  const missing = keys.filter((k) => !memory.has(k));
  const shared = await readSharedCache(missing);
  shared.forEach((value, key) => remember(key, value));

  const results: CheckParagraphResult[] = [];
  const pending: CheckParagraph[] = [];
  paragraphs.forEach((p, i) => {
    const hit = memory.get(keys[i]!);
    if (hit) results.push({ id: p.id, ...hit });
    else pending.push(p);
  });
  return { results, pending };
}

/** Checks uncached paragraphs with the model, caches the results and reports token usage. */
export async function checkWithModel(
  paragraphs: CheckParagraph[]
): Promise<{ results: CheckParagraphResult[]; usage: TokenUsage }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  let output: ModelOutput;
  let usage: TokenUsage;
  try {
    const completion = await openai.chat.completions.create(
      {
        model: LIVE_CHECK_MODEL,
        temperature: 0,
        max_tokens: 1500,
        response_format: { type: 'json_schema', json_schema: RESPONSE_SCHEMA },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify({ p: paragraphs }) },
        ],
      },
      { timeout: 20000, maxRetries: 1 }
    );
    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new Error('No response received from OpenAI');
    output = JSON.parse(raw) as ModelOutput;
    usage = {
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      cachedInputTokens: completion.usage?.prompt_tokens_details?.cached_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }

  const results: CheckParagraphResult[] = [];
  const toCache: Array<{ key: string; result: CachedResult }> = [];
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
    const value: CachedResult = {
      language: modelResult.lang.toLowerCase().slice(0, 5),
      issues: locateIssues(p.text, raw),
    };
    const key = cacheKey(p.text);
    remember(key, value);
    toCache.push({ key, result: value });
    results.push({ id: p.id, ...value });
  }
  await writeSharedCache(toCache);

  return { results, usage };
}
