#!/usr/bin/env tsx
/**
 * Firebase Storage Integration Test Script
 * Tests profile photo and resume file upload/download functionality
 *
 * Usage: npm run test:storage
 *
 * Prerequisites:
 * - User must be authenticated
 * - Firebase Storage must be configured
 * - storage.rules must be deployed
 */

import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load Firebase config from environment
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const storage = getStorage(app)

interface TestResult {
  testName: string
  passed: boolean
  error?: string
  duration?: number
}

const results: TestResult[] = []

function logResult(result: TestResult) {
  results.push(result)
  const icon = result.passed ? '✅' : '❌'
  const duration = result.duration ? ` (${result.duration}ms)` : ''
  console.log(`${icon} ${result.testName}${duration}`)
  if (result.error) {
    console.log(`   Error: ${result.error}`)
  }
}

async function runTests() {
  console.log('🚀 Firebase Storage Integration Tests\n')
  console.log('=' .repeat(60))

  // Get test credentials from environment
  const testEmail = process.env.TEST_USER_EMAIL
  const testPassword = process.env.TEST_USER_PASSWORD

  if (!testEmail || !testPassword) {
    console.error('❌ TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in environment')
    process.exit(1)
  }

  let userId: string

  // Test 1: Authentication
  try {
    const startTime = Date.now()
    const userCredential = await signInWithEmailAndPassword(auth, testEmail, testPassword)
    userId = userCredential.user.uid
    logResult({
      testName: 'User Authentication',
      passed: true,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logResult({
      testName: 'User Authentication',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }

  // Test 2: Upload Profile Photo (PNG)
  try {
    const startTime = Date.now()
    const testImagePath = join(__dirname, 'test-files', 'test-profile.png')

    // Create a simple 1x1 PNG if test file doesn't exist
    const testImageData = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82
    ])

    const storagePath = `users/${userId}/profile/avatar.png`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, testImageData, {
      contentType: 'image/png',
    })

    const downloadURL = await getDownloadURL(storageRef)

    logResult({
      testName: 'Upload Profile Photo (PNG)',
      passed: true,
      duration: Date.now() - startTime,
    })
    console.log(`   URL: ${downloadURL}`)
  } catch (error) {
    logResult({
      testName: 'Upload Profile Photo (PNG)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 3: Upload Profile Photo (JPEG)
  try {
    const startTime = Date.now()

    // Create a minimal JPEG test file
    const testImageData = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
      0x00, 0x01, 0x00, 0x00, 0xff, 0xd9
    ])

    const storagePath = `users/${userId}/profile/avatar.jpg`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, testImageData, {
      contentType: 'image/jpeg',
    })

    const downloadURL = await getDownloadURL(storageRef)

    logResult({
      testName: 'Upload Profile Photo (JPEG)',
      passed: true,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logResult({
      testName: 'Upload Profile Photo (JPEG)',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 4: Upload Resume PDF
  try {
    const startTime = Date.now()

    // Create a minimal PDF test file
    const testPdfData = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/Resources <<\n/Font <<\n/F1 <<\n/Type /Font\n/Subtype /Type1\n/BaseFont /Helvetica\n>>\n>>\n>>\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 24 Tf\n100 700 Td\n(Test Resume) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000317 00000 n\ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n410\n%%EOF'
    )

    const resumeId = 'test-resume-' + Date.now()
    const storagePath = `users/${userId}/resumes/${resumeId}/resume.pdf`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, testPdfData, {
      contentType: 'application/pdf',
    })

    const downloadURL = await getDownloadURL(storageRef)

    logResult({
      testName: 'Upload Resume PDF',
      passed: true,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logResult({
      testName: 'Upload Resume PDF',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 5: Upload Cover Letter
  try {
    const startTime = Date.now()

    const testPdfData = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\ntrailer\n<<\n/Size 2\n/Root 1 0 R\n>>\n%%EOF'
    )

    const applicationId = 'test-app-' + Date.now()
    const storagePath = `users/${userId}/cover-letters/${applicationId}/cover-letter.pdf`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, testPdfData, {
      contentType: 'application/pdf',
    })

    const downloadURL = await getDownloadURL(storageRef)

    logResult({
      testName: 'Upload Cover Letter PDF',
      passed: true,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logResult({
      testName: 'Upload Cover Letter PDF',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Test 6: File Size Validation (Should fail with >2MB image)
  try {
    const startTime = Date.now()

    // Create a buffer larger than 2MB
    const largefile = Buffer.alloc(3 * 1024 * 1024, 0) // 3MB

    const storagePath = `users/${userId}/profile/large-avatar.jpg`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, largefile, {
      contentType: 'image/jpeg',
    })

    // Should not reach here
    logResult({
      testName: 'File Size Validation (Should Reject >2MB)',
      passed: false,
      error: 'Large file was not rejected by security rules',
    })
  } catch (error) {
    // This should fail - which is correct
    if (error instanceof Error && error.message.includes('permission')) {
      logResult({
        testName: 'File Size Validation (Should Reject >2MB)',
        passed: true,
        duration: Date.now() - startTime,
      })
    } else {
      logResult({
        testName: 'File Size Validation (Should Reject >2MB)',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Test 7: Unauthorized Access (Should fail)
  try {
    const startTime = Date.now()

    // Try to access another user's files
    const otherUserId = 'unauthorized-user-123'
    const storagePath = `users/${otherUserId}/profile/avatar.jpg`
    const storageRef = ref(storage, storagePath)

    await getDownloadURL(storageRef)

    // Should not reach here
    logResult({
      testName: 'Unauthorized Access Prevention',
      passed: false,
      error: 'Unauthorized access was not blocked',
    })
  } catch (error) {
    // This should fail - which is correct
    if (error instanceof Error && (error.message.includes('permission') || error.message.includes('not found'))) {
      logResult({
        testName: 'Unauthorized Access Prevention',
        passed: true,
        duration: Date.now() - startTime,
      })
    } else {
      logResult({
        testName: 'Unauthorized Access Prevention',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Test 8: Delete Profile Photo
  try {
    const startTime = Date.now()
    const storagePath = `users/${userId}/profile/avatar.jpg`
    const storageRef = ref(storage, storagePath)

    await deleteObject(storageRef)

    logResult({
      testName: 'Delete Profile Photo',
      passed: true,
      duration: Date.now() - startTime,
    })
  } catch (error) {
    logResult({
      testName: 'Delete Profile Photo',
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    })
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length
  const successRate = ((passedTests / totalTests) * 100).toFixed(1)

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} passed (${successRate}%)`)

  if (passedTests === totalTests) {
    console.log('\n✅ All tests passed! Firebase Storage is properly configured.')
    process.exit(0)
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.')
    process.exit(1)
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test suite failed:', error)
  process.exit(1)
})
