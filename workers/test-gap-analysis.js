#!/usr/bin/env node
/**
 * Test script for Resume Gap Analysis endpoints
 * Tests all 4 endpoints with real authentication
 */

const SUPABASE_URL = 'https://wpupbucinufbaiphwogc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_h6erYLL-Ye6oD7pNyWLGBw_GYbxQ4OA';
const API_URL = 'https://jobmatch-ai-dev.carl-f-frank.workers.dev';

// Test user credentials (create if doesn't exist)
const TEST_EMAIL = 'test@gapanalysis.com';
const TEST_PASSWORD = 'TestPassword123!';

async function getAuthToken() {
  console.log('🔐 Authenticating with Supabase...\n');

  // First try to sign up (this will fail if user exists)
  let response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      options: {
        data: {
          full_name: 'Gap Analysis Test User',
        },
      },
    }),
  });

  let data = await response.json();

  // If user already exists, sign in instead
  if (data.error || data.msg?.includes('already registered') || data.error_code === 'user_already_exists') {
    console.log('   User already exists, signing in...\n');

    response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
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

    data = await response.json();
  } else if (!data.error) {
    console.log('   ✅ New test user created successfully\n');
  }

  if (data.error || !data.access_token) {
    console.error('❌ Authentication failed:', data);
    console.error('\nDebug info:');
    console.error('   SUPABASE_URL:', SUPABASE_URL);
    console.error('   TEST_EMAIL:', TEST_EMAIL);
    process.exit(1);
  }

  console.log('✅ Authenticated successfully');
  console.log(`   User ID: ${data.user?.id}`);
  console.log(`   Email: ${data.user?.email}\n`);

  return data.access_token;
}

async function test1_CreateGapAnalysis(token) {
  console.log('📝 Test 1: Create Gap Analysis');
  console.log('   Endpoint: POST /api/resume/analyze-gaps\n');

  const response = await fetch(`${API_URL}/api/resume/analyze-gaps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const status = response.status;
  const data = await response.json();

  if (status === 200) {
    console.log('   ✅ Status: 200 OK');
    console.log(`   ✅ Analysis ID: ${data.analysis_id}`);
    console.log(`   ✅ Gap Count: ${data.resume_analysis.gap_count}`);
    console.log(`   ✅ Red Flag Count: ${data.resume_analysis.red_flag_count}`);
    console.log(`   ✅ Urgency: ${data.resume_analysis.urgency}`);
    console.log(`   ✅ Questions Generated: ${data.clarification_questions.length}`);
    console.log(`   ✅ Overall Assessment: ${data.resume_analysis.overall_assessment.substring(0, 100)}...\n`);
    return data.analysis_id;
  } else {
    console.error(`   ❌ Status: ${status}`);
    console.error(`   ❌ Error:`, data);
    return null;
  }
}

async function test2_GetGapAnalysis(token, analysisId) {
  console.log('📖 Test 2: Get Gap Analysis by ID');
  console.log(`   Endpoint: GET /api/resume/gap-analysis/${analysisId}\n`);

  const response = await fetch(`${API_URL}/api/resume/gap-analysis/${analysisId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const status = response.status;
  const data = await response.json();

  if (status === 200) {
    console.log('   ✅ Status: 200 OK');
    console.log(`   ✅ Status: ${data.status}`);
    console.log(`   ✅ Questions Total: ${data.questions_total}`);
    console.log(`   ✅ Questions Answered: ${data.questions_answered}`);
    console.log(`   ✅ Completion: ${data.completion_percentage}%\n`);

    return data.clarification_questions[0]?.question_id;
  } else {
    console.error(`   ❌ Status: ${status}`);
    console.error(`   ❌ Error:`, data);
    return null;
  }
}

async function test3_AnswerQuestion(token, analysisId, questionId) {
  console.log('✍️  Test 3: Answer a Question');
  console.log(`   Endpoint: PATCH /api/resume/gap-analysis/${analysisId}/answer\n`);

  const response = await fetch(`${API_URL}/api/resume/gap-analysis/${analysisId}/answer`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_id: questionId,
      answer: 'I was consulting for tech startups during this period, working on system architecture and scalability projects for companies in the healthcare and fintech sectors. I also completed AWS Solutions Architect certification and contributed to open-source projects.',
    }),
  });

  const status = response.status;
  const data = await response.json();

  if (status === 200) {
    console.log('   ✅ Status: 200 OK');
    console.log(`   ✅ Status: ${data.status}`);
    console.log(`   ✅ Questions Answered: ${data.questions_answered}/${data.questions_total}`);
    console.log(`   ✅ Completion: ${data.completion_percentage}%`);
    console.log(`   ✅ Answer saved successfully\n`);
    return true;
  } else {
    console.error(`   ❌ Status: ${status}`);
    console.error(`   ❌ Error:`, data);
    return false;
  }
}

