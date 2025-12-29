/**
 * Test script to debug the resume parse endpoint
 * Run with: node test-resume-parse.js
 */

const backendUrl = process.env.BACKEND_URL || 'https://jobmatch-ai-backend-production.up.railway.app';
const testToken = process.env.TEST_TOKEN || 'your-token-here';
const testPath = process.env.TEST_PATH || 'resumes/4ce126d2-93e9-41b0-8152-a53f37b92bc6/1766720095115_Carl_Frank_Resume.md.pdf';

async function testParseEndpoint() {
  console.log('Testing resume parse endpoint...');
  console.log('Backend URL:', backendUrl);
  console.log('Storage Path:', testPath);
  console.log('');

  try {
    const response = await fetch(`${backendUrl}/api/resume/parse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${testToken}`,
      },
      body: JSON.stringify({ storagePath: testPath }),
    });

    console.log('Response Status:', response.status, response.statusText);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    console.log('');

    let responseData;
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
      console.log('Response Data (JSON):');
      console.log(JSON.stringify(responseData, null, 2));
    } else {
      const text = await response.text();
      console.log('Response Data (Text):');
      console.log(text);
    }

    if (!response.ok) {
      console.error('\nRequest failed!');
      process.exit(1);
    }

    console.log('\nSuccess!');
  } catch (error) {
    console.error('Error during request:', error);
    process.exit(1);
  }
}

// Validate inputs
if (testToken === 'your-token-here') {
  console.error('ERROR: Please set TEST_TOKEN environment variable');
  console.error('Usage: TEST_TOKEN=your-supabase-token node test-resume-parse.js');
  process.exit(1);
}

testParseEndpoint();
