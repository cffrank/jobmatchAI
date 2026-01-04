#!/usr/bin/env node
/**
 * Test Authentication Fix
 *
 * This script tests if the Supabase project mismatch is fixed by:
 * 1. Creating a test session with Supabase
 * 2. Getting a JWT token
 * 3. Testing authenticated API endpoints
 * 4. Verifying 200 OK responses (not 401)
 */

const WORKERS_URL = 'http://localhost:8787';
const SUPABASE_URL = 'https://vkstdibhypprasyiswny.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E';

// Test credentials (replace with actual test user)
const TEST_EMAIL = 'testspamdetection@example.com';
const TEST_PASSWORD = 'testpassword123';

async function testAuth() {
  console.log('🧪 Testing Authentication Fix\n');
  console.log('=' .repeat(60));

  // Step 1: Authenticate with Supabase
  console.log('\n📝 Step 1: Authenticating with Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   User: ${TEST_EMAIL}`);

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
    console.error('❌ Authentication failed!');
    console.error('   Status:', authResponse.status);
    console.error('   Response:', await authResponse.text());
    process.exit(1);
  }

  const authData = await authResponse.json();
  const token = authData.access_token;
  const userId = authData.user?.id;

  console.log('✅ Authentication successful');
  console.log(`   User ID: ${userId}`);
  console.log(`   Token: ${token.substring(0, 20)}...`);

  // Step 2: Test authenticated endpoints
  console.log('\n📝 Step 2: Testing authenticated API endpoints...\n');

  const endpoints = [
    '/api/profile',
    '/api/profile/work-experience',
    '/api/profile/education',
    '/api/skills',
    '/api/resume',
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const endpoint of endpoints) {
    const url = `${WORKERS_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const passed = response.status === 200 || response.status === 404; // 404 is ok if no data exists
    const failed = response.status === 401;

    if (passed) {
      console.log(`   ✅ ${endpoint.padEnd(35)} ${response.status} ${response.statusText}`);
      passedCount++;
    } else if (failed) {
      console.log(`   ❌ ${endpoint.padEnd(35)} ${response.status} ${response.statusText} (UNAUTHORIZED!)`);
      failedCount++;
    } else {
      console.log(`   ⚠️  ${endpoint.padEnd(35)} ${response.status} ${response.statusText}`);
    }
  }

  // Step 3: Results summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results:\n');
  console.log(`   Total endpoints tested: ${endpoints.length}`);
  console.log(`   ✅ Passed (200/404): ${passedCount}`);
  console.log(`   ❌ Failed (401): ${failedCount}`);
  console.log(`   ⚠️  Other: ${endpoints.length - passedCount - failedCount}`);

  if (failedCount === 0) {
    console.log('\n🎉 SUCCESS! All endpoints authorized correctly.');
    console.log('   The Supabase project mismatch is FIXED!\n');
    process.exit(0);
  } else {
    console.log('\n❌ FAILURE! Some endpoints still returning 401.');
    console.log('   The Supabase project mismatch may not be fully fixed.\n');
    console.log('Troubleshooting:');
    console.log('1. Verify .dev.vars has correct SUPABASE_URL');
    console.log('2. Restart Workers dev server');
    console.log('3. Check Workers logs for JWT validation errors\n');
    process.exit(1);
  }
}

// Run the test
testAuth().catch(error => {
  console.error('\n❌ Test failed with error:');
  console.error(error);
  process.exit(1);
});
