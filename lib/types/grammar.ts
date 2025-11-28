/**
 * Grammar Error Types
 */

export interface GrammarError {
  start: number;        // Character position where error starts (0-indexed)
  end: number;          // Character position where error ends (exclusive, 0-indexed)
  word: string;         // The incorrect word/phrase
  suggestions: string[]; // Array of suggested corrections
  type: 'grammar' | 'spelling'; // Error type
}

export interface GrammarCheckResponse {
  errors: GrammarError[]; // Array of grammar errors found
  corrected: string;     // The corrected version of the text
}

export interface GrammarRequest {
  text: string;
}

export interface ApiError {
  error: string;
  message: string;
}

/**
 * LanguageTool API Response Types
 */
export interface LanguageToolMatch {
  message: string;
  shortMessage: string;
  replacements: Array<{ value: string }>;
  offset: number;
  length: number;
  context: {
    text: string;
    offset: number;
    length: number;
  };
  sentence: string;
  rule: {
    id: string;
    description: string;
    category: {
      id: string;
      name: string;
    };
  };
}

export interface LanguageToolResponse {
  matches: LanguageToolMatch[];
  software: {
    name: string;
    version: string;
  };
  language: {
    name: string;
    code: string;
  };
}


