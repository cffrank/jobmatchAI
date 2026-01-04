# AI Gateway Test Plan

**Phase:** Cloudflare Migration Phase 1
**Component:** AI Gateway Integration
**Last Updated:** 2025-12-29

## Overview

This document outlines the comprehensive testing strategy for Cloudflare AI Gateway integration. The AI Gateway provides automatic caching and cost reduction (60-80% savings) for OpenAI API calls while maintaining 100% backward compatibility.

## Test Coverage Summary

| Test Category | Files | Coverage |
|--------------|-------|----------|
| Unit Tests | `workers/api/services/__tests__/openai.test.ts` | AI Gateway URL construction, configuration, error handling |
| Integration Tests | `workers/api/routes/__tests__/ai-gateway.integration.test.ts` | Complete request flow, response format, cache behavior |
| E2E Tests | `workers/e2e-tests/test-ai-features.ts` | Resume parsing, application generation, compatibility analysis |

## Automated Test Suite

### Unit Tests (`openai.test.ts`)

**Location:** `/workers/api/services/__tests__/openai.test.ts`

**Test Cases:**

1. **AI Gateway URL Construction**
   - ✅ Constructs correct gateway URL when both account ID and slug configured
   - ✅ Falls back to direct OpenAI when gateway not configured
   - ✅ Falls back when only account ID configured
   - ✅ Falls back when only gateway slug configured
   - ✅ Throws error when API key missing

2. **Configuration Checks**
   - ✅ `isOpenAIConfigured()` returns correct status
   - ✅ `isAIGatewayConfigured()` validates both required fields

3. **Application Generation**
   - ✅ Generates all 3 variants successfully with AI Gateway
   - ✅ Uses fallback when OpenAI API fails
   - ✅ Handles partial failures (some variants succeed, some fail)
   - ✅ Maintains correct model configuration

4. **Resume Parsing**
   - ✅ Successfully parses image resume through AI Gateway
   - ✅ Rejects PDF files with helpful error message
   - ✅ Rejects unsupported file formats
   - ✅ Handles storage errors gracefully

**Run Command:**
```bash
cd workers
npm test -- api/services/__tests__/openai.test.ts
```

### Integration Tests (`ai-gateway.integration.test.ts`)

**Location:** `/workers/api/routes/__tests__/ai-gateway.integration.test.ts`

**Test Cases:**

1. **Complete Request Flow**
   - ✅ Full application generation through AI Gateway
   - ✅ Maintains backward compatibility with response format
   - ✅ All variants generated correctly

2. **Error Propagation**
   - ✅ OpenAI API errors handled gracefully
   - ✅ Gateway timeout handled with fallback
   - ✅ Invalid JSON responses trigger fallback

3. **Cache Behavior**
   - ✅ Logs cache status information
   - ✅ Identical results for cache hits and misses

4. **Performance**
   - ✅ Generation completes within reasonable time

**Run Command:**
```bash
cd workers
npm test -- api/routes/__tests__/ai-gateway.integration.test.ts
```

### E2E Tests (`test-ai-features.ts`)

**Location:** `/workers/e2e-tests/test-ai-features.ts`

**Test Functions:**

1. `testResumeParsing()` - Verify resume upload and AI parsing UI
2. `testApplicationGeneration()` - Test generation of all 3 variants
3. `testJobCompatibilityAnalysis()` - Verify AI-powered match scores
4. `testAIBackwardCompatibility()` - Ensure features work identically
5. `testAIErrorHandling()` - Verify graceful degradation

**Run Command:**
```bash
# Via Cloudflare Workers
curl -X POST https://e2e-tests.your-domain.workers.dev/run-tests

# Or integrate into main E2E worker
```

## Manual Testing Checklist

### Pre-Deployment Testing (Development Environment)

- [ ] **Environment Setup**
  - [ ] Verify `CLOUDFLARE_ACCOUNT_ID` set in `.dev.vars`
  - [ ] Verify `AI_GATEWAY_SLUG` set in `.dev.vars`
  - [ ] Verify `OPENAI_API_KEY` still works
  - [ ] Check Cloudflare dashboard shows AI Gateway created

- [ ] **Resume Parsing**
  - [ ] Upload PNG resume → parses correctly
  - [ ] Upload JPG resume → parses correctly
  - [ ] Upload PDF → shows helpful error message
  - [ ] Compare parsed data with direct API (should be identical)

