/**
 * AI Gateway Monitoring Types
 *
 * Type definitions for tracking AI Gateway performance, caching, and costs.
 * These types support comprehensive observability for the Cloudflare AI Gateway integration.
 */

/**
 * Cache status from AI Gateway response headers
 */
export type AIGatewayCacheStatus = 'HIT' | 'MISS' | 'BYPASS' | 'UNKNOWN';

/**
 * AI operation types for categorizing requests
 */
export type AIOperationType =
  | 'resume_parsing'
  | 'application_generation'
  | 'cover_letter_generation'
  | 'job_compatibility_analysis'
  | 'match_insights'
  | 'embedding_generation';

/**
 * Log level for AI operations
 */
export type AILogLevel = 'info' | 'warn' | 'error';

/**
 * AI Gateway request metadata
 */
export interface AIGatewayRequestMetadata {
  /** Operation type (e.g., resume_parsing, application_generation) */
  operationType: AIOperationType;

  /** OpenAI model used (e.g., gpt-4o, gpt-4o-mini) */
  model: string;

  /** Request timestamp (ISO 8601) */
  timestamp: string;

  /** Request ID for correlation (generated UUID) */
  requestId: string;

  /** Masked user ID (e.g., user_abc***xyz) for tracking without exposing PII */
  maskedUserId?: string;

  /** Job ID if applicable (NOT masked, as it's not PII) */
  jobId?: string;
}

/**
 * AI Gateway response metrics
 */
export interface AIGatewayResponseMetrics {
  /** Cache status from cf-aig-cache-status header */
  cacheStatus: AIGatewayCacheStatus;

  /** Response time in milliseconds */
  responseTimeMs: number;

  /** Input tokens consumed */
  inputTokens: number;

  /** Output tokens consumed */
  outputTokens: number;

  /** Total tokens consumed */
  totalTokens: number;

  /** Estimated cost in USD */
  estimatedCostUsd: number;

  /** HTTP status code */
  httpStatus: number;

  /** Whether the request succeeded */
  success: boolean;
}

/**
 * AI Gateway error information
 */
export interface AIGatewayError {
  /** Error code (e.g., RATE_LIMIT_EXCEEDED, INVALID_REQUEST) */
  code: string;

  /** Error message (sanitized, no PII) */
  message: string;

  /** HTTP status code */
  httpStatus: number;

  /** Whether error is retryable */
  retryable: boolean;

  /** Stack trace (only in development) */
  stack?: string;
}

/**
 * Complete AI Gateway log entry
 */
export interface AIGatewayLogEntry {
  /** Log level */
  level: AILogLevel;

  /** Request metadata */
  request: AIGatewayRequestMetadata;

  /** Response metrics (omitted if request failed before response) */
  response?: AIGatewayResponseMetrics;

  /** Error information (only present if request failed) */
  error?: AIGatewayError;

  /** Additional context (sanitized, no PII) */
  context?: Record<string, unknown>;
}

/**
 * Aggregated AI Gateway metrics (for analytics)
 */
export interface AIGatewayAggregatedMetrics {
  /** Metric collection period start (ISO 8601) */
  periodStart: string;

  /** Metric collection period end (ISO 8601) */
  periodEnd: string;

  /** Total requests made */
  totalRequests: number;

  /** Cache hit count */
  cacheHits: number;

  /** Cache miss count */
  cacheMisses: number;

  /** Cache hit rate (0-100%) */
  cacheHitRate: number;

  /** Average response time for cache hits (ms) */
  avgCacheHitResponseMs: number;

  /** Average response time for cache misses (ms) */
  avgCacheMissResponseMs: number;

  /** Total tokens consumed */
  totalTokens: number;

  /** Total estimated cost (USD) */
  totalCostUsd: number;

  /** Error count */
  errorCount: number;

  /** Error rate (0-100%) */
  errorRate: number;

