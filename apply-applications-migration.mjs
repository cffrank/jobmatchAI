import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://wpupbucinufbaiphwogc.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.log('❌ Error: SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  console.log('');
  console.log('Set it with:');
  console.log('export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('📦 Applying migration: 015_add_missing_application_columns.sql\n');

  // Read migration file
  const migrationSQL = fs.readFileSync(
    './supabase/migrations/015_add_missing_application_columns.sql',
    'utf8'
  );

  console.log('🔍 Migration contents:');
  console.log('----------------------------------------');
  console.log(migrationSQL);
  console.log('----------------------------------------\n');

  try {
    // Execute the migration (Supabase client doesn't have direct SQL execution)
    // We need to use the REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
      },
      body: JSON.stringify({ query: migrationSQL })
    });

    if (!response.ok) {
      console.log('❌ Migration failed via REST API, trying alternative method...\n');

      // Alternative: Try executing via psql if available
      console.log('💡 Please apply this migration manually via Supabase Dashboard:');
      console.log('1. Go to: https://supabase.com/dashboard/project/wpupbucinufbaiphwogc/sql/new');
      console.log('2. Copy the migration SQL from: supabase/migrations/015_add_missing_application_columns.sql');
      console.log('3. Paste and run it\n');

      // Verify if columns exist despite error
      await verifyMigration();
      return;
    }

    console.log('✅ Migration executed successfully\n');

    // Verify the migration
    await verifyMigration();

  } catch (error) {
    console.log('❌ Error applying migration:', error.message);
    console.log('\n💡 Attempting to verify if columns already exist...\n');
    await verifyMigration();
  }
}

async function verifyMigration() {
  console.log('🔍 Verifying migration...\n');

  // Check if the new columns exist by trying to select them
  const { data, error } = await supabase
    .from('applications')
    .select('id, job_title, company, selected_variant_id')
    .limit(1);

  if (error) {
    console.log('❌ Verification failed:', error.message);
    console.log('\n⚠️  Columns may not exist yet. Please apply migration manually.');
    return;
  }

  console.log('✅ Verification successful! New columns exist:');
  console.log('   - job_title');
  console.log('   - company');
  console.log('   - selected_variant_id\n');

  // Count existing applications
  const { count } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total applications in database: ${count || 0}\n`);

  if (count > 0) {
    console.log('💡 Existing applications will have NULL values for new columns.');
    console.log('   This is expected and won\'t cause issues.\n');
  }

  console.log('✅ Migration complete and verified!\n');
}

applyMigration();
