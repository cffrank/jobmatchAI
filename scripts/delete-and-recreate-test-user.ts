import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, deleteUser, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

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

const testUser = {
  email: 'test1@jobmatch.ai',
  password: 'TestPassword123!',
  displayName: 'Test User 1',
}

async function deleteAndRecreateTestUser() {
  console.log('🗑️  Attempting to delete existing test user...')

  try {
    // First, try to sign in to get the user object
    const userCredential = await signInWithEmailAndPassword(auth, testUser.email, testUser.password)
    await deleteUser(userCredential.user)
    console.log('✅ Deleted existing user')
    await auth.signOut()
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
      console.log('⚠️  User does not exist or password incorrect, proceeding to create...')
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.log('⚠️  Could not delete (might not exist):', message)
    }
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log('\n👤 Creating fresh test user...')

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      testUser.email,
      testUser.password
    )

    await updateProfile(userCredential.user, {
      displayName: testUser.displayName,
    })

    console.log('✅ Test user created successfully!')
    console.log('\n📋 Credentials:')
    console.log('   Email:    ', testUser.email)
    console.log('   Password: ', testUser.password)
    console.log('   UID:      ', userCredential.user.uid)
    console.log('\n✅ You can now log in with these credentials!')

  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    if (code === 'auth/email-already-in-use') {
      console.error('\n❌ Email already in use. Please manually delete from Firebase Console:')
      console.log('   https://console.firebase.google.com/project/ai-career-os-139db/authentication/users')
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error creating user:', message)
    }
  }
}

deleteAndRecreateTestUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
