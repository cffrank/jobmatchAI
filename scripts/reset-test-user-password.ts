import { initializeApp } from 'firebase/app'
import { getAuth, sendPasswordResetEmail, updatePassword, signInWithEmailAndPassword } from 'firebase/auth'

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

async function resetTestUserPassword() {
  console.log('🔐 Attempting to reset test user password...')

  const email = 'test1@jobmatch.ai'

  try {
    // Send password reset email
    await sendPasswordResetEmail(auth, email)
    console.log(`✅ Password reset email sent to ${email}`)
    console.log('📧 Check the email inbox for the reset link')
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Alternative: Manually reset password in Firebase Console:')
    console.log('   1. Go to https://console.firebase.google.com/project/ai-career-os-139db/authentication/users')
    console.log('   2. Find test1@jobmatch.ai')
    console.log('   3. Click the three dots menu → Reset password')
    console.log('   4. Set password to: TestPassword123!')
  }
}

resetTestUserPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
