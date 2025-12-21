#!/usr/bin/env tsx
/**
 * Quick data migration for test user
 * Usage: tsx scripts/migrate-test-user-data.ts
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { readFileSync } from 'fs'

// Import mock data
const profileData = JSON.parse(readFileSync('./src/sections/profile-resume-management/data.json', 'utf8'))
const trackerData = JSON.parse(readFileSync('./src/sections/application-tracker/data.json', 'utf8'))
const applicationsData = JSON.parse(readFileSync('./src/sections/application-generator/data.json', 'utf8'))

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

async function migrate() {
  console.log('🚀 Migrating data for test user...')
  console.log(`📧 Email: ${TEST_EMAIL}\n`)

  try {
    // Sign in
    console.log('🔐 Signing in...')
    const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD)
    const userId = userCredential.user.uid
    console.log(`✅ Signed in as: ${userId}\n`)

    // Migrate profile
    console.log('👤 Migrating profile...')
    await setDoc(doc(db, 'users', userId), {
      ...profileData.user,
      id: userId,
      createdAt: new Date().toISOString(),
    })
    console.log('✅ Profile migrated')

    // Migrate work experience (using original IDs for idempotent behavior)
    console.log('💼 Migrating work experience...')
    for (const exp of profileData.workExperience) {
      await setDoc(doc(db, 'users', userId, 'workExperience', exp.id), exp)
    }
    console.log(`✅ Migrated ${profileData.workExperience.length} work experiences`)

    // Migrate education (using original IDs for idempotent behavior)
    console.log('🎓 Migrating education...')
    for (const edu of profileData.education) {
      await setDoc(doc(db, 'users', userId, 'education', edu.id), edu)
    }
    console.log(`✅ Migrated ${profileData.education.length} education entries`)

    // Migrate skills (using original IDs for idempotent behavior)
    console.log('⚡ Migrating skills...')
    for (const skill of profileData.skills) {
      await setDoc(doc(db, 'users', userId, 'skills', skill.id), skill)
    }
    console.log(`✅ Migrated ${profileData.skills.length} skills`)

    // Migrate resume (using original ID for idempotent behavior)
    console.log('📄 Migrating resume...')
    if (profileData.resume) {
      await setDoc(doc(db, 'users', userId, 'resumes', profileData.resume.id), profileData.resume)
      console.log(`✅ Migrated 1 resume`)
    }

    // Migrate tracked applications (using original IDs for idempotent behavior)
    console.log('📊 Migrating tracked applications...')
    for (const app of trackerData.trackedApplications) {
      await setDoc(doc(db, 'users', userId, 'trackedApplications', app.id), app)
    }
    console.log(`✅ Migrated ${trackerData.trackedApplications.length} tracked applications`)

    // Migrate generated applications (using original IDs for idempotent behavior)
    console.log('📝 Migrating generated applications...')
    for (const app of applicationsData.generatedApplications) {
      await setDoc(doc(db, 'users', userId, 'applications', app.id), app)
    }
    console.log(`✅ Migrated ${applicationsData.generatedApplications.length} generated applications`)

    console.log('\n✅ Migration complete!')
    console.log('\n📋 Summary:')
    console.log(`   Profile: 1`)
    console.log(`   Work Experience: ${profileData.workExperience.length}`)
    console.log(`   Education: ${profileData.education.length}`)
    console.log(`   Skills: ${profileData.skills.length}`)
    console.log(`   Resumes: 1`)
    console.log(`   Tracked Applications: ${trackerData.trackedApplications.length}`)
    console.log(`   Generated Applications: ${applicationsData.generatedApplications.length}`)
    console.log('\n🎉 Test user is ready for testing!')

    await auth.signOut()
    process.exit(0)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    console.error('\n❌ Migration failed:', message)
    if (code === 'auth/invalid-credential') {
      console.error('\n💡 Make sure the test user exists with correct password:')
      console.error(`   Email: ${TEST_EMAIL}`)
      console.error(`   Password: ${TEST_PASSWORD}`)
    }
    process.exit(1)
  }
}

migrate()
