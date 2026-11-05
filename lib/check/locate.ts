import { overlapsProtected, protectedRanges } from './protected';
import type { CheckIssue, RawIssue } from './types';

/**
 * Resolves model-reported issues to exact offsets in the paragraph.
 *
 * LLMs are unreliable at counting characters, so the model only copies the
 * erroneous text (+ a few words before it) and we find it ourselves. Issues
 * that cannot be found, change nothing, or overlap an earlier issue are dropped:
 * a missing underline is far better than one in the wrong place.
 */
/** ’ ‘ ` ´ → ' and “ ” → ": typographic and plain quotes are the same character to a writer. */
export function normalizeQuotes(s: string): string {
  return s.replace(/[’‘`´ʼ]/g, "'").replace(/[“”]/g, '"');
}

export function locateIssues(text: string, raw: RawIssue[]): CheckIssue[] {
  const located: CheckIssue[] = [];
  const shielded = protectedRanges(text);

  for (const issue of raw) {
    if (!issue.original || issue.original === issue.replacement) continue;
    // "Deploy’u" → "Deploy'u" only swaps the apostrophe style: nothing the user got wrong.
    if (normalizeQuotes(issue.original) === normalizeQuotes(issue.replacement)) continue;

    const offset = findOffset(text, issue.original, issue.before);
    if (offset < 0) continue;

    const trimmed = trimToChangedWords(issue.original, issue.replacement);
    if (!trimmed) continue;

    const whole = expandToWord(text, offset + trimmed.start, trimmed.original, trimmed.replacement);
    if (!whole) continue;
    const { start, original, replacement } = whole;
    const end = start + original.length;
    if (overlapsProtected(start, end, shielded)) continue;
    if (repeatsNeighbour(text, start, original, replacement)) continue;
    if (located.some((other) => start < other.offset + other.length && other.offset < end)) continue;

    located.push({
      offset: start,
      length: end - start,
      original,
      replacements: [replacement],
      message: issue.message.trim(),
      type: issue.type,
    });
  }

  return located.sort((a, b) => a.offset - b.offset);
}

const EDGE_PUNCTUATION = new RegExp('^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$', 'gu');
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const bare = (word: string) => word.replace(EDGE_PUNCTUATION, '').toLowerCase();

/**
 * True when a suggestion only adds words that are already right next to it ("yanlışın" →
 * "yanlışın var" in "yanlışın var"): applying it would repeat them. Same rule as
 * repeatsNeighbour in the extension (src/live/text.ts), which also filters cached results.
 */
export function repeatsNeighbour(text: string, start: number, original: string, replacement: string): boolean {
  let added: string[];
  let neighbours: string[];
  if (original && replacement.startsWith(original)) {
    added = words(replacement.slice(original.length));
    neighbours = words(text.slice(start + original.length)).slice(0, added.length);
  } else if (original && replacement.endsWith(original)) {
    added = words(replacement.slice(0, replacement.length - original.length));
    neighbours = words(text.slice(0, start)).slice(-added.length);
  } else {
    return false;
  }
  if (added.length === 0 || neighbours.length !== added.length) return false;
  return added.every((word, i) => bare(word) !== '' && bare(word) === bare(neighbours[i]!));
}

/** Every index where `needle` occurs in `haystack`. */
function allIndexesOf(haystack: string, needle: string): number[] {
  const indexes: number[] = [];
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    indexes.push(index);
    index = haystack.indexOf(needle, index + 1);
  }
  return indexes;
}

function normalizeSpace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Picks the occurrence of `original` whose preceding text best matches `before`.
 * Returns -1 when `original` does not occur in `text`.
 */
export function findOffset(text: string, original: string, before: string): number {
  const candidates = allIndexesOf(text, original);
  if (candidates.length === 0) return -1;
  if (candidates.length === 1) return candidates[0]!;

  const wanted = normalizeSpace(before);
  if (!wanted) return candidates[0]!;

  let best = candidates[0]!;
  let bestScore = -1;
  for (const candidate of candidates) {
    const preceding = normalizeSpace(text.slice(Math.max(0, candidate - wanted.length - 8), candidate));
    const score = commonSuffixLength(preceding, wanted);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function commonSuffixLength(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[a.length - 1 - n] === b[b.length - 1 - n]) n++;
  return n;
}

/**
 * Shrinks an (original → replacement) pair to the words that actually change, so
 * "She dont like" → "She doesn't like" underlines only "dont". Works on whole
 * tokens (words + attached punctuation) so the underline never splits a word,
 * except for pure punctuation fixes where the change is the punctuation itself.
 */
export function trimToChangedWords(
  original: string,
  replacement: string
): { start: number; original: string; replacement: string } | null {
  const a = tokenize(original);
  const b = tokenize(replacement);

  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;
  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) {
    tail++;
  }

  const aMid = a.slice(head, a.length - tail);
  const bMid = b.slice(head, b.length - tail);
  if (aMid.length === 0 && bMid.length === 0) return null;

  // Pure insertion (e.g. a missing word): anchor on the word after it, or the one before at the end.
  if (aMid.length === 0) {
    const next = a[head];
    if (next !== undefined && next.trim()) {
      return {
        start: a.slice(0, head).join('').length,
        original: next,
        replacement: bMid.join('') + next,
      };
    }
    let prev = head - 1;
    while (prev >= 0 && !a[prev]!.trim()) prev--;
    if (prev < 0) return null;
    const spanned = a.slice(prev, head).join('');
    return {
      start: a.slice(0, prev).join('').length,
      original: spanned,
      replacement: spanned + bMid.join(''),
    };
  }

  const start = a.slice(0, head).join('').length;
  let orig = aMid.join('');
  let repl = bMid.join('');

  // Pure deletion ("the the cat"): keep the whitespace so removing it doesn't leave a double space.
  if (repl === '') return orig.trim() ? { start, original: orig, replacement: '' } : null;

  // Keep surrounding whitespace out of the underline.
  const lead = orig.length - orig.trimStart().length;
  const trail = orig.length - orig.trimEnd().length;
  if (lead && repl.startsWith(orig.slice(0, lead))) repl = repl.slice(lead);
  if (trail && repl.endsWith(orig.slice(orig.length - trail))) repl = repl.slice(0, repl.length - trail);
  orig = orig.trim();

  if (!orig || orig === repl) return null;
  return { start: start + lead, original: orig, replacement: repl };
}

/** Splits into alternating word and whitespace tokens; join('') round-trips. */
function tokenize(s: string): string[] {
  return s.match(/\s+|[^\s]+/g) ?? [];
}

// Constructor form: the project's TypeScript target (es5) rejects the `u` flag on literals.
const WORD_CHAR = new RegExp("[\\p{L}\\p{N}\\p{M}'’]", 'u');

/**
 * The model sometimes copies part of a word ("ic" out of "icin", replacement "için").
 * Underline the whole word instead. The replacement is either meant for the whole word
 * already ("için") or only for the fragment ("iç" → "için" after re-adding the rest);
 * we keep whichever reading is closer to the original word.
 */
export function expandToWord(
  text: string,
  start: number,
  original: string,
  replacement: string
): { start: number; original: string; replacement: string } | null {
  let from = start;
  let to = start + original.length;
  while (from > 0 && WORD_CHAR.test(text[from - 1]!) && WORD_CHAR.test(text[from]!)) from--;
  while (to < text.length && WORD_CHAR.test(text[to]!) && WORD_CHAR.test(text[to - 1]!)) to++;
  if (from === start && to === start + original.length) return { start, original, replacement };

  const word = text.slice(from, to);
  const asFragment = text.slice(from, start) + replacement + text.slice(start + original.length, to);
  const fixed = editDistance(word, replacement) <= editDistance(word, asFragment) ? replacement : asFragment;
  return fixed === word ? null : { start: from, original: word, replacement: fixed };
}

/** Levenshtein distance; inputs here are single words, so the O(n·m) table is tiny. */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j]! + 1, row[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length]!;
}
