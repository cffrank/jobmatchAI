# Complete Onboarding Flow E2E Test

## Overview

This comprehensive end-to-end test validates the complete user onboarding workflow **WITHOUT any Supabase PostgreSQL dependencies**. Only Supabase Auth is allowed - all data operations must go through Workers API → D1.

## Test File

**Location:** `tests/e2e/complete-onboarding-flow.spec.ts`

## Test Flow

The test executes the following steps:

### 1. Create New Account ✅
- Navigate to `/signup` page
- Fill in registration form:
  - Display name
  - Email (unique, timestamped)
  - Password (meets strength requirements)
- Submit form
- Verify account creation successful
- Verify redirect to profile/dashboard

### 2. Verify Authentication ✅
- Check JWT token stored in localStorage
- Verify token is valid and non-empty
- Confirm user is authenticated

### 3. Complete Profile Information ✅
- Navigate to `/profile/edit-profile`
- Fill in required profile fields:
  - First name
  - Last name
  - Email
  - Phone number
  - Location
  - LinkedIn URL
  - Professional headline
  - Professional summary (bio)
- Save profile
- **Verify save went through Workers API → D1**
- Confirm profile data persisted

### 4. Import Resume with AI Parsing ✅
- Navigate to profile page
- Click "Import Resume" or "Upload Resume" button
- Upload sample resume PDF (`tests/fixtures/sample-resume.pdf`)
- Wait for AI parsing to complete (10-30 seconds)
- Verify resume parsing successful
- Verify gap analysis generated
- **Verify all operations went through Workers API → D1**

### 5. Answer Gap Analysis Questions ✅
- Review generated gap analysis questions
- Answer at least 2 questions with detailed responses
- Click "Continue to Import" or "Save"
- Wait for import completion
- **Verify answers saved to D1 via Workers API**

### 6. Verify Data Persistence ✅
- Navigate back to profile page
- Verify all data displays correctly:
  - Profile information
  - Work experience (if parsed)
  - Skills (if parsed)
  - Education (if parsed)
- **Confirm data is loading from D1, not Supabase PostgreSQL**

### 7. Logout and Session Cleanup ✅
- Click logout button
- Verify redirect to login page
- Verify JWT token cleared from localStorage
- Attempt to access protected route (`/profile`)
- Verify redirect to login (authentication required)

## Network Monitoring

The test includes comprehensive network activity monitoring:

### What It Monitors

1. **All HTTP requests** made during the test
2. **Supabase Auth calls** (allowed)
3. **Supabase Database calls** (NOT allowed - violations)
4. **Workers API calls** (required for data operations)
5. **Other API calls** (CDN, assets, etc.)

### Violation Detection

The test **fails** if it detects:
- Any direct calls to Supabase PostgreSQL endpoints (excluding `auth.supabase.co`)
- Example violations:
  - `https://your-project.supabase.co/rest/v1/users`
  - `https://your-project.supabase.co/rest/v1/work_experience`
  - `https://your-project.supabase.co/rest/v1/gap_analyses`

### Network Report

After test completion, a detailed network activity report is generated:

**Location:** `test-results/network-activity-report.json`

**Contents:**
```json
{
  "totalCalls": 150,
  "supabaseAuthCalls": 3,
  "supabaseDbCalls": 0,
  "workersCalls": 45,
  "otherCalls": 102,
  "calls": [
    {
      "url": "https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile",
      "method": "PUT",
      "status": 200,
      "timestamp": 1704326400000,
      "duration": 250
    }
  ],
  "violations": []
}
```

## Test Fixtures

### Sample Resume

**Location:** `tests/fixtures/sample-resume.pdf`

**Generation:**
```bash
node tests/fixtures/create-sample-resume-pdf.mjs
```

**Content:** Realistic senior software engineer resume with:
- Contact information
- Professional summary
- Technical skills
- 3 work experiences (2016-present)
- Education
- Certifications
- Projects

## Running the Test

### Prerequisites

1. **Frontend running:**
   ```bash
   npm run dev
   # or set FRONTEND_URL env var
   ```

2. **Backend (Workers) running:**
   ```bash
   cd workers
   npm run dev
   # or set BACKEND_URL env var
   ```

3. **Playwright installed:**
   ```bash
   npm install
   npx playwright install
   ```

### Execution

#### Run all onboarding tests:
```bash
npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts
```

#### Run with UI (debug mode):
```bash
npm run test:e2e:ui tests/e2e/complete-onboarding-flow.spec.ts
```

#### Run in headed browser (watch test execute):
```bash
npm run test:e2e:headed tests/e2e/complete-onboarding-flow.spec.ts
```

#### Run against deployed environment:
```bash
FRONTEND_URL=https://jobmatch-ai-dev.pages.dev \
BACKEND_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev \
npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts
```

### CI/CD Integration

Add to `.github/workflows/e2e-tests.yml`:

```yaml
- name: Run Complete Onboarding Flow Test
  run: |
    FRONTEND_URL=${{ secrets.FRONTEND_URL }} \
    BACKEND_URL=${{ secrets.BACKEND_URL }} \
    npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts

- name: Upload Network Activity Report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: network-activity-report
    path: test-results/network-activity-report.json
```

## Expected Results

### Success Criteria ✅

