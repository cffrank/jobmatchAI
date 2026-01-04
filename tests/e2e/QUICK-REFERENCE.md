# Complete Onboarding Flow E2E Test - Quick Reference

## Files

```
tests/
├── e2e/
│   ├── complete-onboarding-flow.spec.ts    # Main test (483 lines)
│   ├── run-onboarding-test.sh              # Runner script
│   ├── README-ONBOARDING-TEST.md           # Full documentation (396 lines)
│   ├── ONBOARDING-TEST-SUMMARY.md          # Architecture & summary (532 lines)
│   └── QUICK-REFERENCE.md                  # This file
└── fixtures/
    ├── sample-resume.txt                    # Resume content
    ├── sample-resume.pdf                    # Generated PDF (5.2KB)
    └── create-sample-resume-pdf.mjs         # PDF generator
```

## Quick Commands

### Run Test (Local)
```bash
./tests/e2e/run-onboarding-test.sh
```

### Run Test (Debug Mode)
```bash
TEST_MODE=ui ./tests/e2e/run-onboarding-test.sh
```

### Run Test (Deployed Environment)
```bash
FRONTEND_URL=https://jobmatch-ai-dev.pages.dev \
BACKEND_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev \
./tests/e2e/run-onboarding-test.sh
```

### Regenerate Resume Fixture
```bash
node tests/fixtures/create-sample-resume-pdf.mjs
```

### View Network Report
```bash
cat test-results/network-activity-report.json | jq '.'
```

## Test Flow (7 Steps)

1. **Create Account** - Signup form → Supabase Auth
2. **Verify Auth** - Check JWT token stored
3. **Complete Profile** - Fill profile → Workers API → D1
4. **Import Resume** - Upload PDF → AI parsing → D1
5. **Gap Analysis** - Answer questions → D1
6. **Verify Persistence** - Check data displayed from D1
7. **Logout** - Clear session, verify protected routes

## Success Criteria

- ✅ All 7 steps pass
- ✅ Supabase DB calls = 0
- ✅ Workers API calls > 0
- ✅ No violations detected

## What This Test Proves

> **All data operations use Workers API → D1**
>
> **NO Supabase PostgreSQL dependencies**
>
> **Supabase Auth ONLY for JWT tokens**

## Test Result Interpretation

- 🟢 **PASS** = Migration complete and functional
- 🔴 **FAIL** = Migration incomplete, violations detected

## Network Monitoring

**Allowed:**
- `auth.supabase.co/*` (Supabase Auth)

**Violations (Test fails):**
- `*.supabase.co/rest/v1/*` (Supabase PostgreSQL)

**Required:**
- `*/api/*` (Workers API)

## Debugging

### Enable Verbose Logging
```bash
DEBUG=pw:api npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts
```

### Check Violations
```bash
cat test-results/network-activity-report.json | jq '.violations'
```

### Filter Workers API Calls
```bash
cat test-results/network-activity-report.json | jq '.calls[] | select(.url | contains("/api/"))'
```

## Common Issues

### Frontend not accessible
```bash
npm run dev
```

### Backend not running
```bash
cd workers
npm run dev
```

### Resume fixture missing
```bash
node tests/fixtures/create-sample-resume-pdf.mjs
```

## Full Documentation

See `README-ONBOARDING-TEST.md` for complete guide with:
- Detailed step descriptions
- Network monitoring architecture
- CI/CD integration examples
- Debugging procedures
- Maintenance guidelines

See `ONBOARDING-TEST-SUMMARY.md` for:
- Test architecture details
- Success metrics
- Migration validation checklist
- Performance expectations