- [ ] **Application Generation**
  - [ ] Generate application for a job
  - [ ] Verify all 3 variants created:
    - [ ] Impact-Focused
    - [ ] Keyword-Optimized
    - [ ] Concise
  - [ ] Check AI rationale is present and relevant
  - [ ] Verify resume content quality
  - [ ] Verify cover letter quality
  - [ ] Compare with direct API results (should be identical)

- [ ] **Job Compatibility Analysis**
  - [ ] View job details with match score
  - [ ] Verify compatibility breakdown present
  - [ ] Check AI-generated insights accurate
  - [ ] Compare scores with direct API

- [ ] **Error Handling**
  - [ ] Test with invalid API key → appropriate error
  - [ ] Test when OpenAI service down → fallback works
  - [ ] Test network timeout → graceful degradation

### Post-Deployment Testing (Staging Environment)

- [ ] **Functionality Verification**
  - [ ] All automated tests pass
  - [ ] Resume parsing works end-to-end
  - [ ] Application generation works end-to-end
  - [ ] Job matching scores accurate

- [ ] **AI Gateway Verification (Cloudflare Dashboard)**
  - [ ] Navigate to AI → AI Gateway
  - [ ] Verify requests showing up in analytics
  - [ ] Check cache hit rate (should increase over time)
  - [ ] Verify cost savings metrics
  - [ ] No error rate spike

- [ ] **Performance Benchmarks**
  - [ ] First request (cache miss): ~2-5 seconds
  - [ ] Cached request (cache hit): ~100-500ms (60-80% faster)
  - [ ] Application generation: <30 seconds for all variants
  - [ ] Job compatibility analysis: <5 seconds

- [ ] **Response Format Validation**
  - [ ] Resume structure unchanged
  - [ ] Cover letter format unchanged
  - [ ] AI rationale array format unchanged
  - [ ] All TypeScript types still match

### Production Deployment Testing

- [ ] **Smoke Tests (First 15 Minutes)**
  - [ ] Health endpoint responds: `GET /health`
  - [ ] Resume parsing works (1 test case)
  - [ ] Application generation works (1 test case)
  - [ ] No errors in Cloudflare logs

- [ ] **Monitoring (First Hour)**
  - [ ] AI Gateway analytics show traffic
  - [ ] Error rate <1%
  - [ ] Response times normal (<5s average)
  - [ ] Cache hit rate >0% (after a few requests)

- [ ] **User Acceptance (First 24 Hours)**
  - [ ] No user-reported issues
  - [ ] Application quality unchanged
  - [ ] Resume parsing accuracy maintained
  - [ ] Match scores consistent

## Performance Benchmarks

### Baseline (Direct OpenAI API)

| Operation | Average Time | Cost per Request |
|-----------|-------------|------------------|
| Resume Parsing | 3-5 seconds | $0.01-0.02 |
| Application Generation (single variant) | 5-8 seconds | $0.03-0.05 |
| Application Generation (all 3 variants) | 15-25 seconds | $0.09-0.15 |
| Job Compatibility Analysis | 2-4 seconds | $0.01-0.02 |

### Target (With AI Gateway)

| Operation | First Request (miss) | Cached Request (hit) | Cost Savings |
|-----------|---------------------|---------------------|--------------|
| Resume Parsing | 3-5 seconds | 0.3-0.8 seconds | 60-80% |
| Application Generation (single) | 5-8 seconds | 0.5-1.5 seconds | 60-80% |
| Application Generation (all 3) | 15-25 seconds | 1.5-4 seconds | 60-80% |
| Job Compatibility | 2-4 seconds | 0.2-0.6 seconds | 60-80% |

**Key Metrics to Monitor:**
- **Cache Hit Rate:** Should reach 40-60% within first week
- **Cost Reduction:** Should see 60-80% reduction for cached requests
- **Error Rate:** Should remain <1%
- **Response Time P95:** Should decrease by 50-70% for cached requests

## Rollback Testing Procedures

### Scenario 1: AI Gateway Returns Errors

**Detection:**
- Error rate >5% in first hour
- User reports of AI features failing
- Cloudflare logs show gateway errors

**Rollback Steps:**
1. Remove `CLOUDFLARE_ACCOUNT_ID` from environment variables
2. Remove `AI_GATEWAY_SLUG` from environment variables
3. Redeploy workers
4. Service automatically falls back to direct OpenAI API
5. Verify all features working via automated tests

**Test Rollback:**
```bash
# Remove gateway config
wrangler secret delete CLOUDFLARE_ACCOUNT_ID
wrangler secret delete AI_GATEWAY_SLUG

# Redeploy
wrangler deploy

# Run tests
npm test
```

