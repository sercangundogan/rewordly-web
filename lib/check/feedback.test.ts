import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let suppressedRows: Array<{ fp: string }> = [];
const rpc = vi.fn(async () => ({ error: null }));
const limit = vi.fn(async () => ({ data: suppressedRows, error: null }));
vi.mock('../supabase', () => ({
  getSupabaseAdmin: () => ({ rpc, from: () => ({ select: () => ({ limit }) }) }),
}));

import { decorateResults, issueFingerprint, parseFingerprints, recordIgnores, resetSuppressionCache } from './feedback';
import type { CheckIssue, CheckParagraphResult } from './types';

const issue = (offset: number, original: string, replacement: string): CheckIssue => ({
  offset,
  length: original.length,
  original,
  replacements: [replacement],
  message: '',
  type: 'grammar',
});

describe('issueFingerprint', () => {
  it('is stable and differs by sentence, position and edit', () => {
    const base = issueFingerprint('Merge the review.', issue(10, 'review', 'inceleme'));
    expect(base).toMatch(/^[0-9a-f]{40}$/);
    expect(issueFingerprint('Merge the review.', issue(10, 'review', 'inceleme'))).toBe(base);
    expect(issueFingerprint('Merge the review!', issue(10, 'review', 'inceleme'))).not.toBe(base);
    expect(issueFingerprint('Merge the review.', issue(11, 'review', 'inceleme'))).not.toBe(base);
    expect(issueFingerprint('Merge the review.', issue(10, 'review', 'gözden geçirme'))).not.toBe(base);
  });
});

describe('issueFingerprint: keyed', () => {
  it('cannot be computed without the server secret, so votes cannot be forged offline', async () => {
    const forged = createHash('sha1').update('Merge the review.\n10\nreview\ninceleme').digest('hex');
    expect(issueFingerprint('Merge the review.', issue(10, 'review', 'inceleme'))).not.toBe(forged);
  });

  it('changes with the secret (rotating it only resets the votes)', async () => {
    const before = issueFingerprint('Some text.', issue(0, 'Some', 'Any'));
    vi.stubEnv('IP_HASH_SALT', 'another-secret');
    expect(issueFingerprint('Some text.', issue(0, 'Some', 'Any'))).not.toBe(before);
    vi.unstubAllEnvs();
  });
});

describe('parseFingerprints', () => {
  it('keeps distinct valid fingerprints only', () => {
    const a = 'a'.repeat(40);
    expect(parseFingerprints({ fps: [a, a, 'nope', 5, 'B'.repeat(40)] })).toEqual([a]);
    expect(parseFingerprints({ fps: 'x' })).toEqual([]);
    expect(parseFingerprints(null)).toEqual([]);
  });

  it('caps the batch', () => {
    const fps = Array.from({ length: 50 }, (_, i) => i.toString(16).padStart(40, '0'));
    expect(parseFingerprints({ fps })).toHaveLength(20);
  });
});

describe('decorateResults', () => {
  const text = 'Merge the review.';
  const paragraphs = [{ id: 'p1', text }];
  const results = (): CheckParagraphResult[] => [
    { id: 'p1', language: 'en', issues: [issue(10, 'review', 'inceleme'), issue(0, 'Merge', 'Birleştir')] },
  ];

  beforeEach(() => {
    suppressedRows = [];
    limit.mockClear();
    resetSuppressionCache();
  });

  it('tags every issue with its fingerprint', async () => {
    const [out] = await decorateResults(paragraphs, results());
    expect(out!.issues.map((i) => i.fp)).toEqual([
      issueFingerprint(text, issue(10, 'review', 'inceleme')),
      issueFingerprint(text, issue(0, 'Merge', 'Birleştir')),
    ]);
  });

  it('drops a suppressed suggestion and keeps the others', async () => {
    suppressedRows = [{ fp: issueFingerprint(text, issue(10, 'review', 'inceleme')) }];
    const [out] = await decorateResults(paragraphs, results());
    expect(out!.issues.map((i) => i.original)).toEqual(['Merge']);
  });

  it('does not touch the same word in another sentence', async () => {
    suppressedRows = [{ fp: issueFingerprint(text, issue(10, 'review', 'inceleme')) }];
    const other = [{ id: 'p2', text: 'Please review.' }];
    const [out] = await decorateResults(other, [{ id: 'p2', language: 'en', issues: [issue(7, 'review', 'inceleme')] }]);
    expect(out!.issues).toHaveLength(1);
  });

  it('reads the suppression list once per minute, and not at all when nothing was found', async () => {
    await decorateResults(paragraphs, results());
    await decorateResults(paragraphs, results());
    expect(limit).toHaveBeenCalledTimes(1);
    limit.mockClear();
    await decorateResults(paragraphs, [{ id: 'p1', language: 'en', issues: [] }]);
    expect(limit).not.toHaveBeenCalled();
  });
});

describe('recordIgnores', () => {
  it('sends the identity, fingerprints and threshold to the database function', async () => {
    rpc.mockClear();
    await recordIgnores('anon:1', ['a'.repeat(40)]);
    expect(rpc).toHaveBeenCalledWith('add_check_feedback', { p_identity: 'anon:1', p_fps: ['a'.repeat(40)], p_min_users: 5 });
  });

  it('does nothing for an empty batch', async () => {
    rpc.mockClear();
    await recordIgnores('anon:1', []);
    expect(rpc).not.toHaveBeenCalled();
  });
});
