# Job Posting Parser - Implementation Summary

## Quick Overview

**Goal:** Allow users to paste job postings from LinkedIn/Indeed and automatically extract structured data using AI.

**Solution:** Cloudflare Workers AI (Llama 3.3 70B) with JSON Mode for structured extraction.

## Recommended Approach

### Model Selection

**Primary:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

**Why?**
- 70B parameters = better extraction quality than 8B models
- FP8 quantization = fast inference (~1-2 seconds)
- JSON Mode support = guaranteed valid JSON output
- Already used in codebase for resume parsing
- Cost: ~$0.001-0.002 per parse (95% cheaper than GPT-4)

**Fallbacks:**
1. `@cf/meta/llama-3.1-8b-instruct` (faster, less accurate)
2. `@cf/meta/llama-3.1-8b-instruct-fast` (fastest, lowest accuracy)

### API Design

**Endpoint:** `POST /api/jobs/parse`

**Request:**
```json
{
  "text": "IT Systems Engineer\nClarity Technology Group...",
  "url": "https://linkedin.com/jobs/view/123" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "job": {
    "title": "IT Systems Engineer",
    "company": "Clarity Technology Group, Inc.",
    "location": "Madison, WI",
    "workArrangement": "On-site",
    "salaryMin": null,
    "salaryMax": null,
    "description": "Full description...",
    "requiredSkills": ["Active Directory", "Windows Server"],
    "preferredSkills": ["PowerShell", "Azure"],
    "experienceLevel": "Mid-Level",
    "postedDate": "2025-01-02"
  },
  "confidence": 0.92,
  "warnings": ["Salary information not found"]
}
```

### JSON Schema for Structured Output

Workers AI supports JSON Mode with schema validation:

```typescript
const schema = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    company: { type: 'string' },
    location: { type: 'string' },
    workArrangement: {
      type: 'string',
      enum: ['Remote', 'Hybrid', 'On-site', 'Unknown']
    },
    salaryMin: { type: ['number', 'null'] },
    salaryMax: { type: ['number', 'null'] },
    description: { type: 'string' },
    requiredSkills: { type: 'array', items: { type: 'string' } },
    preferredSkills: { type: 'array', items: { type: 'string' } },
    experienceLevel: { type: ['string', 'null'] },
    postedDate: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 }
  },
  required: ['title', 'company', 'location', 'description']
};
```

### Prompt Strategy

**System Prompt:**
- Define role: "You are an expert data extraction system"
- Explicit extraction rules for each field
- Confidence scoring guidance (0.0-1.0)
- Common patterns to watch for (salary formats, work arrangements)
- Critical instruction: "Don't invent data, use null for missing fields"

**User Prompt:**
- Simple: "Extract structured job information from the following text: [job_text]"

**Configuration:**
- Temperature: 0.1 (very low for deterministic extraction)
- Max tokens: 2000 (sufficient for job data)
- JSON Mode: Enabled with schema

## Error Handling Strategy

### Retry Logic
1. Try primary model (Llama 3.3 70B) with 2 retries
2. If fails, try fallback #1 (Llama 3.1 8B) with 2 retries
3. If fails, try fallback #2 (Llama 3.1 8B-fast) with 2 retries
4. Return error if all models fail

### Validation Layers
1. **Schema validation:** JSON Mode enforces structure
2. **Business logic:** Check required fields exist and are non-empty
3. **Confidence threshold:** Reject if AI confidence < 0.5
4. **Salary validation:** Min can't exceed max
5. **User warnings:** Alert if optional fields missing (salary, posted date)

### Edge Cases Handled

| Case | Solution |
|------|----------|
| Text too short (< 10 chars) | Validation error before AI call |
| Text too long (> 20k chars) | Validation error before AI call |
| Empty AI response | Retry with same model |
| Low confidence (< 0.5) | Try next model in fallback chain |
| Missing required fields | Fail validation, try next model |
| Invalid JSON | Catch parse error, retry |
| All models fail | Return user-friendly error message |

## Cost & Performance

**Parsing Cost:**
- Llama 3.3 70B: ~100-200 neurons = ~$0.001-0.002 per parse
- Free tier: 10,000 neurons/day = 50-100 free parses/day
- Monthly cost (1,000 users, 10 parses each): ~$10-20/month

**Time:**
- Average: 1-2 seconds per parse
- 95th percentile: ~3 seconds
- Timeout: 10 seconds (triggers retry)

**Compare to manual entry:**
- Manual: 2-3 minutes per job
- AI: 1-2 seconds
- Time saved: **98%+ reduction**

## Implementation Files

1. **Service:** `workers/api/services/jobParser.ts` (500 lines)
   - Main parsing logic with retry/fallback
   - Validation functions
   - Prompt builders

2. **API Route:** Add to `workers/api/routes/jobs.ts`
   - POST /api/jobs/parse endpoint
   - Zod validation
   - Rate limiting

3. **Frontend:** `src/sections/job-discovery-matching/components/JobPasteDialog.tsx`
   - Dialog component for pasting job text
   - Loading states, error handling
   - Success feedback with warnings

4. **Tests:**
   - Unit: `workers/api/services/jobParser.test.ts`
   - Integration: `workers/api/routes/jobs.test.ts`
   - E2E: `tests/e2e/job-paste.spec.ts`

## Key Features

1. **Multi-model fallback:** Tries 3 models before giving up
2. **Quality validation:** Rejects low-confidence results
3. **User warnings:** Alerts user to missing optional fields
4. **Confidence scoring:** AI self-evaluates extraction quality
5. **Comprehensive error handling:** Graceful degradation
6. **Rate limiting:** Prevents abuse (20 parses/minute)
7. **Structured logging:** Full analytics and debugging support

## Monitoring

**Key Metrics:**
- Success rate (target: > 95%)
- Average confidence (target: > 0.8)
- Parsing time (target: < 2s median)
- Model distribution (70B vs. fallbacks)

**Alerts:**
- Success rate < 90%
- Average duration > 5s
- Average confidence < 0.7

## Next Steps

1. Review full implementation guide: `workers/docs/JOB_POSTING_PARSER_IMPLEMENTATION.md`
2. Implement service: `workers/api/services/jobParser.ts`
3. Add API route to `workers/api/routes/jobs.ts`
4. Create frontend component
5. Write tests
6. Deploy to staging
7. Test with real job postings from LinkedIn/Indeed
8. Monitor metrics for 1 week
9. Deploy to production

## Sources

Implementation based on official Cloudflare documentation:

- [JSON Mode - Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Workers AI Structured JSON Outputs](https://developers.cloudflare.com/changelog/2025-02-25-json-mode/)
- [Meta Llama 3.1 on Workers AI](https://blog.cloudflare.com/meta-llama-3-1-available-on-workers-ai/)
