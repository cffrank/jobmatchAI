import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc } from 'firebase/firestore'

// Firebase config - using the same config as the app
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

const chefJobs = [
  {
    title: 'Executive Chef',
    company: 'The Capital Grille Madison',
    companyLogo: 'https://via.placeholder.com/80x80/dc2626/ffffff?text=CG',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 75000,
    salaryMax: 95000,
    postedDate: '2025-12-18',
    applicationDeadline: '2026-01-31',
    matchScore: 0,
    isSaved: false,
    requiredSkills: [
      'Menu Development',
      'Kitchen Management',
      'Team Leadership',
      'Fine Dining',
      'Cost Control & Budgeting',
    ],
    missingSkills: [],
    description: `Lead our upscale steakhouse kitchen as Executive Chef. You'll oversee all culinary operations, manage kitchen staff, develop seasonal menus, and maintain our reputation for exceptional fine dining.

Responsibilities:
• Oversee all kitchen operations and ensure highest quality standards
• Manage team of 20+ kitchen staff including sous chefs and line cooks
• Develop creative seasonal menus featuring premium steaks and seafood
• Manage food costs, inventory, and vendor relationships
• Ensure compliance with health and safety regulations
• Train and mentor kitchen staff

Requirements:
• 8+ years of culinary experience with 3+ years in leadership roles
• Culinary degree from accredited institution
• Experience with high-volume fine dining operations
• Strong knowledge of food safety and sanitation
• Excellent leadership and communication skills
• Proven track record of menu development and cost control`,
    compatibilityBreakdown: {
      skillMatch: 100,
      experienceMatch: 95,
      industryMatch: 100,
      locationMatch: 100,
    },
    recommendations: [
      'Excellent match! Your 20 years of experience aligns perfectly',
      'Your Michelin-star background is a strong asset for this upscale restaurant',
      'Highlight your cost reduction and revenue growth achievements',
    ],
  },
  {
    title: 'Head Chef',
    company: 'L\'Etoile Restaurant',
    companyLogo: 'https://via.placeholder.com/80x80/f59e0b/ffffff?text=LE',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 70000,
    salaryMax: 85000,
    postedDate: '2025-12-17',
    applicationDeadline: '2026-01-25',
    matchScore: 0,
    isSaved: false,
    requiredSkills: [
      'French Cuisine',
      'Farm-to-Table Cooking',
      'Menu Development',
      'Kitchen Management',
      'Food Safety & Sanitation',
    ],
    missingSkills: [],
    description: `Join our award-winning farm-to-table restaurant as Head Chef. L'Etoile has been a Madison institution for over 40 years, showcasing Wisconsin's finest ingredients in French-inspired cuisine.

What You'll Do:
• Lead kitchen operations for our 100-seat fine dining restaurant
• Create innovative seasonal menus using local, organic ingredients
• Manage kitchen team of 12 staff members
• Build relationships with local farmers and suppliers
• Maintain our commitment to sustainability and local sourcing
• Oversee food preparation, presentation, and quality control

What We're Looking For:
• 10+ years of professional culinary experience
• Strong background in French cuisine techniques
• Passion for farm-to-table and sustainable cooking
• Culinary school training preferred
• Experience managing kitchen operations and staff
• Creativity and commitment to excellence`,
    compatibilityBreakdown: {
      skillMatch: 100,
      experienceMatch: 100,
      industryMatch: 100,
      locationMatch: 100,
    },
    recommendations: [
      'Perfect match! Your farm-to-table experience is exactly what they need',
      'Your French cuisine background from CIA is highly relevant',
      'This local Madison restaurant aligns with your location preference',
    ],
  },
  {
    title: 'Sous Chef',
    company: 'Merchant Madison',
    companyLogo: 'https://via.placeholder.com/80x80/3b82f6/ffffff?text=MM',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 55000,
    salaryMax: 68000,
    postedDate: '2025-12-16',
    applicationDeadline: '2026-01-20',
    matchScore: 0,
    isSaved: false,
    requiredSkills: [
      'Kitchen Management',
      'Team Leadership',
      'Menu Development',
      'Food Safety & Sanitation',
      'Inventory Management',
    ],
    missingSkills: [],
    description: `Support our Executive Chef in managing daily kitchen operations at Merchant, one of Madison's premier contemporary American restaurants located on Capitol Square.

Responsibilities:
• Assist Executive Chef with all kitchen management duties
• Supervise kitchen staff during service periods
• Maintain food quality and presentation standards
• Help develop seasonal menu items and daily specials
• Manage food ordering and inventory control
• Ensure kitchen cleanliness and safety compliance
• Train and develop line cooks and kitchen staff

Requirements:
• 5+ years of professional kitchen experience
• Previous sous chef or senior line cook experience
• Strong organizational and leadership skills
• Knowledge of contemporary American cuisine
• Culinary degree or equivalent experience
• Ability to work evenings, weekends, and holidays
• Passion for local ingredients and seasonal cooking`,
    compatibilityBreakdown: {
      skillMatch: 95,
      experienceMatch: 100,
      industryMatch: 90,
      locationMatch: 100,
    },
    recommendations: [
      'Your experience far exceeds this role - you may be overqualified',
      'This is a step down from Executive Chef positions',
      'Could be good if you want less responsibility while settling in Madison',
    ],
  },
  {
    title: 'Chef de Cuisine',
    company: 'Eno Vino Wine Bar & Bistro',
    companyLogo: 'https://via.placeholder.com/80x80/8b5cf6/ffffff?text=EV',
    location: 'Madison, WI',
    workArrangement: 'On-site',
    salaryMin: 65000,
    salaryMax: 80000,
    postedDate: '2025-12-19',
    applicationDeadline: '2026-02-05',
    matchScore: 0,
    isSaved: false,
    requiredSkills: [
      'Fine Dining',
      'Menu Development',
      'Kitchen Management',
      'Team Leadership',
      'Cost Control & Budgeting',
    ],
    missingSkills: [],
    description: `Lead the culinary program at our sophisticated wine bar and bistro. Create wine-friendly dishes that showcase seasonal ingredients while managing a talented kitchen team.

Your Role:
• Develop and execute seasonal menus paired with our extensive wine list
• Manage kitchen operations for lunch and dinner service
• Lead team of 8 kitchen professionals
• Control food costs and maintain profitable operations
• Collaborate with wine director on food and wine pairings
• Maintain high standards for food quality and presentation
• Create special tasting menus for wine events

Ideal Candidate:
• 7+ years of culinary experience in upscale environments
• Strong knowledge of wine and food pairings
• Creative approach to seasonal menu development
• Proven kitchen management and leadership skills
• Culinary degree and/or apprenticeship training
• Experience with small plates and bistro-style cooking
• Commitment to local sourcing and sustainability`,
    compatibilityBreakdown: {
      skillMatch: 100,
      experienceMatch: 95,
      industryMatch: 100,
      locationMatch: 100,
    },
    recommendations: [
      'Great match! Your fine dining experience is perfect for this bistro',
      'Your menu development skills will shine in this creative role',
      'Madison location is ideal for your relocation goals',
    ],
  },
]

async function addChefJobs() {
  console.log('Adding chef jobs to Firestore...')

  try {
    for (const job of chefJobs) {
      const docRef = await addDoc(collection(db, 'jobs'), job)
      console.log(`Added ${job.title} at ${job.company} with ID: ${docRef.id}`)
    }

    console.log('\n✅ Successfully added 4 chef jobs in Madison, WI!')
  } catch (error) {
    console.error('Error adding jobs:', error)
    process.exit(1)
  }
}

addChefJobs()
