# Job Posting Parser - Quick Start Guide

## 5-Minute Implementation

### 1. Basic Workers AI Call (Minimal Example)

```typescript
// Simplest possible implementation
async function parseJobQuick(env: Env, text: string) {
  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role: 'system',
        content: 'Extract job title, company, and location from text. Return JSON.'
      },
      {
        role: 'user',
        content: `Extract from: ${text}`
      }
    ],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.response);
}
```

### 2. With JSON Schema (Recommended)

```typescript
// Production-ready with schema validation
async function parseJob(env: Env, text: string) {
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
      confidence: { type: 'number', minimum: 0, maximum: 1 }
    },
    required: ['title', 'company', 'location', 'confidence']
  };

  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt() // See below
      },
      {
        role: 'user',
        content: `Extract structured job info from:\n\n${text}`
      }
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: {
      type: 'json_schema',
      json_schema: schema
    }
  });

  return JSON.parse(response.response);
}
```

### 3. Complete System Prompt

```typescript
function buildSystemPrompt(): string {
  return `You are an expert data extraction system. Extract structured job information.

FIELDS TO EXTRACT:
1. title: Job title (required)
2. company: Company name (required)
3. location: City, State (required)
4. workArrangement: Remote | Hybrid | On-site | Unknown
5. salaryMin: Minimum salary (USD/year, null if not mentioned)
6. salaryMax: Maximum salary (USD/year, null if not mentioned)
7. description: Full job description
8. requiredSkills: Array of required skills/technologies
9. preferredSkills: Array of preferred/nice-to-have skills
10. experienceLevel: Entry Level | Mid-Level | Senior | null
11. postedDate: YYYY-MM-DD format (null if not found)
12. confidence: Your confidence score 0.0-1.0

RULES:
- Return ONLY valid JSON
- Use null for missing optional fields
- Don't invent information
- Be conservative with confidence scores
- Extract skills from requirements sections

CONFIDENCE SCORING:
- 0.9-1.0: All key fields clear and unambiguous
- 0.7-0.9: Most fields extracted, some optional missing
- 0.5-0.7: Several fields ambiguous or missing
- Below 0.5: Poor quality, reject`;
}
```

### 4. API Route Handler

```typescript
import { Hono } from 'hono';
import { z } from 'zod';

const app = new Hono();

// Validation schema
const parseJobSchema = z.object({
  text: z.string().min(10).max(20000),
  url: z.string().url().optional()
});

// POST /api/jobs/parse
app.post('/parse', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  // Validate input
  const parseResult = parseJobSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Invalid input' }, 400);
  }

  const { text } = parseResult.data;

  try {
    // Call AI parser
    const result = await parseJob(c.env, text);

    // Validate confidence threshold
    if (result.confidence < 0.5) {
      return c.json({
        error: 'Low confidence extraction',
        confidence: result.confidence
      }, 400);
    }

    // Generate warnings for missing optional fields
    const warnings = [];
    if (!result.salaryMin && !result.salaryMax) {
      warnings.push('Salary information not found');
    }
    if (!result.experienceLevel) {
      warnings.push('Experience level not specified');
    }

    return c.json({
      success: true,
      job: result,
      confidence: result.confidence,
      warnings: warnings.length > 0 ? warnings : undefined
    });

  } catch (error) {
    console.error('Parse error:', error);
    return c.json({
      error: 'Failed to parse job posting'
    }, 500);
  }
});
```

### 5. Frontend Component (React)

```typescript
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function JobPaster({ onJobParsed }) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleParse = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/jobs/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: JSON.stringify({ text })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Parse failed');
      }

      // Success - pass to parent
      onJobParsed(data.job);
      setText(''); // Clear form

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste job posting here..."
        rows={15}
      />

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <Button
        onClick={handleParse}
        disabled={!text || loading}
      >
        {loading ? 'Parsing...' : 'Parse Job'}
      </Button>
    </div>
  );
}
```

## Common Patterns

### Retry Logic

```typescript
async function parseWithRetry(env: Env, text: string, maxRetries = 2) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await parseJob(env, text);

      if (result.confidence >= 0.5) {
        return result; // Success
      }

      console.log(`Attempt ${attempt}: Low confidence ${result.confidence}`);

    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw error; // Give up
      }

      // Wait before retry
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  throw new Error('All retries failed');
}
```

