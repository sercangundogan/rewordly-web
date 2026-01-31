/**
 * Grammar Error Types
 */

export interface GrammarError {
  start: number;
  end: number;
  word: string;
  suggestions: string[];
  type: 'grammar' | 'spelling';
}

export interface GrammarCheckResponse {
  errors: GrammarError[];
  corrected: string;
  detectedLanguage?: {
    code: string;
    name: string;
  };
}

export interface GrammarRequest {
  text: string;
}

export interface ApiError {
  error: string;
  message: string;
}
