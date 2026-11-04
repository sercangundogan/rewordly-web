/**
 * Links, email addresses, @mentions and #hashtags: the prompt says never to flag them, but the
 * model sometimes "fixes" one anyway (x.com/…/statusss → status). locateIssues drops those.
 * Same rules as protectedRanges in the extension (src/live/text.ts), which filters cached results too.
 */

const TLDS = 'com|net|org|io|co|dev|app|ai|me|tv|gg|ly|so|xyz|info|biz|edu|gov|tr|de|uk|fr|es|it|nl|ru|jp|cn|in|br|us|ca|au|eu';
// Constructor form: the project's TypeScript target (es5) rejects the `u` flag on literals.
const PROTECTED = new RegExp(
  [
    '\\b(?:https?://|www\\.)[^\\s<>"]+',
    '[\\p{L}\\p{N}._%+-]+@[\\p{L}\\p{N}-]+(?:\\.[\\p{L}\\p{N}-]+)+',
    `\\b(?:[\\p{L}\\p{N}-]+\\.)+(?:${TLDS})\\b(?:/[^\\s<>"]*)?`,
    '(?<![\\p{L}\\p{N}_])[@#][\\p{L}\\p{N}_]+',
  ].join('|'),
  'giu'
);
const TRAILING_PUNCTUATION = /[.,!?;:)\]}'"…]+$/;

export function protectedRanges(text: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  PROTECTED.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = PROTECTED.exec(text)) !== null) {
    const token = match[0].replace(TRAILING_PUNCTUATION, '');
    if (token) ranges.push([match.index, match.index + token.length]);
  }
  return ranges;
}

export function overlapsProtected(start: number, end: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([from, to]) => start < to && from < end);
}
