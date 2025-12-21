import admin from 'firebase-admin'

// Initialize without credentials (will use default credentials or fail gracefully)
try {
  admin.initializeApp({
    projectId: 'ai-career-os-139db',
  })
} catch {
  console.log('Firebase Admin already initialized')
}

const auth = admin.auth()
const db = admin.firestore()

async function deleteJohnFrank() {
  const email = 'cffrank@yahoo.com'

  console.log('🔍 Looking up user by email:', email)

  try {
    // Get user by email
    const userRecord = await auth.getUserByEmail(email)
    const uid = userRecord.uid

    console.log('✅ Found user:', uid)

    // Delete all Firestore data
    console.log('\n🗑️  Deleting Firestore data...')

    const subcollections = ['workExperience', 'education', 'skills', 'resumes', 'savedJobs', 'applications', 'trackedApplications']

    for (const subcol of subcollections) {
      const snapshot = await db.collection('users').doc(uid).collection(subcol).get()
      const batch = db.batch()
      snapshot.docs.forEach(doc => batch.delete(doc.ref))
      if (snapshot.size > 0) {
        await batch.commit()
        console.log(`   Deleted ${snapshot.size} documents from ${subcol}`)
      }
    }

    // Delete user document
    await db.collection('users').doc(uid).delete()
    console.log('   Deleted user document')

    // Delete auth account
    console.log('\n🗑️  Deleting auth account...')
    await auth.deleteUser(uid)
    console.log('✅ User deleted successfully!')

    console.log('\n✅ John Frank account completely removed')
    console.log('   You can now run: npx tsx scripts/recreate-john-frank.ts')

  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    if (code === 'auth/user-not-found') {
      console.log('⚠️  User not found - already deleted or never existed')
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error:', message)
      throw error
    }
  }
}

deleteJohnFrank()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
