/**
 * Apply database migration script
 * Runs the compatibility fields migration on Supabase
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wpupbucinufbaiphwogc.supabase.co'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2MjU2NywiZXhwIjoyMDgyMjM4NTY3fQ.mY32AJDUOQutU5Sd6gfUtVAOZjF63GbM2RoOu0kSF2M'

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('🔄 Applying database migration: 014_add_job_compatibility_fields.sql')
  console.log('📍 Supabase URL:', SUPABASE_URL)

  try {
    // Read migration file
    const migrationPath = join(__dirname, 'supabase', 'migrations', '014_add_job_compatibility_fields.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration file loaded:', migrationPath)
    console.log('📊 SQL length:', migrationSQL.length, 'characters')

    // Execute migration using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: migrationSQL })

    if (error) {
      // If exec_sql function doesn't exist, we need to use the REST API directly
      console.log('⚠️  exec_sql RPC not available, using direct SQL execution...')

      // Try using postgres connection instead
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: migrationSQL })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    }

    console.log('✅ Migration applied successfully!')
    console.log('📋 Changes made:')
    console.log('   - Created job_searches table with RLS policies')
    console.log('   - Added required_skills column to jobs table')
    console.log('   - Added preferred_skills column to jobs table')
    console.log('   - Added work_arrangement column to jobs table')
    console.log('   - Added company_logo column to jobs table')
    console.log('   - Added search_id column to jobs table')
    console.log('   - Added scraped_at column to jobs table')
    console.log('   - Added compatibility_breakdown JSONB column to jobs table')
    console.log('   - Added missing_skills column to jobs table')
    console.log('   - Added recommendations column to jobs table')
    console.log('   - Created indexes for performance')
    console.log('')
    console.log('🎉 Database is now ready for dynamic compatibility scoring!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('📝 Details:', error)
    process.exit(1)
  }
}

applyMigration()