  /** Breakdown by operation type */
  byOperationType: Record<AIOperationType, {
    count: number;
    cacheHitRate: number;
    avgResponseMs: number;
    totalCostUsd: number;
  }>;
}

/**
 * Cost tracking per model
 */
export interface ModelCostConfig {
  /** Model identifier (e.g., gpt-4o, gpt-4o-mini) */
  model: string;

  /** Input cost per 1M tokens (USD) */
  inputCostPer1M: number;

  /** Output cost per 1M tokens (USD) */
  outputCostPer1M: number;
}

/**
 * Alert thresholds for monitoring
 */
export interface AIGatewayAlertThresholds {
  /** Alert if cache hit rate drops below this percentage */
  minCacheHitRatePercent: number;

  /** Alert if error rate exceeds this percentage */
  maxErrorRatePercent: number;

  /** Alert if response time (p95) exceeds this value (ms) */
  maxP95ResponseMs: number;

  /** Alert if hourly cost exceeds this amount (USD) */
  maxHourlyCostUsd: number;

  /** Alert if daily cost exceeds this amount (USD) */
  maxDailyCostUsd: number;
}

/**
 * Default alert thresholds based on project requirements
 */
export const DEFAULT_ALERT_THRESHOLDS: AIGatewayAlertThresholds = {
  minCacheHitRatePercent: 30, // Alert if cache hit rate < 30% (target is 60-80%)
  maxErrorRatePercent: 5,     // Alert if error rate > 5%
  maxP95ResponseMs: 5000,     // Alert if p95 latency > 5 seconds
  maxHourlyCostUsd: 5,        // Alert if hourly cost > $5 (safety threshold)
  maxDailyCostUsd: 30,        // Alert if daily cost > $30 (monthly budget $94)
};

/**
 * Model cost configuration
 * Prices as of January 2025
 */
export const MODEL_COSTS: Record<string, ModelCostConfig> = {
  'gpt-4o': {
    model: 'gpt-4o',
    inputCostPer1M: 2.50,
    outputCostPer1M: 10.00,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  'gpt-4': {
    model: 'gpt-4',
    inputCostPer1M: 30.00,
    outputCostPer1M: 60.00,
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
  },
};

/**
 * Helper function to calculate cost from token usage
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const costConfig = MODEL_COSTS[model];
  if (!costConfig) {
    console.warn(`[AI Monitoring] Unknown model: ${model}, using gpt-4o-mini pricing as fallback`);
    return calculateCost('gpt-4o-mini', inputTokens, outputTokens);
  }

  const inputCost = (inputTokens / 1_000_000) * costConfig.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * costConfig.outputCostPer1M;

  return inputCost + outputCost;
}

/**
 * Helper function to mask user ID for logging (PII protection)
 * Example: "user_123456789" → "user_123***789"
 */
export function maskUserId(userId: string): string {
  if (!userId || userId.length < 10) {
    return 'user_***';
  }

  const prefix = userId.substring(0, 8);
  const suffix = userId.substring(userId.length - 3);

  return `${prefix}***${suffix}`;
}

/**
 * Helper function to sanitize error messages (remove PII)
 */
export function sanitizeErrorMessage(message: string): string {
  // Remove user IDs first (before phone numbers, to avoid conflicts)
  let sanitized = message.replace(/user_[a-zA-Z0-9]+/g, 'user_[REDACTED]');

  // Remove API keys
  sanitized = sanitized.replace(/sk-[a-zA-Z0-9]+/g, 'sk-[REDACTED]');

  // Remove email addresses
  sanitized = sanitized.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');

  // Remove phone numbers (various formats)
  // Matches: 555-123-4567, 555.123.4567, 5551234567, (555-1234), etc.
  sanitized = sanitized.replace(/\(?\d{3}\)?[-.]?\d{3,4}[-.]?\d{4}\b/g, '[PHONE]');
  // Also match shorter partial phone numbers like 555-1234
  sanitized = sanitized.replace(/\b\d{3}[-]\d{4}\b/g, '[PHONE]');

  return sanitized;
}
