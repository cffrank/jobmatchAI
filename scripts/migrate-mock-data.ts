/**
 * Data Migration Script
 *
 * This script imports mock data from JSON files into Firestore.
 * Run with: npx tsx scripts/migrate-mock-data.ts <userId>
 *
 * Prerequisites:
 * - Firebase Admin SDK initialized
 * - User must be authenticated (pass userId as argument)
 * - .env.local must contain valid Firebase config
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { join } from 'path'

// Import mock data
import profileData from '../src/sections/profile-resume-management/data.json'
import jobsData from '../src/sections/job-discovery-matching/data.json'
import applicationsData from '../src/sections/application-generator/data.json'
import trackerData from '../src/sections/application-tracker/data.json'
import accountData from '../src/sections/account-billing/data.json'

// Initialize Firebase Admin
// Note: You need to download service account key from Firebase Console
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json'

let serviceAccount
try {
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
} catch (error) {
  console.error('Error: Could not load service account key.')
  console.error('Please download service account key from Firebase Console and save to:', serviceAccountPath)
  console.error('Or set FIREBASE_SERVICE_ACCOUNT_PATH environment variable')
  process.exit(1)
}

const app = initializeApp({
  credential: cert(serviceAccount),
})

const db = getFirestore(app)

/**
 * Get userId from command line args
 */
const userId = process.argv[2]
if (!userId) {
  console.error('Error: Please provide userId as argument')
  console.error('Usage: npx tsx scripts/migrate-mock-data.ts <userId>')
  process.exit(1)
}

/**
 * Migrate user profile data
 */
async function migrateProfile() {
  console.log('Migrating user profile...')
  const userRef = db.collection('users').doc(userId)

  await userRef.set({
    ...profileData.user,
    id: userId,
    createdAt: new Date().toISOString(),
  })

  console.log('✓ User profile migrated')
}

/**
 * Migrate work experience
 */
async function migrateWorkExperience() {
  console.log('Migrating work experience...')
  const workExperienceRef = db.collection('users').doc(userId).collection('workExperience')

  for (const experience of profileData.workExperience) {
    await workExperienceRef.doc(experience.id).set(experience)
  }

  console.log(`✓ ${profileData.workExperience.length} work experience entries migrated`)
}

/**
 * Migrate education
 */
async function migrateEducation() {
  console.log('Migrating education...')
  const educationRef = db.collection('users').doc(userId).collection('education')

  for (const education of profileData.education) {
    await educationRef.doc(education.id).set(education)
  }

  console.log(`✓ ${profileData.education.length} education entries migrated`)
}

/**
 * Migrate skills
 */
async function migrateSkills() {
  console.log('Migrating skills...')
  const skillsRef = db.collection('users').doc(userId).collection('skills')

  for (const skill of profileData.skills) {
    await skillsRef.doc(skill.id).set(skill)
  }

  console.log(`✓ ${profileData.skills.length} skills migrated`)
}

/**
 * Migrate resumes
 */
async function migrateResumes() {
  console.log('Migrating resumes...')
  const resumesRef = db.collection('users').doc(userId).collection('resumes')

  await resumesRef.doc(profileData.resume.id).set({
    ...profileData.resume,
    userId,
  })

  console.log(`✓ Resume migrated`)
}

/**
 * Migrate jobs (top-level collection, shared across users)
 */
async function migrateJobs() {
  console.log('Migrating jobs...')
  const jobsRef = db.collection('jobs')

  for (const job of jobsData.jobs) {
    await jobsRef.doc(job.id).set(job)
  }

  console.log(`✓ ${jobsData.jobs.length} jobs migrated`)
}

/**
 * Migrate saved jobs
 */
async function migrateSavedJobs() {
  console.log('Migrating saved jobs...')
  const savedJobsRef = db.collection('users').doc(userId).collection('savedJobs')

  // Find saved jobs in the mock data
  const savedJobs = jobsData.jobs.filter((job) => job.isSaved)

  for (const job of savedJobs) {
    await savedJobsRef.doc(job.id).set({
      jobId: job.id,
      savedAt: new Date().toISOString(),
    })
  }

  console.log(`✓ ${savedJobs.length} saved jobs migrated`)
}

/**
 * Migrate generated applications
 */
async function migrateApplications() {
  console.log('Migrating generated applications...')
  const applicationsRef = db.collection('users').doc(userId).collection('applications')

  for (const application of applicationsData.generatedApplications) {
    await applicationsRef.doc(application.id).set(application)
  }

  console.log(`✓ ${applicationsData.generatedApplications.length} applications migrated`)
}

/**
 * Migrate tracked applications
 */
async function migrateTrackedApplications() {
  console.log('Migrating tracked applications...')
  const trackedApplicationsRef = db.collection('users').doc(userId).collection('trackedApplications')

  for (const trackedApp of trackerData.trackedApplications) {
    await trackedApplicationsRef.doc(trackedApp.id).set(trackedApp)
  }

  console.log(`✓ ${trackerData.trackedApplications.length} tracked applications migrated`)
}

/**
 * Migrate subscription data
 */
async function migrateSubscription() {
  console.log('Migrating subscription...')
  const subscriptionRef = db.collection('users').doc(userId).doc('subscription')

  await subscriptionRef.set({
    ...accountData.subscription,
    userId,
  })

  console.log(`✓ Subscription migrated`)
}

/**
 * Migrate usage limits
 */
async function migrateUsageLimits() {
  console.log('Migrating usage limits...')
  const usageLimitsRef = db.collection('users').doc(userId).doc('usageLimits')

  await usageLimitsRef.set({
    ...accountData.usageLimits,
    userId,
  })

  console.log(`✓ Usage limits migrated`)
}

/**
 * Migrate invoices
 */
async function migrateInvoices() {
  console.log('Migrating invoices...')
  const invoicesRef = db.collection('users').doc(userId).collection('invoices')

  for (const invoice of accountData.invoices) {
    await invoicesRef.doc(invoice.id).set({
      ...invoice,
      userId,
    })
  }

  console.log(`✓ ${accountData.invoices.length} invoices migrated`)
}

/**
 * Migrate payment methods
 */
async function migratePaymentMethods() {
  console.log('Migrating payment methods...')
  const paymentMethodsRef = db.collection('users').doc(userId).collection('paymentMethods')

  for (const method of accountData.paymentMethods) {
    await paymentMethodsRef.doc(method.id).set(method)
  }

  console.log(`✓ ${accountData.paymentMethods.length} payment methods migrated`)
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('='.repeat(60))
  console.log('Starting data migration for user:', userId)
  console.log('='.repeat(60))
  console.log()

  try {
    // Profile & Resume Management
    await migrateProfile()
    await migrateWorkExperience()
    await migrateEducation()
    await migrateSkills()
    await migrateResumes()

    // Job Discovery & Matching
    await migrateJobs()
    await migrateSavedJobs()

    // Application Generator
    await migrateApplications()

    // Application Tracker
    await migrateTrackedApplications()

    // Account & Billing
    await migrateSubscription()
    await migrateUsageLimits()
    await migrateInvoices()
    await migratePaymentMethods()

    console.log()
    console.log('='.repeat(60))
    console.log('✓ Migration completed successfully!')
    console.log('='.repeat(60))
    console.log()
    console.log('Next steps:')
    console.log('1. Login to the app with this userId:', userId)
    console.log('2. Verify all data is displaying correctly')
    console.log('3. Test CRUD operations (create, update, delete)')
  } catch (error) {
    console.error()
    console.error('✗ Migration failed:', error)
    process.exit(1)
  }
}

// Run migration
migrate()
