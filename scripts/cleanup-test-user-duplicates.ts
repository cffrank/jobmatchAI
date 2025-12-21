#!/usr/bin/env tsx
/**
 * Cleanup script to remove ALL data from test user's Firestore collections
 * This prepares for a fresh migration with no duplicates
 * Usage: tsx scripts/cleanup-test-user-duplicates.ts
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

// SECURITY: Firebase configuration must come from environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

// Validate all required environment variables are present
const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:')
  missingVars.forEach(varName => console.error(`   - ${varName}`))
  console.error('\n📝 Please create a .env.local file with these variables.')
  console.error('   See .env.example for the required format.\n')
  process.exit(1)
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY!,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.VITE_FIREBASE_APP_ID!,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

// Test user credentials
const TEST_EMAIL = 'test1@jobmatch.ai'
const TEST_PASSWORD = 'TestPassword123!'

async function cleanup() {
  console.log('🧹 Cleaning up test user data...')
  console.log(`📧 Email: ${TEST_EMAIL}\n`)

  try {
    // Sign in
    console.log('🔐 Signing in...')
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const userId = userCredential.user.uid
    console.log(`✅ Signed in as: ${userId}\n`)

    // Collections to clean
    const collections = [
      'workExperience',
      'education',
      'skills',
      'resumes',
      'trackedApplications',
      'applications',
    ]

    for (const collectionName of collections) {
      console.log(`🗑️  Deleting ${collectionName}...`)
      const ref = collection(db, 'users', userId, collectionName)
      const snapshot = await getDocs(ref)

      let deleted = 0
      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, 'users', userId, collectionName, document.id))
        deleted++
      }

      console.log(`✅ Deleted ${deleted} documents from ${collectionName}`)
    }

    console.log('\n✅ Cleanup complete! Test user data has been cleared.')
    console.log('💡 Run migrate-test-user-data.ts to populate fresh data.')

    await auth.signOut()
    process.exit(0)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('\n❌ Cleanup failed:', message)
    process.exit(1)
  }
}

cleanup()
