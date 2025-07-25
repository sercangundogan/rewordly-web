import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface RewriteRequest {
  text: string;
}

export interface RewriteResponse {
  rewritten: string;
}

export interface ApiError {
  error: string;
  message: string;
}

/**
 * Rewrites text using OpenAI GPT API
 * @param text - The text to rewrite
 * @returns Promise<RewriteResponse> - The rewritten text
 */
export async function rewriteText(text: string): Promise<RewriteResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that rewrites text to improve grammar, clarity, and fluency while preserving the original meaning. Return only the rewritten text without any additional commentary or formatting.'
        },
        {
          role: 'user',
          content: `Please rewrite the following text to improve grammar, clarity, and fluency while preserving the original meaning:\n\n${text}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.7,
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