/**
 * Test script to debug resume parse endpoint
 *
 * Run with: npx ts-node test-resume-endpoint.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.test' });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('Environment loaded:');
console.log('SUPABASE_URL:', SUPABASE_URL ? '✓ Set' : '✗ Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓ Set' : '✗ Not set');
console.log();

async function testResumeEndpoint() {
  console.log('=== Testing Resume Parse Endpoint ===\n');

  // Initialize admin client
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Test 1: Check if we can generate a signed URL
  console.log('Test 1: Generate signed URL for test path');
  const testPath = 'resumes/test-user-id/1735139200000_resume.pdf';

  try {
    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(testPath, 3600);

    if (error) {
      console.error('ERROR generating signed URL:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else if (data) {
      console.log('SUCCESS: Signed URL generated');
      console.log('Signed URL:', data.signedUrl);
    } else {
      console.log('UNEXPECTED: No data and no error');
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }

  // Test 2: List files in bucket
  console.log('\nTest 2: List files in "files" bucket');
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('files')
      .list('resumes', {
        limit: 10,
      });

    if (error) {
      console.error('ERROR listing files:', error);
    } else {
      console.log('Files found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('First few files:');
        data.slice(0, 5).forEach(file => {
          console.log(`  - ${file.name}`);
        });
      }
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }

  // Test 3: Check bucket permissions
  console.log('\nTest 3: Check bucket exists and is accessible');
  try {
    const { data, error } = await supabaseAdmin.storage.listBuckets();

    if (error) {
      console.error('ERROR listing buckets:', error);
    } else {
      console.log('Buckets found:', data?.length || 0);
      const filesBucket = data?.find(b => b.name === 'files');
      if (filesBucket) {
        console.log('✓ "files" bucket exists');
        console.log('  Public:', filesBucket.public);
        console.log('  ID:', filesBucket.id);
      } else {
        console.log('✗ "files" bucket NOT FOUND');
        console.log('Available buckets:', data?.map(b => b.name).join(', '));
      }
    }
  } catch (err) {
    console.error('EXCEPTION:', err);
  }

  // Test 4: Validate request body schema
  console.log('\nTest 4: Validate request body format');
  const validBody = { storagePath: 'resumes/user-123/file.pdf' };
  const invalidBody = { filePath: 'resumes/user-123/file.pdf' }; // wrong key
  const emptyBody = { storagePath: '' };

  console.log('Valid body:', JSON.stringify(validBody));
  console.log('Invalid body (wrong key):', JSON.stringify(invalidBody));
  console.log('Empty body:', JSON.stringify(emptyBody));
}

testResumeEndpoint()
  .then(() => {
    console.log('\n=== Test Complete ===');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n=== Test Failed ===');
    console.error(err);
    process.exit(1);
  });
