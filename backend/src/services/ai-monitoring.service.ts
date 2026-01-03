/**
 * AI Gateway Monitoring Service
 *
 * Provides comprehensive logging and monitoring for AI Gateway requests.
 * Tracks cache performance, response times, token usage, and costs.
 *
 * IMPORTANT: All logs are PII-safe (user IDs are masked, no personal data logged).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  AIGatewayLogEntry,
  AIGatewayRequestMetadata,
  AIGatewayResponseMetrics,
  AIGatewayError,
  AIOperationType,
  AIGatewayCacheStatus,
} from '../types/ai-monitoring';
import {
  calculateCost,
  maskUserId,
  sanitizeErrorMessage,
} from '../types/ai-monitoring';

/**
 * AI Monitoring Service
 *
 * Singleton service for logging and tracking AI Gateway operations.
 */
class AIMonitoringService {
  private enabled: boolean;

  constructor() {
    // Enable monitoring in all environments except test
    this.enabled = process.env.NODE_ENV !== 'test';
  }

  /**
   * Create a new request metadata object
   */
  createRequestMetadata(
    operationType: AIOperationType,
    model: string,
    userId?: string,
    jobId?: string
  ): AIGatewayRequestMetadata {
    return {
      operationType,
      model,
      timestamp: new Date().toISOString(),
      requestId: uuidv4(),
      maskedUserId: userId ? maskUserId(userId) : undefined,
      jobId,
    };
  }

  /**
   * Extract cache status from AI Gateway response headers
   */
  extractCacheStatus(headers?: Headers | Record<string, string>): AIGatewayCacheStatus {
    if (!headers) return 'UNKNOWN';

    const cacheStatus =
      headers instanceof Headers
        ? headers.get('cf-aig-cache-status')
        : headers['cf-aig-cache-status'];

    if (!cacheStatus) return 'UNKNOWN';

    const normalized = cacheStatus.toUpperCase();
    if (normalized === 'HIT' || normalized === 'MISS' || normalized === 'BYPASS') {
      return normalized as AIGatewayCacheStatus;
    }

    return 'UNKNOWN';
  }

  /**
   * Create response metrics from AI completion
   */
  createResponseMetrics(
    cacheStatus: AIGatewayCacheStatus,
    responseTimeMs: number,
    model: string,
    inputTokens: number,
    outputTokens: number,
    httpStatus: number,
    success: boolean
  ): AIGatewayResponseMetrics {
    const totalTokens = inputTokens + outputTokens;
    const estimatedCostUsd = calculateCost(model, inputTokens, outputTokens);

    return {
      cacheStatus,
      responseTimeMs,
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCostUsd,
      httpStatus,
      success,
    };
  }

  /**
   * Create error information (sanitized)
   */
  createError(
    error: Error | unknown,
    httpStatus: number = 500,
    retryable: boolean = false
  ): AIGatewayError {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = this.extractErrorCode(error);

    return {
      code: errorCode,
      message: sanitizeErrorMessage(errorMessage),
      httpStatus,
      retryable,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error
        ? error.stack
        : undefined,
    };
  }

