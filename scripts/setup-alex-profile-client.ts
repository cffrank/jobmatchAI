import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore'

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

async function setupAlexProfile() {
  try {
    // Sign in as Alex
    const userCredential = await signInWithEmailAndPassword(
      auth,
      'alex.johnson@example.com',
      'SecurePassword123!'
    )
    const userId = userCredential.user.uid
    console.log('Signed in as:', userId)

    // Create profile
    await setDoc(doc(db, 'users', userId), {
      firstName: 'Alex',
      lastName: 'Johnson',
      email: 'alex.johnson@example.com',
      phone: '+1 (555) 234-5678',
      location: 'Austin, TX',
      linkedInUrl: 'https://linkedin.com/in/alexjohnson',
      profileImageUrl: null,
      headline: 'Senior Software Engineer | Full-Stack Developer',
      summary: 'Passionate software engineer with 5+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud architecture. Led development of high-impact features serving millions of users.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    console.log('✓ Profile created')

    // Add work experience
    const workExp = [
      {
        company: 'TechCorp Solutions',
        position: 'Senior Software Engineer',
        location: 'Austin, TX',
        startDate: '2021-03',
        endDate: null,
        current: true,
        description: 'Leading development of customer-facing web applications',
        accomplishments: [
          'Architected and deployed microservices infrastructure reducing API latency by 40%',
          'Led team of 4 engineers in rebuilding legacy monolith into React + Node.js stack',
          'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
          'Mentored 3 junior developers and conducted technical interviews',
        ],
      },
      {
        company: 'StartupXYZ',
        position: 'Full-Stack Developer',
        location: 'San Francisco, CA',
        startDate: '2019-06',
        endDate: '2021-02',
        current: false,
        description: 'Built and maintained core product features',
        accomplishments: [
          'Developed real-time collaborative editing feature using WebSockets serving 50k+ users',
          'Optimized database queries improving page load time by 60%',
          'Integrated Stripe payment processing and subscription management',
          'Built RESTful APIs consumed by web and mobile clients',
        ],
      },
    ]

    for (const exp of workExp) {
      await addDoc(collection(db, 'users', userId, 'workExperience'), {
        ...exp,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    console.log('✓ Work experience added')

    // Add education
    const education = [
      {
        school: 'University of Texas at Austin',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Austin, TX',
        startDate: '2015-08',
        endDate: '2019-05',
        gpa: '3.8',
        highlights: [
          'Dean\'s List all semesters',
          'Led student hackathon team to 1st place',
          'TA for Data Structures course',
        ],
      },
    ]

    for (const edu of education) {
      await addDoc(collection(db, 'users', userId, 'education'), {
        ...edu,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    console.log('✓ Education added')

    // Add skills
    const skills = [
      { name: 'JavaScript', endorsements: 45 },
      { name: 'TypeScript', endorsements: 38 },
      { name: 'React', endorsements: 42 },
      { name: 'Node.js', endorsements: 35 },
      { name: 'Python', endorsements: 28 },
      { name: 'AWS', endorsements: 30 },
      { name: 'Docker', endorsements: 25 },
      { name: 'PostgreSQL', endorsements: 22 },
      { name: 'Git', endorsements: 40 },
      { name: 'REST APIs', endorsements: 36 },
      { name: 'GraphQL', endorsements: 20 },
      { name: 'CI/CD', endorsements: 18 },
    ]

    for (const skill of skills) {
      await addDoc(collection(db, 'users', userId, 'skills'), {
        ...skill,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    console.log('✓ Skills added')

    // Create master resume
    await addDoc(collection(db, 'users', userId, 'resumes'), {
      type: 'master',
      title: 'Master Resume',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sections: {
        header: {
          name: 'Alex Johnson',
          title: 'Senior Software Engineer',
          contact: {
            email: 'alex.johnson@example.com',
            phone: '+1 (555) 234-5678',
            location: 'Austin, TX',
            linkedIn: 'https://linkedin.com/in/alexjohnson',
          },
        },
        summary: 'Passionate software engineer with 5+ years of experience building scalable web applications. Specialized in React, Node.js, and cloud architecture. Led development of high-impact features serving millions of users.',
        experience: [
          'Senior Software Engineer at TechCorp Solutions',
          'Full-Stack Developer at StartupXYZ',
        ],
        education: [
          'B.S. Computer Science - University of Texas at Austin',
        ],
        skills: skills.map(s => s.name),
      },
      formats: ['pdf', 'docx', 'txt'],
    })
    console.log('✓ Master resume created')

    console.log('\n✅ Alex Johnson profile setup complete!')
    process.exit(0)
  } catch (error) {
    console.error('Error setting up profile:', error)
    process.exit(1)
  }
}

setupAlexProfile()
