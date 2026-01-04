# Job Parser Test Suite Documentation

Comprehensive test coverage for the AI-powered job posting parser feature.

## Overview

The job parser test suite validates the complete job import workflow, from pasting raw job text to saving structured data in the database. Tests cover three levels:

1. **Unit Tests** - Test the core parsing service logic
2. **Integration Tests** - Test the API endpoint with request/response validation
3. **E2E Tests** - Test the complete user flow from UI to database

## Test Files

### 1. Unit Tests (`workers/api/services/__tests__/jobParser.test.ts`)

**Location:** `/home/carl/application-tracking/jobmatch-ai/workers/api/services/__tests__/jobParser.test.ts`

**Test Count:** 31 tests across 10 test suites

**Coverage Areas:**

#### Successful Parsing (3 tests)
- Parse LinkedIn job posting format
- Parse Indeed job posting format with salary
- Parse minimal job posting (only essential fields)
- Handle missing optional fields (no salary, no URL)

#### Salary Parsing (4 tests)
- Parse format: "$100k-$150k"
- Parse format: "100-150K"
- Parse format: "100000-150000"
- Handle single salary value (set both min and max)

#### Work Arrangement Inference (4 tests)
- Detect "Remote" from keywords ("remote", "work from home", "distributed")
- Detect "Hybrid" from keywords ("hybrid", "flexible", "some remote")
- Detect "On-site" from keywords ("on-site", "in-office", "office-based")
- Default to "Unknown" when work arrangement is unclear

#### Quality Validation (6 tests)
- Reject invalid data: empty title
- Reject invalid data: title too short (< 3 chars)
- Reject description too short (< 50 chars)
- Reject invalid salary range (min > max)
- Reject negative salary values
- Reject invalid work arrangement enum

#### Confidence Scoring (3 tests)
- Calculate high confidence (>= 80) for complete data
- Calculate medium confidence (50-79) for partial data
- Include warnings for missing optional fields

#### Retry Logic and Fallback (3 tests)
- Retry Workers AI on transient failure (exponential backoff)
- Fallback to OpenAI when Workers AI fails after all retries
- Verify correct model names and retry configuration

#### Edge Cases (4 tests)
- Handle empty required skills array
- Handle empty preferred skills array
- Handle job posting with URL
- Handle job posting with experience level

#### Workers AI Integration (2 tests)
- Call Workers AI with correct model and parameters
- Include job text in user prompt

**Run Command:**
```bash
cd workers && npm run test -- api/services/__tests__/jobParser.test.ts
```

---

### 2. Integration Tests (`workers/api/routes/__tests__/jobs-parse.test.ts`)

**Location:** `/home/carl/application-tracking/jobmatch-ai/workers/api/routes/__tests__/jobs-parse.test.ts`

**Test Count:** 28 tests across 9 test suites

**Coverage Areas:**

#### Successful Parsing (6 tests)
- Return 200 with structured job data for valid text
- Return job object with all expected fields
- Return metadata with confidence score (0-100)
- Return metadata with AI model used ('workers-ai' | 'openai')
- Return metadata with warnings array
- Parse minimal valid text successfully (50+ chars)

#### Validation Errors (7 tests)
- Return 400 for empty text
- Return 400 for text < 50 characters
- Return 400 for text > 10,000 characters
- Return 400 for missing text field
- Return 400 for invalid JSON body
- Return 400 for text field with wrong type (number)

#### Authentication (2 tests)
- Require authentication token
- Call authentication middleware

#### Response Structure (4 tests)
- Return JSON content type
- Validate job object structure
- Validate metadata structure
- Include optional fields when present

#### Edge Cases (5 tests)
- Handle text exactly 50 characters (boundary test)
- Handle text exactly 10,000 characters (boundary test)
- Handle text with special characters (emojis, symbols)
- Handle text with unicode characters (non-ASCII)
- Handle text with excessive whitespace

#### AI Service Integration (2 tests)
- Call Workers AI service
- Handle AI service errors gracefully

#### Rate Limiting (1 test)
- Apply rate limiting to parse endpoint

#### CORS (1 test)
- Handle CORS preflight OPTIONS request

**Run Command:**
```bash
cd workers && npm run test -- api/routes/__tests__/jobs-parse.test.ts
```

---

### 3. E2E Tests (`tests/e2e/job-paste-import.spec.ts`)

**Location:** `/home/carl/application-tracking/jobmatch-ai/tests/e2e/job-paste-import.spec.ts`

**Test Count:** 23 tests across 2 test suites

**Coverage Areas:**

#### Happy Path - Complete Flow (1 test)
- Navigate to Jobs page
- Click "Import from Text" button
- Paste job posting text
- Verify character counter updates
- Click "Parse Job" button
- Verify loading state shows
- Wait for parsing to complete
- Verify preview section appears
- Verify confidence badge displays
- Edit one field (location)
- Click "Save Job" button
- Verify success message shows
- Verify dialog closes
- Verify redirect to job detail page
- Verify new job appears in list

