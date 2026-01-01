/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Implements sliding window rate limiting using:
 * - Cloudflare KV for authenticated user rate limiting (< 10ms latency)
 * - In-memory Map for IP-based rate limiting (per-isolate)
 *
 * Migration from PostgreSQL → KV (Phase 2.2):
 * - KV key format: rate:user:{userId}:{endpoint} or rate:ip:{ipAddress}
 * - TTL: 1 hour (automatic expiry, no cleanup job needed)
 * - 10x faster than PostgreSQL (50ms → <10ms latency)
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, RateLimitConfig } from '../types';
import { HttpError } from '../types';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_MAX_REQUESTS = 100;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// =============================================================================
// Endpoint-Specific Limits
// =============================================================================

export const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  // Email sending: 10 per hour (strict to prevent abuse)
  'POST:/api/emails/send': { maxRequests: 10, windowMs: 60 * 60 * 1000 },

  // Application generation: 20 per hour (API costs)
  'POST:/api/applications/generate': { maxRequests: 20, windowMs: 60 * 60 * 1000 },

  // Job scraping: 10 per hour (API costs)
  'POST:/api/jobs/scrape': { maxRequests: 10, windowMs: 60 * 60 * 1000 },

  // Resume parsing: 20 per hour (API costs)
  'POST:/api/resume/parse': { maxRequests: 20, windowMs: 60 * 60 * 1000 },

  // Export generation: 30 per hour
  'POST:/api/exports/pdf': { maxRequests: 30, windowMs: 60 * 60 * 1000 },
  'POST:/api/exports/docx': { maxRequests: 30, windowMs: 60 * 60 * 1000 },

  // LinkedIn OAuth: 5 per 15 minutes (prevent abuse)
  'GET:/api/auth/linkedin/initiate': { maxRequests: 5, windowMs: 15 * 60 * 1000 },
};

// =============================================================================
// Rate Limiter Middleware Factory
// =============================================================================

/**
 * Create rate limiter middleware with custom configuration
 * Uses PostgreSQL for authenticated users
 */
export function rateLimiter(config?: Partial<RateLimitConfig>): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    try {
      const userId = c.get('userId');
      if (!userId) {
        // For unauthenticated requests, use IP-based limiting
        return next();
      }

      // Determine endpoint key for rate limit lookup
      const endpointKey = `${c.req.method}:${c.req.path}`;

      // Get rate limit config: custom > endpoint-specific > default
      const endpointConfig = ENDPOINT_LIMITS[endpointKey];
      const maxRequests = config?.maxRequests ?? endpointConfig?.maxRequests ?? DEFAULT_MAX_REQUESTS;
      const windowMs = config?.windowMs ?? endpointConfig?.windowMs ?? DEFAULT_WINDOW_MS;

      // Check and update rate limit in database
      const result = await checkRateLimit(c.env, userId, endpointKey, maxRequests, windowMs);

      // Set rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', result.remaining.toString());
      c.header('X-RateLimit-Reset', result.resetTime.toISOString());

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime.getTime() - Date.now()) / 1000);
        c.header('Retry-After', retryAfter.toString());

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

      return next();
    } catch (error) {
      if (error instanceof HttpError) {
        return c.json(error.toJSON(), 429);
      }

      // Log rate limit check errors but don't block the request
      console.error('Rate limit check error:', error);
      return next();
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

interface KVRateLimitData {
  count: number;
  windowStart: number; // Unix timestamp in milliseconds
}

/**
 * Check and update rate limit using Cloudflare KV
 *
 * KV-based rate limiting (Phase 2.2):
 * - Key: rate:user:{userId}:{endpoint}
 * - Value: JSON { count: number, windowStart: timestamp }
 * - TTL: 1 hour (automatic expiry)
 * - Latency: <10ms (10x faster than PostgreSQL)
 */
async function checkRateLimit(
  env: Env,
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const startTime = Date.now();
  const now = Date.now();
  const key = `rate:user:${userId}:${endpoint}`;

  try {
    // Get existing rate limit record from KV
    const existingData = await env.RATE_LIMITS.get(key, { type: 'json' }) as KVRateLimitData | null;

    let currentCount = 0;
    let windowStart = now;

    if (existingData) {
      // Check if window is still valid
      const windowAge = now - existingData.windowStart;

      if (windowAge < windowMs) {
        // Window is still active, use existing data
        currentCount = existingData.count;
        windowStart = existingData.windowStart;
      }
      // else: window expired, will start new window
    }

    const resetTime = new Date(windowStart + windowMs);

    // Check if limit is exceeded
    if (currentCount >= maxRequests) {
      const latency = Date.now() - startTime;
      console.log(`[RateLimit] User ${userId} exceeded limit for ${endpoint} (${latency}ms latency)`);

      return {
        allowed: false,
        remaining: 0,
        resetTime,
        currentCount,
      };
    }

    // Increment counter and store in KV
    const newCount = currentCount + 1;
    const newData: KVRateLimitData = {
      count: newCount,
      windowStart,
    };

    // Store with TTL (1 hour, covers all windowMs configs)
    await env.RATE_LIMITS.put(key, JSON.stringify(newData), {
      expirationTtl: 60 * 60, // 1 hour
    });

    const latency = Date.now() - startTime;
    console.log(
      `[RateLimit] User ${userId} request ${newCount}/${maxRequests} for ${endpoint} (${latency}ms latency)`
    );

    return {
      allowed: true,
      remaining: maxRequests - newCount,
      resetTime,
      currentCount: newCount,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`[RateLimit] KV error for user ${userId} after ${latency}ms:`, error);

    // On KV error, allow request but log error (fail open for availability)
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetTime: new Date(now + windowMs),
      currentCount: 1,
    };
  }
}

// =============================================================================
// IP-Based Rate Limiter (In-Memory, per-isolate)
// =============================================================================

// Note: This resets on each deployment/worker restart
// For production, migrate to KV Namespace or Durable Objects
const ipRateLimitStore = new Map<string, { count: number; windowStart: number }>();

export function ipRateLimiter(
  maxRequests: number = 30,
  windowMs: number = 60000
): MiddlewareHandler<{ Bindings: Env; Variables: Variables }> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0] ||
               'unknown';
    const now = Date.now();

    const record = ipRateLimitStore.get(ip);

    if (!record || now - record.windowStart > windowMs) {
      // New window
      ipRateLimitStore.set(ip, { count: 1, windowStart: now });
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - 1).toString());
      return next();
    }

    if (record.count >= maxRequests) {
      const resetTime = new Date(record.windowStart + windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', resetTime.toISOString());
      c.header('Retry-After', retryAfter.toString());

      return c.json(
        {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          statusCode: 429,
        },
        429
      );
    }

    record.count++;
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    return next();
  };
}

// =============================================================================
// Cleanup Functions
// =============================================================================

/**
 * Clean up expired rate limit records from KV
 *
 * NOTE: Not needed - KV automatically expires entries after TTL (1 hour).
 * This function is kept for backward compatibility but does nothing.
 *
 * @deprecated KV handles expiry automatically via TTL
 */
export async function cleanupExpiredRateLimits(_env: Env): Promise<number> {
  console.log('[RateLimit] Cleanup skipped - KV handles expiry automatically via TTL');
  return 0;
}

/**
 * Clean up in-memory IP rate limit store
 * Should be called periodically
 */
export function cleanupIpRateLimits(): void {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const [ip, record] of ipRateLimitStore.entries()) {
    if (now - record.windowStart > ONE_HOUR) {
      ipRateLimitStore.delete(ip);
    }
  }
}
