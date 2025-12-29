/**
 * Rate Limiting Middleware for Cloudflare Workers
 *
 * Implements sliding window rate limiting using:
 * - PostgreSQL (Supabase) for authenticated user rate limiting
 * - In-memory Map for IP-based rate limiting (per-isolate)
 *
 * Note: In-memory rate limiting resets on each deployment/worker restart
 * For production, consider migrating to KV or Durable Objects
 */

import type { MiddlewareHandler } from 'hono';
import type { Env, Variables, RateLimitConfig } from '../types';
import { HttpError, TABLES } from '../types';
import { createSupabaseAdmin } from '../services/supabase';

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

async function checkRateLimit(
  env: Env,
  userId: string,
  endpoint: string,
  maxRequests: number,
  windowMs: number
): Promise<RateLimitResult> {
  const supabase = createSupabaseAdmin(env);
  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMs);

  // Get existing rate limit record
  const { data: existingRecord, error: selectError } = await supabase
    .from(TABLES.RATE_LIMITS)
    .select('*')
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('window_start', windowStart.toISOString())
    .order('window_start', { ascending: false })
    .limit(1)
    .single();

  if (selectError && selectError.code !== 'PGRST116') {
    console.error('Rate limit select error:', selectError);
    throw selectError;
  }

  let currentCount = 0;
  let windowStartTime = now;

  if (existingRecord) {
    currentCount = existingRecord.request_count;
    windowStartTime = new Date(existingRecord.window_start);
  }

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
    await supabase
      .from(TABLES.RATE_LIMITS)
      .update({
        request_count: currentCount + 1,
        updated_at: now.toISOString(),
      })
      .eq('id', existingRecord.id);
  } else {
    await supabase.from(TABLES.RATE_LIMITS).insert({
      user_id: userId,
      endpoint,
      request_count: 1,
      window_start: now.toISOString(),
      window_end: resetTime.toISOString(),
    });
  }

  return {
    allowed: true,
    remaining: maxRequests - currentCount - 1,
    resetTime,
    currentCount: currentCount + 1,
  };
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
 * Clean up expired rate limit records from database
 * Called by scheduled job
 */
export async function cleanupExpiredRateLimits(env: Env): Promise<number> {
  const supabase = createSupabaseAdmin(env);
  const now = new Date();

  const { data, error } = await supabase
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
