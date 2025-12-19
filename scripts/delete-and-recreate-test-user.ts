import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, deleteUser, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'

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
  } catch (error: any) {
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
      console.log('⚠️  User does not exist or password incorrect, proceeding to create...')
    } else {
      console.log('⚠️  Could not delete (might not exist):', error.message)
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

  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.error('\n❌ Email already in use. Please manually delete from Firebase Console:')
      console.log('   https://console.firebase.google.com/project/ai-career-os-139db/authentication/users')
    } else {
      console.error('❌ Error creating user:', error.message)
    }
  }
}

deleteAndRecreateTestUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
