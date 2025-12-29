/**
 * Rate Limiting Middleware for Cloud Functions
 *
 * Implements per-user rate limiting using Firestore to track request counts.
 * Supports configurable time windows and request limits per endpoint.
 *
 * Security Features:
 * - Per-user, per-endpoint rate limiting
 * - Configurable time windows and limits
 * - Automatic cleanup of expired rate limit records
 * - Detailed logging of rate limit violations
 * - Returns 429 status with Retry-After header
 */

const admin = require('firebase-admin');
const { HttpsError } = require('firebase-functions/v2/https');
const { securityLogger } = require('./securityLogger');

/**
 * Rate limit configurations for different endpoints
 * Format: { endpoint: { windowMs: milliseconds, maxRequests: number } }
 */
const RATE_LIMITS = {
  generateApplication: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    description: 'Application generation'
  },
  scrapeJobs: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    description: 'Job scraping'
  },
  linkedInCallback: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    description: 'LinkedIn OAuth callback'
  },
  exportApplication: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    description: 'Application export'
  },
  sendApplicationEmail: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    description: 'Email sending'
  },
  linkedInAuth: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5,
    description: 'LinkedIn authentication initiation'
  }
};

/**
 * Get rate limit key for a user and endpoint
 */
function getRateLimitKey(userId, endpoint) {
  return `${userId}:${endpoint}`;
}

/**
 * Check and enforce rate limiting for a user on a specific endpoint
 *
 * @param {string} userId - User ID (or IP address for unauthenticated endpoints)
 * @param {string} endpoint - Endpoint name (must match RATE_LIMITS keys)
 * @returns {Promise<void>} Resolves if request is allowed, throws HttpsError if rate limited
 * @throws {HttpsError} 429 resource-exhausted if rate limit exceeded
 */
async function checkRateLimit(userId, endpoint) {
  const config = RATE_LIMITS[endpoint];

  if (!config) {
    // If endpoint is not configured, allow the request but log warning
    securityLogger.warn('Rate limit check for unconfigured endpoint', {
      endpoint,
      userId,
      severity: 'WARNING'
    });
    return;
  }

  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = getRateLimitKey(userId, endpoint);

  const rateLimitRef = db.collection('_rate_limits').doc(key);

  try {
    // Use transaction to ensure atomic read-modify-write
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(rateLimitRef);

      let requests = [];

      if (doc.exists) {
        const data = doc.data();
        // Filter out requests outside the current window
        requests = (data.requests || []).filter(timestamp => timestamp > windowStart);
      }

      // Check if rate limit is exceeded
      if (requests.length >= config.maxRequests) {
        // Calculate retry-after time (when the oldest request expires)
        const oldestRequest = Math.min(...requests);
        const retryAfterMs = (oldestRequest + config.windowMs) - now;
        const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

        // Log rate limit violation
        securityLogger.security('Rate limit exceeded', {
          userId,
          endpoint,
          currentCount: requests.length,
          limit: config.maxRequests,
          windowMs: config.windowMs,
          retryAfterSeconds,
          severity: 'WARNING'
        });

        // Throw error with retry-after information
        const error = new HttpsError(
          'resource-exhausted',
          `Rate limit exceeded for ${config.description}. You have made ${requests.length} requests in the last hour. Maximum allowed is ${config.maxRequests}. Please try again in ${retryAfterSeconds} seconds.`
        );

        // Add custom property for retry-after (can be read by client)
        error.retryAfter = retryAfterSeconds;

        throw error;
      }

      // Add current request timestamp
      requests.push(now);

      // Update the rate limit document
      transaction.set(rateLimitRef, {
        requests,
        lastRequestAt: admin.firestore.FieldValue.serverTimestamp(),
        endpoint,
        userId
      }, { merge: true });

      // Log successful rate limit check (debug level)
      securityLogger.debug('Rate limit check passed', {
        userId,
        endpoint,
        currentCount: requests.length,
        limit: config.maxRequests,
        remainingRequests: config.maxRequests - requests.length
      });
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }

    // Log unexpected errors
    securityLogger.error('Rate limit check failed', {
      userId,
      endpoint,
      error: error.message,
      severity: 'ERROR'
    });

    // In case of system errors, fail open (allow request) to avoid blocking users
    // but log the error for investigation
    securityLogger.warn('Rate limit check failed - allowing request', {
      userId,
      endpoint,
      error: error.message,
      severity: 'WARNING'
    });
  }
}

