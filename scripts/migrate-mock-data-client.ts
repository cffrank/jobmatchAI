#!/usr/bin/env tsx

/**
 * Data Migration Script (Client SDK)
 *
 * This script imports mock data from JSON files into Firestore using client SDK.
 * Run with: npx tsx scripts/migrate-mock-data-client.ts <userId> <password>
 *
 * No service account needed - uses client SDK with test user credentials
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Import mock data
const profileData = JSON.parse(readFileSync('./src/sections/profile-resume-management/data.json', 'utf8'));
const jobsData = JSON.parse(readFileSync('./src/sections/job-discovery-matching/data.json', 'utf8'));
const applicationsData = JSON.parse(readFileSync('./src/sections/application-generator/data.json', 'utf8'));
const trackerData = JSON.parse(readFileSync('./src/sections/application-tracker/data.json', 'utf8'));
const accountData = JSON.parse(readFileSync('./src/sections/account-billing/data.json', 'utf8'));

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

// Get userId and password from command line args
const userId = process.argv[2];
const password = process.argv[3];

if (!userId) {
  console.error('Error: Please provide userId as argument');
  console.error('Usage: npx tsx scripts/migrate-mock-data-client.ts <userId> <password>');
  console.error('Example: npx tsx scripts/migrate-mock-data-client.ts 7PVNCYbrjJdLZklH9OaScjxAKPa2 TestPassword123!');
  process.exit(1);
}

// Password is optional - if not provided, we'll just use the userId directly
// This assumes the user is already authenticated in the app

/**
 * Migrate user profile data
 */
async function migrateProfile() {
  console.log('Migrating user profile...');
  const userRef = doc(db, 'users', userId);

  await setDoc(userRef, {
    ...profileData.user,
    id: userId,
    createdAt: new Date().toISOString(),
  });

  console.log('✓ User profile migrated');
}

/**
 * Migrate work experience
 */
async function migrateWorkExperience() {
  console.log('Migrating work experience...');

  for (const experience of profileData.workExperience) {
    const experienceRef = doc(db, 'users', userId, 'workExperience', experience.id);
    await setDoc(experienceRef, experience);
  }

  console.log(`✓ ${profileData.workExperience.length} work experience entries migrated`);
}

/**
 * Migrate education
 */
async function migrateEducation() {
  console.log('Migrating education...');

  for (const education of profileData.education) {
    const educationRef = doc(db, 'users', userId, 'education', education.id);
    await setDoc(educationRef, education);
  }

  console.log(`✓ ${profileData.education.length} education entries migrated`);
}

/**
 * Migrate skills
 */
async function migrateSkills() {
  console.log('Migrating skills...');

  for (const skill of profileData.skills) {
    const skillRef = doc(db, 'users', userId, 'skills', skill.id);
    await setDoc(skillRef, skill);
  }

  console.log(`✓ ${profileData.skills.length} skills migrated`);
}

/**
 * Migrate resumes
 */
async function migrateResumes() {
  console.log('Migrating resumes...');
  const resumeRef = doc(db, 'users', userId, 'resumes', profileData.resume.id);

  await setDoc(resumeRef, {
    ...profileData.resume,
    userId,
  });

  console.log(`✓ Resume migrated`);
}

/**
 * Migrate jobs (top-level collection, shared across users)
 */
async function migrateJobs() {
  console.log('Migrating jobs...');

  for (const job of jobsData.jobs) {
    const jobRef = doc(db, 'jobs', job.id);
    await setDoc(jobRef, job);
  }

  console.log(`✓ ${jobsData.jobs.length} jobs migrated`);
}

/**
 * Migrate saved jobs
 */
async function migrateSavedJobs() {
  console.log('Migrating saved jobs...');

  // Find saved jobs in the mock data
  const savedJobs = jobsData.jobs.filter((job: any) => job.isSaved);

  for (const job of savedJobs) {
    const savedJobRef = doc(db, 'users', userId, 'savedJobs', job.id);
    await setDoc(savedJobRef, {
      jobId: job.id,
      savedAt: new Date().toISOString(),
    });
  }

  console.log(`✓ ${savedJobs.length} saved jobs migrated`);
}

/**
 * Migrate generated applications
 */
async function migrateApplications() {
  console.log('Migrating generated applications...');

  for (const application of applicationsData.generatedApplications) {
    const applicationRef = doc(db, 'users', userId, 'applications', application.id);
    await setDoc(applicationRef, application);
  }

  console.log(`✓ ${applicationsData.generatedApplications.length} applications migrated`);
}

/**
 * Migrate tracked applications
 */
