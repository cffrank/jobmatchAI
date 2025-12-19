import { initializeApp } from 'firebase/app'
import { getAuth, sendPasswordResetEmail, updatePassword, signInWithEmailAndPassword } from 'firebase/auth'

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU",
  authDomain: "ai-career-os-139db.firebaseapp.com",
  projectId: "ai-career-os-139db",
  storageBucket: "ai-career-os-139db.firebasestorage.app",
  messagingSenderId: "785333175773",
  appId: "1:785333175773:web:c00c7f30e9dd73bc5c56c0"
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
