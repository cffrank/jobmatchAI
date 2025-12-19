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

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-career-os-139db.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-career-os-139db',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-career-os-139db.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '529057497050',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:529057497050:web:69933ebef1c282bacecae3',
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