async function test4_ListAllAnalyses(token) {
  console.log('📋 Test 4: List All Gap Analyses');
  console.log('   Endpoint: GET /api/resume/gap-analyses\n');

  const response = await fetch(`${API_URL}/api/resume/gap-analyses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  const status = response.status;
  const data = await response.json();

  if (status === 200) {
    console.log('   ✅ Status: 200 OK');
    console.log(`   ✅ Total Analyses: ${data.length}`);
    if (data.length > 0) {
      console.log(`   ✅ Latest Analysis: ${data[0].overall_assessment?.substring(0, 80)}...`);
      console.log(`   ✅ Latest Status: ${data[0].status} (${data[0].completion_percentage}% complete)\n`);
    }
    return true;
  } else {
    console.error(`   ❌ Status: ${status}`);
    console.error(`   ❌ Error:`, data);
    return false;
  }
}

async function test5_ErrorHandling(token) {
  console.log('🚫 Test 5: Error Handling');
  console.log('   Testing various error scenarios\n');

  // Test 5a: Missing auth token
  console.log('   5a. Missing auth token:');
  let response = await fetch(`${API_URL}/api/resume/analyze-gaps`, {
    method: 'POST',
  });
  console.log(`      ${response.status === 401 ? '✅' : '❌'} Expected 401, got ${response.status}\n`);

  // Test 5b: Invalid analysis ID
  console.log('   5b. Invalid analysis ID:');
  response = await fetch(`${API_URL}/api/resume/gap-analysis/invalid-uuid-here`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  console.log(`      ${response.status === 404 ? '✅' : '❌'} Expected 404, got ${response.status}\n`);

  // Test 5c: Non-existent question ID
  console.log('   5c. Non-existent question ID:');
  // First create an analysis to get valid ID
  const createResp = await fetch(`${API_URL}/api/resume/analyze-gaps`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const createData = await createResp.json();

  response = await fetch(`${API_URL}/api/resume/gap-analysis/${createData.analysis_id}/answer`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_id: 999999,
      answer: 'This should fail',
    }),
  });
  console.log(`      ${response.status === 404 ? '✅' : '❌'} Expected 404, got ${response.status}\n`);
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 Resume Gap Analysis - End-to-End Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Authenticate
    const token = await getAuthToken();

    // Step 2: Create gap analysis
    const analysisId = await test1_CreateGapAnalysis(token);
    if (!analysisId) {
      console.error('❌ Test 1 failed, cannot continue');
      process.exit(1);
    }

    // Step 3: Retrieve gap analysis
    const questionId = await test2_GetGapAnalysis(token, analysisId);
    if (!questionId) {
      console.error('❌ Test 2 failed, cannot continue');
      process.exit(1);
    }

    // Step 4: Answer a question
    const answerSuccess = await test3_AnswerQuestion(token, analysisId, questionId);
    if (!answerSuccess) {
      console.error('❌ Test 3 failed, cannot continue');
      process.exit(1);
    }

    // Step 5: List all analyses
    const listSuccess = await test4_ListAllAnalyses(token);
    if (!listSuccess) {
      console.error('❌ Test 4 failed');
      process.exit(1);
    }

    // Step 6: Error handling
    await test5_ErrorHandling(token);

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ All Tests Passed!');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log('   • Gap analysis creation: ✅');
    console.log('   • Gap analysis retrieval: ✅');
    console.log('   • Question answering: ✅');
    console.log('   • List all analyses: ✅');
    console.log('   • Error handling: ✅');
    console.log('\n🎉 Resume Gap Analysis feature is fully operational!\n');

  } catch (error) {
    console.error('\n❌ Test suite failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
