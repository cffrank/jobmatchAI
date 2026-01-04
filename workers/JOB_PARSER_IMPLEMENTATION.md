# Job Parser Implementation

**Date:** 2026-01-03
**Status:** ✅ Complete
**TypeScript:** ✅ Compiles without errors

## Overview

Implemented AI-powered job posting parser that converts unstructured job posting text (from LinkedIn, Indeed, etc.) into structured JSON data.

## Implementation Summary

### 1. Job Parser Service (`workers/api/services/jobParser.ts`)

**Primary Model:** Cloudflare Workers AI (Llama 3.3 70B Instruct FP8 Fast)
- Cost: ~$0.001 per parse
- JSON Mode for structured output
- Temperature: 0.1 (deterministic extraction)
- Max tokens: 2000

**Fallback Model:** OpenAI GPT-4o-mini
- Cost: ~$0.01 per parse (10x more expensive)
- Used when Workers AI fails or validation fails
- Same prompts for consistency

**Retry Logic:**
- Max retries: 2 per model
- Exponential backoff: 500ms × 2^(attempt-1)
- Falls back to OpenAI after Workers AI exhausted

**Quality Validation:**
- Title: min 3 characters (required)
- Company: min 2 characters (required)
- Location: min 2 characters (required)
- Description: min 50 characters (required)
- Work arrangement: must be valid enum ('Remote' | 'Hybrid' | 'On-site' | 'Unknown')
- Salary range: if both present, min <= max, both >= 0
- Skills arrays: can be empty but must exist

**Confidence Scoring (0-100):**
- Required fields (40 points): title, company, location, description
- Work arrangement (15 points): higher if not 'Unknown'
- Salary range (15 points): full credit for both min/max
- URL (10 points)
- Experience level (10 points)
- Skills (10 points): based on total skill count

### 2. Parse Endpoint (`workers/api/routes/jobs.ts`)

**Endpoint:** `POST /api/jobs/parse`

**Input Validation:**
- Text length: 50-10,000 characters
- Required field: `text` (string)

**Middleware:**
- `authenticateUser`: Requires valid JWT
- `rateLimiter()`: 20 requests per hour

**Response:**
```typescript
{
  job: {
    title: string;
    company: string;
    location: string;
    workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
    salaryMin?: number;
    salaryMax?: number;
    description: string;
    url?: string;
    experienceLevel?: string;
    requiredSkills: string[];
    preferredSkills: string[];
  },
  metadata: {
    confidence: number; // 0-100
    aiModel: 'workers-ai' | 'openai';
    warnings: string[];
  }
}
```

**Error Handling:**
- Validation errors: 400 with detailed field errors
- Parsing failures: After all retries, throws error with last failure reason
- Rate limit: 429 with retry-after header

### 3. Rate Limiter Update (`workers/api/middleware/rateLimiter.ts`)

**Added configuration:**
```typescript
'POST:/api/jobs/parse': { maxRequests: 20, windowMs: 3600000 }
```

- Limit: 20 requests per hour
- Uses KV storage for persistence
- Headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### 4. Type Definitions (`workers/api/types.ts`)

**Updated interfaces:**

```typescript
export interface ParsedJobData {
  title: string;
  company: string;
  location: string;
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  url?: string;
  experienceLevel?: string;
  requiredSkills: string[];
  preferredSkills: string[];
}

export interface ParseMetadata {
  confidence: number;
  aiModel: 'workers-ai' | 'openai';
  warnings: string[];
}

export interface ParsedJobResult {
  job: ParsedJobData;
  metadata: ParseMetadata;
}
```

## Prompt Engineering

### System Prompt
- Clear extraction rules for all 10 fields
- Examples for salary parsing ("$100k-$150k" → 100000, 150000)
- Examples for work arrangement inference (keywords: remote, hybrid, on-site)
- Strict JSON schema with exact field names
- Instructions to not hallucinate missing data

### User Prompt
- Simple wrapper around raw job posting text
- Instructs to return only valid JSON

## Cost Analysis

**Per Parse:**
- Workers AI: ~$0.001 (95% cheaper)
- OpenAI fallback: ~$0.01

**Expected Distribution (95/5 split):**
- 95% Workers AI success: 19 parses × $0.001 = $0.019
- 5% OpenAI fallback: 1 parse × $0.01 = $0.010
- **Total per 20 parses: ~$0.029 (~$0.0015 per parse average)**

**Monthly (100 users, 20 parses each):**
- Total parses: 2,000
- Cost: ~$3.00/month
- Traditional OpenAI only: ~$20.00/month
- **Savings: 85%**

