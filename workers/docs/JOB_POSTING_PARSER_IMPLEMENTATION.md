# Job Posting Parser Implementation Guide

## Overview

This guide provides a comprehensive implementation for parsing unstructured job posting text into structured JSON using Cloudflare Workers AI.

**Use Case:** Users can copy/paste job postings from LinkedIn, Indeed, or any website, and the AI will extract structured data automatically.

## Recommended Model

**Primary Model:** `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

**Why this model?**
- **70B parameters:** More capable than 8B models for complex extraction tasks
- **FP8 quantization:** Fast inference (~1-2s response time)
- **JSON Mode support:** Native structured output with schema validation
- **Already in use:** Currently used for resume parsing in the codebase
- **Cost-effective:** Free tier includes 10,000 neurons/day

**Fallback Models:**
1. `@cf/meta/llama-3.1-8b-instruct` - Faster but less accurate for complex extraction
2. `@cf/meta/llama-3.1-8b-instruct-fast` - Even faster variant

## Architecture

### New Endpoint

```
POST /api/jobs/parse
```

**Request Body:**
```json
{
  "text": "IT Systems Engineer\nClarity Technology Group, Inc.\nMadison, WI...",
  "url": "https://linkedin.com/jobs/view/..." // Optional
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
    "description": "Full description text...",
    "requiredSkills": ["Active Directory", "Windows Server", "Azure"],
    "preferredSkills": ["PowerShell", "Networking"],
    "experienceLevel": "Mid-Level",
    "postedDate": "2025-01-02",
    "source": "manual"
  },
  "confidence": 0.95, // AI confidence score
  "warnings": [] // Any fields that couldn't be extracted
}
```

## Implementation

### Step 1: Create Service (`workers/api/services/jobParser.ts`)

```typescript
/**
 * Job Posting Parser Service
 *
 * Uses Cloudflare Workers AI (Llama 3.3 70B) to extract structured data
 * from unstructured job posting text.
 *
 * Supports JSON Mode with schema validation for reliable extraction.
 */

import type { Env } from '../types';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Workers AI model for job posting parsing
 * Llama 3.3 70B with fp8 quantization for fast inference
 */
export const JOB_PARSER_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/**
 * Alternative models for fallback (ordered by preference)
 */
export const FALLBACK_MODELS = [
  '@cf/meta/llama-3.1-8b-instruct', // Smaller but faster
  '@cf/meta/llama-3.1-8b-instruct-fast', // Even faster variant
] as const;

/**
 * Generation config for job parsing
 */
export const PARSING_CONFIG = {
  TEMPERATURE: 0.1, // Very low for deterministic extraction
  MAX_TOKENS: 2000, // Sufficient for job data extraction
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
} as const;

// =============================================================================
// Types
// =============================================================================

interface WorkersAIResponse {
  response: string;
}

export interface ParseJobRequest {
  text: string; // Unstructured job posting text
  url?: string; // Optional source URL
}

export interface ParsedJobData {
  title: string;
  company: string;
  location: string;
  workArrangement: 'Remote' | 'Hybrid' | 'On-site' | 'Unknown';
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceLevel?: string;
  postedDate?: string; // ISO 8601 date string
}

export interface ParseJobResponse {
  success: boolean;
  job?: ParsedJobData;
  confidence?: number; // 0-1 confidence score
  warnings?: string[]; // Fields that couldn't be extracted
  error?: string;
}

// =============================================================================
// JSON Schema for Structured Output
// =============================================================================

/**
 * JSON Schema for job posting extraction
 * Workers AI will validate the response against this schema
 */