### Model Fallback

```typescript
const MODELS = [
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast', // Best quality
  '@cf/meta/llama-3.1-8b-instruct',           // Faster
  '@cf/meta/llama-3.1-8b-instruct-fast'       // Fastest
];

async function parseWithFallback(env: Env, text: string) {
  let lastError;

  for (const model of MODELS) {
    try {
      const result = await parseJobWithModel(env, text, model);

      if (result.confidence >= 0.5) {
        console.log(`Success with ${model}`);
        return result;
      }

    } catch (error) {
      console.error(`${model} failed:`, error);
      lastError = error;
    }
  }

  throw lastError || new Error('All models failed');
}
```

### Validation Helper

```typescript
function validateParsedJob(job: any): { valid: boolean; errors: string[] } {
  const errors = [];

  // Required fields
  if (!job.title?.trim()) errors.push('Missing job title');
  if (!job.company?.trim()) errors.push('Missing company');
  if (!job.location?.trim()) errors.push('Missing location');
  if (!job.description || job.description.length < 50) {
    errors.push('Description too short');
  }

  // Enum validation
  const validArrangements = ['Remote', 'Hybrid', 'On-site', 'Unknown'];
  if (!validArrangements.includes(job.workArrangement)) {
    errors.push('Invalid work arrangement');
  }

  // Salary range logic
  if (job.salaryMin && job.salaryMax && job.salaryMin > job.salaryMax) {
    errors.push('Salary min cannot exceed max');
  }

  // Arrays must be arrays
  if (!Array.isArray(job.requiredSkills)) {
    errors.push('requiredSkills must be array');
  }
  if (!Array.isArray(job.preferredSkills)) {
    errors.push('preferredSkills must be array');
  }

  // Confidence check
  if (typeof job.confidence !== 'number' || job.confidence < 0 || job.confidence > 1) {
    errors.push('Invalid confidence score');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

## Testing Examples

### Unit Test

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('parseJob', () => {
  it('should extract job details from LinkedIn posting', async () => {
    const mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: JSON.stringify({
            title: 'Senior Engineer',
            company: 'Tech Corp',
            location: 'Remote',
            workArrangement: 'Remote',
            salaryMin: 120000,
            salaryMax: 150000,
            description: 'Great opportunity...',
            requiredSkills: ['Python', 'AWS'],
            preferredSkills: ['Docker'],
            confidence: 0.95
          })
        })
      }
    };

    const result = await parseJob(mockEnv, 'Senior Engineer at Tech Corp...');

    expect(result.title).toBe('Senior Engineer');
    expect(result.company).toBe('Tech Corp');
    expect(result.confidence).toBeGreaterThan(0.9);
  });

  it('should reject low confidence results', async () => {
    const mockEnv = {
      AI: {
        run: vi.fn().mockResolvedValue({
          response: JSON.stringify({
            title: 'Unknown',
            company: 'Unknown',
            location: 'Unknown',
            confidence: 0.3
          })
        })
      }
    };

    await expect(parseJob(mockEnv, 'vague text'))
      .rejects.toThrow('Low confidence');
  });
});
```

### Integration Test

```typescript
import { testClient } from 'hono/testing';

describe('POST /api/jobs/parse', () => {
  it('should parse valid job posting', async () => {
    const client = testClient(app);

    const res = await client.parse.$post({
      json: {
        text: 'Software Engineer at Google\nMountain View, CA\nRemote...'
      },
      header: {
        Authorization: `Bearer ${validToken}`
      }
    });

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.job.title).toBeDefined();
    expect(data.confidence).toBeGreaterThan(0.5);
  });

  it('should reject unauthenticated requests', async () => {
    const res = await client.parse.$post({
      json: { text: 'test' }
    });

    expect(res.status).toBe(401);
  });

  it('should validate input length', async () => {
    const res = await client.parse.$post({
      json: { text: 'x'.repeat(30000) }, // Too long
      header: { Authorization: `Bearer ${validToken}` }
    });

    expect(res.status).toBe(400);
  });
});
```

## Cost Estimation

