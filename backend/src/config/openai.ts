/**
 * OpenAI Client Configuration
 *
 * Initializes and exports the OpenAI client for:
 * - Application generation (resume + cover letter)
 * - Match score analysis with AI insights
 * - Content optimization suggestions
 *
 * Uses lazy initialization to fail fast if API key is missing
 */

import OpenAI from 'openai';

// =============================================================================
// Environment Validation
// =============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// =============================================================================
// OpenAI Client Instance
// =============================================================================

let openaiClient: OpenAI | null = null;

/**
 * Get the OpenAI client instance
 * Uses lazy initialization to allow the app to start even if OpenAI is not configured
 * (useful for development/testing without OpenAI access)
 *
 * @throws Error if OPENAI_API_KEY is not set when client is requested
 */
export function getOpenAI(): OpenAI {
  if (!openaiClient) {
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiClient = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openaiClient;
}

// =============================================================================
// Model Configuration
// =============================================================================

/**
 * OpenAI model identifiers for different use cases
 * Centralizing these allows easy model upgrades across the codebase
 */
export const MODELS = {
  /**
   * Primary model for application generation
   * GPT-4o-mini offers good quality at lower cost
   */
  APPLICATION_GENERATION: 'gpt-4o-mini',

  /**
   * Model for match score AI analysis
   * Using faster model for real-time scoring
   */
  MATCH_ANALYSIS: 'gpt-4o-mini',

  /**
   * Model for content optimization suggestions
   */
  CONTENT_OPTIMIZATION: 'gpt-4o-mini',
} as const;

// =============================================================================
// Generation Parameters
// =============================================================================

/**
 * Default parameters for application generation
 */
export const GENERATION_CONFIG = {
  /**
   * Temperature for resume/cover letter generation
   * 0.7 provides good balance between creativity and consistency
   */
  TEMPERATURE: 0.7,

  /**
   * Maximum tokens for generated content
   */
  MAX_TOKENS: 3000,

  /**
   * Request timeout in milliseconds
   */
  TIMEOUT_MS: 60000,
} as const;

// =============================================================================
// Prompt Templates
// =============================================================================

/**
 * System prompts for different generation strategies
 */
export const GENERATION_STRATEGIES = [
  {
    id: 'variant-impact',
    name: 'Impact-Focused',
    prompt: 'Focus on metrics and business impact',
  },
  {
    id: 'variant-keyword',
    name: 'Keyword-Optimized',
    prompt: 'Maximize ATS keyword matches',
  },
  {
    id: 'variant-concise',
    name: 'Concise',
    prompt: 'Streamlined one-page version',
  },
] as const;

export type GenerationStrategy = (typeof GENERATION_STRATEGIES)[number];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if OpenAI is configured and available
 * Useful for feature flags and graceful degradation
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY;
}

/**
 * Estimate token count for a string (rough approximation)
 * Rule of thumb: 1 token ~= 4 characters in English
 *
 * @param text - Text to estimate tokens for
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate text to fit within token limit
 *
 * @param text - Text to truncate
 * @param maxTokens - Maximum tokens allowed
 * @returns Truncated text
 */
export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) {
    return text;
  }
  return text.slice(0, maxChars - 3) + '...';
}