1. **All 7 steps complete without errors**
2. **No Supabase PostgreSQL violations detected**
3. **At least 1 Workers API call for each data operation**
4. **Profile data persisted and displayed correctly**
5. **Logout clears session completely**

### Console Output (Success)

```
🧪 Test User: test-user-1704326400000@jobmatch-test.com

📝 Step 1: Creating new account...
✅ Account created successfully

🔐 Step 2: Verifying authentication...
✅ JWT token received and stored

👤 Step 3: Completing profile information...
✅ Profile information saved to D1
✅ Profile update went through Workers API (1 calls)

📄 Step 4: Importing resume with AI parsing...
⏳ Waiting for resume parsing...
✅ Resume parsed and gap analysis generated

💡 Step 5: Answering gap analysis questions...
Found 5 gap analysis questions
✅ Answered question 1
✅ Answered question 2
✅ Gap analysis answers saved to D1

🔍 Step 6: Verifying data persistence...
✅ Profile data persisted and displayed correctly
✅ Work experience data persisted
✅ Skills data persisted

🚪 Step 7: Logging out...
✅ Session cleared successfully
✅ Protected routes require authentication

🎉 All onboarding steps completed successfully!

📊 Network Activity Report:
Total API calls: 150
Supabase Auth calls: 3
Supabase DB calls: 0 ✅
Workers API calls: 45
Other calls: 102

✅ No Supabase DB violations detected!
✅ Migration validation PASSED: All data operations use Workers API → D1

📄 Detailed report saved to: test-results/network-activity-report.json
```

### Failure Scenarios

#### Supabase DB Violation Detected ❌

```
⚠️ VIOLATIONS DETECTED:
  - VIOLATION: Direct Supabase DB call detected: GET https://abc123.supabase.co/rest/v1/users?id=eq.123
  - VIOLATION: Direct Supabase DB call detected: POST https://abc123.supabase.co/rest/v1/work_experience

❌ Test FAILED: Supabase PostgreSQL calls detected!
Expected supabaseDbCalls to be 0, but got 2
```

**Action:** Investigate code to find direct Supabase client usage. Replace with Workers API calls.

#### Workers API Not Responding ❌

```
❌ Step 3 FAILED: Profile save timeout
Error: Request to http://localhost:3000/api/profile timed out after 30000ms
```

**Action:** Ensure Workers backend is running and accessible.

#### Resume Parsing Timeout ❌

```
❌ Step 4 FAILED: Resume parsing timeout
Error: Gap analysis did not complete within 60 seconds
```

**Action:** Check OpenAI API key is configured and service is responsive.

## Debugging

### Enable Verbose Logging

```bash
DEBUG=pw:api npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts
```

### Take Screenshots on Failure

Already configured in `playwright.config.ts`:
- `screenshot: 'only-on-failure'`
- `video: 'retain-on-failure'`

Screenshots saved to: `test-results/`

### Inspect Network Calls

Check generated report:
```bash
cat test-results/network-activity-report.json | jq '.'
```

Filter violations:
```bash
cat test-results/network-activity-report.json | jq '.violations'
```

List all Workers API calls:
```bash
cat test-results/network-activity-report.json | jq '.calls[] | select(.url | contains("/api/"))'
```

## Maintenance

### Update Test User Credentials

Test generates unique email addresses automatically using timestamp:
- Format: `test-user-{timestamp}@jobmatch-test.com`
- No manual cleanup needed

### Update Sample Resume

Modify `tests/fixtures/sample-resume.txt` and regenerate PDF:
```bash
node tests/fixtures/create-sample-resume-pdf.mjs
```

### Add More Test Assertions

The test is designed to be extended. Example additions:
- Verify work experience count
- Verify skill tags displayed
- Verify gap analysis appears in profile
- Test error handling (invalid resume format, etc.)

## Monitoring Migration Progress

This test serves as a **migration validation checkpoint**. It proves that:

1. ✅ User authentication works (Supabase Auth)
2. ✅ Profile data CRUD works (Workers API → D1)
3. ✅ Resume parsing works (Workers API → OpenAI → D1)
4. ✅ Gap analysis works (Workers API → OpenAI → D1)
5. ✅ No direct Supabase PostgreSQL dependencies remain

**Goal:** All assertions pass = Migration is complete and functional.

**Current Status (as of test creation):**
- Infrastructure: 100% deployed ✅
- Code Migration: 35% → Testing will reveal actual percentage
- This test will fail until code fully migrated from Supabase to D1

## Related Documentation

- [Cloudflare Infrastructure Audit](../../docs/CLOUDFLARE_INFRASTRUCTURE_AUDIT_2026-01-02.md)
- [Cloudflare Migration Status](../../docs/CLOUDFLARE_MIGRATION_STATUS.md)
- [D1 Schema Mapping](../../docs/D1_SCHEMA_MAPPING.md)
- [Testing Strategy](../../docs/TESTING_STRATEGY.md)

## Support

For issues or questions:
1. Check console output for specific error messages
2. Review network activity report for violations
3. Verify environment variables are set correctly
4. Ensure all services (frontend, backend, OpenAI) are running
5. Check Playwright documentation for test debugging

---

**Last Updated:** 2026-01-03
**Test Version:** 1.0.0
**Migration Phase:** 3.2 (D1 + R2 + Vectorize Code Migration)
