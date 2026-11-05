/**
 * Types for the live (check-as-you-type) endpoint: POST /api/check.
 * The extension sends changed paragraphs; the server returns issues with
 * character offsets relative to each paragraph's text.
 */

export type IssueType = 'spelling' | 'grammar' | 'punctuation';

export interface CheckParagraph {
  /** Client-chosen id (usually a hash of the text); echoed back in results. */
  id: string;
  text: string;
}

export interface CheckRequest {
  paragraphs: CheckParagraph[];
}

export interface CheckIssue {
  /** UTF-16 offset into the paragraph text (same unit as JS string indices). */
  offset: number;
  length: number;
  /** text.slice(offset, offset + length), sent so the client can verify before applying. */
  original: string;
  replacements: string[];
  message: string;
  type: IssueType;
  /** Opaque id of this suggestion, set by the API; the client sends it back when the suggestion is ignored. */
  fp?: string;
}

export interface CheckParagraphResult {
  id: string;
  /** ISO 639-1 code detected by the model, e.g. "en", "tr". */
  language: string;
  issues: CheckIssue[];
}

export interface CheckResponse {
  results: CheckParagraphResult[];
  /** Remaining auto-check quota for today; null when unlimited (Pro). */
  usage: { used: number; limit: number | null };
}

/** Raw issue as produced by the model, before offsets are resolved. */
export interface RawIssue {
  /** Exact erroneous text copied from the paragraph. */
  original: string;
  /** Up to ~4 words that appear immediately before `original` (may be empty). */
  before: string;
  replacement: string;
  message: string;
  type: IssueType;
}
