import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type RewriteTone = 'standard' | 'formal' | 'casual' | 'concise' | 'elaborate';

export interface RewriteRequest {
  text: string;
  tone?: RewriteTone;
}

export interface RewriteResponse {
  rewritten: string;
}

export interface ApiError {
  error: string;
  message: string;
}

const TONE_SYSTEM_PROMPTS: Record<RewriteTone, string> = {
  standard:
    'You are a helpful writing assistant. Rewrite the text to improve grammar, clarity, and fluency while preserving the original meaning and tone. Return only the rewritten text without any commentary or formatting.',
  formal:
    'You are a professional writing assistant. Rewrite the text in a formal, professional tone. Use precise language, avoid contractions, and structure sentences clearly. Preserve the original meaning. Return only the rewritten text without any commentary or formatting.',
  casual:
    'You are a friendly writing assistant. Rewrite the text in a casual, conversational tone. Use natural language and contractions where appropriate. Keep it warm and approachable while preserving the original meaning. Return only the rewritten text without any commentary or formatting.',
  concise:
    'You are a concise writing assistant. Rewrite the text to be shorter and more direct. Remove unnecessary words, filler phrases, and redundancy while keeping all key information intact. Return only the rewritten text without any commentary or formatting.',
  elaborate:
    'You are an expressive writing assistant. Rewrite the text to be more detailed and rich. Expand on the ideas with stronger vocabulary and additional context while staying true to the original meaning. Return only the rewritten text without any commentary or formatting.',
};

const TONE_USER_PROMPTS: Record<RewriteTone, string> = {
  standard: 'Rewrite the following text to improve grammar, clarity, and fluency:',
  formal:   'Rewrite the following text in a formal, professional tone:',
  casual:   'Rewrite the following text in a casual, conversational tone:',
  concise:  'Rewrite the following text to be more concise and direct:',
  elaborate: 'Rewrite the following text to be more detailed and elaborate:',
};

/**
 * Rewrites text using OpenAI GPT API
 * @param text - The text to rewrite
 * @param tone - Optional tone style (defaults to 'standard')
 * @returns Promise<RewriteResponse> - The rewritten text
 */
export async function rewriteText(text: string, tone: RewriteTone = 'standard'): Promise<RewriteResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  const safeTone: RewriteTone = TONE_SYSTEM_PROMPTS[tone] ? tone : 'standard';

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: TONE_SYSTEM_PROMPTS[safeTone],
        },
        {
          role: 'user',
          content: `${TONE_USER_PROMPTS[safeTone]}\n\n${text}`,
        }
      ],
      max_tokens: 1000,
      temperature: safeTone === 'concise' ? 0.5 : 0.7,
    });

    const rewritten = completion.choices[0]?.message?.content;
    
    if (!rewritten) {
      throw new Error('No response received from OpenAI');
    }

    return { rewritten: rewritten.trim() };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
} 

export interface GrammarRequest {
  text: string;
}

export interface GrammarResponse {
  corrected: string;
}

/**
 * Corrects grammar in text using OpenAI GPT API
 * @param text - The text to correct grammar for
 * @returns Promise<GrammarResponse> - The grammar-corrected text
 */
export async function correctGrammar(text: string): Promise<GrammarResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a grammar correction assistant. Fix only grammar mistakes, spelling errors, and punctuation issues. Do not change the meaning, style, or tone of the text. Do not rewrite or rephrase sentences unless there is a grammar error. Return only the corrected text without any additional commentary or formatting.'
        },
        {
          role: 'user',
          content: `Please fix only the grammar mistakes in the following text. Do not change the meaning or style, just correct grammar, spelling, and punctuation:\n\n${text}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more conservative corrections
    });

    const corrected = completion.choices[0]?.message?.content;
    
    if (!corrected) {
      throw new Error('No response received from OpenAI');
    }

    return { corrected: corrected.trim() };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
} 