```typescript
// Calculate cost for job parsing
function estimateCost(textLength: number, model: string): number {
  // Approximate neurons per parse
  const neuronsPerParse = {
    'llama-3.3-70b': 150,      // ~0.0015 USD
    'llama-3.1-8b': 30,        // ~0.0003 USD
    'llama-3.1-8b-fast': 20    // ~0.0002 USD
  };

  // Cost per 1000 neurons
  const costPerK = 0.011;

  const neurons = neuronsPerParse[model] || 150;
  return (neurons / 1000) * costPerK;
}

// Usage example
const cost = estimateCost(2000, 'llama-3.3-70b');
console.log(`Estimated cost: $${cost.toFixed(4)}`); // ~$0.0017
```

## Performance Monitoring

```typescript
// Add timing and logging
async function parseJobWithMetrics(env: Env, text: string) {
  const startTime = Date.now();
  const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

  try {
    const result = await parseJob(env, text);
    const duration = Date.now() - startTime;

    // Structured logging for analytics
    console.log(JSON.stringify({
      event: 'job_parse_success',
      model,
      duration_ms: duration,
      text_length: text.length,
      confidence: result.confidence,
      fields_extracted: Object.keys(result).length,
      timestamp: new Date().toISOString()
    }));

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(JSON.stringify({
      event: 'job_parse_failure',
      model,
      duration_ms: duration,
      error: error.message,
      timestamp: new Date().toISOString()
    }));

    throw error;
  }
}
```

## Cloudflare Analytics Queries

```sql
-- Success rate
SELECT
  COUNT(*) as total,
  COUNTIF(event = 'job_parse_success') as successes,
  COUNTIF(event = 'job_parse_success') / COUNT(*) * 100 as success_rate
FROM logs
WHERE event IN ('job_parse_success', 'job_parse_failure')
  AND timestamp > NOW() - INTERVAL 1 DAY

-- Average confidence
SELECT AVG(confidence) as avg_confidence
FROM logs
WHERE event = 'job_parse_success'
  AND timestamp > NOW() - INTERVAL 1 DAY

-- Performance percentiles
SELECT
  PERCENTILE_CONT(duration_ms, 0.50) as p50,
  PERCENTILE_CONT(duration_ms, 0.95) as p95,
  PERCENTILE_CONT(duration_ms, 0.99) as p99
FROM logs
WHERE event = 'job_parse_success'

-- Model usage distribution
SELECT
  model,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence,
  AVG(duration_ms) as avg_duration
FROM logs
WHERE event = 'job_parse_success'
GROUP BY model
ORDER BY count DESC
```

## Troubleshooting

### Issue: Low confidence scores

```typescript
// Add debug logging to understand why
if (result.confidence < 0.7) {
  console.warn('Low confidence parse:', {
    confidence: result.confidence,
    text_length: text.length,
    fields_found: Object.keys(result).filter(k => result[k] !== null).length,
    missing_fields: Object.keys(result).filter(k => result[k] === null)
  });
}
```

### Issue: Timeouts

```typescript
// Add timeout wrapper
async function parseWithTimeout(env: Env, text: string, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const result = await parseJob(env, text);
    clearTimeout(timeout);
    return result;
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('Parse timeout after ${timeoutMs}ms');
    }
    throw error;
  }
}
```

### Issue: Rate limit errors

```typescript
// Implement exponential backoff
async function parseWithBackoff(env: Env, text: string) {
  let delay = 1000;
  const maxDelay = 30000;

  while (true) {
    try {
      return await parseJob(env, text);
    } catch (error) {
      if (error.message.includes('rate limit')) {
        console.log(`Rate limited, waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        delay = Math.min(delay * 2, maxDelay);
        continue;
      }
      throw error;
    }
  }
}
```

## Next Steps

1. ✅ Read full implementation guide: `JOB_POSTING_PARSER_IMPLEMENTATION.md`
2. ✅ Review architecture diagrams: `JOB_POSTING_PARSER_ARCHITECTURE.md`
3. ⏳ Implement service: `workers/api/services/jobParser.ts`
4. ⏳ Add API route to `workers/api/routes/jobs.ts`
5. ⏳ Create frontend component
6. ⏳ Write tests
7. ⏳ Deploy and monitor