/**
 * Cleanup expired rate limit records (should be called periodically)
 * This is a maintenance function to prevent unbounded growth of the rate_limits collection
 *
 * @param {number} maxAgeMs - Maximum age of records to keep (default: 24 hours)
 * @returns {Promise<number>} Number of documents deleted
 */
async function cleanupExpiredRateLimits(maxAgeMs = 24 * 60 * 60 * 1000) {
  const db = admin.firestore();
  const cutoffTime = Date.now() - maxAgeMs;

  try {
    const snapshot = await db.collection('_rate_limits')
      .where('lastRequestAt', '<', new Date(cutoffTime))
      .limit(500) // Process in batches to avoid timeout
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    securityLogger.info('Cleaned up expired rate limit records', {
      deletedCount: snapshot.size,
      cutoffTime: new Date(cutoffTime).toISOString(),
      severity: 'INFO'
    });

    return snapshot.size;
  } catch (error) {
    securityLogger.error('Failed to cleanup rate limit records', {
      error: error.message,
      severity: 'ERROR'
    });

    return 0;
  }
}

/**
 * Get current rate limit status for a user on an endpoint
 * Useful for displaying rate limit info to users
 *
 * @param {string} userId - User ID
 * @param {string} endpoint - Endpoint name
 * @returns {Promise<Object>} Rate limit status
 */
async function getRateLimitStatus(userId, endpoint) {
  const config = RATE_LIMITS[endpoint];

  if (!config) {
    return {
      configured: false,
      endpoint
    };
  }

  const db = admin.firestore();
  const now = Date.now();
  const windowStart = now - config.windowMs;
  const key = getRateLimitKey(userId, endpoint);

  try {
    const doc = await db.collection('_rate_limits').doc(key).get();

    if (!doc.exists) {
      return {
        configured: true,
        endpoint,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetAt: null
      };
    }

    const data = doc.data();
    const requests = (data.requests || []).filter(timestamp => timestamp > windowStart);
    const oldestRequest = requests.length > 0 ? Math.min(...requests) : null;

    return {
      configured: true,
      endpoint,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - requests.length),
      resetAt: oldestRequest ? new Date(oldestRequest + config.windowMs).toISOString() : null,
      currentCount: requests.length
    };
  } catch (error) {
    securityLogger.error('Failed to get rate limit status', {
      userId,
      endpoint,
      error: error.message,
      severity: 'ERROR'
    });

    return {
      configured: true,
      endpoint,
      error: 'Failed to retrieve rate limit status'
    };
  }
}

/**
 * Rate limit middleware wrapper for Cloud Functions
 * Use this to wrap your Cloud Function handler
 *
 * @param {string} endpoint - Endpoint name (must match RATE_LIMITS keys)
 * @param {Function} handler - Original Cloud Function handler
 * @returns {Function} Wrapped handler with rate limiting
 */
function withRateLimit(endpoint, handler) {
  return async (request) => {
    // Extract user ID (authenticated) or IP address (unauthenticated)
    const userId = request.auth?.uid || request.rawRequest?.ip || 'anonymous';

    // Check rate limit before proceeding
    await checkRateLimit(userId, endpoint);

    // If rate limit check passes, execute the original handler
    return handler(request);
  };
}

module.exports = {
  checkRateLimit,
  withRateLimit,
  cleanupExpiredRateLimits,
  getRateLimitStatus,
  RATE_LIMITS
};
