/**
 * Script to seed sample jobs into Firestore for testing user-specific job matching
 *
 * Run with: bun run scripts/seed-jobs.ts
 *
 * This creates a variety of jobs with different:
 * - Required skills (React, TypeScript, Python, Java, etc.)
 * - Experience levels (Junior, Mid, Senior)
 * - Industries (Fintech, Healthcare, E-commerce, etc.)
 * - Locations (San Francisco, New York, Remote, etc.)
 * - Work arrangements (Remote, Hybrid, On-site)
 *
 * This allows testing that different users see different job rankings based on their profiles.
 */

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, deleteDoc, getDocs } from 'firebase/firestore'

// Firebase config (use your actual config)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Sample jobs with diverse characteristics
const sampleJobs = [
  {
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    companyLogo: 'https://via.placeholder.com/100x100?text=TC',
    location: 'San Francisco, CA',
    workArrangement: 'Hybrid',
    salaryMin: 140000,
    salaryMax: 180000,
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'We are seeking an experienced Frontend Developer to join our team. 5+ years of experience with React and TypeScript required. Experience with modern build tools and state management. Fintech industry experience preferred.',
    requiredSkills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Redux', 'Next.js'],
    source: 'manual',
  },
  {
    title: 'Backend Engineer',
    company: 'HealthTech Solutions',
    companyLogo: 'https://via.placeholder.com/100x100?text=HTS',
    location: 'Remote',
    workArrangement: 'Remote',
    salaryMin: 120000,
    salaryMax: 160000,
    postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Join our healthcare platform team as a Backend Engineer. 3+ years experience with Node.js and Python. Experience building HIPAA-compliant systems. Work with medical data and improve patient outcomes.',
    requiredSkills: ['Node.js', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'REST API'],
    source: 'manual',
  },
  {
    title: 'Full Stack Developer',
    company: 'E-Commerce Inc',
    companyLogo: 'https://via.placeholder.com/100x100?text=EC',
    location: 'New York, NY',
    workArrangement: 'On-site',
    salaryMin: 110000,
    salaryMax: 150000,
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Looking for a Full Stack Developer to build our e-commerce platform. 4+ years experience required. Strong skills in React and Node.js. Experience with payment processing and high-traffic systems.',
    requiredSkills: ['React', 'Node.js', 'TypeScript', 'MongoDB', 'Express', 'Stripe'],
    source: 'manual',
  },
  {
    title: 'Junior Software Engineer',
    company: 'StartupXYZ',
    companyLogo: 'https://via.placeholder.com/100x100?text=SXY',
    location: 'Austin, TX',
    workArrangement: 'Hybrid',
    salaryMin: 70000,
    salaryMax: 90000,
    postedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Entry-level position for recent graduates or developers with 0-2 years experience. Learn from senior engineers while building SaaS products. Knowledge of JavaScript and modern frameworks preferred.',
    requiredSkills: ['JavaScript', 'HTML', 'CSS', 'Git', 'React'],
    source: 'manual',
  },
  {
    title: 'Lead Java Developer',
    company: 'Enterprise Corp',
    companyLogo: 'https://via.placeholder.com/100x100?text=ENT',
    location: 'Chicago, IL',
    workArrangement: 'Hybrid',
    salaryMin: 150000,
    salaryMax: 190000,
    postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Lead a team of Java developers building enterprise applications. 7+ years of Java experience required. Experience with Spring Boot, microservices, and cloud platforms. Financial services background a plus.',
    requiredSkills: ['Java', 'Spring Boot', 'Microservices', 'AWS', 'Kubernetes', 'SQL'],
    source: 'manual',
  },
  {
    title: 'React Native Developer',
    company: 'Mobile First',
    companyLogo: 'https://via.placeholder.com/100x100?text=MF',
    location: 'Remote',
    workArrangement: 'Remote',
    salaryMin: 100000,
    salaryMax: 140000,
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Build mobile apps for iOS and Android using React Native. 3+ years mobile development experience. Strong understanding of mobile UI/UX patterns and performance optimization.',
    requiredSkills: ['React Native', 'JavaScript', 'TypeScript', 'iOS', 'Android', 'Redux'],
    source: 'manual',
  },
  {
    title: 'DevOps Engineer',
    company: 'CloudTech',
    companyLogo: 'https://via.placeholder.com/100x100?text=CT',
    location: 'Seattle, WA',
    workArrangement: 'Hybrid',
    salaryMin: 130000,
    salaryMax: 170000,
    postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Seeking DevOps Engineer to manage cloud infrastructure and CI/CD pipelines. 4+ years experience with AWS, Docker, and Kubernetes. Experience with infrastructure as code and monitoring systems.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'Python', 'Linux'],
    source: 'manual',
  },
  {
    title: 'Frontend Developer (Vue.js)',
    company: 'WebSolutions',
    companyLogo: 'https://via.placeholder.com/100x100?text=WS',
    location: 'Boston, MA',
    workArrangement: 'Remote',
    salaryMin: 95000,
    salaryMax: 130000,
    postedDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Join our team building web applications with Vue.js. 3+ years frontend experience. Strong CSS skills and experience with component libraries. Nuxt.js experience is a plus.',
    requiredSkills: ['Vue.js', 'JavaScript', 'TypeScript', 'CSS', 'HTML', 'Nuxt.js'],
    source: 'manual',
  },
  {
    title: 'Python Data Engineer',
    company: 'DataCorp',
    companyLogo: 'https://via.placeholder.com/100x100?text=DC',
    location: 'Remote',
    workArrangement: 'Remote',
    salaryMin: 125000,
    salaryMax: 165000,
    postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Build data pipelines and ETL processes using Python. 4+ years experience with Python and SQL. Experience with Airflow, Spark, and cloud data warehouses. Work with petabyte-scale datasets.',
    requiredSkills: ['Python', 'SQL', 'Airflow', 'Spark', 'AWS', 'ETL', 'Data Warehousing'],
    source: 'manual',
  },
  {
    title: 'Staff Software Engineer',
    company: 'BigTech',
    companyLogo: 'https://via.placeholder.com/100x100?text=BT',
    location: 'San Francisco, CA',
    workArrangement: 'Hybrid',
    salaryMin: 180000,
    salaryMax: 250000,
    postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    description:
      'Staff-level position for experienced engineers. 8+ years experience building large-scale distributed systems. Strong system design skills. Experience leading technical initiatives across multiple teams.',
    requiredSkills: [
      'System Design',
      'Distributed Systems',
      'JavaScript',
      'TypeScript',
      'Go',
      'Python',
      'Kubernetes',
    ],
    source: 'manual',
  },
]