  /**
   * Extract error code from various error types
   */
  private extractErrorCode(error: unknown): string {
    if (error && typeof error === 'object') {
      if ('code' in error && typeof error.code === 'string') {
        return error.code;
      }
      if ('name' in error && typeof error.name === 'string') {
        return error.name;
      }
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Log AI Gateway request/response
   */
  log(entry: AIGatewayLogEntry): void {
    if (!this.enabled) return;

    const { level, request, response, error, context } = entry;

    // Build log message
    const logParts: string[] = [
      `[AI Gateway]`,
      `[${request.operationType}]`,
      `[${request.model}]`,
      `[RequestID: ${request.requestId}]`,
    ];

    if (request.maskedUserId) {
      logParts.push(`[User: ${request.maskedUserId}]`);
    }

    if (request.jobId) {
      logParts.push(`[Job: ${request.jobId}]`);
    }

    if (response) {
      logParts.push(`[Cache: ${response.cacheStatus}]`);
      logParts.push(`[${response.responseTimeMs}ms]`);
      logParts.push(`[${response.totalTokens} tokens]`);
      logParts.push(`[$${response.estimatedCostUsd.toFixed(4)}]`);

      if (!response.success) {
        logParts.push(`[HTTP ${response.httpStatus}]`);
      }
    }

    if (error) {
      logParts.push(`[Error: ${error.code}]`);
      logParts.push(`[${error.message}]`);
    }

    const logMessage = logParts.join(' ');

    // Log at appropriate level
    switch (level) {
      case 'info':
        console.log(logMessage, context || {});
        break;
      case 'warn':
        console.warn(logMessage, context || {});
        break;
      case 'error':
        console.error(logMessage, context || {});
        break;
    }

    // Emit metrics for analytics (could be extended to push to monitoring service)
    this.emitMetrics(entry);
  }

  /**
   * Log successful AI Gateway request
   */
  logSuccess(
    request: AIGatewayRequestMetadata,
    response: AIGatewayResponseMetrics,
    context?: Record<string, unknown>
  ): void {
    this.log({
      level: 'info',
      request,
      response,
      context,
    });
  }

  /**
   * Log failed AI Gateway request
   */
  logError(
    request: AIGatewayRequestMetadata,
    error: AIGatewayError,
    response?: AIGatewayResponseMetrics,
    context?: Record<string, unknown>
  ): void {
    this.log({
      level: 'error',
      request,
      response,
      error,
      context,
    });
  }

  /**
   * Log warning (e.g., high latency, cache miss on expected hit)
   */
  logWarning(
    request: AIGatewayRequestMetadata,
    response: AIGatewayResponseMetrics,
    warningMessage: string,
    context?: Record<string, unknown>
  ): void {
    this.log({
      level: 'warn',
      request,
      response,
      context: {
        ...context,
        warning: warningMessage,
      },
    });
  }

  /**
   * Emit metrics for external monitoring systems
   * (Placeholder for future integration with Datadog, Prometheus, etc.)
   */
  private emitMetrics(entry: AIGatewayLogEntry): void {
    // TODO: Integrate with monitoring service when ready
    // Examples:
    // - Push to Datadog: dogstatsd.increment('ai_gateway.requests', 1, tags)
    // - Push to Prometheus: prometheusRegistry.increment('ai_gateway_requests_total', labels)
    // - Push to CloudWatch: cloudwatch.putMetricData(...)

    // For now, just log a summary for manual analysis
    if (entry.response && this.enabled) {
      // In production, this could be sent to a metrics aggregation service
      if (process.env.NODE_ENV === 'production') {
        // Example: await metricsService.record(summary);
        // Summary would include: timestamp, operation, model, cacheStatus, responseTime, tokens, cost, success
      }
    }
  }

  /**
   * Helper: Measure execution time and log
   */
  async measureAndLog<T>(
    fn: () => Promise<T>,
    metadata: AIGatewayRequestMetadata,
    getTokenUsage: (result: T) => { inputTokens: number; outputTokens: number; httpStatus?: number },
    extractHeaders?: (result: T) => Headers | Record<string, string> | undefined
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const result = await fn();
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      const { inputTokens, outputTokens, httpStatus = 200 } = getTokenUsage(result);
      const headers = extractHeaders ? extractHeaders(result) : undefined;
      const cacheStatus = this.extractCacheStatus(headers);

      const responseMetrics = this.createResponseMetrics(
        cacheStatus,
        responseTimeMs,
        metadata.model,
        inputTokens,
        outputTokens,
        httpStatus,
        true
      );

      this.logSuccess(metadata, responseMetrics);

      // Warn if cache miss on expected cacheable request
      if (cacheStatus === 'MISS' && this.isCacheableOperation(metadata.operationType)) {
        this.logWarning(
          metadata,
          responseMetrics,
          `Cache MISS on cacheable operation: ${metadata.operationType}`
        );
      }

      // Warn if high latency
      if (responseTimeMs > 5000) {
        this.logWarning(
          metadata,
          responseMetrics,
          `High latency detected: ${responseTimeMs}ms`
        );
      }

      return result;
    } catch (error) {
      const endTime = Date.now();
      const responseTimeMs = endTime - startTime;

      const aiError = this.createError(error, 500, this.isRetryableError(error));

      this.logError(metadata, aiError, undefined, {
        responseTimeMs,
      });

      throw error;
    }
  }

  /**
   * Check if operation is expected to be cacheable
   */
  private isCacheableOperation(operationType: AIOperationType): boolean {
    // Resume parsing and job compatibility are highly cacheable
    return operationType === 'resume_parsing' || operationType === 'job_compatibility_analysis';
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error && typeof error === 'object') {
      // OpenAI rate limit errors
      if ('status' in error && error.status === 429) {
        return true;
      }

      // Network errors
      if ('code' in error) {
        const code = String(error.code);
        return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'].includes(code);
      }
    }

    return false;
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const aiMonitoring = new AIMonitoringService();