async function migrateTrackedApplications() {
  console.log('Migrating tracked applications...');

  for (const trackedApp of trackerData.trackedApplications) {
    const trackedAppRef = doc(db, 'users', userId, 'trackedApplications', trackedApp.id);
    await setDoc(trackedAppRef, trackedApp);
  }

  console.log(`✓ ${trackerData.trackedApplications.length} tracked applications migrated`);
}

/**
 * Migrate subscription data
 */
async function migrateSubscription() {
  console.log('Migrating subscription...');
  const subscriptionRef = doc(db, 'users', userId, 'subscription', 'current');

  await setDoc(subscriptionRef, {
    ...accountData.subscription,
    userId,
  });

  console.log(`✓ Subscription migrated`);
}

/**
 * Migrate usage limits
 */
async function migrateUsageLimits() {
  console.log('Migrating usage limits...');
  const usageLimitsRef = doc(db, 'users', userId, 'usageLimits', 'current');

  await setDoc(usageLimitsRef, {
    ...accountData.usageLimits,
    userId,
  });

  console.log(`✓ Usage limits migrated`);
}

/**
 * Migrate invoices
 */
async function migrateInvoices() {
  console.log('Migrating invoices...');

  for (const invoice of accountData.invoices) {
    const invoiceRef = doc(db, 'users', userId, 'invoices', invoice.id);
    await setDoc(invoiceRef, {
      ...invoice,
      userId,
    });
  }

  console.log(`✓ ${accountData.invoices.length} invoices migrated`);
}

/**
 * Migrate payment methods
 */
async function migratePaymentMethods() {
  console.log('Migrating payment methods...');

  for (const method of accountData.paymentMethods) {
    const paymentMethodRef = doc(db, 'users', userId, 'paymentMethods', method.id);
    await setDoc(paymentMethodRef, method);
  }

  console.log(`✓ ${accountData.paymentMethods.length} payment methods migrated`);
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60));
  console.log('Starting data migration for user:', userId);
  console.log('='.repeat(60));
  console.log();

  try {
    // Authenticate if password provided
    if (password) {
      console.log('Authenticating...');
      // We need the email, not the UID. Let's use the test credentials
      const email = 'test1@jobmatch.ai';
      await signInWithEmailAndPassword(auth, email, password);
      console.log('✓ Authenticated as:', email);
      console.log();
    }

    // Profile & Resume Management
    await migrateProfile();
    await migrateWorkExperience();
    await migrateEducation();
    await migrateSkills();
    await migrateResumes();

    // Job Discovery & Matching
    // NOTE: Skipping migrateJobs() - security rules only allow Cloud Functions to write
    // Jobs are populated from mock data in the frontend for now
    console.log('⚠️  Skipping jobs migration (requires Cloud Functions)');
    await migrateSavedJobs();

    // Application Generator
    await migrateApplications();

    // Application Tracker
    await migrateTrackedApplications();

    // Account & Billing
    // NOTE: Skipping protected collections - security rules only allow Cloud Functions to write
    console.log('⚠️  Skipping subscription migration (requires Cloud Functions)');
    console.log('⚠️  Skipping usage limits migration (requires Cloud Functions)');
    console.log('⚠️  Skipping invoices migration (requires Cloud Functions)');
    console.log('⚠️  Skipping payment methods migration (requires Cloud Functions)');

    console.log();
    console.log('='.repeat(60));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(60));
    console.log();
    console.log('Data migrated to Firestore:');
    console.log('  ✓ User profile');
    console.log(`  ✓ ${profileData.workExperience.length} work experiences`);
    console.log(`  ✓ ${profileData.education.length} education entries`);
    console.log(`  ✓ ${profileData.skills.length} skills`);
    console.log(`  ✓ 1 resume`);
    console.log(`  ✓ ${applicationsData.generatedApplications.length} applications`);
    console.log(`  ✓ ${trackerData.trackedApplications.length} tracked applications`);
    console.log();
    console.log('Skipped (requires Cloud Functions):');
    console.log(`  ⚠️  ${jobsData.jobs.length} jobs (using frontend mock data for now)`);
    console.log('  ⚠️  Subscription data');
    console.log('  ⚠️  Usage limits');
    console.log('  ⚠️  Invoices');
    console.log('  ⚠️  Payment methods');
    console.log();
    console.log('Next steps:');
    console.log('1. Re-run TestSprite tests to verify improvements');
    console.log('2. Login to the app and verify data displays correctly');

    process.exit(0);
  } catch (error: any) {
    console.error();
    console.error('✗ Migration failed:', error.message);
    console.error();
    console.error('Common issues:');
    console.error('  - Firestore security rules may be blocking writes');
    console.error('  - User authentication may be required');
    console.error('  - Data structure may not match Firestore schema');
    process.exit(1);
  }
}

// Run migration
migrate();
