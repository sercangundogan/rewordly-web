import { describe, expect, it, vi } from 'vitest';

vi.mock('../supabase', () => ({ getSupabaseAdmin: () => ({}) }));
vi.mock('openai', () => ({ default: class {} }));

import { quotaIdentity } from './quota';
import { parseParagraphs } from '../../pages/api/check';

describe('parseParagraphs', () => {
  const ok = [{ id: 'a', text: 'One.' }, { id: 'b', text: 'Two.' }];

  it('accepts distinct ids', () => {
    expect(parseParagraphs({ paragraphs: ok })).toEqual(ok);
  });

  it('rejects a repeated id: results are matched by id and cached by text, so two paragraphs would swap issues', () => {
    expect(parseParagraphs({ paragraphs: [ok[0], { id: 'a', text: 'Something else.' }] })).toBe('Paragraph ids must be unique');
  });

  it.each([
    ['not an array', { paragraphs: 'x' }],
    ['empty', { paragraphs: [] }],
    ['null body', null],
    ['no id', { paragraphs: [{ text: 'x' }] }],
    ['numeric id', { paragraphs: [{ id: 1, text: 'x' }] }],
    ['id too long', { paragraphs: [{ id: 'x'.repeat(65), text: 'x' }] }],
    ['blank text', { paragraphs: [{ id: 'a', text: '   ' }] }],
    ['text is not a string', { paragraphs: [{ id: 'a', text: { toString: 'x' } }] }],
    ['null entry', { paragraphs: [null] }],
    ['too many', { paragraphs: Array.from({ length: 31 }, (_, i) => ({ id: `p${i}`, text: 'x' })) }],
    ['paragraph too long', { paragraphs: [{ id: 'a', text: 'x'.repeat(3001) }] }],
    ['request too long', { paragraphs: Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, text: 'x'.repeat(2900) })) }],
  ])('rejects %s', (_label, body) => {
    expect(typeof parseParagraphs(body)).toBe('string');
  });
});

describe('quotaIdentity', () => {
  it('uses the account when there is one', () => {
    expect(quotaIdentity('u1', 'a'.repeat(32))).toBe('user:u1');
  });

  it('accepts what the extension generates', () => {
    expect(quotaIdentity(null, '0123456789abcdef0123456789abcdef')).toBe('anon:0123456789abcdef0123456789abcdef');
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too short', 'abc'],
    ['an endless header', 'a'.repeat(5000)],
    ['spaces and symbols', "x' OR '1'='1 -- padding"],
    ['control characters', 'abcdefgh\nabcdefgh'],
  ])('%s becomes one shared "unknown" identity instead of a new database row', (_label, id) => {
    expect(quotaIdentity(null, id as string | undefined)).toBe('anon:unknown');
  });
});
