#!/usr/bin/env tsx

/**
 * Jobs Migration Script
 *
 * Migrates jobs from mock data to Firestore
 * Run with: npx tsx scripts/migrate-jobs.ts
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Import jobs data
const jobsData = JSON.parse(readFileSync('./src/sections/job-discovery-matching/data.json', 'utf8'));

// SECURITY: Firebase configuration must come from environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
];

// Validate all required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Please create a .env.local file with these variables.');
  console.error('   See .env.example for the required format.\n');
  process.exit(1);
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY!,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.VITE_FIREBASE_APP_ID!,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Migrate jobs (top-level collection, shared across users)
 */
async function migrateJobs() {
  console.log('Migrating jobs...');

  for (const job of jobsData.jobs) {
    const jobRef = doc(db, 'jobs', job.id);
    await setDoc(jobRef, job);
    console.log(`  ✓ Migrated: ${job.id} - ${job.title} at ${job.company}`);
  }

  console.log(`\n✅ ${jobsData.jobs.length} jobs migrated successfully!`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('Jobs Data Migration');
  console.log('='.repeat(60));
  console.log();

  try {
    // Authenticate with test user
    console.log('Authenticating...');
    const email = 'test1@jobmatch.ai';
    const password = 'TestPassword123!';

    await signInWithEmailAndPassword(auth, email, password);
    console.log('✓ Authenticated as:', email);
    console.log();

    // Migrate jobs
    await migrateJobs();

    console.log();
    console.log('='.repeat(60));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrate();
