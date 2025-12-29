/**
 * OpenAI Service with AI Gateway Monitoring
 *
 * This module provides wrapper functions for OpenAI API calls with comprehensive
 * monitoring and logging for AI Gateway integration.
 *
 * USAGE:
 * Once AI Gateway is implemented, replace direct OpenAI calls with these wrappers:
 *
 * Before:
 *   const completion = await openai.chat.completions.create({...});
 *
 * After:
 *   const completion = await monitoredChatCompletion(openai, {...}, metadata);
 *
 * The wrappers automatically:
 * - Log cache hits/misses
 * - Track response times
 * - Calculate token costs
 * - Mask PII in logs
 * - Warn on performance issues
 */

import type OpenAI from 'openai';
import type { ChatCompletionCreateParamsNonStreaming } from 'openai/resources/chat/completions';
import { aiMonitoring } from './ai-monitoring.service';
import type {
  AIOperationType,
  AIGatewayRequestMetadata,
} from '../types/ai-monitoring';

/**
 * Extended OpenAI client response with headers
 */
interface CompletionWithHeaders {
  completion: OpenAI.Chat.Completions.ChatCompletion;
  headers?: Headers | Record<string, string>;
}

/**
 * Monitored chat completion request
 *
 * This function wraps the OpenAI chat completion API with monitoring.
 * It logs cache status, response time, token usage, and costs.
 *
 * @param openai - OpenAI client instance (configured with AI Gateway)
 * @param params - Chat completion parameters
 * @param operationType - Type of AI operation (for categorization)
 * @param userId - User ID (will be masked in logs)
 * @param jobId - Job ID (optional, for context)
 * @returns Chat completion response
 */
export async function monitoredChatCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  operationType: AIOperationType,
  userId?: string,
  jobId?: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  // Create request metadata
  const metadata = aiMonitoring.createRequestMetadata(
    operationType,
    params.model,
    userId,
    jobId
  );

  // Execute with monitoring
  const result = await aiMonitoring.measureAndLog(
    async () => {
      // Call OpenAI API
      const completion = await openai.chat.completions.create(params);

      // Note: Access to response headers depends on OpenAI SDK version
      // The monitoring will extract cache status if headers are available
      return {
        completion,
        headers: undefined, // TODO: Extract headers when AI Gateway is implemented
      };
    },
    metadata,
    (result) => ({
      inputTokens: result.completion.usage?.prompt_tokens || 0,
      outputTokens: result.completion.usage?.completion_tokens || 0,
      httpStatus: 200,
    }),
    (result) => result.headers
  );

  return result.completion;
}

/**
 * Monitored resume parsing
 *
 * Wrapper for resume parsing operations with specific monitoring context.
 */
export async function monitoredResumeParsingCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  userId: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return monitoredChatCompletion(
    openai,
    params,
    'resume_parsing',
    userId
  );
}

/**
 * Monitored application generation
 *
 * Wrapper for application variant generation with specific monitoring context.
 */
export async function monitoredApplicationGenerationCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  userId: string,
  jobId: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return monitoredChatCompletion(
    openai,
    params,
    'application_generation',
    userId,
    jobId
  );
}

/**
 * Monitored cover letter generation
 *
 * Wrapper for cover letter generation with specific monitoring context.
 */
export async function monitoredCoverLetterCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  userId: string,
  jobId: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return monitoredChatCompletion(
    openai,
    params,
    'cover_letter_generation',
    userId,
    jobId
  );
}

/**
 * Monitored job compatibility analysis
 *
 * Wrapper for job matching/compatibility analysis with specific monitoring context.
 */
export async function monitoredJobCompatibilityCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  userId: string,
  jobId: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return monitoredChatCompletion(
    openai,
    params,
    'job_compatibility_analysis',
    userId,
    jobId
  );
}

/**
 * Monitored match insights generation
 *
 * Wrapper for match insights with specific monitoring context.
 */
export async function monitoredMatchInsightsCompletion(
  openai: OpenAI,
  params: ChatCompletionCreateParamsNonStreaming,
  userId: string,
  jobId: string
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  return monitoredChatCompletion(
    openai,
    params,
    'match_insights',
    userId,
    jobId
  );
}

/**
 * Create AI Gateway request metadata manually
 * (for use in custom logging scenarios)
 */
export function createAIGatewayMetadata(
  operationType: AIOperationType,
  model: string,
  userId?: string,
  jobId?: string
): AIGatewayRequestMetadata {
  return aiMonitoring.createRequestMetadata(operationType, model, userId, jobId);
}

/**
 * Log custom AI operation
 * (for operations not covered by standard wrappers)
 */
export async function logAIOperation<T>(
  fn: () => Promise<T>,
  metadata: AIGatewayRequestMetadata,
  getTokenUsage: (result: T) => { inputTokens: number; outputTokens: number }
): Promise<T> {
  return aiMonitoring.measureAndLog(
    fn,
    metadata,
    getTokenUsage,
    undefined
  );
}

/**
 * Example usage in openai.service.ts:
 *
 * ```typescript
 * // Before (without monitoring):
 * const completion = await openai.chat.completions.create({
 *   model: 'gpt-4o',
 *   messages: [...],
 *   temperature: 0.3,
 * });
 *
 * // After (with monitoring):
 * const completion = await monitoredResumeParsingCompletion(
 *   openai,
 *   {
 *     model: 'gpt-4o',
 *     messages: [...],
 *     temperature: 0.3,
 *   },
 *   userId
 * );
 * ```
 *
 * This will automatically log:
 * - [AI Gateway] [resume_parsing] [gpt-4o] [Cache: HIT] [245ms] [3542 tokens] [$0.0354]
 * - [AI Gateway] [resume_parsing] [gpt-4o] [Cache: MISS] [3124ms] [3542 tokens] [$0.0354]
 */
