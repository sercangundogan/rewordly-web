import { GrammarCheckResponse } from '../types/grammar';

/**
 * Grammar checking using OpenAI.
 * Returns corrected text (no detailed error positions).
 */
export async function checkGrammarWithOpenAI(text: string): Promise<GrammarCheckResponse> {
  const { correctGrammar } = await import('../openai');
  const result = await correctGrammar(text);

  return {
    errors: [],
    corrected: result.corrected,
  };
}
