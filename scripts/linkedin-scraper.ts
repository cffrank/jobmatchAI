/**
 * LinkedIn Profile Scraper (LOCAL USE ONLY)
 *
 * ⚠️ WARNING: This script is for PERSONAL USE ONLY to extract YOUR OWN LinkedIn data.
 * - Run this script locally on your machine
 * - Do NOT automate this or run it on a server
 * - LinkedIn prohibits automated scraping in their Terms of Service
 * - Use at your own risk
 *
 * This script extracts:
 * - Work Experience
 * - Education
 * - Skills
 *
 * Usage:
 *   npx tsx scripts/linkedin-scraper.ts
 */

import { chromium } from 'playwright'
import fs from 'fs/promises'
import path from 'path'

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

async function scrapeLinkedInProfile(profileUrl: string): Promise<LinkedInProfile> {
  console.log('🚀 Starting LinkedIn profile scraper...')
  console.log('⚠️  Make sure you are logged into LinkedIn in your browser')
  console.log('📄 Profile URL:', profileUrl)
  console.log('')

  // Launch browser with persistent context (uses your existing login)
  const userDataDir = path.join(process.env.HOME || '', '.config/google-chrome')

  const browser = await chromium.launchPersistentContext(userDataDir, {
    headless: false, // Show browser so you can see what's happening
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  })

  const page = await browser.newPage()

  try {
    console.log('📱 Navigating to LinkedIn profile...')
    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // Wait a bit for dynamic content
    await page.waitForTimeout(2000)

    // Check if we're on the login page
    const isLoginPage = await page.locator('input[name="session_key"]').count() > 0
    if (isLoginPage) {
      console.log('❌ Not logged in! Please log into LinkedIn first.')
      console.log('   1. Open Chrome/Chromium browser')
      console.log('   2. Go to linkedin.com and log in')
      console.log('   3. Run this script again')
      await browser.close()
      process.exit(1)
    }

    console.log('✅ Page loaded successfully')
    console.log('')

    const profile: LinkedInProfile = {
      name: '',
      headline: '',
      location: '',
      experiences: [],
      education: [],
      skills: [],
    }

    // Extract name
    console.log('📝 Extracting profile data...')
    try {
      const nameElement = page.locator('h1.text-heading-xlarge').first()
      profile.name = (await nameElement.textContent()) || ''
      console.log('   Name:', profile.name)
    } catch {
      console.log('   ⚠️  Could not extract name')
    }

    // Extract headline
    try {
      const headlineElement = page.locator('.text-body-medium.break-words').first()
      profile.headline = (await headlineElement.textContent()) || ''
      console.log('   Headline:', profile.headline)
    } catch {
      console.log('   ⚠️  Could not extract headline')
    }

    // Extract location
    try {
      const locationElement = page.locator('.text-body-small.inline.t-black--light.break-words').first()
      profile.location = (await locationElement.textContent()) || ''
      console.log('   Location:', profile.location)
    } catch {
      console.log('   ⚠️  Could not extract location')
    }

    // Extract About/Summary
    try {
      const aboutButton = page.locator('#about').first()
      if (await aboutButton.count() > 0) {
        const summarySection = page.locator('#about').locator('..').locator('..')
        const summaryText = await summarySection.locator('.inline-show-more-text span[aria-hidden="true"]').first()
        profile.summary = (await summaryText.textContent())?.trim() || ''
        console.log('   Summary length:', profile.summary.length, 'characters')
      }
    } catch {
      console.log('   ⚠️  Could not extract summary')
    }

    console.log('')
    console.log('💼 Extracting work experience...')

    // Scroll to experience section
    try {
      await page.locator('#experience').scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)

      // Get all experience items
      const experienceSection = page.locator('#experience').locator('..').locator('..')
      const experienceItems = experienceSection.locator('li.artdeco-list__item')
      const count = await experienceItems.count()

      console.log(`   Found ${count} experience entries`)

      for (let i = 0; i < count; i++) {
        try {
          const item = experienceItems.nth(i)

          const title = await item.locator('.mr1.t-bold span[aria-hidden="true"]').first().textContent() || ''
          const companyElement = item.locator('.t-14.t-normal span[aria-hidden="true"]').first()
          const company = await companyElement.textContent() || ''
          const duration = await item.locator('.t-14.t-normal.t-black--light span[aria-hidden="true"]').first().textContent() || ''
          const location = await item.locator('.t-14.t-normal.t-black--light').nth(1).textContent() || ''

          // Try to get description if "...see more" button exists
          let description = ''
          try {
            const seeMoreButton = item.locator('button[aria-label*="see more"]').first()
            if (await seeMoreButton.count() > 0) {
              await seeMoreButton.click()
              await page.waitForTimeout(500)
            }

            const descElement = item.locator('.inline-show-more-text span[aria-hidden="true"]').first()
            if (await descElement.count() > 0) {
              description = (await descElement.textContent())?.trim() || ''
            }
          } catch {
            // Description not found or couldn't expand
          }

          const experience: Experience = {
            title: title.trim(),
            company: company.trim(),
            duration: duration.trim(),
            location: location.trim(),
            description: description,
          }

          profile.experiences.push(experience)
          console.log(`   ✓ ${experience.title} at ${experience.company}`)
        } catch {
          console.log(`   ⚠️  Error parsing experience item ${i + 1}`)
        }
      }
    } catch {
      console.log('   ⚠️  Could not extract experience section')
    }

    console.log('')
    console.log('🎓 Extracting education...')

    // Scroll to education section
    try {
      await page.locator('#education').scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)

      const educationSection = page.locator('#education').locator('..').locator('..')
      const educationItems = educationSection.locator('li.artdeco-list__item')
      const count = await educationItems.count()

      console.log(`   Found ${count} education entries`)

      for (let i = 0; i < count; i++) {
        try {
          const item = educationItems.nth(i)

          const school = await item.locator('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]').first().textContent() || ''
          const degreeElement = item.locator('.t-14.t-normal span[aria-hidden="true"]').first()
          const degree = await degreeElement.textContent() || ''
          const duration = await item.locator('.t-14.t-normal.t-black--light span[aria-hidden="true"]').first().textContent() || ''

          const education: Education = {
            school: school.trim(),
            degree: degree.trim(),
            duration: duration.trim(),
          }

          profile.education.push(education)
          console.log(`   ✓ ${education.degree} from ${education.school}`)
        } catch {
          console.log(`   ⚠️  Error parsing education item ${i + 1}`)
        }
      }
    } catch {
      console.log('   ⚠️  Could not extract education section')
    }

    console.log('')
    console.log('🎯 Extracting skills...')

    // Scroll to skills section
    try {
      await page.locator('#skills').scrollIntoViewIfNeeded()
      await page.waitForTimeout(1000)

      // Click "Show all skills" if available
      const showAllButton = page.locator('button[aria-label*="Show all"]').first()
      if (await showAllButton.count() > 0) {
        await showAllButton.click()
        await page.waitForTimeout(1000)
      }

      const skillsSection = page.locator('#skills').locator('..').locator('..')
      const skillItems = skillsSection.locator('li.artdeco-list__item')
      const count = await skillItems.count()

      console.log(`   Found ${count} skills`)

      for (let i = 0; i < Math.min(count, 50); i++) { // Limit to 50 skills
        try {
          const item = skillItems.nth(i)
          const skill = await item.locator('.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]').first().textContent() || ''

          if (skill.trim()) {
            profile.skills.push(skill.trim())
            console.log(`   ✓ ${skill.trim()}`)
          }
        } catch {
          // Skip this skill
        }
      }
    } catch {
      console.log('   ⚠️  Could not extract skills section')
    }

    return profile
  } finally {
    await browser.close()
  }
}

