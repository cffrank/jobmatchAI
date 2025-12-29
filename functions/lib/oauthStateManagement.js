/**
 * OAuth State Management for CSRF Protection
 *
 * This module provides secure state parameter generation and validation
 * for OAuth flows to prevent CSRF attacks.
 *
 * Security measures:
 * - Cryptographically secure random state generation
 * - State tokens stored in Firestore with expiration
 * - Automatic cleanup of expired tokens
 * - Strict validation on callback
 */

const crypto = require('crypto');

// State token expiration time (10 minutes)
const STATE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Generate a cryptographically secure state token
 * @returns {string} Base64-encoded random state token
 */
function generateStateToken() {
  const buffer = crypto.randomBytes(32);
  return buffer.toString('base64url');
}

/**
 * Store OAuth state in Firestore with expiration
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} provider - OAuth provider name (e.g., 'linkedin', 'google')
 * @param {Object} metadata - Additional metadata to store with state
 * @returns {Promise<string>} The generated state token
 */
async function storeOAuthState(db, userId, provider, metadata = {}) {
  const state = generateStateToken();
  const expiresAt = new Date(Date.now() + STATE_EXPIRATION_MS);

  await db.collection('oauthStates').doc(state).set({
    userId,
    provider,
    createdAt: new Date(),
    expiresAt,
    metadata,
    used: false
  });

  console.log(`[OAuth] State token created for user ${userId}, provider ${provider}`);
  return state;
}

/**
 * Validate and consume OAuth state token
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} state - State token to validate
 * @param {string} expectedProvider - Expected OAuth provider
 * @returns {Promise<Object|null>} State data if valid, null otherwise
 */
async function validateOAuthState(db, state, expectedProvider) {
  if (!state) {
    console.warn('[OAuth] No state token provided');
    return null;
  }

  const stateRef = db.collection('oauthStates').doc(state);
  const stateDoc = await stateRef.get();

  if (!stateDoc.exists) {
    console.warn('[OAuth] State token not found:', state.substring(0, 8) + '...');
    return null;
  }

  const stateData = stateDoc.data();

  // Check if already used
  if (stateData.used) {
    console.warn('[OAuth] State token already used:', state.substring(0, 8) + '...');
    await stateRef.delete(); // Clean up
    return null;
  }

  // Check expiration
  if (new Date() > stateData.expiresAt.toDate()) {
    console.warn('[OAuth] State token expired:', state.substring(0, 8) + '...');
    await stateRef.delete(); // Clean up
    return null;
  }

  // Check provider matches
  if (stateData.provider !== expectedProvider) {
    console.warn(
      `[OAuth] Provider mismatch: expected ${expectedProvider}, got ${stateData.provider}`
    );
    await stateRef.delete(); // Clean up
    return null;
  }

  // Mark as used
  await stateRef.update({ used: true });

  console.log(`[OAuth] State token validated for user ${stateData.userId}`);
  return stateData;
}

/**
 * Clean up expired OAuth state tokens
 * Should be called periodically via Cloud Scheduler
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @returns {Promise<number>} Number of tokens deleted
 */
async function cleanupExpiredStates(db) {
  const now = new Date();
  const expiredStates = await db
    .collection('oauthStates')
    .where('expiresAt', '<', now)
    .get();

  const batch = db.batch();
  let count = 0;

  expiredStates.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`[OAuth] Cleaned up ${count} expired state tokens`);

  return count;
}

/**
 * Delete all OAuth states for a specific user
 * Useful when user logs out or account is deleted
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore instance
 * @param {string} userId - User ID
 * @returns {Promise<number>} Number of tokens deleted
 */
async function deleteUserStates(db, userId) {
  const userStates = await db
    .collection('oauthStates')
    .where('userId', '==', userId)
    .get();

  const batch = db.batch();
  let count = 0;

  userStates.forEach((doc) => {
    batch.delete(doc.ref);
    count++;
  });

  await batch.commit();
  console.log(`[OAuth] Deleted ${count} state tokens for user ${userId}`);

  return count;
}

module.exports = {
  generateStateToken,
  storeOAuthState,
  validateOAuthState,
  cleanupExpiredStates,
  deleteUserStates
};
