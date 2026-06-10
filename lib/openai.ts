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
  /** All generated alternatives (first entry === rewritten). */
  variants: string[];
}

export interface CompletionOptions {
  /** OpenAI model to use (plan-dependent, see lib/features.ts). */
  model?: string;
  /** Number of alternatives to generate (plan-dependent). */
  variants?: number;
  /** User-defined style instruction (Pro). Overrides the tone prompts. */
  customPrompt?: string;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

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
 * @param options - Plan-dependent model and variant count
 * @returns Promise<RewriteResponse> - The rewritten text + alternatives
 */
export async function rewriteText(
  text: string,
  tone: RewriteTone = 'standard',
  options: CompletionOptions = {}
): Promise<RewriteResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  const safeTone: RewriteTone = TONE_SYSTEM_PROMPTS[tone] ? tone : 'standard';
  const model = options.model || DEFAULT_MODEL;
  const n = Math.max(1, Math.min(options.variants ?? 1, 3));

  try {
    const completion = await openai.chat.completions.create({
      model,
      n,
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
      // Slightly higher temperature when generating alternatives so they actually differ
      temperature: n > 1 ? 0.9 : safeTone === 'concise' ? 0.5 : 0.7,
    });

    const variants: string[] = [];
    for (const choice of completion.choices) {
      const content = choice.message?.content?.trim();
      if (content && !variants.includes(content)) {
        variants.push(content);
      }
    }

    if (variants.length === 0) {
      throw new Error('No response received from OpenAI');
    }

    return { rewritten: variants[0], variants };
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
    throw error;
  }
} 

export interface ProactiveCheckResponse {
  /** Whether any corrections were found. */
  hasIssues: boolean;
  /** Approximate number of distinct corrections. */
  issueCount: number;
  /** Fully corrected version of the text (equals input when no issues). */
  corrected: string;
}

/**
 * Lightweight grammar/spelling scan used by the extension's proactive
 * (check-while-typing) feature. Always uses the fast/cheap model since
 * it runs in the background on every typing pause.
 */
export async function proactiveCheck(text: string): Promise<ProactiveCheckResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: DEFAULT_MODEL,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a strict grammar and spelling checker. The user sends text they are typing. ' +
            'Fix only clear grammar, spelling, and punctuation mistakes. Never change meaning, style, tone, or formatting. ' +
            'Respond with JSON: {"corrected": string, "issues": number} where "issues" is the number of distinct corrections you made. ' +
            'If the text has no mistakes, return the text unchanged with "issues": 0.',
        },
        {
          role: 'user',
          content: text,
        },
      ],
      max_tokens: 1200,
      temperature: 0,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error('No response received from OpenAI');
    }

    let parsed: { corrected?: unknown; issues?: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Invalid response format from OpenAI');
    }

    const corrected = typeof parsed.corrected === 'string' ? parsed.corrected.trim() : text;
    const issueCount =
      typeof parsed.issues === 'number' && Number.isFinite(parsed.issues)
        ? Math.max(0, Math.round(parsed.issues))
        : corrected !== text.trim() ? 1 : 0;
    const hasIssues = issueCount > 0 && corrected !== text.trim();

    return {
      hasIssues,
      issueCount: hasIssues ? issueCount : 0,
      corrected: hasIssues ? corrected : text.trim(),
    };
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
 * @param options - Plan-dependent model
 * @returns Promise<GrammarResponse> - The grammar-corrected text
 */
export async function correctGrammar(
  text: string,
  options: CompletionOptions = {}
): Promise<GrammarResponse> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text is required and cannot be empty');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
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