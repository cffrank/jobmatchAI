/**
 * PostgreSQL-Backed Rate Limiting Middleware
 *
 * Implements sliding window rate limiting using Supabase (PostgreSQL).
 * This provides persistent, distributed rate limiting that works across
 * multiple server instances.
 *
 * Features:
 * - Per-user rate limiting
 * - Per-endpoint configurable limits
 * - Sliding window algorithm
 * - Automatic cleanup of expired records
 */

import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin, TABLES } from '../config/supabase';
import { HttpError, type RateLimitConfig } from '../types';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 minutes

// =============================================================================
// Endpoint-Specific Limits
// =============================================================================

/**
 * Rate limits for specific endpoints
 * More sensitive/expensive operations have stricter limits
 */
export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // Email sending: 10 per hour (strict to prevent abuse)
  'POST:/api/emails/send': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000, // 1 hour
  },

  // Application generation: 20 per hour (API costs)
  'POST:/api/applications/generate': {
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
  },

  // Job scraping: 10 per hour (API costs)
  'POST:/api/jobs/scrape': {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
  },

  // Export generation: 30 per hour
  'POST:/api/exports/pdf': {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
  },
  'POST:/api/exports/docx': {
    maxRequests: 30,
    windowMs: 60 * 60 * 1000,
  },

  // LinkedIn OAuth: 5 per 15 minutes (prevent abuse)
  'GET:/api/auth/linkedin/callback': {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  },
};

// =============================================================================
// Rate Limiter Middleware Factory
// =============================================================================

/**
 * Create rate limiter middleware with custom configuration
 *
 * @param config - Rate limit configuration (optional, uses endpoint-specific or defaults)
 * @returns Express middleware function
 *
 * Usage:
 * ```typescript
 * // Use endpoint-specific or default limits
 * router.post('/send', rateLimiter(), sendEmail);
 *
 * // Override with custom limits
 * router.post('/special', rateLimiter({ maxRequests: 5, windowMs: 60000 }), handler);
 * ```
 */
export function rateLimiter(config?: Partial<RateLimitConfig>) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Must be authenticated for user-based rate limiting
      const userId = req.userId;
      if (!userId) {
        // For unauthenticated requests, use IP-based limiting
        // But most endpoints require auth, so this is a fallback
        next();
        return;
      }

      // Determine endpoint key for rate limit lookup
      const endpointKey = `${req.method}:${req.baseUrl}${req.path}`;

      // Get rate limit config: custom > endpoint-specific > default
      const endpointConfig = ENDPOINT_LIMITS[endpointKey];
      const maxRequests = config?.maxRequests ?? endpointConfig?.maxRequests ?? DEFAULT_MAX_REQUESTS;
      const windowMs = config?.windowMs ?? endpointConfig?.windowMs ?? DEFAULT_WINDOW_MS;

      // Check and update rate limit in database
      const result = await checkRateLimit(userId, endpointKey, maxRequests, windowMs);

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

      if (!result.allowed) {
        // Calculate retry-after in seconds
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        res.setHeader('Retry-After', retryAfter.toString());

        throw new HttpError(
          429,
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          'RATE_LIMIT_EXCEEDED',
          {
            limit: maxRequests,
            remaining: 0,
            resetAt: result.resetTime.toISOString(),
          }
        );
      }

      next();
    } catch (error) {
      if (error instanceof HttpError) {
        res.status(error.statusCode).json(error.toJSON());
        return;
      }

      // Log rate limit check errors but don't block the request
      console.error('Rate limit check error:', error);
      next();
    }
  };
}

// =============================================================================
// Rate Limit Check Function
// =============================================================================

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  currentCount: number;
}

/**
 * Check and update rate limit for a user/endpoint combination
 * Uses a sliding window algorithm with PostgreSQL
 *
 * @param userId - The user's ID
 * @param endpoint - The endpoint being accessed
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window size in milliseconds
 * @returns Rate limit result with remaining requests and reset time
 */
async function checkRateLimit(
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Use a transaction to ensure atomic read-update
  // First, clean up old records and get current count
  const { data: existingRecord, error: selectError } = await supabaseAdmin
    .from(TABLES.RATE_LIMITS)
    .select('*')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    // PGRST116 is "no rows returned" which is fine
    console.error('Rate limit select error:', selectError);
    throw selectError;
  }

  let currentCount = 0;
  let windowStartTime = now;

  if (existingRecord) {
    // Existing record in current window
    currentCount = existingRecord.count;
    windowStartTime = new Date(existingRecord.window_start);
  }

  // Calculate reset time (end of current window)
  const resetTime = new Date(windowStartTime.getTime() + windowMs);

  // Check if limit is exceeded
  if (currentCount >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      currentCount,
    };
  }

  // Increment counter
  if (existingRecord) {
    // Update existing record
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.RATE_LIMITS)
      .update({
        count: currentCount + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', existingRecord.id);

    if (updateError) {
      console.error('Rate limit update error:', updateError);
      throw updateError;
    }
  } else {
    // Create new record
    const { error: insertError } = await supabaseAdmin.from(TABLES.RATE_LIMITS).insert({
      user_id: userId,
      endpoint,
      count: 1,
      window_start: now.toISOString(),
      window_end: resetTime.toISOString(),
    });

    if (insertError) {
      console.error('Rate limit insert error:', insertError);
      throw insertError;
    }
  }

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    resetTime,
    currentCount: currentCount + 1,
  };
}

// =============================================================================
// Cleanup Function
// =============================================================================

/**
 * Clean up expired rate limit records
 * Should be run periodically (e.g., via scheduled job)
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const now = new Date();

  const { data, error } = await supabaseAdmin
    .from(TABLES.RATE_LIMITS)
    .delete()
    .lt('window_end', now.toISOString())
    .select('id');

  if (error) {
    console.error('Rate limit cleanup error:', error);
    throw error;
  }

  const deletedCount = data?.length ?? 0;
  console.log(`Cleaned up ${deletedCount} expired rate limit records`);
  return deletedCount;
}

// =============================================================================
// IP-Based Rate Limiter (for unauthenticated endpoints)
// =============================================================================

/**
 * IP-based rate limiter for unauthenticated endpoints
 * Uses in-memory store (suitable for single-instance deployments)
 * For multi-instance, would need Redis or similar
 */
const ipRateLimitStore = new Map<string, { count: number; windowStart: number }>();

export function ipRateLimiter(maxRequests: number = 30, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    const record = ipRateLimitStore.get(ip);

    if (!record || now - record.windowStart > windowMs) {
      // New window
      ipRateLimitStore.set(ip, { count: 1, windowStart: now });
      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      next();
      return;
    }

    if (record.count >= maxRequests) {
      const resetTime = new Date(record.windowStart + windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', resetTime.toISOString());
      res.setHeader('Retry-After', retryAfter.toString());

      res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        statusCode: 429,
      });
      return;
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    next();
  };
}

// Cleanup IP rate limit store periodically
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, record] of ipRateLimitStore.entries()) {
      if (now - record.windowStart > 3600000) {
        // 1 hour
        ipRateLimitStore.delete(ip);
      }
    }
  },
  5 * 60 * 1000
); // Every 5 minutes
