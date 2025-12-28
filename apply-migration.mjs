/**
 * Apply database migration to Supabase
 * Uses pg library to directly execute SQL migration
 */

import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';

// Supabase PostgreSQL connection details
const SUPABASE_URL = 'https://wpupbucinufbaiphwogc.supabase.co';
const PROJECT_REF = 'wpupbucinufbaiphwogc';

// Read database password from user input or environment
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.error('❌ Error: SUPABASE_DB_PASSWORD environment variable not set');
  console.error('');
  console.error('To apply the migration, you have two options:');
  console.error('');
  console.error('Option 1: Use Supabase Dashboard (Recommended)');
  console.error('  1. Go to https://supabase.com/dashboard/project/' + PROJECT_REF + '/sql/new');
  console.error('  2. Copy the contents of supabase/migrations/014_add_job_compatibility_fields.sql');
  console.error('  3. Paste into the SQL Editor');
  console.error('  4. Click "Run" to execute the migration');
  console.error('');
  console.error('Option 2: Use this script with database password');
  console.error('  export SUPABASE_DB_PASSWORD="your-database-password"');
  console.error('  node apply-migration.mjs');
  console.error('');
  console.error('You can find your database password in the Supabase Dashboard:');
  console.error('Project Settings → Database → Connection Pooling → Password');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

async function applyMigration() {
  console.log('🔄 Applying database migration: 014_add_job_compatibility_fields.sql');
  console.log('📍 Project:', PROJECT_REF);

  const client = new Client({ connectionString });

  try {
    // Connect to database
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully');

    // Read migration file
    const migrationSQL = readFileSync('./supabase/migrations/014_add_job_compatibility_fields.sql', 'utf-8');
    console.log('📄 Migration file loaded (' + migrationSQL.length + ' characters)');

    // Execute migration
    console.log('⚙️  Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('📋 Changes made:');
    console.log('   ✓ Created job_searches table with RLS policies');
    console.log('   ✓ Added required_skills column to jobs table');
    console.log('   ✓ Added preferred_skills column to jobs table');
    console.log('   ✓ Added work_arrangement column to jobs table');
    console.log('   ✓ Added company_logo column to jobs table');
    console.log('   ✓ Added search_id column to jobs table');
    console.log('   ✓ Added scraped_at column to jobs table');
    console.log('   ✓ Added compatibility_breakdown JSONB column to jobs table');
    console.log('   ✓ Added missing_skills column to jobs table');
    console.log('   ✓ Added recommendations column to jobs table');
    console.log('   ✓ Created performance indexes');
    console.log('');
    console.log('🎉 Database is now ready for dynamic compatibility scoring!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Regenerate TypeScript types: npx supabase gen types typescript --linked > src/types/supabase.ts');
    console.log('  2. Restart backend and frontend services');
    console.log('  3. Test compatibility scoring with new job searches');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
