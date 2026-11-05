import { describe, expect, it } from 'vitest';
import { expandToWord, findOffset, locateIssues, normalizeQuotes, trimToChangedWords } from './locate';
import type { RawIssue } from './types';

function issue(original: string, replacement: string, before = ''): RawIssue {
  return { original, replacement, before, message: 'msg', type: 'grammar' };
}

function apply(text: string, offset: number, length: number, replacement: string): string {
  return text.slice(0, offset) + replacement + text.slice(offset + length);
}

describe('trimToChangedWords', () => {
  it('narrows to the changed word', () => {
    expect(trimToChangedWords('She dont like', "She doesn't like")).toEqual({
      start: 4,
      original: 'dont',
      replacement: "doesn't",
    });
  });

  it('anchors a missing word on the following word', () => {
    const r = trimToChangedWords('I going home', 'I am going home')!;
    expect(r).toEqual({ start: 2, original: 'going', replacement: 'am going' });
    expect(apply('I going home', r.start, r.original.length, r.replacement)).toBe('I am going home');
  });

  it('anchors a missing trailing word on the previous word', () => {
    const r = trimToChangedWords('I go', 'I go home')!;
    expect(apply('I go', r.start, r.original.length, r.replacement)).toBe('I go home');
  });

  it('deletes a duplicated word without leaving a double space', () => {
    const r = trimToChangedWords('the the cat', 'the cat')!;
    expect(apply('the the cat', r.start, r.original.length, r.replacement)).toBe('the cat');
  });

  it('returns null for no-op changes', () => {
    expect(trimToChangedWords('same', 'same')).toBeNull();
  });
});

describe('findOffset', () => {
  it('uses the preceding words to disambiguate repeated text', () => {
    const text = 'I has a cat. She has a dog. They has a bird.';
    expect(findOffset(text, 'has', 'They')).toBe(text.indexOf('They has') + 5);
    expect(findOffset(text, 'has', 'I')).toBe(2);
  });

  it('returns -1 when the text is not present', () => {
    expect(findOffset('hello world', 'wrold', '')).toBe(-1);
  });
});

describe('locateIssues', () => {
  it('resolves offsets that round-trip to the original text', () => {
    const text = 'Ths is a sentense with erors.';
    const issues = locateIssues(text, [
      issue('Ths', 'This'),
      issue('sentense', 'sentence', 'is a'),
      issue('erors', 'errors', 'with'),
    ]);
    expect(issues).toHaveLength(3);
    for (const i of issues) expect(text.slice(i.offset, i.offset + i.length)).toBe(i.original);
  });

  it('drops hallucinated, no-op and overlapping issues', () => {
    const text = 'He go to school yesterday.';
    const issues = locateIssues(text, [
      issue('He go', 'He went'),
      issue('go to', 'went to'), // overlaps the first
      issue('scool', 'school'), // not in text
      issue('yesterday', 'yesterday'), // no-op
    ]);
    expect(issues).toEqual([
      { offset: 3, length: 2, original: 'go', replacements: ['went'], message: 'msg', type: 'grammar' },
    ]);
  });

  it('handles non-ASCII text with UTF-16 offsets', () => {
    const text = 'Bugün çok güzel bir gün 🌞 ama hava soguk.';
    const [found] = locateIssues(text, [issue('soguk', 'soğuk', 'hava')]);
    expect(text.slice(found!.offset, found!.offset + found!.length)).toBe('soguk');
  });
});

describe('expandToWord', () => {
  it('underlines the whole word when the model copied part of it', () => {
    const text = 'Yarınki toplantı icin sunumu hazırladım.';
    const start = text.indexOf('icin');
    // Replacement meant for the whole word.
    expect(expandToWord(text, start, 'ic', 'için')).toEqual({ start, original: 'icin', replacement: 'için' });
    // Replacement meant for the fragment only.
    expect(expandToWord(text, start, 'ic', 'iç')).toEqual({ start, original: 'icin', replacement: 'için' });
  });

  it('leaves whole words alone', () => {
    expect(expandToWord('She dont care', 4, 'dont', "don't")).toEqual({ start: 4, original: 'dont', replacement: "don't" });
  });

  it('keeps apostrophes inside the word', () => {
    const text = "I dont't know";
    const start = text.indexOf('dont');
    expect(expandToWord(text, start, 'dont', "don't")!.original).toBe("dont't");
  });
});

describe('locateIssues with partial words', () => {
  it('never produces a fix that duplicates the rest of the word', () => {
    const text = 'Yarınki toplantı icin sunumu hazırladım.';
    const [found] = locateIssues(text, [{ original: 'ic', before: 'toplantı', replacement: 'için', message: '', type: 'spelling' }]);
    const fixed = text.slice(0, found!.offset) + found!.replacements[0] + text.slice(found!.offset + found!.length);
    expect(fixed).toBe('Yarınki toplantı için sunumu hazırladım.');
  });
});

describe('locateIssues: links, emails, mentions and hashtags', () => {
  it('drops issues inside them and keeps the rest', () => {
    const text = 'I dont see https://x.com/eliftabiki1/statusss/1 or @jhon or #remotwork.';
    const located = locateIssues(text, [
      { original: 'dont', before: 'I', replacement: "don't", message: '', type: 'punctuation' },
      { original: 'statusss', before: 'eliftabiki1/', replacement: 'status', message: '', type: 'spelling' },
      { original: 'jhon', before: '@', replacement: 'John', message: '', type: 'spelling' },
      { original: 'remotwork', before: '#', replacement: 'remotework', message: '', type: 'spelling' },
    ]);
    expect(located.map((i) => i.original)).toEqual(['dont']);
  });
});

describe('locateIssues: suggestions that repeat the next words', () => {
  it('drops "yanlışın" → "yanlışın var" when "var" already follows', () => {
    const text = 'Mümkün değil kanka, bence yanlışın var.';
    const located = locateIssues(text, [
      { original: 'yanlışın', before: 'bence', replacement: 'yanlışın var', message: '', type: 'grammar' },
    ]);
    expect(located).toEqual([]);
  });

  it('keeps a real missing word', () => {
    const text = 'Mümkün değil kanka, bence yanlışın.';
    const located = locateIssues(text, [
      { original: 'yanlışın', before: 'bence', replacement: 'yanlışın var', message: '', type: 'grammar' },
    ]);
    expect(located.map((i) => i.replacements[0])).toEqual(['yanlışın var']);
  });
});

describe('locateIssues: changes that are not mistakes', () => {
  it('drops a suggestion that only swaps the apostrophe style', () => {
    const text = 'Deploy’u yarın sabah yapacağız.';
    const located = locateIssues(text, [{ original: 'Deploy’u', before: '', replacement: "Deploy'u", message: '', type: 'punctuation' }]);
    expect(located).toEqual([]);
    expect(normalizeQuotes('it’s “ok”')).toBe('it\'s "ok"');
  });
});