### Scenario 2: Cache Serving Stale Data

**Detection:**
- Generated applications contain outdated information
- Resume parsing returns old data
- Users report inconsistencies

**Rollback Steps:**
1. Clear AI Gateway cache via Cloudflare Dashboard
2. If issue persists, remove gateway configuration (see Scenario 1)
3. Re-enable after investigating cache TTL settings

**Test Cache Clear:**
```bash
# Via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/accounts/{account_id}/ai-gateway/{gateway_id}/cache/purge" \
  -H "Authorization: Bearer {api_token}"
```

### Scenario 3: Performance Degradation

**Detection:**
- Response times increase >50%
- Timeout errors increase
- User complaints about slow AI features

**Investigation:**
1. Check Cloudflare status page
2. Review AI Gateway analytics for anomalies
3. Compare direct OpenAI API performance

**Rollback Decision:**
- If gateway adds >2s latency: rollback immediately
- If intermittent: monitor for 1 hour before rollback
- If OpenAI also slow: keep gateway (not the cause)

## Continuous Monitoring

### Daily Checks
- [ ] AI Gateway analytics reviewed
- [ ] Cache hit rate trending upward
- [ ] No error rate spikes
- [ ] Cost metrics showing expected savings

### Weekly Reviews
- [ ] Compare AI quality metrics (pre/post gateway)
- [ ] Review user feedback on AI features
- [ ] Analyze cost savings vs. projections
- [ ] Adjust cache TTL if needed

### Monthly Analysis
- [ ] Full cost comparison report
- [ ] Performance benchmarks updated
- [ ] User satisfaction survey results
- [ ] Decision: continue, optimize, or rollback

## Success Criteria

**Must-Have (Go/No-Go):**
- ✅ All automated tests pass (100%)
- ✅ Error rate <1%
- ✅ Response format unchanged (backward compatible)
- ✅ Rollback procedure tested and verified

**Should-Have (First Week):**
- ✅ Cache hit rate >20%
- ✅ Cost reduction >30%
- ✅ Response time P95 improved >30%
- ✅ No user-reported quality issues

**Nice-to-Have (First Month):**
- ✅ Cache hit rate >50%
- ✅ Cost reduction >60%
- ✅ Response time P95 improved >60%
- ✅ User satisfaction maintained or improved

## Test Data

### Test Users
- **Development:** `test-dev@jobmatch-ai.com`
- **Staging:** `test-staging@jobmatch-ai.com`
- **Production:** (use real account with consent)

### Test Jobs
Create diverse test jobs covering:
- Different industries (tech, healthcare, finance)
- Different levels (entry, mid, senior, executive)
- Different locations (remote, on-site, hybrid)
- Different skill requirements

### Test Resumes
Prepare test resumes in supported formats:
- ✅ `test-resume-good.png` - Clean, well-formatted resume
- ✅ `test-resume-complex.jpg` - Multi-column layout
- ✅ `test-resume-minimal.png` - Single page, basic format
- ❌ `test-resume.pdf` - Should show error message

## Known Limitations

1. **PDF Parsing:** Not yet supported in Cloudflare Workers
   - Workaround: Show helpful error, suggest image upload
   - Future: Implement pdfjs-serverless or client-side conversion

2. **Cache Invalidation:** Manual cache clear required if OpenAI models updated
   - Workaround: Set reasonable TTL (24 hours suggested)
   - Future: Automatic invalidation on model version change

3. **Cost Tracking:** AI Gateway analytics separate from OpenAI dashboard
   - Workaround: Compare both dashboards for complete picture
   - Future: Unified cost tracking dashboard

## Appendix: Test Commands

### Run All Tests
```bash
cd workers
npm test
```

### Run Specific Test Suites
```bash
# Unit tests only
npm test -- api/services/__tests__/openai.test.ts

# Integration tests only
npm test -- api/routes/__tests__/ai-gateway.integration.test.ts

# Watch mode for development
npm test:watch
```

### Check Test Coverage
```bash
npm test -- --coverage
```

### Run E2E Tests
```bash
# Deploy E2E worker first
cd workers/e2e-tests
wrangler deploy

# Trigger tests
curl -X POST https://e2e-tests.your-domain.workers.dev/run-tests
```

## Contact & Support

**Questions:** Open issue in GitHub repository
**Urgent Issues:** Contact DevOps team
**AI Gateway Docs:** https://developers.cloudflare.com/ai-gateway/

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-29 | 1.0 | Initial test plan | Testing Agent |
