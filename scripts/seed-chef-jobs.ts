/**
 * Script to seed chef jobs into Firestore for John Frank's profile testing
 *
 * Run with: npx tsx scripts/seed-chef-jobs.ts
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'

// Firebase config with fallback values
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'ai-career-os-139db.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'ai-career-os-139db',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'ai-career-os-139db.firebasestorage.app',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '529057497050',
  appId: process.env.VITE_FIREBASE_APP_ID || '1:529057497050:web:69933ebef1c282bacecae3',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const auth = getAuth(app)

// Chef jobs in Madison, WI
const chefJobs = [
  {
    title: 'Executive Chef',
    company: 'The Capital Grille Madison',
    companyLogo: 'https://via.placeholder.com/100x100?text=CG',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 75000,
    salaryMax: 95000,
    postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Lead our upscale steakhouse kitchen as Executive Chef. Oversee all culinary operations, manage 20+ kitchen staff, develop seasonal menus featuring premium steaks and seafood. 8+ years culinary experience with 3+ years in leadership roles required. Culinary degree from accredited institution preferred.',
    requiredSkills: [
      'Menu Development',
      'Kitchen Management',
      'Team Leadership',
      'Fine Dining',
      'Cost Control & Budgeting',
    ],
    source: 'manual',
  },
  {
    title: 'Head Chef',
    company: "L'Etoile Restaurant",
    companyLogo: 'https://via.placeholder.com/100x100?text=LE',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 70000,
    salaryMax: 85000,
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      "Join our award-winning farm-to-table restaurant as Head Chef. L'Etoile has been a Madison institution for over 40 years. Create innovative seasonal menus using local, organic ingredients. Lead kitchen team of 12 staff. 10+ years professional culinary experience required. Strong background in French cuisine techniques. Culinary school training preferred.",
    requiredSkills: [
      'French Cuisine',
      'Farm-to-Table Cooking',
      'Menu Development',
      'Kitchen Management',
      'Food Safety & Sanitation',
    ],
    source: 'manual',
  },
  {
    title: 'Chef de Cuisine',
    company: 'Eno Vino Wine Bar & Bistro',
    companyLogo: 'https://via.placeholder.com/100x100?text=EV',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 65000,
    salaryMax: 80000,
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Lead the culinary program at our sophisticated wine bar and bistro. Create wine-friendly dishes that showcase seasonal ingredients while managing kitchen team of 8 professionals. Collaborate with wine director on food and wine pairings. 7+ years culinary experience in upscale environments. Strong knowledge of wine and food pairings required.',
    requiredSkills: [
      'Fine Dining',
      'Menu Development',
      'Kitchen Management',
      'Team Leadership',
      'Cost Control & Budgeting',
    ],
    source: 'manual',
  },
  {
    title: 'Sous Chef',
    company: 'Merchant Madison',
    companyLogo: 'https://via.placeholder.com/100x100?text=MM',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 55000,
    salaryMax: 68000,
    postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      "Support our Executive Chef in managing daily kitchen operations at Merchant, one of Madison's premier contemporary American restaurants on Capitol Square. Supervise kitchen staff during service, maintain food quality and presentation standards, help develop seasonal menu items. 5+ years professional kitchen experience required. Previous sous chef or senior line cook experience.",
    requiredSkills: [
      'Kitchen Management',
      'Team Leadership',
      'Menu Development',
      'Food Safety & Sanitation',
      'Inventory Management',
    ],
    source: 'manual',
  },
]

async function seedChefJobs() {
  console.log('Seeding chef jobs for Madison, WI...')
  console.log('Project ID:', firebaseConfig.projectId)

  try {
    // Sign in with test user credentials to get authentication
    console.log('\nAuthenticating with test user...')
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'test1@jobmatch.ai',
      'TestPassword123!'
    )
    console.log('✓ Authenticated as:', userCredential.user.email)

    // Add chef jobs
    console.log('\nAdding chef jobs...')
    const promises = chefJobs.map((job) => addDoc(collection(db, 'jobs'), job))
    await Promise.all(promises)

    console.log(`\n✅ Successfully added ${chefJobs.length} chef jobs to Firestore!`)
    console.log('\nJobs added:')
    chefJobs.forEach((job, i) => {
      console.log(`${i + 1}. ${job.title} at ${job.company}`)
    })
    process.exit(0)
  } catch (error) {
    console.error('❌ Error seeding jobs:', error)
    process.exit(1)
  }
}

seedChefJobs()
