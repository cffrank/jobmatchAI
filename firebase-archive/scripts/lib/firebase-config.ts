/**
 * Secure Firebase Configuration Utility
 *
 * This module provides a secure way to load Firebase configuration from environment variables.
 * SECURITY: Never use hardcoded credentials. All values must come from environment variables.
 *
 * Usage:
 *   import { getFirebaseConfig } from './lib/firebase-config';
 *   const config = getFirebaseConfig();
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const REQUIRED_ENV_VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

/**
 * Get Firebase configuration from environment variables
 * Throws an error if any required variables are missing
 */
export function getFirebaseConfig(): FirebaseConfig {
  // Check for missing environment variables
  const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('\n❌ SECURITY ERROR: Missing required environment variables\n');
    console.error('The following environment variables must be set:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n📝 To fix this:');
    console.error('   1. Copy .env.example to .env.local');
    console.error('   2. Fill in the Firebase configuration values');
    console.error('   3. Never commit .env.local to git');
    console.error('\n⚠️  NEVER use hardcoded credentials in scripts.\n');
    throw new Error('Missing required Firebase environment variables');
  }

  return {
    apiKey: process.env.VITE_FIREBASE_API_KEY!,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.VITE_FIREBASE_APP_ID!,
  };
}

/**
 * Validate that Firebase configuration is properly loaded
 * Useful for debugging without exposing sensitive values
 */
export function validateFirebaseConfig(): boolean {
  try {
    const config = getFirebaseConfig();
    console.log('✓ Firebase configuration loaded successfully');
    console.log(`  Project ID: ${config.projectId}`);
    console.log(`  Auth Domain: ${config.authDomain}`);
    return true;
  } catch {
    return false;
  }
}