const JOB_PARSING_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Job title (e.g., "Senior Software Engineer")',
    },
    company: {
      type: 'string',
      description: 'Company name',
    },
    location: {
      type: 'string',
      description: 'Job location (city, state/country)',
    },
    workArrangement: {
      type: 'string',
      enum: ['Remote', 'Hybrid', 'On-site', 'Unknown'],
      description: 'Work arrangement type',
    },
    salaryMin: {
      type: ['number', 'null'],
      description: 'Minimum salary (annual, in USD)',
    },
    salaryMax: {
      type: ['number', 'null'],
      description: 'Maximum salary (annual, in USD)',
    },
    description: {
      type: 'string',
      description: 'Full job description text',
    },
    requiredSkills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Required skills, technologies, or qualifications',
    },
    preferredSkills: {
      type: 'array',
      items: { type: 'string' },
      description: 'Preferred/nice-to-have skills',
    },
    experienceLevel: {
      type: ['string', 'null'],
      description: 'Experience level (e.g., "Entry Level", "Mid-Level", "Senior")',
    },
    postedDate: {
      type: ['string', 'null'],
      description: 'Date posted (ISO 8601 format: YYYY-MM-DD)',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score from 0-1 for extraction quality',
      minimum: 0,
      maximum: 1,
    },
  },
  required: [
    'title',
    'company',
    'location',
    'workArrangement',
    'description',
    'requiredSkills',
    'preferredSkills',
    'confidence',
  ],
} as const;

// =============================================================================
// Main Parsing Function
// =============================================================================

/**
 * Parse unstructured job posting text into structured data
 *
 * Uses Llama 3.3 70B with JSON Mode for reliable extraction.
 * Implements retry logic and fallback to smaller models if needed.
 *
 * @param env - Environment bindings (includes AI binding)
 * @param request - Parsing request with job text
 * @returns Parsed job data with confidence score
 */
