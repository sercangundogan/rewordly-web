import axios from 'axios';
import { GrammarError, GrammarCheckResponse, LanguageToolResponse } from '../types/grammar';

const LANGUAGETOOL_API_URL = process.env.LANGUAGETOOL_API_URL || 'https://api.languagetool.org/v2/check';
const DEFAULT_LANGUAGE = 'en-US';

/**
 * Checks if a word is likely a proper noun (name, place, etc.)
 * Proper nouns are capitalized words that are not at the start of sentences,
 * or capitalized words at sentence start that are likely names (not common words like "I", "The")
 * @param text - The full text
 * @param start - Start position of the word
 * @param end - End position of the word
 * @returns true if the word is likely a proper noun
 */
function isProperNoun(text: string, start: number, end: number): boolean {
  const word = text.substring(start, end);
  
  // Must start with uppercase letter
  if (!/^[A-Z]/.test(word)) {
    return false;
  }
  
  // Common words that start sentences but are not proper nouns
  const commonSentenceStarters = ['I', 'The', 'A', 'An', 'This', 'That', 'These', 'Those', 'He', 'She', 'It', 'We', 'They', 'My', 'Your', 'His', 'Her', 'Our', 'Their'];
  if (commonSentenceStarters.includes(word)) {
    return false;
  }
  
  // Check if it's at the start of a sentence (after punctuation, newline, or start of text)
  const beforeWord = text.substring(Math.max(0, start - 10), start);
  const isSentenceStart = /^[\s]*$/.test(beforeWord) || /[.!?\n]\s*$/.test(beforeWord);
  
  // If it's not at sentence start and starts with uppercase, it's likely a proper noun
  if (!isSentenceStart) {
    return true;
  }
  
  // Even at sentence start, if it's a longer capitalized word (likely a name),
  // it might be a proper noun (like "Sercan", "John", "Mary")
  // Filter words that are 3+ characters and match the pattern of a name
  const isLikelyName = word.length >= 3 && /^[A-Z][a-z]+$/.test(word);
  const hasMultipleCapitals = /[A-Z].*[A-Z]/.test(word); // Like "McDonald", "O'Brien"
  
  // If it has multiple capitals or is a longer capitalized word, it's likely a proper noun
  return hasMultipleCapitals || isLikelyName;
}

/**
 * Checks grammar using LanguageTool API and returns detailed error information
 * @param text - The text to check for grammar errors
 * @param language - Language code (default: 'en-US')
 * @returns Promise<GrammarCheckResponse> - Grammar errors with positions and suggestions
 */
export async function checkGrammar(
  text: string,
  language: string = DEFAULT_LANGUAGE
): Promise<GrammarCheckResponse> {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  try {
    // Call LanguageTool API
    // LanguageTool expects form-urlencoded data
    const params = new URLSearchParams();
    params.append('text', text);
    params.append('language', language);
    
    const response = await axios.post<LanguageToolResponse>(
      LANGUAGETOOL_API_URL,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // Transform LanguageTool response to our format and filter out proper nouns
    const errors: GrammarError[] = response.data.matches
      .map((match) => {
        const offset = match.offset;
        const length = match.length;
        
        // Extract the incorrect word/phrase from the original text
        const word = text.substring(offset, offset + length);
        
        // Get suggestions from replacements
        const suggestions = match.replacements?.map((r) => r.value) || [];
        
        // Determine error type based on rule category
        const isSpelling = match.rule?.category?.id === 'TYPOS' || 
                          match.rule?.id?.includes('SPELL') ||
                          match.rule?.id?.includes('MORFOLOGIK');
        const type: 'grammar' | 'spelling' = isSpelling ? 'spelling' : 'grammar';
        
        return {
          start: offset,
          end: offset + length,
          word: word,
          suggestions: suggestions,
          type: type,
        };
      })
      .filter((error) => {
        // Filter out spelling errors for proper nouns (names, places, etc.)
        // Keep grammar errors even for proper nouns
        if (error.type === 'spelling' && isProperNoun(text, error.start, error.end)) {
          return false; // Filter out spelling errors for proper nouns
        }
        return true; // Keep all other errors
      });

    // Sort errors by start position (descending) for easier correction application
    const sortedErrors = [...errors].sort((a, b) => b.start - a.start);
    
    // Generate corrected text by applying suggestions
    let corrected = text;
    for (const error of sortedErrors) {
      if (error.suggestions.length > 0) {
        // Apply the first (most likely) suggestion
        const replacement = error.suggestions[0];
        corrected = corrected.substring(0, error.start) + 
                   replacement + 
                   corrected.substring(error.end);
      }
    }

    return {
      errors: errors, // Return errors in original order (ascending by position)
      corrected: corrected,
      detectedLanguage: response.data.language && response.data.language.detectedLanguage ? {
        code: response.data.language.detectedLanguage.code || '',
        name: response.data.language.detectedLanguage.name || ""  ,
      } : undefined,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout: LanguageTool API took too long to respond');
      }
      if (error.response) {
        throw new Error(`LanguageTool API error: ${error.response.status} - ${error.response.statusText}`);
      }
      if (error.request) {
        throw new Error('Unable to reach LanguageTool API. Please check your internet connection.');
      }
    }
    throw error;
  }
}

/**
 * Fallback grammar checking using OpenAI (when LanguageTool is unavailable)
 * Note: This doesn't provide detailed error positions, so it's a fallback only
 */
export async function checkGrammarWithOpenAI(text: string): Promise<GrammarCheckResponse> {
  // This is a fallback - OpenAI doesn't provide detailed error positions
  // For now, return empty errors array with corrected text
  // In production, you might want to implement a hybrid approach
  
  const { correctGrammar } = await import('../openai');
  const result = await correctGrammar(text);
  
  return {
    errors: [], // OpenAI doesn't provide detailed error positions
    corrected: result.corrected,
  };
}

