/**
 * Scheduled Function: Clean up expired OAuth state tokens
 *
 * This function runs periodically (recommended: hourly) to remove
 * expired OAuth state tokens from Firestore, preventing database bloat
 * and maintaining security hygiene.
 *
 * Schedule: Run every hour
 */

const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const { cleanupExpiredStates } = require('../lib/oauthStateManagement');

exports.cleanupOAuthStates = onSchedule(
  {
    schedule: 'every 1 hours',
    timeZone: 'America/New_York',
    retryCount: 3,
    memory: '256MiB'
  },
  async (event) => {
    console.log('[Scheduled] Starting OAuth state cleanup');

    try {
      const db = admin.firestore();
      const deletedCount = await cleanupExpiredStates(db);

      console.log(`[Scheduled] OAuth state cleanup completed. Deleted ${deletedCount} expired tokens`);

      return {
        success: true,
        deletedCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Scheduled] OAuth state cleanup failed:', error);
      throw error;
    }
  }
);