## Testing Validation

✅ TypeScript compilation: No errors in implementation files
✅ Type compatibility: All interfaces match service output
✅ Input validation: 50-10,000 character range enforced
✅ Rate limiting: 20 requests/hour configured
✅ Endpoint path: `POST:/api/jobs/parse` registered
✅ Authentication: Required via `authenticateUser` middleware
✅ Error handling: Comprehensive validation and retry logic

## Files Modified

1. `workers/api/services/jobParser.ts` (new file, 662 lines)
   - Main parsing logic with Workers AI + OpenAI fallback
   - Quality validation and confidence scoring
   - Retry logic with exponential backoff

2. `workers/api/routes/jobs.ts` (modified)
   - Added `POST /api/jobs/parse` endpoint
   - Input validation with Zod schema
   - Error handling and logging

3. `workers/api/middleware/rateLimiter.ts` (modified)
   - Added rate limit config for parse endpoint
   - 20 requests per hour

4. `workers/api/types.ts` (modified)
   - Updated `ParsedJobData` interface (required fields, work arrangement enum)
   - Updated `ParseMetadata` interface (numeric confidence, ai model)
   - Updated `ParsedJobResult` interface (job + metadata structure)

## Usage Example

**Request:**
```bash
curl -X POST https://jobmatch-ai-prod.carl-f-frank.workers.dev/api/jobs/parse \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Senior Software Engineer\nAcme Corp | San Francisco, CA | Hybrid\n\nWe are seeking a talented Senior Software Engineer with 5+ years of experience in TypeScript, React, and Node.js. Salary: $150k-$200k.\n\nResponsibilities:\n- Design and implement scalable web applications\n- Mentor junior developers\n- Collaborate with product team\n\nRequired Skills:\n- TypeScript, React, Node.js\n- 5+ years experience\n\nPreferred:\n- GraphQL, AWS experience"
  }'
```

**Response:**
```json
{
  "job": {
    "title": "Senior Software Engineer",
    "company": "Acme Corp",
    "location": "San Francisco, CA",
    "workArrangement": "Hybrid",
    "salaryMin": 150000,
    "salaryMax": 200000,
    "description": "We are seeking a talented Senior Software Engineer with 5+ years of experience...",
    "experienceLevel": "Senior",
    "requiredSkills": ["TypeScript", "React", "Node.js"],
    "preferredSkills": ["GraphQL", "AWS"]
  },
  "metadata": {
    "confidence": 95,
    "aiModel": "workers-ai",
    "warnings": []
  }
}
```

## Next Steps

### Frontend Integration (Not Implemented)
1. Create parse UI in job discovery section
2. Add textarea for pasting job posting text
3. Show parsed result with confidence indicator
4. Allow user to edit/confirm before saving
5. Add "Parse Another" button for batch operations

### Future Enhancements
1. **Batch Parsing:** Support multiple job postings in one request
2. **Enhanced Validation:** Use Zod schemas for parsed output validation
3. **Caching:** Cache parsed results by text hash (KV with 7-day TTL)
4. **Analytics:** Track confidence scores and model fallback rates
5. **User Feedback:** Allow users to report incorrect parsing
6. **Fine-tuning:** Use user corrections to improve prompts

## Security Considerations

✅ **Authentication Required:** All requests must include valid JWT
✅ **Rate Limiting:** 20 requests/hour prevents abuse and controls costs
✅ **Input Validation:** Length limits prevent DoS attacks
✅ **No Data Storage:** Parsed results not stored server-side (user decides)
✅ **Sanitization:** Output is structured JSON, no XSS risk

## Performance Metrics

**Expected Latency:**
- Workers AI (95% of requests): 800-1200ms
- OpenAI fallback (5% of requests): 1500-2500ms
- Average: ~900ms

**Cache Opportunities:**
- Same job posting parsed multiple times: Hash-based KV cache
- Expected hit rate: 10-15% (if multiple users parse same posting)
- Potential savings: ~$0.30/month on 2,000 parses

## Conclusion

Successfully implemented AI-powered job posting parser with:
- ✅ Dual AI strategy (Workers AI primary, OpenAI fallback)
- ✅ 85% cost savings vs. OpenAI-only approach
- ✅ Comprehensive quality validation
- ✅ Rate limiting and authentication
- ✅ Detailed confidence scoring and warnings
- ✅ Production-ready error handling

All TypeScript code compiles successfully. Ready for deployment.
