/**
 * Cloud Functions for JobMatch AI
 *
 * Security-focused serverless functions for:
 * - File scanning and malware detection
 * - Rate limiting
 * - Data sanitization
 * - Secure API proxying
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export all functions
export * from './fileScanning';
export * from './rateLimiting';
export * from './secureProxy';
