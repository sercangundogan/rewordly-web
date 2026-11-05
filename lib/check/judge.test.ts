import { describe, expect, it } from 'vitest';
import { approved } from './judge';

describe('approved', () => {
  const issues = ['a', 'b', 'c'];
  it('keeps what the judge approved for that paragraph only', () => {
    const verdicts = [
      { id: 'p1', i: 0, keep: true },
      { id: 'p1', i: 1, keep: false },
      { id: 'p2', i: 2, keep: true },
    ];
    expect(approved('p1', issues, verdicts)).toEqual(['a']);
  });

  it('drops issues that have no verdict', () => {
    expect(approved('p1', issues, [{ id: 'p1', i: 2, keep: true }])).toEqual(['c']);
    expect(approved('p1', issues, [])).toEqual([]);
  });
});