export async function parseJobPosting(
  env: Env,
  request: ParseJobRequest
): Promise<ParseJobResponse> {
  const startTime = Date.now();

  console.log('[JobParser] Starting job posting parsing');
  console.log(`[JobParser] Input text length: ${request.text.length} characters`);

  // Validate input
  if (!request.text || request.text.trim().length === 0) {
    return {
      success: false,
      error: 'Job posting text is required',
    };
  }

  if (request.text.length > 20000) {
    return {
      success: false,
      error: 'Job posting text is too long (max 20,000 characters)',
    };
  }

  // Build prompt
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(request.text);

  let lastError: Error | null = null;

  // Try primary model first, then fallback models
  const modelsToTry = [JOB_PARSER_MODEL, ...FALLBACK_MODELS];

  for (const model of modelsToTry) {
    // Retry loop for transient failures
    for (let attempt = 1; attempt <= PARSING_CONFIG.MAX_RETRIES; attempt++) {
      const attemptStartTime = Date.now();

      try {
        console.log(`[JobParser] Attempting parse with ${model} (attempt ${attempt}/${PARSING_CONFIG.MAX_RETRIES})`);

        // Call Workers AI with JSON Mode
        const response = await env.AI.run(model, {
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: PARSING_CONFIG.TEMPERATURE,
          max_tokens: PARSING_CONFIG.MAX_TOKENS,
          // JSON Mode for structured output
          response_format: {
            type: 'json_schema',
            json_schema: JOB_PARSING_SCHEMA,
          },
        }) as WorkersAIResponse;

        const attemptDuration = Date.now() - attemptStartTime;

        // Extract and parse response
        if (!response || !response.response) {
          console.log(JSON.stringify({
            event: 'job_parser_attempt_failed',
            model,
            attempt,
            error: 'Empty response from Workers AI',
            duration_ms: attemptDuration,
            timestamp: new Date().toISOString(),
          }));

          throw new Error('Empty response from Workers AI');
        }

        const parsed = JSON.parse(response.response) as ParsedJobData & { confidence: number };

        // Validate response quality
        const validationResult = validateParsedData(parsed);
        if (!validationResult.isValid) {
          console.warn(`[JobParser] Validation failed with ${model}: ${validationResult.reason}`);

          console.log(JSON.stringify({
            event: 'job_parser_validation_failed',
            model,
            attempt,
            validation_failure: validationResult.reason,
            duration_ms: attemptDuration,
            timestamp: new Date().toISOString(),
          }));

          lastError = new Error(`Validation failed: ${validationResult.reason}`);
          break; // Try next model
        }

        const totalDuration = Date.now() - startTime;
        console.log(`[JobParser] Successfully parsed job posting with ${model} in ${totalDuration}ms`);

        // Extract warnings for missing optional fields
        const warnings: string[] = [];
        if (!parsed.salaryMin && !parsed.salaryMax) {
          warnings.push('Salary information not found');
        }
        if (!parsed.experienceLevel) {
          warnings.push('Experience level not specified');
        }
        if (!parsed.postedDate) {
          warnings.push('Posted date not found');
        }

        // Log success
        console.log(JSON.stringify({
          event: 'job_parser_success',
          model,
          attempt,
          duration_ms: totalDuration,
          confidence: parsed.confidence,
          warnings_count: warnings.length,
          timestamp: new Date().toISOString(),
        }));

        // Return parsed data (remove internal confidence field)
        const { confidence, ...jobData } = parsed;

        return {
          success: true,
          job: jobData,
          confidence,
          warnings: warnings.length > 0 ? warnings : undefined,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const attemptDuration = Date.now() - attemptStartTime;

        console.error(
          `[JobParser] Attempt ${attempt}/${PARSING_CONFIG.MAX_RETRIES} failed with ${model}:`,
          lastError.message
        );

        console.log(JSON.stringify({
          event: 'job_parser_attempt_failed',
          model,
          attempt,
          error: lastError.message,
          duration_ms: attemptDuration,
          will_retry: attempt < PARSING_CONFIG.MAX_RETRIES,
          timestamp: new Date().toISOString(),
        }));

        // Retry with delay
        if (attempt < PARSING_CONFIG.MAX_RETRIES) {
          const delayMs = PARSING_CONFIG.RETRY_DELAY_MS * attempt;
          console.log(`[JobParser] Retrying in ${delayMs}ms...`);
          await sleep(delayMs);
        }
      }
    }

    console.log(`[JobParser] All attempts failed with ${model}, trying next model...`);
  }

  // All models exhausted
  const totalDuration = Date.now() - startTime;
  console.error(
    `[JobParser] Failed to parse job posting after trying ${modelsToTry.length} models (${totalDuration}ms total)`
  );

  console.log(JSON.stringify({
    event: 'job_parser_complete_failure',
    models_tried: modelsToTry.length,
    duration_ms: totalDuration,
    last_error: lastError?.message,
    timestamp: new Date().toISOString(),
  }));

  return {
    success: false,
    error: lastError?.message || 'Failed to parse job posting',
  };
}

// =============================================================================
// Validation
// =============================================================================

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

/**
 * Validate parsed job data quality
 *
 * Ensures the extraction meets minimum quality standards.
 */
function validateParsedData(data: ParsedJobData & { confidence: number }): ValidationResult {
  // Check required fields are present and non-empty
  if (!data.title || data.title.trim().length === 0) {
    return { isValid: false, reason: 'Missing or empty job title' };
  }

  if (!data.company || data.company.trim().length === 0) {
    return { isValid: false, reason: 'Missing or empty company name' };
  }

  if (!data.location || data.location.trim().length === 0) {
    return { isValid: false, reason: 'Missing or empty location' };
  }

  if (!data.description || data.description.trim().length < 50) {
    return { isValid: false, reason: 'Description too short or missing' };
  }

  // Validate work arrangement enum
  const validArrangements = ['Remote', 'Hybrid', 'On-site', 'Unknown'];
  if (!validArrangements.includes(data.workArrangement)) {
    return { isValid: false, reason: 'Invalid work arrangement' };
  }

  // Check arrays exist (can be empty)
  if (!Array.isArray(data.requiredSkills)) {
    return { isValid: false, reason: 'requiredSkills must be an array' };
  }

  if (!Array.isArray(data.preferredSkills)) {
    return { isValid: false, reason: 'preferredSkills must be an array' };
  }

  // Validate confidence score
  if (typeof data.confidence !== 'number' || data.confidence < 0 || data.confidence > 1) {
    return { isValid: false, reason: 'Invalid confidence score' };
  }

  // Warn if confidence is very low
  if (data.confidence < 0.5) {
    return { isValid: false, reason: `Low confidence score: ${data.confidence}` };
  }

  // Validate salary range if present
  if (data.salaryMin !== undefined && data.salaryMin !== null) {
    if (typeof data.salaryMin !== 'number' || data.salaryMin < 0) {
      return { isValid: false, reason: 'Invalid salary minimum' };
    }
  }

  if (data.salaryMax !== undefined && data.salaryMax !== null) {
    if (typeof data.salaryMax !== 'number' || data.salaryMax < 0) {
      return { isValid: false, reason: 'Invalid salary maximum' };
    }
  }

  if (data.salaryMin && data.salaryMax && data.salaryMin > data.salaryMax) {
    return { isValid: false, reason: 'Salary min cannot exceed salary max' };
  }

  // All checks passed
  return { isValid: true };
}

// =============================================================================
// Prompt Builders
// =============================================================================

/**
 * Build system prompt for job posting extraction
 */
function buildSystemPrompt(): string {
  return `You are an expert data extraction system specializing in parsing job postings. Your task is to extract structured information from unstructured job posting text.

EXTRACTION RULES:

1. **Job Title**: Extract the exact job title as written
2. **Company**: Extract the company/organization name
3. **Location**: Extract city and state/country (e.g., "Madison, WI", "Remote", "New York, NY")
4. **Work Arrangement**: Classify as Remote, Hybrid, On-site, or Unknown
   - Remote: Can work from anywhere
   - Hybrid: Mix of remote and office
   - On-site: Must work in office
   - Unknown: Not specified
5. **Salary**: Extract salary range if mentioned
   - Convert to annual USD amounts
   - Extract both min and max if range given
   - Set to null if not mentioned
6. **Description**: Extract the full job description
   - Include responsibilities, requirements, benefits
   - Preserve formatting where reasonable
   - Remove duplicated sections
7. **Required Skills**: Extract technical skills, tools, technologies that are required
   - Include years of experience if specified (e.g., "5+ years Python")
   - Separate from nice-to-have skills
8. **Preferred Skills**: Extract nice-to-have or bonus skills
   - Skills mentioned as "preferred", "nice to have", "bonus"
9. **Experience Level**: Classify as Entry Level, Mid-Level, Senior, Lead, or null
   - Based on years of experience or title keywords
10. **Posted Date**: Extract date if mentioned (format as YYYY-MM-DD)
11. **Confidence Score**: Rate your confidence in the extraction (0.0 to 1.0)
    - 0.9-1.0: All key fields extracted with high confidence
    - 0.7-0.9: Most fields extracted, some ambiguity
    - 0.5-0.7: Several fields missing or ambiguous
    - Below 0.5: Poor quality or insufficient information

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON matching the schema
- Be conservative with confidence scores
- Use null for optional fields that aren't found
- Preserve original text quality in description
- Don't invent information - extract only what's present
- If a field is truly ambiguous, mark confidence lower

COMMON PATTERNS TO WATCH FOR:
- Salary formats: "$80K-$100K", "$80,000 - $100,000/year", "80-100k"
- Work arrangement keywords: "fully remote", "work from home", "hybrid schedule", "in-office"
- Experience indicators: "3+ years", "Senior", "Junior", "Lead"
- Skills in bullet points, parentheses, or inline text`;
}

/**
 * Build user prompt with job posting text
 */
function buildUserPrompt(jobText: string): string {
  return `Extract structured job information from the following job posting text.

JOB POSTING TEXT:
${jobText}

Return the extracted data as JSON matching the schema.`;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
```

### Step 2: Add API Route (`workers/api/routes/jobs.ts`)

Add this endpoint to the existing jobs router:

```typescript
import { parseJobPosting } from '../services/jobParser';

// Add validation schema at top with other schemas
const parseJobSchema = z.object({
  text: z.string().min(10, 'Job posting text is too short').max(20000, 'Job posting text is too long'),
  url: z.string().url().optional(),
});

// Add this route with other job routes
/**
 * POST /api/jobs/parse
 * Parse unstructured job posting text into structured data
 */
app.post('/parse', authenticateUser, rateLimiter('ai_generation'), async (c) => {
  const userId = getUserId(c);

  // Parse and validate request body
  const body = await c.req.json();
  const parseResult = parseJobSchema.safeParse(body);

  if (!parseResult.success) {
    throw createValidationError(parseResult.error.errors);
  }

  const { text, url } = parseResult.data;

  console.log(`[Jobs] User ${userId} parsing job posting (${text.length} characters)`);

  // Call AI parser
  const result = await parseJobPosting(c.env, { text, url });

  if (!result.success) {
    console.error(`[Jobs] Failed to parse job posting: ${result.error}`);
    return c.json(
      {
        error: result.error || 'Failed to parse job posting',
        message: 'Unable to extract structured data from the job posting. Please try manual entry.',
      },
      400
    );
  }

  // Success - return parsed job data
  console.log(`[Jobs] Successfully parsed job posting: ${result.job!.title} at ${result.job!.company}`);
  console.log(`[Jobs] Confidence: ${result.confidence}, Warnings: ${result.warnings?.length || 0}`);

  return c.json({
    success: true,
    job: result.job,
    confidence: result.confidence,
    warnings: result.warnings,
  });
});
```

### Step 3: Frontend Integration

Create a new component for the job paste feature:

```typescript
// src/sections/job-discovery-matching/components/JobPasteDialog.tsx

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface JobPasteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJobParsed: (job: ParsedJob) => void;
}

interface ParsedJob {
  title: string;
  company: string;
  location: string;
  workArrangement: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  // ... other fields
}

interface ParseResponse {
  success: boolean;
  job?: ParsedJob;
  confidence?: number;
  warnings?: string[];
  error?: string;
}

export function JobPasteDialog({ open, onOpenChange, onJobParsed }: JobPasteDialogProps) {
  const [jobText, setJobText] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResponse | null>(null);

  const handleParse = async () => {
    if (!jobText.trim()) return;

    setIsParsing(true);
    setParseResult(null);

    try {
      const response = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('jobmatch-auth-token')}`,
        },
        body: JSON.stringify({
          text: jobText,
          url: jobUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setParseResult({
          success: false,
          error: data.message || 'Failed to parse job posting',
        });
        return;
      }

      setParseResult(data);

      // If successful, pass to parent
      if (data.success && data.job) {
        onJobParsed(data.job);
        // Reset form
        setJobText('');
        setJobUrl('');
        setParseResult(null);
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Error parsing job:', error);
      setParseResult({
        success: false,
        error: 'Network error - please try again',
      });
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paste Job Posting</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Job Posting Text</label>
            <Textarea
              value={jobText}
              onChange={(e) => setJobText(e.target.value)}
              placeholder="Paste the full job posting here..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {jobText.length.toLocaleString()} / 20,000 characters
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Job URL (Optional)</label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/..."
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          {parseResult && (
            <Alert variant={parseResult.success ? 'default' : 'destructive'}>
              {parseResult.success ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {parseResult.success ? (
                  <div>
                    <p className="font-medium">Job parsed successfully!</p>
                    {parseResult.confidence && (
                      <p className="text-sm">
                        Confidence: {(parseResult.confidence * 100).toFixed(0)}%
                      </p>
                    )}
                    {parseResult.warnings && parseResult.warnings.length > 0 && (
                      <ul className="text-sm mt-2 space-y-1">
                        {parseResult.warnings.map((warning, i) => (
                          <li key={i}>• {warning}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <p>{parseResult.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isParsing}
            >
              Cancel
            </Button>
            <Button onClick={handleParse} disabled={!jobText.trim() || isParsing}>
              {isParsing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isParsing ? 'Parsing...' : 'Parse Job Posting'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

## Prompt Engineering Strategy

### System Prompt Design

**Key principles:**
1. **Clear role definition:** "You are an expert data extraction system"
2. **Explicit extraction rules:** Numbered list with specific instructions
3. **Common patterns:** Examples of salary formats, work arrangement keywords
4. **Confidence guidance:** When to score high vs. low confidence
5. **Error handling:** "Use null for missing fields, don't invent data"

### User Prompt Design

**Simple and direct:**
- Single instruction: "Extract structured job information from..."
- Raw job text
- No additional formatting needed

### Why This Works

1. **JSON Mode with Schema:** Guarantees valid JSON structure
2. **Low temperature (0.1):** Deterministic extraction, minimal hallucination
3. **Large model (70B):** Better at complex extraction than 8B models
4. **Confidence scoring:** AI self-evaluates quality, allows filtering low-quality results

## Error Handling Strategy

### Retry Logic

1. **Model-level retries:** Try each model 2 times before moving to next
2. **Fallback chain:** 70B → 8B → 8B-fast
3. **Exponential backoff:** 1s, 2s between retries

### Validation Layers

1. **Schema validation:** JSON Mode enforces structure
2. **Business logic validation:** Check required fields, validate enums
3. **Confidence threshold:** Reject if confidence < 0.5
4. **User warnings:** Alert user to missing optional fields

### Edge Cases

| Scenario | Handling |
|----------|----------|
| Text too short (< 10 chars) | Reject with validation error |
| Text too long (> 20k chars) | Reject with validation error |
| Empty response from AI | Retry with same model |
| Low confidence (< 0.5) | Reject, try next model |
| Missing required fields | Fail validation, try next model |
| Invalid JSON | Catch parse error, retry |
| Network timeout | Retry with exponential backoff |
| Model unavailable | Try fallback model |

## Cost Analysis

**Workers AI Pricing:**
- Free tier: 10,000 neurons/day
- Paid tier: $0.011 per 1,000 neurons

**Per-request cost:**
- Llama 3.3 70B: ~100-200 neurons (~$0.001-0.002)
- Llama 3.1 8B: ~20-40 neurons (~$0.0002-0.0004)

**Expected usage:**
- Average user: 5-10 job parsings per day
- Cost per user/month: ~$0.03-0.06
- 1,000 active users: ~$30-60/month

**Compare to manual entry:**
- Manual entry: 2-3 minutes per job
- AI parsing: 1-2 seconds
- Time saved: 98%+ reduction

## Testing Strategy

### Unit Tests

Test the parser service with various job posting formats:

```typescript
// workers/api/services/jobParser.test.ts

describe('Job Posting Parser', () => {
  it('should parse LinkedIn job posting', async () => {
    const text = `IT Systems Engineer
Clarity Technology Group, Inc.
Madison, WI
Full-time, On-site
...`;

    const result = await parseJobPosting(mockEnv, { text });

    expect(result.success).toBe(true);
    expect(result.job?.title).toBe('IT Systems Engineer');
    expect(result.job?.company).toBe('Clarity Technology Group, Inc.');
  });

  it('should handle salary ranges', async () => {
    const text = `Senior Developer
Tech Corp
Remote
$120,000 - $150,000/year
...`;

    const result = await parseJobPosting(mockEnv, { text });

    expect(result.job?.salaryMin).toBe(120000);
    expect(result.job?.salaryMax).toBe(150000);
  });

  it('should reject malformed input', async () => {
    const result = await parseJobPosting(mockEnv, { text: 'abc' });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### Integration Tests

Test the full API endpoint with real requests:

```typescript
// Test in workers/api/routes/jobs.test.ts

describe('POST /api/jobs/parse', () => {
  it('should parse job posting and return structured data', async () => {
    const response = await app.request('/api/jobs/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        text: sampleJobPosting,
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.job).toBeDefined();
    expect(data.confidence).toBeGreaterThan(0.5);
  });

  it('should require authentication', async () => {
    const response = await app.request('/api/jobs/parse', {
      method: 'POST',
      body: JSON.stringify({ text: 'test' }),
    });

    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

Test the user workflow:

```typescript
// tests/e2e/job-paste.spec.ts

test('user can paste and parse job posting', async ({ page }) => {
  await page.goto('/jobs');

  await page.click('text=Add Job');
  await page.click('text=Paste Job Posting');

  await page.fill('textarea', sampleJobPosting);
  await page.click('button:has-text("Parse Job Posting")');

  await page.waitForSelector('text=Job parsed successfully!');

  // Verify fields are populated
  await expect(page.locator('input[name="title"]')).toHaveValue('IT Systems Engineer');
  await expect(page.locator('input[name="company"]')).toHaveValue('Clarity Technology Group');
});
```

## Performance Optimization

### Caching Strategy

**Not recommended for parsing** because:
- Each job posting is unique (no cache hits)
- Parsing is already fast (1-2 seconds)
- Storage overhead not worth it

### Rate Limiting

Apply stricter rate limits for parsing endpoint:

```typescript
// In rateLimiter.ts
export const RATE_LIMITS = {
  ai_generation: { requests: 10, window: 60 }, // Default
  job_parsing: { requests: 20, window: 60 }, // More lenient for parsing
};
```

### Background Processing

For bulk imports, consider async processing:

```typescript
// Optional: POST /api/jobs/parse-bulk
app.post('/parse-bulk', authenticateUser, async (c) => {
  const { jobs } = await c.req.json();

  // Queue jobs for background processing
  const jobId = await queueBulkParsing(c.env, userId, jobs);

  return c.json({ jobId, status: 'processing' });
});
```

## Monitoring & Analytics

### Key Metrics

Track in Cloudflare Analytics:

```typescript
// Log structured events for analytics
console.log(JSON.stringify({
  event: 'job_parser_success',
  model: 'llama-3.3-70b',
  confidence: 0.92,
  duration_ms: 1823,
  text_length: 2456,
  fields_extracted: 10,
  warnings_count: 1,
  timestamp: new Date().toISOString(),
}));
```

**Dashboard queries:**
- Success rate: `event="job_parser_success" OR event="job_parser_complete_failure"`
- Average confidence: `event="job_parser_success" | avg(confidence)`
- Parsing time: `event="job_parser_success" | percentile(duration_ms, 50, 95, 99)`
- Model usage: `event="job_parser_success" | count by model`

### Alerting

Set up alerts for:
- Success rate < 90% (quality issue)
- Average duration > 5s (performance degradation)
- Average confidence < 0.7 (model accuracy issue)

## Deployment Checklist

- [ ] Create `workers/api/services/jobParser.ts`
- [ ] Add unit tests for parser service
- [ ] Add route to `workers/api/routes/jobs.ts`
- [ ] Add integration tests for API endpoint
- [ ] Create frontend component `JobPasteDialog.tsx`
- [ ] Add E2E tests for user workflow
- [ ] Configure rate limiting for parsing endpoint
- [ ] Set up analytics dashboard for monitoring
- [ ] Document user-facing feature in help docs
- [ ] Test with real job postings from LinkedIn, Indeed
- [ ] Deploy to staging environment
- [ ] Smoke test on staging
- [ ] Deploy to production
- [ ] Monitor success rate and confidence scores

## Sources

This implementation is based on the following Cloudflare documentation:

- [JSON Mode - Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models/)
- [Workers AI - Structured JSON outputs changelog](https://developers.cloudflare.com/changelog/2025-02-25-json-mode/)
- [Meta Llama 3.1 on Workers AI](https://blog.cloudflare.com/meta-llama-3-1-available-on-workers-ai/)