#### Step-by-Step UI Tests (9 tests)
- Open Import from Text dialog
- Update character counter as text is typed
- Enable Parse button when text is entered
- Show loading state during parsing
- Display preview section after successful parsing
- Display confidence badge with percentage
- Allow editing of extracted fields
- Allow changing work arrangement dropdown
- Show warnings for missing optional fields

#### Cancel and Reset Tests (3 tests)
- Allow canceling during paste step (no job created)
- Allow canceling during preview step (no job created)
- Allow starting over from preview step (clears form)

#### Error Cases (2 tests)
- Show error for text shorter than 50 characters
- Disable Save button if required fields are empty

#### Different Job Formats (2 tests)
- Parse LinkedIn job format correctly
- Handle minimal job posting with warnings

#### Accessibility Tests (2 tests)
- Be keyboard navigable (Tab, Enter)
- Have proper ARIA labels (dialog, inputs)

#### Integration with Jobs List (1 test)
- Refresh jobs list after successful save
- Redirect to new job detail page

#### Backend API Tests (1 test)
- Parse job via API endpoint (authentication required)

**Run Command:**
```bash
npm run test:e2e tests/e2e/job-paste-import.spec.ts
```

**Prerequisites:**
- Frontend running on `http://localhost:5173` (or set `FRONTEND_URL` env var)
- Backend running on `http://localhost:3000` (or set `BACKEND_URL` env var)
- Test credentials set in environment variables:
  - `TEST_USER_EMAIL` - User email for login
  - `TEST_USER_PASSWORD` - User password for login

---

## Test Data

### LinkedIn Job Posting Example
```
IT Systems Engineer
Madison, WI · Reposted 2 weeks ago · 91 applicants
On-site · Full-time
Clarity Technology Group, Inc.

About the job
Are you a skilled problem-solver who is always looking to sink your teeth into something new? A strong communicator who enjoys helping others?

What You'll Do:
Plan, design, implement, and support primarily Microsoft solutions both in the cloud and on-premises for organizations ranging from a dozen to hundreds of users

Skills You'll Need:
2+ Years supporting Microsoft cloud technologies (O365, Azure, Entra ID, Intune, etc.)
2+ Years supporting Windows Server and Active Directory
2+ Years working with networking and firewalls
5+ Years combined IT support experience
```

**Expected Extraction:**
- Title: "IT Systems Engineer"
- Company: "Clarity Technology Group"
- Location: "Madison, WI"
- Work Arrangement: "On-site"
- Experience Level: "Mid Level"
- Required Skills: ["O365", "Azure", "Entra ID", "Intune", "Windows Server", "Active Directory", "Networking", "Firewalls"]

### Indeed Job Posting Example (with salary)
```
Senior Software Engineer - Full Stack
Google
San Francisco, CA
$150,000 - $200,000 a year - Remote

Job Description:
We're looking for a talented Senior Software Engineer to join our team building next-generation cloud infrastructure. You'll work with React, Node.js, and AWS to create scalable systems.

Requirements:
- 5+ years of full-stack development experience
- Expert knowledge of React, TypeScript, Node.js
- Experience with AWS, Docker, Kubernetes
- Strong problem-solving and communication skills

Nice to have:
- GraphQL experience
- Machine learning knowledge
- Open source contributions
```

**Expected Extraction:**
- Title: "Senior Software Engineer - Full Stack"
- Company: "Google"
- Location: "San Francisco, CA"
- Work Arrangement: "Remote"
- Salary Min: 150000
- Salary Max: 200000
- Experience Level: "Senior"
- Required Skills: ["React", "TypeScript", "Node.js", "AWS", "Docker", "Kubernetes"]
- Preferred Skills: ["GraphQL", "Machine Learning"]

### Minimal Job Posting Example
```
Software Developer at StartupCo

We need a developer who knows JavaScript. Come work with us and build amazing products.
```

**Expected Extraction:**
- Title: "Software Developer"
- Company: "StartupCo"
- Location: "Location not specified"
- Work Arrangement: "Unknown"
- Required Skills: ["JavaScript"]
- Warnings: ["No job posting URL provided", "Experience level not specified", "Could not determine work arrangement"]

---

## Mock Configuration

### Unit Tests
- Mock Workers AI responses with structured JSON
- Mock OpenAI fallback (when Workers AI fails)
- Mock environment bindings (KV, D1, R2, Vectorize, AI)
- Mock confidence scoring logic

### Integration Tests
- Mock authentication middleware (bypass login)
- Mock rate limiting middleware
- Mock AI service calls
- Mock database operations

### E2E Tests
- Use real frontend and backend (localhost or deployed)
- Require actual test user credentials
- Use real AI services (incurs costs)

---

## Running All Tests

### Run All Unit Tests
```bash
cd workers
npm run test -- api/services/__tests__/
```

