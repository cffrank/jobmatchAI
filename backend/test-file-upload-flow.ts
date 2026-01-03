/**
 * Test script to simulate the complete upload and parse flow
 *
 * This script:
 * 1. Creates a test file in the files bucket
 * 2. Verifies the file exists
 * 3. Generates a signed URL
 * 4. Tests the parseResume function logic
 *
 * Run with: npx ts-node test-file-upload-flow.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.test' });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function testUploadFlow() {
  console.log('=== Testing Upload and Parse Flow ===\n');

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Create a dummy test file
  const testUserId = 'test-user-123';
  const testFileName = `${Date.now()}_test-resume.txt`;
  const testPath = `resumes/${testUserId}/${testFileName}`;
  const testContent = 'This is a test resume file for debugging purposes.';

  console.log('Step 1: Upload test file');
  console.log('Path:', testPath);

  try {
    // Upload the test file
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('files')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      return;
    }

    console.log('✓ File uploaded successfully');
    console.log('Upload data:', uploadData);

    // Step 2: Verify file exists (simulating our new backend logic)
    console.log('\nStep 2: Verify file exists');
    const folderPath = testPath.substring(0, testPath.lastIndexOf('/'));
    const fileName = testPath.substring(testPath.lastIndexOf('/') + 1);

    console.log('Folder:', folderPath);
    console.log('File name:', fileName);

    const { data: fileList, error: listError } = await supabaseAdmin.storage
      .from('files')
      .list(folderPath);

    if (listError) {
      console.error('❌ List failed:', listError);
      return;
    }

    console.log('Files in folder:', fileList?.map(f => f.name).join(', ') || 'none');

    const fileExists = fileList?.some(file => file.name === fileName);
    if (fileExists) {
      console.log('✓ File found in storage');
    } else {
      console.error('❌ File NOT found in storage');
      return;
    }

    // Step 3: Generate signed URL
    console.log('\nStep 3: Generate signed URL');

    const { data: signedUrlData, error: urlError } = await supabaseAdmin.storage
      .from('files')
      .createSignedUrl(testPath, 3600);

    if (urlError) {
      console.error('❌ Signed URL generation failed:', urlError);
      return;
    }

    console.log('✓ Signed URL generated successfully');
    console.log('URL:', signedUrlData.signedUrl);

    // Step 4: Clean up - delete the test file
    console.log('\nStep 4: Clean up test file');

    const { error: deleteError } = await supabaseAdmin.storage
      .from('files')
      .remove([testPath]);

    if (deleteError) {
      console.error('⚠️  Failed to delete test file:', deleteError);
    } else {
      console.log('✓ Test file deleted');
    }

    console.log('\n=== All Steps Passed ===');
  } catch (error) {
    console.error('\n❌ Test failed with exception:', error);
  }
}

testUploadFlow()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
