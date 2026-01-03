/**
 * Test backend API endpoint to diagnose HTTP 500 errors
 */

const BACKEND_URL = 'https://jobmatch-ai-dev.carl-f-frank.workers.dev';

// You'll need to get this from browser DevTools after logging in
// Open console, run: localStorage.getItem('jobmatch-auth-token')
const AUTH_TOKEN = process.argv[2];

if (!AUTH_TOKEN) {
  console.log('Usage: node test-backend-api.mjs <auth-token>');
  console.log('');
  console.log('To get your auth token:');
  console.log('1. Log in to https://jobmatch-ai-dev.pages.dev');
  console.log('2. Open browser DevTools (F12)');
  console.log('3. Go to Console tab');
  console.log('4. Run: localStorage.getItem("jobmatch-auth-token")');
  console.log('5. Copy the token (without quotes)');
  console.log('6. Run: node test-backend-api.mjs YOUR_TOKEN_HERE');
  process.exit(1);
}

async function testBackend() {
  console.log('🔍 Testing Backend API...\n');

  // Test 1: Health check
  console.log('Test 1: Health Check');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }

  // Test 2: Applications endpoint (with auth)
  console.log('\nTest 2: Applications Generate Endpoint');
  try {
    const response = await fetch(`${BACKEND_URL}/api/applications/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId: 'test-job-id-123'
      })
    });

    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);

    const responseText = await response.text();
    console.log('Response:', responseText);

    if (!response.ok) {
      console.log('\n❌ Error Details:');
      try {
        const errorData = JSON.parse(responseText);
        console.log('Error Message:', errorData.message || errorData.error);
        console.log('Full Error:', JSON.stringify(errorData, null, 2));
      } catch {
        console.log('Raw Error:', responseText);
      }
    } else {
      console.log('✅ Success');
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }
}

testBackend();
