/**
 * Import LinkedIn Profile Data to Supabase
 *
 * This script imports the LinkedIn profile data (experiences, education, skills)
 * that was extracted using the linkedin-scraper.ts script.
 *
 * Usage:
 *   npx tsx scripts/import-linkedin-data.ts [path-to-json]
 *
 * Default path: ./linkedin-profile-export.json
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs/promises'
import path from 'path'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase credentials!')
  console.error('   Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

interface Experience {
  title: string
  company: string
  duration: string
  location?: string
  description?: string
  startDate?: string
  endDate?: string
}

interface Education {
  school: string
  degree?: string
  field?: string
  duration: string
  startDate?: string
  endDate?: string
}

interface LinkedInProfile {
  name: string
  headline: string
  location: string
  summary?: string
  experiences: Experience[]
  education: Education[]
  skills: string[]
}

function parseDuration(duration: string): { startDate: Date | null; endDate: Date | null; isCurrent: boolean } {
  // Examples:
  // "Jan 2020 - Present"
  // "2018 - 2022"
  // "Jun 2015 - Dec 2019"
  // "2020 - Present"

  const isCurrent = duration.toLowerCase().includes('present')
  let startDate: Date | null = null
  let endDate: Date | null = null

  try {
    const parts = duration.split('-').map(p => p.trim())

    // Parse start date
    if (parts[0]) {
      const startStr = parts[0].replace(/[^\w\s]/g, ' ').trim()
      startDate = new Date(startStr)
      if (isNaN(startDate.getTime())) {
        startDate = null
      }
    }

    // Parse end date
    if (parts[1] && !isCurrent) {
      const endStr = parts[1].replace(/[^\w\s]/g, ' ').trim()
      endDate = new Date(endStr)
      if (isNaN(endDate.getTime())) {
        endDate = null
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Could not parse duration: "${duration}"`)
  }

  return { startDate, endDate, isCurrent }
}

async function importLinkedInData(filePath: string) {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  LinkedIn Data Import')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')

  // Read the LinkedIn export JSON
  console.log('📂 Reading LinkedIn export file...')
  const fileContent = await fs.readFile(filePath, 'utf-8')
  const profile: LinkedInProfile = JSON.parse(fileContent)

  console.log(`   ✓ Found data for: ${profile.name}`)
  console.log(`   ✓ ${profile.experiences.length} experiences`)
  console.log(`   ✓ ${profile.education.length} education entries`)
  console.log(`   ✓ ${profile.skills.length} skills`)
  console.log('')

  // Check if user is authenticated
  console.log('🔐 Checking authentication...')
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    console.error('❌ Not authenticated!')
    console.error('   Please sign in to JobMatch first.')
    console.error('')
    console.error('   Steps:')
    console.error('   1. Open http://localhost:5173 in your browser')
    console.error('   2. Sign in with your account')
    console.error('   3. Run this script again')
    process.exit(1)
  }

  const userId = session.user.id
  console.log(`   ✓ Authenticated as: ${session.user.email}`)
  console.log('')

  // Update basic profile info
  console.log('👤 Updating basic profile info...')
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: session.user.email!,
      current_title: profile.headline,
      location: profile.location,
      professional_summary: profile.summary,
      updated_at: new Date().toISOString(),
    })

  if (profileError) {
    console.log(`   ⚠️  Could not update basic profile: ${profileError.message}`)
  } else {
    console.log('   ✓ Profile updated')
  }
  console.log('')

  // Import experiences
  console.log('💼 Importing work experience...')
  let experienceCount = 0

  for (const exp of profile.experiences) {
    const { startDate, endDate, isCurrent } = parseDuration(exp.duration)

    const { error } = await supabase
      .from('work_experience')
      .insert({
        user_id: userId,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        description: exp.description,
        start_date: startDate?.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0],
        is_current: isCurrent,
      })

    if (error) {
      console.log(`   ⚠️  Error importing: ${exp.title} at ${exp.company}`)
      console.log(`      ${error.message}`)
    } else {
      experienceCount++
      console.log(`   ✓ ${exp.title} at ${exp.company}`)
    }
  }

  console.log(`   ✅ Imported ${experienceCount}/${profile.experiences.length} experiences`)
  console.log('')

  // Import education
  console.log('🎓 Importing education...')
  let educationCount = 0

  for (const edu of profile.education) {
    const { startDate, endDate, isCurrent } = parseDuration(edu.duration)

    // Try to parse degree and field from combined string
    // e.g., "Bachelor's Degree, Computer Science" → degree: "Bachelor's Degree", field: "Computer Science"
    let degree = edu.degree || ''
    let field = edu.field || ''

    if (degree && degree.includes(',')) {
      const parts = degree.split(',')
      degree = parts[0].trim()
      field = parts.slice(1).join(',').trim()
    }

    const { error } = await supabase
      .from('education')
      .insert({
        user_id: userId,
        institution: edu.school,
        degree: degree || null,
        field_of_study: field || null,
        start_date: startDate?.toISOString().split('T')[0],
        end_date: endDate?.toISOString().split('T')[0],
        is_current: isCurrent,
      })

    if (error) {
      console.log(`   ⚠️  Error importing: ${edu.school}`)
      console.log(`      ${error.message}`)
    } else {
      educationCount++
      console.log(`   ✓ ${edu.degree || 'Education'} from ${edu.school}`)
    }
  }

  console.log(`   ✅ Imported ${educationCount}/${profile.education.length} education entries`)
  console.log('')

  // Import skills
  console.log('🎯 Importing skills...')
  let skillCount = 0

  for (const skillName of profile.skills) {
    const { error } = await supabase
      .from('skills')
      .insert({
        user_id: userId,
        name: skillName,
      })
      .select()

    if (error) {
      // Check if it's a duplicate error (constraint violation)
      if (error.code === '23505') {
        console.log(`   ⚠️  Skill already exists: ${skillName}`)
      } else {
        console.log(`   ⚠️  Error importing: ${skillName}`)
        console.log(`      ${error.message}`)
      }
    } else {
      skillCount++
      console.log(`   ✓ ${skillName}`)
    }
  }

  console.log(`   ✅ Imported ${skillCount}/${profile.skills.length} skills`)
  console.log('')

  console.log('═══════════════════════════════════════════════════════')
  console.log('  ✅ IMPORT COMPLETE')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   Experiences: ${experienceCount} imported`)
  console.log(`   Education: ${educationCount} imported`)
  console.log(`   Skills: ${skillCount} imported`)
  console.log('')
  console.log('📝 Next steps:')
  console.log('   1. Visit http://localhost:5173/profile to view your updated profile')
  console.log('   2. Edit any entries that need corrections')
  console.log('   3. Add missing details (descriptions, dates, etc.)')
  console.log('')
}

async function main() {
  const jsonPath = process.argv[2] || path.join(process.cwd(), 'linkedin-profile-export.json')

  try {
    await importLinkedInData(jsonPath)
  } catch (error) {
    console.error('')
    console.error('❌ Error:', error)
    console.error('')
    process.exit(1)
  }
}

main()