### Run All Integration Tests
```bash
cd workers
npm run test -- api/routes/__tests__/
```

### Run All E2E Tests
```bash
npm run test:e2e tests/e2e/job-paste-import.spec.ts
```

### Run All Tests (Full Suite)
```bash
# Unit + Integration
cd workers && npm run test

# E2E (separate command)
npm run test:e2e
```

---

## Test Coverage Summary

| Test Level | Files | Tests | Coverage Areas |
|------------|-------|-------|----------------|
| Unit | 1 | 31 | Parsing logic, validation, confidence scoring, retry/fallback |
| Integration | 1 | 28 | API endpoint, request/response, validation, error handling |
| E2E | 1 | 23 | Complete user flow, UI interactions, dialog wizard, save flow |
| **Total** | **3** | **82** | **Full job parser feature coverage** |

---

## Key Features Tested

✅ **AI Parsing**
- Workers AI (Llama 3.3 70B) primary model
- OpenAI (GPT-4o-mini) fallback model
- Retry logic with exponential backoff
- JSON Mode for structured output

✅ **Quality Validation**
- Required fields (title, company, location, description)
- Description minimum length (50 chars)
- Salary range validation (min <= max, no negatives)
- Work arrangement enum validation

✅ **Confidence Scoring**
- 0-100 scale based on data completeness
- High confidence: >= 80 (all fields populated)
- Medium confidence: 50-79 (most fields populated)
- Low confidence: < 50 (minimal fields populated)

✅ **Input Validation**
- Text length: 50-10,000 characters
- JSON body validation
- Field type validation

✅ **Error Handling**
- Validation errors (400)
- Authentication errors (401)
- AI service errors (graceful fallback)
- Network errors (retry logic)

✅ **User Experience**
- Character counter (live updates)
- Loading states (parsing, saving)
- Preview and edit (before saving)
- Warnings for missing fields
- Confidence badge display
- Success confirmation

✅ **Accessibility**
- Keyboard navigation
- ARIA labels
- Screen reader support

---

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

### GitHub Actions Workflow
```yaml
- name: Run Unit Tests
  run: cd workers && npm run test

- name: Run E2E Tests
  run: npm run test:e2e
  env:
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
    TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
```

---

## Future Enhancements

### Potential Test Additions
1. **Performance Tests**
   - Measure parsing latency (target: < 5 seconds)
   - Test rate limiting enforcement
   - Test concurrent parse requests

2. **Visual Regression Tests**
   - Screenshot comparison for dialog UI
   - Confidence badge rendering
   - Warnings display

3. **Mutation Tests**
   - Verify test quality with mutation testing
   - Ensure tests catch real bugs

4. **Load Tests**
   - Test parser with high volume of requests
   - Verify AI Gateway caching effectiveness

5. **Browser Compatibility Tests**
   - Test E2E flow across Chrome, Firefox, Safari
   - Test mobile responsive design

---

## Troubleshooting

### Tests Failing with "AI Gateway not configured"
**Solution:** Ensure mock environment includes `CLOUDFLARE_ACCOUNT_ID` and `AI_GATEWAY_SLUG`

### E2E Tests Skipped
**Solution:** Set environment variables `TEST_USER_EMAIL` and `TEST_USER_PASSWORD`

### Tests Failing with "Validation failed: Description too short"
**Solution:** Ensure mock responses include descriptions >= 50 characters

### Integration Tests Failing with 401
**Solution:** Verify authentication middleware is properly mocked

---

## Test Maintenance

### When to Update Tests

1. **API Changes**
   - Update validation schemas if input constraints change
   - Update response structure tests if output format changes

2. **UI Changes**
   - Update E2E tests if dialog structure changes
   - Update accessibility tests if form fields change

3. **AI Model Changes**
   - Update model name constants if switching AI models
   - Update confidence scoring logic if thresholds change

4. **Feature Additions**
   - Add new test cases for additional job sources
   - Add tests for new extracted fields

### Test Review Checklist

- [ ] All tests pass locally
- [ ] Tests pass in CI/CD pipeline
- [ ] Test coverage > 80%
- [ ] E2E tests cover happy path
- [ ] Edge cases documented and tested
- [ ] Error cases handled gracefully
- [ ] Mocks accurately reflect real behavior

---

## Documentation

See also:
- `workers/api/services/jobParser.ts` - Core parsing service implementation
- `workers/api/routes/jobs.ts` - API endpoint implementation (POST /api/jobs/parse)
- `src/sections/job-discovery-matching/components/PasteJobDialog.tsx` - Frontend dialog component
- `src/hooks/useJobParser.ts` - Frontend React hook for parsing
- `docs/TESTING_STRATEGY.md` - Overall testing strategy

---

**Last Updated:** 2026-01-03
**Test Suite Version:** 1.0.0
**Total Tests:** 82
**Pass Rate:** 100% (with proper mocks)
