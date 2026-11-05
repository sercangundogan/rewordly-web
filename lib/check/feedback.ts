import { createHash } from 'crypto';
import { getSupabaseAdmin } from '../supabase';
import type { CheckIssue, CheckParagraph, CheckParagraphResult } from './types';

/**
 * Suggestions people keep ignoring.
 *
 * Every issue leaves the API with a fingerprint (`fp`) of its sentence, position and edit. The
 * extension reports it when someone ignores the suggestion; when MIN_USERS different identities
 * did, the suggestion is suppressed: no longer returned, whether it comes from the cache or from
 * a new model call. No text is stored, only the hash. Storage: supabase-live-check.sql.
 */

/** How many different people have to ignore the same suggestion before it is dropped. */
export const MIN_USERS = Math.max(2, Number(process.env.CHECK_SUPPRESS_MIN_USERS) || 5);

const FP = /^[0-9a-f]{40}$/;
const MAX_FPS = 20;

export function issueFingerprint(text: string, issue: Pick<CheckIssue, 'offset' | 'original' | 'replacements'>): string {
  return createHash('sha1').update(`${text}\n${issue.offset}\n${issue.original}\n${issue.replacements[0] ?? ''}`).digest('hex');
}

/** Valid, distinct fingerprints from a client batch. */
export function parseFingerprints(body: unknown): string[] {
  const fps = (body as { fps?: unknown } | null)?.fps;
  if (!Array.isArray(fps)) return [];
  return Array.from(new Set(fps.filter((f): f is string => typeof f === 'string' && FP.test(f)))).slice(0, MAX_FPS);
}

export async function recordIgnores(identity: string, fps: string[]): Promise<void> {
  if (fps.length === 0) return;
  const { error } = await getSupabaseAdmin().rpc('add_check_feedback', { p_identity: identity, p_fps: fps, p_min_users: MIN_USERS });
  if (error) console.error('add_check_feedback failed (has supabase-live-check.sql been run?):', error.message);
  else refreshSoon();
}

/**
 * Suppressed fingerprints, kept in memory for a minute: the table only holds suggestions that
 * went wrong, so it stays small, and a check never waits for a query.
 */
const REFRESH_MS = 60_000;
const MAX_SUPPRESSED = 20_000;
let suppressed = new Set<string>();
let loadedAt = 0;
let loading: Promise<void> | null = null;

function refreshSoon(): void {
  loadedAt = 0;
}

async function load(): Promise<void> {
  const { data, error } = await getSupabaseAdmin().from('check_suppressions').select('fp').limit(MAX_SUPPRESSED);
  if (error) {
    // Keep what we have; suppression is a refinement, never a reason to fail a check.
    console.error('check_suppressions read failed (has supabase-live-check.sql been run?):', error.message);
  } else {
    suppressed = new Set((data ?? []).map((r: { fp: string }) => r.fp));
  }
  loadedAt = Date.now();
}

async function suppressedSet(): Promise<Set<string>> {
  if (Date.now() - loadedAt > REFRESH_MS) {
    loading ??= load().finally(() => {
      loading = null;
    });
    await loading;
  }
  return suppressed;
}

/** Drops suppressed suggestions and tags the rest with their fingerprint. */
export async function decorateResults(paragraphs: CheckParagraph[], results: CheckParagraphResult[]): Promise<CheckParagraphResult[]> {
  if (results.every((r) => r.issues.length === 0)) return results;
  const hidden = await suppressedSet();
  const text = new Map(paragraphs.map((p) => [p.id, p.text]));
  return results.map((r) => {
    const source = text.get(r.id);
    if (source === undefined || r.issues.length === 0) return r;
    const issues: CheckIssue[] = [];
    for (const issue of r.issues) {
      const fp = issueFingerprint(source, issue);
      if (!hidden.has(fp)) issues.push({ ...issue, fp });
    }
    return { ...r, issues };
  });
}

/** For tests. */
export function resetSuppressionCache(): void {
  suppressed = new Set();
  loadedAt = 0;
  loading = null;
}