async function main() {
  const profileUrl = process.argv[2] || 'https://www.linkedin.com/in/carl-frank-939a122/'

  console.log('═══════════════════════════════════════════════════════')
  console.log('  LinkedIn Profile Scraper')
  console.log('  ⚠️  FOR PERSONAL USE ONLY')
  console.log('═══════════════════════════════════════════════════════')
  console.log('')

  try {
    const profile = await scrapeLinkedInProfile(profileUrl)

    console.log('')
    console.log('═══════════════════════════════════════════════════════')
    console.log('  ✅ EXTRACTION COMPLETE')
    console.log('═══════════════════════════════════════════════════════')
    console.log('')
    console.log('📊 Summary:')
    console.log(`   Name: ${profile.name}`)
    console.log(`   Headline: ${profile.headline}`)
    console.log(`   Location: ${profile.location}`)
    console.log(`   Experiences: ${profile.experiences.length}`)
    console.log(`   Education: ${profile.education.length}`)
    console.log(`   Skills: ${profile.skills.length}`)
    console.log('')

    // Save to JSON file
    const outputPath = path.join(process.cwd(), 'linkedin-profile-export.json')
    await fs.writeFile(outputPath, JSON.stringify(profile, null, 2), 'utf-8')

    console.log('💾 Data saved to:', outputPath)
    console.log('')
    console.log('📝 Next steps:')
    console.log('   1. Review the exported JSON file')
    console.log('   2. Run the import script to add this data to your profile:')
    console.log('      npx tsx scripts/import-linkedin-data.ts')
    console.log('')
  } catch (error) {
    console.error('')
    console.error('❌ Error:', error)
    console.error('')
    process.exit(1)
  }
}

main()
