import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword, deleteUser, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'

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

const johnFrank = {
  email: 'cffrank@yahoo.com',
  password: 'TestPassword123!',
  displayName: 'John Frank',
  firstName: 'John',
  lastName: 'Frank',
  phone: '(608) 395-8100',
  location: 'Madison, WI',
}

async function recreateJohnFrank() {
  console.log('🗑️  Attempting to delete existing John Frank account...')

  try {
    // Try to sign in with known password
    const userCredential = await signInWithEmailAndPassword(auth, johnFrank.email, johnFrank.password)
    await deleteUser(userCredential.user)
    console.log('✅ Deleted existing John Frank account')
    await auth.signOut()
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
      console.log('⚠️  Account does not exist or password incorrect, proceeding to create...')
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.log('⚠️  Could not delete (might not exist):', message)
    }
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log('\n👤 Creating fresh John Frank account...')

  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      johnFrank.email,
      johnFrank.password
    )

    await updateProfile(userCredential.user, {
      displayName: johnFrank.displayName,
    })

    const userId = userCredential.user.uid

    console.log('✅ Account created successfully!')
    console.log('   UID:', userId)

    // Create profile document
    console.log('\n📋 Creating profile...')
    await setDoc(doc(db, 'users', userId), {
      email: johnFrank.email,
      firstName: johnFrank.firstName,
      lastName: johnFrank.lastName,
      phone: johnFrank.phone,
      location: johnFrank.location,
      photoURL: '',
      currentTitle: 'Executive Chef',
      yearsOfExperience: 20,
      professionalSummary: 'Accomplished Executive Chef with 20+ years of experience in fine dining establishments. Proven track record of leading kitchen operations, developing innovative menus, and maintaining Michelin-star standards while managing teams of 15-20+ staff.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    // Create work experience
    console.log('💼 Creating work experience...')

    const workExperiences = [
      {
        id: 'work-1',
        title: 'Executive Chef',
        company: 'Alinea',
        location: 'Chicago, IL',
        startDate: '2015-01',
        endDate: null,
        current: true,
        achievements: [
          'Led fine dining kitchen operations serving 50+ guests nightly',
          'Developed innovative tasting menus featuring molecular gastronomy',
          'Maintained 3 Michelin stars through consistent quality and creativity',
        ],
      },
      {
        id: 'work-2',
        title: 'Sous Chef',
        company: 'Le Bernardin',
        location: 'New York, NY',
        startDate: '2010-06',
        endDate: '2014-12',
        current: false,
        achievements: [
          'Managed kitchen staff of 15 in high-volume seafood restaurant',
          'Developed daily specials using fresh market ingredients',
          'Reduced food costs by 15% through better inventory management',
        ],
      },
      {
        id: 'work-3',
        title: 'Line Cook',
        company: 'The French Laundry',
        location: 'Yountville, CA',
        startDate: '2007-03',
        endDate: '2010-05',
        current: false,
        achievements: [
          'Prepared dishes for 9-course tasting menus',
          'Mastered French cooking techniques under Chef Thomas Keller',
          'Contributed to menu development and seasonal offerings',
        ],
      },
      {
        id: 'work-4',
        title: 'Prep Cook',
        company: 'Chez Panisse',
        location: 'Berkeley, CA',
        startDate: '2005-01',
        endDate: '2007-02',
        current: false,
        achievements: [
          'Prepared ingredients for farm-to-table restaurant',
          'Learned organic and sustainable cooking practices',
          'Assisted with menu planning and ingredient sourcing',
        ],
      },
    ]

    for (const work of workExperiences) {
      await setDoc(doc(db, 'users', userId, 'workExperience', work.id), work)
    }

    // Create education
    console.log('🎓 Creating education...')

    const education = [
      {
        id: 'edu-1',
        degree: 'Bachelor of Culinary Arts',
        institution: 'Culinary Institute of America',
        graduationYear: 2004,
        location: 'Hyde Park, NY',
      },
      {
        id: 'edu-2',
        degree: 'Associate Degree in Business',
        institution: 'New York University',
        graduationYear: 2002,
        location: 'New York, NY',
      },
    ]

    for (const edu of education) {
      await setDoc(doc(db, 'users', userId, 'education', edu.id), edu)
    }

    // Create skills
    console.log('⚡ Creating skills...')

    const skills = [
      { id: 'skill-1', name: 'Menu Development', level: 'expert' },
      { id: 'skill-2', name: 'Kitchen Management', level: 'expert' },
      { id: 'skill-3', name: 'Fine Dining', level: 'expert' },
      { id: 'skill-4', name: 'Team Leadership', level: 'expert' },
      { id: 'skill-5', name: 'Food Safety & Sanitation', level: 'advanced' },
      { id: 'skill-6', name: 'Cost Control & Budgeting', level: 'advanced' },
      { id: 'skill-7', name: 'French Cuisine', level: 'expert' },
      { id: 'skill-8', name: 'Farm-to-Table Cooking', level: 'advanced' },
      { id: 'skill-9', name: 'Inventory Management', level: 'advanced' },
      { id: 'skill-10', name: 'Culinary Innovation', level: 'expert' },
    ]

    for (const skill of skills) {
      await setDoc(doc(db, 'users', userId, 'skills', skill.id), skill)
    }

    console.log('\n✅ John Frank account fully recreated!')
    console.log('\n📋 Login Credentials:')
    console.log('   Email:    ', johnFrank.email)
    console.log('   Password: ', johnFrank.password)
    console.log('   UID:      ', userId)
    console.log('\n✅ You can now log in and test application generation!')

  } catch (error) {
    const code = error instanceof Error && 'code' in error ? (error as { code: string }).code : ''
    if (code === 'auth/email-already-in-use') {
      console.error('\n❌ Email already in use. Please manually delete from Firebase Console:')
      console.log('   https://console.firebase.google.com/project/ai-career-os-139db/authentication/users')
    } else {
      const message = error instanceof Error ? error.message : 'Unknown error'
      console.error('❌ Error:', message)
      throw error
    }
  }
}

recreateJohnFrank()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  })
