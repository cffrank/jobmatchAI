/**
 * Rate limiting functions to prevent abuse and DoS attacks
 *
 * SECURITY CONTROLS:
 * - Per-user rate limits
 * - IP-based rate limits
 * - Endpoint-specific limits
 * - Automatic ban for abuse
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  banThreshold: number;
  banDurationMs: number;
}

// Rate limit configurations by endpoint type
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  'ai_generation': {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    banThreshold: 50,
    banDurationMs: 60 * 60 * 1000, // 1 hour
  },
  'job_scraping': {
    maxRequests: 20,
    windowMs: 60 * 1000,
    banThreshold: 100,
    banDurationMs: 60 * 60 * 1000,
  },
  'file_upload': {
    maxRequests: 5,
    windowMs: 60 * 1000,
    banThreshold: 20,
    banDurationMs: 2 * 60 * 60 * 1000, // 2 hours
  },
  'authentication': {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    banThreshold: 10,
    banDurationMs: 24 * 60 * 60 * 1000, // 24 hours
  },
  'default': {
    maxRequests: 100,
    windowMs: 60 * 1000,
    banThreshold: 500,
    banDurationMs: 30 * 60 * 1000, // 30 minutes
  },
};

/**
 * Check if a user/IP is rate limited
 */
export const checkRateLimit = functions.https.onCall(async (data, context) => {
  const { endpoint = 'default' } = data;
  const userId = context.auth?.uid;
  const ipAddress = context.rawRequest.ip;

  if (!userId && !ipAddress) {
    throw new functions.https.HttpsError('invalid-argument', 'Unable to identify client');
  }

  const identifier = userId || ipAddress || 'unknown';
  const config = RATE_LIMITS[endpoint] || RATE_LIMITS.default;

  try {
    // Check if banned
    const banDoc = await admin.firestore()
      .collection('banned_clients')
      .doc(identifier)
      .get();

    if (banDoc.exists) {
      const banData = banDoc.data();
      const banExpiry = banData?.expiresAt?.toDate();

      if (banExpiry && banExpiry > new Date()) {
        throw new functions.https.HttpsError(
          'permission-denied',
          `Access temporarily blocked until ${banExpiry.toISOString()}`
        );
      } else {
        // Ban expired, remove it
        await banDoc.ref.delete();
      }
    }

    // Check rate limit
    const now = Date.now();
    const windowStart = now - config.windowMs;

    const rateLimitDoc = await admin.firestore()
      .collection('rate_limits')
      .doc(identifier)
      .get();

    let requestCount = 0;
    let totalRequests = 0;

    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      const requests = data?.requests || [];

      // Filter requests within the current window
      const recentRequests = requests.filter((ts: number) => ts > windowStart);
      requestCount = recentRequests.length;
      totalRequests = data?.totalRequests || 0;

      // Update with filtered requests
      await rateLimitDoc.ref.set({
        requests: [...recentRequests, now],
        totalRequests: totalRequests + 1,
        lastRequest: now,
        endpoint,
        userId,
        ipAddress,
      });
    } else {
      // First request
      await admin.firestore()
        .collection('rate_limits')
        .doc(identifier)
        .set({
          requests: [now],
          totalRequests: 1,
          lastRequest: now,
          endpoint,
          userId,
          ipAddress,
        });
    }

    // Check if limit exceeded
    if (requestCount >= config.maxRequests) {
      // Log violation
      await admin.firestore()
        .collection('security_events')
        .add({
          type: 'rate_limit_exceeded',
          userId,
          ipAddress,
          endpoint,
          requestCount,
          limit: config.maxRequests,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Check if should ban
      if (totalRequests >= config.banThreshold) {
        await banClient(identifier, config.banDurationMs, 'Excessive rate limit violations');
      }

      throw new functions.https.HttpsError(
        'resource-exhausted',
        `Rate limit exceeded. Max ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`
      );
    }

    return {
      allowed: true,
      remaining: config.maxRequests - requestCount,
      resetAt: new Date(now + config.windowMs).toISOString(),
    };

  } catch (error) {
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    console.error('Rate limit check failed:', error);
    throw new functions.https.HttpsError('internal', 'Rate limit check failed');
  }
});

/**
 * Ban a client (user or IP)
 */
async function banClient(identifier: string, durationMs: number, reason: string): Promise<void> {
  const expiresAt = new Date(Date.now() + durationMs);

  await admin.firestore()
    .collection('banned_clients')
    .doc(identifier)
    .set({
      reason,
      expiresAt,
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  console.log(`Client banned: ${identifier} until ${expiresAt.toISOString()}`);
}

/**
 * Clean up expired rate limit records (scheduled function)
 */
export const cleanupRateLimits = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

    const expiredDocs = await admin.firestore()
      .collection('rate_limits')
      .where('lastRequest', '<', oneDayAgo)
      .get();

    const batch = admin.firestore().batch();
    expiredDocs.docs.forEach(doc => batch.delete(doc.ref));

    await batch.commit();
    console.log(`Cleaned up ${expiredDocs.size} expired rate limit records`);
  });
