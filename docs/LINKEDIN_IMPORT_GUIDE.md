# LinkedIn Profile Import Guide

This guide explains how to automatically import your LinkedIn profile data (work experience, education, skills) into JobMatch AI.

## ⚠️ Important Disclaimer

**LinkedIn Terms of Service Warning:**
- LinkedIn prohibits automated scraping in their Terms of Service
- This tool is for **PERSONAL USE ONLY** to extract **YOUR OWN** data
- Run this script **locally** on your computer (not on a server)
- Use **once** to populate your profile, not for continuous automated scraping
- Use at your own risk - account restrictions are possible

## What Gets Imported

The scraper extracts:
- ✅ **Work Experience**: Job titles, companies, dates, locations, descriptions
- ✅ **Education**: Schools, degrees, fields of study, dates
- ✅ **Skills**: All your listed LinkedIn skills
- ✅ **Basic Info**: Headline, location, summary

## Prerequisites

1. **Playwright installed**:
   ```bash
   npm install playwright
   npx playwright install chromium
   ```

2. **Logged into LinkedIn**:
   - Open Chrome/Chromium browser
   - Go to linkedin.com and sign in
   - Keep the browser open

3. **Logged into JobMatch**:
   - Open http://localhost:5173 in your browser
   - Sign in with your account
   - Keep this session active

## Step-by-Step Instructions

### Step 1: Run Database Migration

First, apply the database migration to create the necessary tables:

```bash
cd /home/carl/application-tracking/jobmatch-ai
```

Then run the migration using the Supabase MCP tool or SQL editor.

### Step 2: Extract LinkedIn Data

Run the scraper script:

```bash
npx tsx scripts/linkedin-scraper.ts https://www.linkedin.com/in/carl-frank-939a122/
```

**What happens:**
1. Browser window opens (you'll see it)
2. Navigates to your LinkedIn profile
3. Extracts experiences, education, skills
4. Saves to `linkedin-profile-export.json`

**Expected output:**
```
🚀 Starting LinkedIn profile scraper...
📱 Navigating to LinkedIn profile...
✅ Page loaded successfully

📝 Extracting profile data...
   Name: Carl Frank
   Headline: [Your headline]
   Location: [Your location]

💼 Extracting work experience...
   Found 5 experience entries
   ✓ Senior Software Engineer at Company A
   ✓ Software Engineer at Company B
   ...

🎓 Extracting education...
   Found 2 education entries
   ✓ Bachelor's Degree from University X
   ...

🎯 Extracting skills...
   Found 25 skills
   ✓ JavaScript
   ✓ React
   ...

✅ EXTRACTION COMPLETE
💾 Data saved to: linkedin-profile-export.json
```

### Step 3: Review Exported Data

Open and review the JSON file:

```bash
cat linkedin-profile-export.json
```

Check for:
- Correct names and titles
- Accurate dates
- Complete descriptions
- All skills captured

Edit the JSON file if needed to fix any errors.

### Step 4: Import to JobMatch

Run the import script:

```bash
npx tsx scripts/import-linkedin-data.ts
```

**What happens:**
1. Reads `linkedin-profile-export.json`
2. Authenticates with Supabase (uses your current session)
3. Imports experiences, education, skills
4. Shows progress for each item

**Expected output:**
```
═══════════════════════════════════════════════════════
  LinkedIn Data Import
═══════════════════════════════════════════════════════

📂 Reading LinkedIn export file...
   ✓ Found data for: Carl Frank
   ✓ 5 experiences
   ✓ 2 education entries
   ✓ 25 skills

🔐 Checking authentication...
   ✓ Authenticated as: carl.f.frank@gmail.com

👤 Updating basic profile info...
   ✓ Profile updated

💼 Importing work experience...
   ✓ Senior Software Engineer at Company A
   ✓ Software Engineer at Company B
   ...
   ✅ Imported 5/5 experiences

🎓 Importing education...
   ✓ Bachelor's Degree from University X
   ✅ Imported 2/2 education entries

🎯 Importing skills...
   ✓ JavaScript
   ✓ React
   ...
   ✅ Imported 25/25 skills

✅ IMPORT COMPLETE
```

### Step 5: Review in JobMatch

1. Visit http://localhost:5173/profile
2. Check your imported data
3. Edit any entries that need corrections
4. Add missing details

## Troubleshooting

### "Not logged in! Please log into LinkedIn first"

**Solution:**
1. Open Chrome/Chromium
2. Go to linkedin.com
3. Sign in
4. Run the scraper again

The scraper uses your existing browser session.

### "Not authenticated!" (during import)

**Solution:**
1. Open http://localhost:5173
2. Sign in to JobMatch
3. Keep the browser tab open
4. Run the import script again

### "Could not extract [section]"

LinkedIn frequently changes their DOM structure. If extraction fails:

**Option 1: Manual Entry**
- Copy data manually from LinkedIn
- Paste into JobMatch profile editor

**Option 2: Update Selectors**
- Open `scripts/linkedin-scraper.ts`
- Update CSS selectors to match current LinkedIn DOM
- LinkedIn class names often change

### Skills Already Exist

If you see "Skill already exists" warnings:
- This is normal if you've run the import before
- Duplicate skills are automatically skipped
- No action needed

## Data Structure

### Experiences Table (`work_experience`)
```sql
- id: UUID
- user_id: UUID
- title: TEXT (Job Title)
- company: TEXT
- location: TEXT
- employment_type: TEXT
- start_date: DATE
- end_date: DATE
- is_current: BOOLEAN
- description: TEXT
```

### Education Table (`education`)
```sql
- id: UUID
- user_id: UUID
- institution: TEXT (School/University)
- degree: TEXT
- field_of_study: TEXT
- start_date: DATE
- end_date: DATE
- is_current: BOOLEAN
- grade: TEXT
- description: TEXT
```

### Skills Table (`skills`)
```sql
- id: UUID
- user_id: UUID
- name: TEXT (UNIQUE per user)
- proficiency_level: TEXT
- years_of_experience: INTEGER
- endorsed_count: INTEGER
```

## Alternative: Manual Import

If automated scraping doesn't work or you prefer not to use it:

1. **Copy from LinkedIn** → Paste into JobMatch
2. Use the profile editor at `/profile/edit`
3. Add experiences, education, skills one by one
4. Save after each entry

## Future: Browser Extension

In Version 2.0, we're planning a safer browser extension approach (see `docs/VERSION_2.0_ROADMAP.md` - Feature 7):

- One-click capture while browsing LinkedIn
- No server-side scraping
- More compliant with LinkedIn ToS
- Works on mobile devices

## Security & Privacy

- All data stays local until you import
- No data sent to external servers
- Direct Supabase connection (your database)
- JSON export file can be deleted after import

## Clean Up

After successful import:

```bash
# Delete the exported JSON file (optional)
rm linkedin-profile-export.json
```

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review the browser console for errors
3. Verify Supabase credentials in `.env`
4. Check that migrations were applied successfully
