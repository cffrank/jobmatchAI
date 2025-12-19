#!/usr/bin/env tsx
/**
 * Cleanup script to remove ALL data from test user's Firestore collections
 * This prepares for a fresh migration with no duplicates
 * Usage: tsx scripts/cleanup-test-user-duplicates.ts
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU',
  authDomain: 'ai-career-os-139db.firebaseapp.com',
  projectId: 'ai-career-os-139db',
  storageBucket: 'ai-career-os-139db.firebasestorage.app',
  messagingSenderId: '785333175773',
  appId: '1:785333175773:web:c00c7f30e9dd73bc5c56c0',
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
  } catch (error: any) {
    console.error('\n❌ Cleanup failed:', error.message)
    process.exit(1)
  }
}

cleanup()
