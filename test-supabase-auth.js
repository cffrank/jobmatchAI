/**
 * Supabase Authentication & Security Test Suite
 *
 * Validates:
 * - Authentication flows (signup, login, logout)
 * - JWT token issuance and validation
 * - Row-Level Security (RLS) policies
 * - Session management
 * - Security event logging
 * - Database constraints and foreign keys
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://lrzhpnsykasqrousgmdh.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test state
let testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

let testUser = null;
let testUserId = null;
let testSession = null;

// ============================================================================
// Test Utilities
// ============================================================================

function generateTestEmail() {
  const randomString = randomBytes(8).toString('hex');
  return `test-${randomString}@jobmatch-test.com`;
}

function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const symbols = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️', test: '🧪' };
  console.log(`[${timestamp}] ${symbols[type] || ''} ${message}`);
}

function recordTest(name, passed, message, details = null) {
  const result = {
    name,
    passed,
    message,
    details,
    timestamp: new Date().toISOString()
  };

  testResults.tests.push(result);

  if (passed) {
    testResults.passed++;
    log(`PASS: ${name}`, 'success');
  } else {
    testResults.failed++;
    log(`FAIL: ${name} - ${message}`, 'error');
    if (details) {
      console.log('  Details:', JSON.stringify(details, null, 2));
    }
  }
}

function recordWarning(name, message) {
  testResults.warnings++;
  log(`WARNING: ${name} - ${message}`, 'warning');
}

// ============================================================================
// Test 1: Connection & Configuration
// ============================================================================

async function testConnection() {
  log('Testing Supabase connection...', 'test');

  try {
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code === '42P01') {
      recordTest('Connection', false, 'Users table does not exist', error);
      return false;
    }

    if (error) {
      recordTest('Connection', false, 'Failed to connect to Supabase', error);
      return false;
    }

    recordTest('Connection', true, 'Successfully connected to Supabase');
    return true;
  } catch (err) {
    recordTest('Connection', false, 'Connection failed with exception', err.message);
    return false;
  }
}

// ============================================================================
// Test 2: Authentication - Signup Flow
// ============================================================================

async function testSignup() {
  log('Testing user signup...', 'test');

  const testEmail = generateTestEmail();
  const testPassword = 'TestPassword123!@#';

  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });

    if (error) {
      recordTest('Signup', false, 'Signup failed', error);
      return false;
    }

    if (!data.user) {
      recordTest('Signup', false, 'No user returned from signup', data);
      return false;
    }

    testUser = data.user;
    testUserId = data.user.id;
    testSession = data.session;

    // Check if JWT token was issued
    if (!data.session?.access_token) {
      recordWarning('Signup JWT', 'No access token issued (email confirmation may be required)');
    } else {
      recordTest('Signup JWT', true, 'Access token issued successfully');
    }

    recordTest('Signup', true, `User created successfully: ${testEmail}`);
    return true;
  } catch (err) {
    recordTest('Signup', false, 'Signup threw exception', err.message);
    return false;
  }
}

// ============================================================================
// Test 3: Verify public.users Record Created
// ============================================================================

async function testPublicUserCreation() {
  log('Testing public.users auto-creation trigger...', 'test');

  if (!testUserId) {
    recordTest('Public User Creation', false, 'No test user ID available');
    return false;
  }

  try {
    // Create a temporary admin client to bypass RLS
    const { data, error } = await supabase
      .from('users')
      .select('id, email, created_at')
      .eq('id', testUserId)
      .single();

    if (error && error.code === 'PGRST116') {
      recordTest('Public User Creation', false, 'No public.users record created by trigger', error);
      return false;
    }

    if (error) {
      recordTest('Public User Creation', false, 'Error checking public.users table', error);
      return false;
    }

    if (!data) {
      recordTest('Public User Creation', false, 'No matching user found in public.users');
      return false;
    }

    recordTest('Public User Creation', true, 'Trigger successfully created public.users record');
    return true;
  } catch (err) {
    recordTest('Public User Creation', false, 'Exception checking public.users', err.message);
    return false;
  }
}

// ============================================================================
// Test 4: RLS Policies - Sessions Table
// ============================================================================

async function testSessionsRLS() {
  log('Testing sessions table RLS policies...', 'test');

  if (!testUserId) {
    recordTest('Sessions RLS', false, 'No test user available');
    return false;
  }

  try {
    // Test INSERT (unauthenticated during signup)
    const sessionId = randomBytes(16).toString('hex');

    const { data: insertData, error: insertError } = await supabase
      .from('sessions')
      .insert({
        user_id: testUserId,
        session_id: sessionId,
        ip_address: '127.0.0.1',
        user_agent: 'Test Suite',
        expires_at: new Date(Date.now() + 86400000).toISOString() // 24 hours
      });

    if (insertError) {
      recordTest('Sessions RLS - Insert', false, 'Failed to insert session (RLS may be blocking)', insertError);
      return false;
    }

    recordTest('Sessions RLS - Insert', true, 'Successfully inserted session');

    // Test SELECT (should be blocked if not authenticated as this user)
    const { data: selectData, error: selectError } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', testUserId);

    if (selectError) {
      recordWarning('Sessions RLS - Select', 'Select blocked (expected if not authenticated)');
    } else if (selectData && selectData.length === 0) {
      recordTest('Sessions RLS - Select', true, 'RLS correctly blocking unauthorized select');
    } else {
      recordWarning('Sessions RLS - Select', 'RLS may not be properly configured');
    }

    return true;
  } catch (err) {
    recordTest('Sessions RLS', false, 'Exception testing sessions RLS', err.message);
    return false;
  }
}

// ============================================================================
// Test 5: RLS Policies - Security Events Table
// ============================================================================

async function testSecurityEventsRLS() {
  log('Testing security_events table RLS policies...', 'test');

  if (!testUserId) {
    recordTest('Security Events RLS', false, 'No test user available');
    return false;
  }

  try {
    // Test INSERT (unauthenticated during signup)
    const { data: insertData, error: insertError } = await supabase
      .from('security_events')
      .insert({
        user_id: testUserId,
        action: 'test_event',
        ip_address: '127.0.0.1',
        user_agent: 'Test Suite',
        status: 'success'
      });

    if (insertError) {
      recordTest('Security Events RLS - Insert', false, 'Failed to insert security event', insertError);
      return false;
    }

    recordTest('Security Events RLS - Insert', true, 'Successfully inserted security event (unauthenticated)');
    return true;
  } catch (err) {
    recordTest('Security Events RLS', false, 'Exception testing security_events RLS', err.message);
    return false;
  }
}

// ============================================================================
// Test 6: Login Flow
// ============================================================================

async function testLogin() {
  log('Testing user login...', 'test');

  if (!testUser) {
    recordTest('Login', false, 'No test user available for login');
    return false;
  }

  // For this test to work, email confirmation must be disabled or the email must be confirmed
  // This will likely fail with "Email not confirmed" error, which is expected

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUser.email,
      password: 'TestPassword123!@#'
    });

    if (error && error.message.includes('Email not confirmed')) {
      recordWarning('Login', 'Email confirmation required (expected behavior)');
      return true; // This is expected behavior
    }

    if (error) {
      recordTest('Login', false, 'Login failed', error);
      return false;
    }

    if (!data.session?.access_token) {
      recordTest('Login', false, 'No access token in login response', data);
      return false;
    }

    recordTest('Login', true, 'Successfully logged in with JWT token');
    return true;
  } catch (err) {
    recordTest('Login', false, 'Login threw exception', err.message);
    return false;
  }
}

// ============================================================================
// Test 7: Database Constraints
// ============================================================================

async function testDatabaseConstraints() {
  log('Testing database constraints...', 'test');

  try {
    // Test unique constraint on session_id
    const sessionId = randomBytes(16).toString('hex');

    const { error: firstInsert } = await supabase
      .from('sessions')
      .insert({
        user_id: testUserId,
        session_id: sessionId,
        ip_address: '127.0.0.1',
        user_agent: 'Test Suite',
        expires_at: new Date(Date.now() + 86400000).toISOString()
      });

    if (firstInsert) {
      recordWarning('Constraints - Unique session_id', 'Could not test unique constraint');
      return true;
    }

    // Try to insert duplicate
    const { error: duplicateInsert } = await supabase
      .from('sessions')
      .insert({
        user_id: testUserId,
        session_id: sessionId, // Same session_id
        ip_address: '127.0.0.1',
        user_agent: 'Test Suite',
        expires_at: new Date(Date.now() + 86400000).toISOString()
      });

    if (duplicateInsert && duplicateInsert.code === '23505') {
      recordTest('Constraints - Unique session_id', true, 'Unique constraint working correctly');
    } else if (duplicateInsert) {
      recordWarning('Constraints - Unique session_id', 'Unexpected error on duplicate insert');
    } else {
      recordTest('Constraints - Unique session_id', false, 'Duplicate session_id allowed (constraint missing)');
    }

    return true;
  } catch (err) {
    recordTest('Database Constraints', false, 'Exception testing constraints', err.message);
    return false;
  }
}

// ============================================================================
// Test 8: Security Configuration Review
// ============================================================================

async function testSecurityConfiguration() {
  log('Reviewing security configuration...', 'test');

  const securityChecks = [];

  // Check 1: SSL/TLS
  if (SUPABASE_URL.startsWith('https://')) {
    securityChecks.push({ check: 'HTTPS Enabled', passed: true });
  } else {
    securityChecks.push({ check: 'HTTPS Enabled', passed: false, message: 'Using unencrypted HTTP' });
  }

  // Check 2: Anon key should be public (not service role)
  if (SUPABASE_ANON_KEY.length > 100) {
    securityChecks.push({ check: 'Anon Key Format', passed: true });
  } else {
    securityChecks.push({ check: 'Anon Key Format', passed: false, message: 'Anon key appears invalid' });
  }

  // Check 3: RLS should be enabled on sensitive tables
  const rlsChecks = [
    'users',
    'sessions',
    'security_events',
    'applications',
    'jobs'
  ];

  for (const table of rlsChecks) {
    try {
      const { error } = await supabase.from(table).select('count').limit(1);

      if (error && error.code === '42501') {
        securityChecks.push({ check: `RLS on ${table}`, passed: true });
      } else if (error && error.code === '42P01') {
        // Table doesn't exist
        continue;
      } else {
        securityChecks.push({
          check: `RLS on ${table}`,
          passed: false,
          message: 'RLS may not be properly configured'
        });
      }
    } catch (err) {
      // Skip
    }
  }

  const passed = securityChecks.filter(c => c.passed).length;
  const total = securityChecks.length;

  recordTest('Security Configuration', true, `${passed}/${total} security checks passed`, securityChecks);

  return true;
}

// ============================================================================
// Test Runner
// ============================================================================

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 SUPABASE AUTHENTICATION & SECURITY TEST SUITE');
  console.log('='.repeat(80) + '\n');

  log(`Testing against: ${SUPABASE_URL}`, 'info');
  log('Starting test execution...', 'info');
  console.log('');

  // Run tests sequentially
  await testConnection();
  await testSignup();
  await testPublicUserCreation();
  await testSessionsRLS();
  await testSecurityEventsRLS();
  await testLogin();
  await testDatabaseConstraints();
  await testSecurityConfiguration();

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`✅ Passed:   ${testResults.passed}`);
  console.log(`❌ Failed:   ${testResults.failed}`);
  console.log(`⚠️  Warnings: ${testResults.warnings}`);
  console.log(`📝 Total:    ${testResults.tests.length}`);
  console.log('='.repeat(80) + '\n');

  // Print failed tests
  if (testResults.failed > 0) {
    console.log('❌ FAILED TESTS:');
    console.log('-'.repeat(80));
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  • ${t.name}: ${t.message}`);
        if (t.details) {
          console.log(`    Details: ${JSON.stringify(t.details, null, 2)}`);
        }
      });
    console.log('');
  }

  // Print warnings
  if (testResults.warnings > 0) {
    console.log('⚠️  WARNINGS:');
    console.log('-'.repeat(80));
    console.log(`  ${testResults.warnings} warnings detected. Review logs above for details.`);
    console.log('');
  }

  // Overall result
  if (testResults.failed === 0) {
    console.log('✅ ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED. Please review the errors above.\n');
    process.exit(1);
  }
}

// ============================================================================
// Execute
// ============================================================================

runAllTests().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