async function clearJobs() {
  console.log('Clearing existing jobs...')
  const jobsSnapshot = await getDocs(collection(db, 'jobs'))
  const deletePromises = jobsSnapshot.docs.map((doc) => deleteDoc(doc.ref))
  await Promise.all(deletePromises)
  console.log(`Deleted ${deletePromises.length} existing jobs`)
}

async function seedJobs() {
  console.log('Seeding jobs...')
  const promises = sampleJobs.map((job) => addDoc(collection(db, 'jobs'), job))
  await Promise.all(promises)
  console.log(`Added ${sampleJobs.length} jobs to Firestore`)
}

async function main() {
  try {
    console.log('Starting job seeding process...')
    console.log('Project ID:', firebaseConfig.projectId)

    await clearJobs()
    await seedJobs()

    console.log('\nSuccess! Jobs have been seeded.')
    console.log('\nTest instructions:')
    console.log('1. Create User A with skills: React, TypeScript, JavaScript')
    console.log('   Location: San Francisco, CA')
    console.log('   Expected top matches: Senior Frontend Developer, Staff Software Engineer')
    console.log('')
    console.log('2. Create User B with skills: Python, SQL, AWS')
    console.log('   Location: Remote preferred')
    console.log('   Expected top matches: Python Data Engineer, Backend Engineer')
    console.log('')
    console.log('3. Verify that each user sees different match scores and rankings')
    console.log('4. Test save/unsave functionality is user-specific')

    process.exit(0)
  } catch (error) {
    console.error('Error seeding jobs:', error)
    process.exit(1)
  }
}

main()
