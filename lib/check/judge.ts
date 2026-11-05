/** Pure helpers for the judge pass (lib/check/llm.ts), kept apart so they can be tested without an API key. */

export interface JudgeVerdict {
  id: string;
  i: number;
  keep: boolean;
}

/** Keeps the issues the judge approved. An issue without a verdict is dropped: when unsure, show nothing. */
export function approved<T>(id: string, issues: T[], verdicts: JudgeVerdict[]): T[] {
  const keep = new Set(verdicts.filter((v) => v.id === id && v.keep).map((v) => v.i));
  return issues.filter((_, i) => keep.has(i));
}
