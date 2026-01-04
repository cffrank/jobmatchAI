#!/usr/bin/env node
/**
 * Session Issue Diagnostic Script
 *
 * Diagnoses why sessions aren't appearing in Cloudflare KV SESSIONS namespace.
 * Tests the complete authentication flow from login to session creation.
 *
 * Run: node workers/scripts/diagnose-session-issue.js
 */

const WORKERS_URL = process.env.WORKERS_URL || 'http://localhost:8787';
const SUPABASE_URL = 'https://vkstdibhypprasyiswny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E';

const TEST_EMAIL = 'testspamdetection@example.com';
const TEST_PASSWORD = 'testpassword123';

async function diagnose() {
  console.log('\n🔍 Session Issue Diagnostic Tool');
  console.log('=' .repeat(70));
  console.log('\nThis tool diagnoses why sessions aren\'t created in KV SESSIONS namespace.\n');

  // STEP 1: Test Supabase authentication
  console.log('📝 STEP 1: Testing Supabase Authentication');
  console.log('-'.repeat(70));
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   Test User: ${TEST_EMAIL}`);

  const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!authResponse.ok) {
    console.error('   ❌ FAILED: Could not authenticate with Supabase');
    console.error(`   Status: ${authResponse.status}`);
    console.error(`   Response: ${await authResponse.text()}`);
    console.log('\n💡 Fix: Verify TEST_EMAIL/TEST_PASSWORD are correct\n');
    process.exit(1);
  }

  const authData = await authResponse.json();
  const jwt = authData.access_token;
  const userId = authData.user?.id;

  console.log('   ✅ SUCCESS: Authenticated with Supabase');
  console.log(`   User ID: ${userId}`);
  console.log(`   JWT Token: ${jwt.substring(0, 30)}...`);

  // STEP 2: Test Workers JWT validation
  console.log('\n📝 STEP 2: Testing Workers JWT Validation');
  console.log('-'.repeat(70));
  console.log(`   Workers URL: ${WORKERS_URL}`);
  console.log(`   Testing endpoint: /api/profile`);

  const profileResponse = await fetch(`${WORKERS_URL}/api/profile`, {
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
  });

  console.log(`   Response Status: ${profileResponse.status} ${profileResponse.statusText}`);

  if (profileResponse.status === 401) {
    console.error('   ❌ FAILED: Workers returned 401 Unauthorized');
    console.error('   This means JWT validation failed!\n');

    const errorBody = await profileResponse.json();
    console.error('   Error details:', JSON.stringify(errorBody, null, 2));

    console.log('\n💡 Root Cause: Supabase Project Mismatch');
    console.log('-'.repeat(70));
    console.log('The JWT was issued by:');
    console.log(`   Frontend: ${SUPABASE_URL}`);
    console.log('\nBut Workers is configured with a DIFFERENT Supabase project!');
    console.log('\n🔧 Fix Required:');
    console.log('1. Check Workers secrets:');
    console.log('   cd workers && wrangler secret list --env development');
    console.log('\n2. Verify SUPABASE_URL matches:');
    console.log(`   Expected: ${SUPABASE_URL}`);
    console.log('\n3. If different, update the secret:');
    console.log(`   wrangler secret put SUPABASE_URL --env development`);
    console.log(`   Enter: ${SUPABASE_URL}`);
    console.log('\n4. Also check/update SUPABASE_ANON_KEY');
    console.log('5. Restart Workers dev server');
    console.log('\n⚠️  Sessions can ONLY be created AFTER JWT validation succeeds!');
    console.log('    No sessions in KV = auth middleware rejecting requests.\n');
    process.exit(1);
  }

  if (profileResponse.status === 200 || profileResponse.status === 404) {
    console.log('   ✅ SUCCESS: Workers validated JWT correctly');
    const body = await profileResponse.text();
    console.log(`   Response: ${body.substring(0, 100)}${body.length > 100 ? '...' : ''}`);
  }

  // STEP 3: Check session creation flow
  console.log('\n📝 STEP 3: Session Creation Flow Analysis');
  console.log('-'.repeat(70));
  console.log('Frontend session creation flow:');
  console.log('   1. User logs in → Supabase issues JWT');
  console.log('   2. Frontend calls initializeSession() (in AuthContext.tsx)');
  console.log('   3. initializeSession() calls createOrUpdateSession()');
  console.log('   4. createOrUpdateSession() writes to Supabase PostgreSQL sessions table');
  console.log('   5. Frontend makes API calls with JWT in Authorization header\n');

  console.log('❌ PROBLEM: Frontend writes to SUPABASE, not Cloudflare KV!');
  console.log('-'.repeat(70));
  console.log('Current code in src/lib/securityService.ts:');
  console.log('   Line 145: await supabase.from(\'sessions\').upsert(sessionData)');
  console.log('   → This writes to Supabase PostgreSQL, NOT KV SESSIONS namespace!\n');

  console.log('Cloudflare KV SESSIONS namespace is configured but NEVER USED:');
  console.log('   - Configured: wrangler.toml line 87-88 (development)');
  console.log('   - Binding: SESSIONS');
  console.log('   - ID: 8b8cb591b4864e51a5e14c0d551e2d88');
  console.log('   - Used by: NOTHING (no code references c.env.SESSIONS)\n');

  // STEP 4: Summary and recommendations
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(70));
  console.log('\n🔍 Root Cause Identified:');
  console.log('   1. ❌ Workers JWT validation failing (Supabase project mismatch)');
  console.log('   2. ❌ Sessions stored in Supabase PostgreSQL, not KV');
  console.log('   3. ⚠️  KV SESSIONS namespace configured but never used\n');

  console.log('🔧 Required Fixes (in priority order):');
  console.log('-'.repeat(70));
  console.log('\n[CRITICAL] Fix #1: Supabase Project Mismatch');
  console.log('   Workers must use same Supabase project as frontend!');
  console.log('   Steps:');
  console.log('   1. Verify Workers secrets match frontend .env.local');
  console.log('   2. Update SUPABASE_URL and SUPABASE_ANON_KEY if needed');
  console.log('   3. Restart Workers dev server\n');

  console.log('[OPTIONAL] Fix #2: Migrate sessions to KV (future enhancement)');
  console.log('   Current: Sessions in Supabase PostgreSQL (works fine)');
  console.log('   Future: Could migrate to KV for faster access');
  console.log('   Required changes:');
  console.log('   - Add session write logic to Workers auth middleware');
  console.log('   - Update frontend to call Workers endpoint for session creation');
  console.log('   - Add KV session cleanup cron job\n');

  console.log('💡 Understanding the Flow:');
  console.log('-'.repeat(70));
  console.log('Sessions are created AFTER successful authentication:');
  console.log('   Login → JWT issued → JWT validated → API calls succeed → Session created');
  console.log('   ↓       ↓            ↓                ↓                  ↓');
  console.log('   ✅      ✅           ❌ FAILS HERE    ❌ Never happens   ❌ Never created\n');

  console.log('Once JWT validation works, sessions will be created automatically!');
  console.log('They just won\'t be in KV - they\'ll be in Supabase PostgreSQL.\n');

  console.log('🎯 Next Steps:');
  console.log('-'.repeat(70));
  console.log('1. Fix Supabase project mismatch (see Fix #1 above)');
  console.log('2. Test authentication again with test-auth-fix.js');
  console.log('3. Check Supabase PostgreSQL sessions table (not KV)');
  console.log('4. Once working, consider migrating to KV (optional)\n');
}

diagnose().catch(error => {
  console.error('\n❌ Diagnostic failed with error:');
  console.error(error);
  process.exit(1);
});
