/**
 * Test Script: Address Feature Implementation
 *
 * This script tests the address feature by:
 * 1. Running the migration
 * 2. Updating a test user with address data
 * 3. Verifying the data is stored correctly
 * 4. Testing the formatted address function
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 Testing Address Feature Implementation\n');
  console.log('=' . repeat(60));

  // Test 1: Check if migration ran successfully
  console.log('\n📋 Test 1: Verifying migration columns exist...');
  try {
    const { data, error } = await supabase
      .from('users')
      .select('street_address, city, state, postal_code, country')
      .limit(1);

    if (error) {
      results.push({
        test: 'Migration columns check',
        status: 'FAIL',
        message: `Error: ${error.message}`,
      });
      console.log('❌ FAIL: Migration columns not found');
    } else {
      results.push({
        test: 'Migration columns check',
        status: 'PASS',
        message: 'All address columns exist in users table',
      });
      console.log('✅ PASS: All address columns exist');
    }
  } catch (err) {
    results.push({
      test: 'Migration columns check',
      status: 'FAIL',
      message: `Exception: ${err}`,
    });
    console.log('❌ FAIL: Exception occurred');
  }

  // Test 2: Test formatted address function
  console.log('\n📋 Test 2: Testing get_formatted_address function...');
  try {
    // First, get a test user or create one
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userError || !users || users.length === 0) {
      results.push({
        test: 'Formatted address function',
        status: 'FAIL',
        message: 'No test user found',
      });
      console.log('⚠️  SKIP: No users in database to test');
    } else {
      const testUserId = users[0].id;

      // Update user with test address
      const { error: updateError } = await supabase
        .from('users')
        .update({
          street_address: '123 Main Street, Apt 4B',
          city: 'San Francisco',
          state: 'CA',
          postal_code: '94102',
          country: 'United States',
        })
        .eq('id', testUserId);

      if (updateError) {
        results.push({
          test: 'Update user address',
          status: 'FAIL',
          message: `Error updating user: ${updateError.message}`,
        });
        console.log('❌ FAIL: Could not update user address');
      } else {
        console.log('✅ PASS: User address updated successfully');

        // Test the function
        const { data, error } = await supabase.rpc('get_formatted_address', {
          p_user_id: testUserId,
        });

        if (error) {
          results.push({
            test: 'Formatted address function',
            status: 'FAIL',
            message: `Function error: ${error.message}`,
          });
          console.log('❌ FAIL: Function returned error');
        } else {
          const expected = '123 Main Street, Apt 4B, San Francisco, CA 94102, United States';
          if (data === expected) {
            results.push({
              test: 'Formatted address function',
              status: 'PASS',
              message: `Correctly formatted: ${data}`,
            });
            console.log('✅ PASS: Address formatted correctly');
            console.log(`   Result: ${data}`);
          } else {
            results.push({
              test: 'Formatted address function',
              status: 'FAIL',
              message: `Expected: ${expected}, Got: ${data}`,
            });
            console.log('❌ FAIL: Address format mismatch');
            console.log(`   Expected: ${expected}`);
            console.log(`   Got: ${data}`);
          }
        }
      }
    }
  } catch (err) {
    results.push({
      test: 'Formatted address function',
      status: 'FAIL',
      message: `Exception: ${err}`,
    });
    console.log('❌ FAIL: Exception occurred');
  }

  // Test 3: Test partial address
  console.log('\n📋 Test 3: Testing partial address (city and state only)...');
  try {
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (!userError && users && users.length > 0) {
      const testUserId = users[0].id;

      // Update with partial address
      const { error: updateError } = await supabase
        .from('users')
        .update({
          street_address: null,
          city: 'New York',
          state: 'NY',
          postal_code: null,
          country: null,
        })
        .eq('id', testUserId);

      if (!updateError) {
        const { data, error } = await supabase.rpc('get_formatted_address', {
          p_user_id: testUserId,
        });

        if (!error && data === 'New York, NY') {
          results.push({
            test: 'Partial address formatting',
            status: 'PASS',
            message: 'Correctly formatted partial address',
          });
          console.log('✅ PASS: Partial address formatted correctly');
          console.log(`   Result: ${data}`);
        } else {
          results.push({
            test: 'Partial address formatting',
            status: 'FAIL',
            message: `Expected "New York, NY", Got: ${data}`,
          });
          console.log('❌ FAIL: Partial address format incorrect');
        }
      }
    }
  } catch (err) {
    results.push({
      test: 'Partial address formatting',
      status: 'FAIL',
      message: `Exception: ${err}`,
    });
    console.log('❌ FAIL: Exception occurred');
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Summary:\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  results.forEach((result) => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.status}`);
    console.log(`   ${result.message}`);
  });

  console.log(`\n${passed} passed, ${failed} failed out of ${results.length} tests`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
