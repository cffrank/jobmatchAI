import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

// Supabase PostgreSQL connection details
const SUPABASE_DB_HOST = 'aws-0-us-east-1.pooler.supabase.com';
const SUPABASE_DB_PORT = 6543;
const SUPABASE_DB_NAME = 'postgres';
const SUPABASE_DB_USER = 'postgres.wpupbucinufbaiphwogc';
const SUPABASE_DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!SUPABASE_DB_PASSWORD) {
  console.log('❌ Error: SUPABASE_DB_PASSWORD environment variable not set');
  console.log('');
  console.log('Get the password from:');
  console.log('1. Go to Supabase Dashboard → Settings → Database');
  console.log('2. Copy the password from Connection String');
  console.log('3. Run: export SUPABASE_DB_PASSWORD=your-password');
  console.log('');
  console.log('Or use the service role key approach (safer):');
  console.log('We\'ll try using Supabase REST API instead...\n');

  // Fall back to service role key approach
  await useServiceRoleKey();
  process.exit(0);
}

const client = new Client({
  host: SUPABASE_DB_HOST,
  port: SUPABASE_DB_PORT,
  database: SUPABASE_DB_NAME,
  user: SUPABASE_DB_USER,
  password: SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
});

async function applyMigration() {
  console.log('📦 Applying migration: 015_add_missing_application_columns.sql\n');

  try {
    // Connect to database
    console.log('🔌 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Read migration file
    const migrationSQL = fs.readFileSync(
      './supabase/migrations/015_add_missing_application_columns.sql',
      'utf8'
    );

    console.log('🔍 Executing migration SQL...\n');

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!\n');

    // Verify the migration
    console.log('🔍 Verifying migration...\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'applications'
        AND column_name IN ('job_title', 'company', 'selected_variant_id')
      ORDER BY column_name;
    `);

    if (result.rows.length === 3) {
      console.log('✅ All 3 columns verified:');
      result.rows.forEach(row => {
        console.log(`   - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`);
      });
      console.log('');
    } else {
      console.log('⚠️  Expected 3 columns, found:', result.rows.length);
    }

    // Count applications
    const countResult = await client.query('SELECT COUNT(*) FROM applications');
    console.log(`📊 Total applications: ${countResult.rows[0].count}\n`);

    console.log('✅ Migration complete!\n');

  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('\nTrying alternative approach...\n');
    await useServiceRoleKey();
  } finally {
    await client.end();
  }
}

async function useServiceRoleKey() {
  console.log('📦 Using Supabase service role key approach...\n');

  const SUPABASE_URL = 'https://wpupbucinufbaiphwogc.supabase.co';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwdXBidWNpbnVmYmFpcGh3b2djIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjY2MjU2NywiZXhwIjoyMDgyMjM4NTY3fQ.mY32AJDUOQutU5Sd6gfUtVAOZjF63GbM2RoOu0kSF2M';

  // Read migration SQL
  const migrationSQL = fs.readFileSync(
    './supabase/migrations/015_add_missing_application_columns.sql',
    'utf8'
  );

  // Split into individual statements
  const statements = migrationSQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  // Execute each statement via Supabase SQL API
  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
        body: JSON.stringify({ query: stmt + ';' })
      });

      if (!response.ok) {
        console.log(`   ⚠️  Warning: ${response.statusText}`);
      } else {
        console.log(`   ✅ Success`);
      }
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
    }
  }

  console.log('\n💡 Some statements may have failed due to API limitations.');
  console.log('Please manually apply via Supabase Dashboard if needed:\n');
  console.log('https://supabase.com/dashboard/project/wpupbucinufbaiphwogc/sql/new\n');
  console.log('Copy SQL from: supabase/migrations/015_add_missing_application_columns.sql\n');
}

applyMigration();
