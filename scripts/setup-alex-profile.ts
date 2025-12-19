import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert({
    projectId: 'ai-career-os-139db',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})

const db = getFirestore(app)
const auth = getAuth(app)

async function setupAlexProfile() {
  try {
    // Find Alex Johnson's user
    const user = await auth.getUserByEmail('alex.johnson@example.com')
    console.log('Found user:', user.uid)

    const userId = user.uid

    // Create profile
    await db.collection('users').doc(userId).set({
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
      await db.collection('users').doc(userId).collection('workExperience').add({
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
      await db.collection('users').doc(userId).collection('education').add({
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
      await db.collection('users').doc(userId).collection('skills').add({
        ...skill,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    console.log('✓ Skills added')

    // Create master resume
    await db.collection('users').doc(userId).collection('resumes').add({
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
  } catch (error) {
    console.error('Error setting up profile:', error)
    process.exit(1)
  }
}

setupAlexProfile()
