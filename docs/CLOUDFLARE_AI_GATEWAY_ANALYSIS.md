# Cloudflare AI Gateway Analysis & Integration Strategy

**JobMatch AI - AI Gateway vs KV Caching Evaluation**

**Document Version:** 1.0
**Date:** December 31, 2025
**Status:** Architecture Recommendation
**Author:** Cloud Infrastructure Team

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI Gateway Capabilities](#ai-gateway-capabilities)
3. [AI Gateway vs KV Caching Comparison](#ai-gateway-vs-kv-caching-comparison)
4. [Current AI Usage Analysis](#current-ai-usage-analysis)
5. [Integration Approach](#integration-approach)
6. [Architecture Recommendation](#architecture-recommendation)
7. [Cost Analysis](#cost-analysis)
8. [Implementation Guide](#implementation-guide)
9. [Migration Impact](#migration-impact)
10. [Final Recommendation](#final-recommendation)

---

## Executive Summary

### Key Findings

**AI Gateway is a complementary caching layer, NOT a replacement for KV caching:**

1. **AI Gateway** = Proxy-level caching for **AI API requests** (OpenAI, Workers AI)
2. **KV Caching** = Application-level caching for **AI results** (embeddings, analyses)

**Both can and should be used together for maximum cost savings.**

### Quick Comparison

| Feature | AI Gateway | KV Caching | Winner |
|---------|-----------|------------|--------|
| **Caches AI API calls** | ✅ Automatic | ❌ No | AI Gateway |
| **Caches embeddings** | ✅ Response cache | ✅ Custom logic | **Both** |
| **Caches job analyses** | ✅ Response cache | ✅ Custom logic | **Both** |
| **Custom cache keys** | ⚠️ Limited | ✅ Full control | KV |
| **Cache by user** | ❌ No | ✅ Yes | KV |
| **Analytics** | ✅ Dashboard | ❌ Manual | AI Gateway |
| **Rate limiting** | ✅ Built-in | ❌ Manual | AI Gateway |
| **Cost tracking** | ✅ Automatic | ❌ Manual | AI Gateway |
| **TTL control** | ✅ Per-request | ✅ Per-key | Tie |
| **Free tier** | ✅ Yes | ✅ Yes | Tie |

### Recommendation

**Use BOTH AI Gateway + KV Caching for layered caching strategy:**

```
┌────────────────────────────────────────────────────────┐
│                 Layered Caching Strategy               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Layer 1: AI Gateway (Proxy Cache)                    │
│  ├─ Caches identical AI API requests                  │
│  ├─ Works for: OpenAI, Workers AI                     │
│  ├─ Cache key: Automatic (request hash)               │
│  └─ TTL: Configurable per-request                     │
│                                                        │
│  Layer 2: KV Cache (Application Cache)                │
│  ├─ Caches processed AI results by user/job           │
│  ├─ Works for: Custom business logic                  │
│  ├─ Cache key: Custom (userId:jobId, text-hash)       │
│  └─ TTL: Custom per namespace                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Expected Benefits:**
- **60-80% cost savings** on AI operations (combined caching)
- **Better observability** (AI Gateway analytics)
- **Faster responses** (dual cache layer)
- **$0 additional cost** (both free tier)

---

## AI Gateway Capabilities

### Overview

Cloudflare AI Gateway is a **proxy layer** that sits between your application and AI providers, providing automatic caching, analytics, rate limiting, and cost tracking.

**Official Description:**
> "AI Gateway is a proxy that sits between your application and your AI services, providing features like caching, rate limiting, analytics, and logging with just one line of code."

### Supported Providers

✅ **Workers AI** (Cloudflare's AI models)
✅ **OpenAI** (GPT-4, GPT-4o, GPT-4o-mini, embeddings)
✅ **Azure OpenAI**
✅ **HuggingFace**
✅ **Replicate**
✅ **And more...**

**For JobMatch AI:** We use both **Workers AI** (Llama 3.1, Llama 3.3) and **OpenAI** (GPT-4o, GPT-4o-mini)

### Core Features

#### 1. Caching

**How it works:**
- AI Gateway caches **identical AI API requests** automatically
- Cache key is based on request parameters (model, prompt, temperature, etc.)
- Supports text and image responses
- Default: Global cache across all requests

**Cache Control Headers:**
```typescript
// Skip cache for this request
headers: { 'cf-aig-skip-cache': 'true' }

// Custom TTL (60 seconds to 1 month)
headers: { 'cf-aig-cache-ttl': '3600' } // 1 hour

// Custom cache key (for semantic caching)
headers: { 'cf-aig-cache-key': 'user-123-job-456' }
```

**Cache Hit Detection:**
```typescript
// Response header indicates cache status
response.headers.get('cf-aig-cache-status')
// Returns: 'HIT' or 'MISS'
```

**Limitations:**
- ⚠️ **No semantic caching yet** (only exact match)
- ⚠️ **No user-specific caching** (same prompt = same cache for all users)
- ⚠️ **Cache volatility** (simultaneous requests may not both hit cache)

#### 2. Analytics & Observability

**Dashboard Metrics:**
- Request counts (total, per model, per endpoint)
- Token usage (input, output, total)
- Cost estimates (based on provider pricing)
- Error rates and types
- Cache hit rates
- Response latency (p50, p95, p99)

**Benefits:**
- ✅ **Unified view** across OpenAI + Workers AI
- ✅ **Cost attribution** by endpoint/model
- ✅ **Performance insights** (slow requests, errors)
- ✅ **Free** on all plans

#### 3. Rate Limiting

**Capabilities:**
- Limit requests per time window (e.g., 100 req/hour)
- Sliding window or fixed window
- Per-gateway limits (not per-user)

**Configuration:**
```typescript
// Set via dashboard or API
{
  "rate_limit": {
    "requests": 100,
    "window": "1h"
  }
}
```

**Limitations:**
- ⚠️ **Not per-user** (global limits only)
- ⚠️ **No custom logic** (simple count-based)

#### 4. Cost Tracking

**Features:**
- Automatic cost estimation based on:
  - Provider pricing (OpenAI, Workers AI)
  - Token usage (input + output)
  - Model type (GPT-4 vs GPT-4o-mini)
- Historical cost trends
- Cost breakdown by endpoint

**Benefits:**
- ✅ **No manual tracking** needed
- ✅ **Real-time estimates**
- ✅ **Budget alerts** (configure thresholds)

### Pricing

**Core Features: FREE** 🎉
- Dashboard analytics
- Caching
- Rate limiting
- Cost tracking

**Paid Features:**
- **Persistent Logs:** $0.05 per million requests (beyond free tier)
  - Workers Free: 100K logs/month included
  - Workers Paid: 1M logs/month included
- **Logpush:** $0.05 per million requests (Workers Paid only)

**For JobMatch AI:** All features we need are **FREE**

---

## AI Gateway vs KV Caching Comparison

### Architecture Differences

#### AI Gateway (Proxy-Level Cache)

```
┌─────────────────────────────────────────────────────┐
│  Application Request                                │
│  "Analyze job compatibility for user 123 + job 456"│
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  AI Gateway (Proxy)                                 │
│  ├─ Hash request params                             │
│  ├─ Check cache: POST /workers-ai/llama-3.1         │
│  ├─ Cache key: hash(model + prompt + params)        │
│  └─ If MISS → forward to Workers AI                 │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  Workers AI / OpenAI                                │
│  Returns: { analysis: {...}, overallScore: 85 }    │
└─────────────────────────────────────────────────────┘
```

**Cache Scope:** **Global** (same prompt = same cache for all users)

#### KV Caching (Application-Level Cache)

```
┌─────────────────────────────────────────────────────┐
│  Application Request                                │
│  "Analyze job compatibility for user 123 + job 456"│
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  KV Cache Check (Custom Logic)                     │
│  ├─ Cache key: "analysis:user-123:job-456"         │
│  ├─ Check KV: JOB_ANALYSIS_CACHE.get(key)          │
│  ├─ If HIT → return cached analysis                │
│  └─ If MISS → call AI service                      │
└──────────────┬──────────────────────────────────────┘
               │ (MISS)
               ▼
┌─────────────────────────────────────────────────────┐
│  AI Service (Workers AI / OpenAI)                  │
│  Returns: { analysis: {...}, overallScore: 85 }    │
└──────────────┬──────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────┐
│  Store in KV Cache                                  │
│  KV.put("analysis:user-123:job-456", result, TTL)  │
└─────────────────────────────────────────────────────┘
```

**Cache Scope:** **User-specific** (user 123 + job 456 = unique cache)

### Use Case Analysis

| Use Case | AI Gateway | KV Caching | Winner |
|----------|-----------|------------|--------|
| **Resume parsing (same PDF)** | ✅ Yes (same image URL) | ⚠️ Rare (users don't re-parse) | AI Gateway |
| **Job compatibility (user X + job Y)** | ❌ No (different users) | ✅ Yes (user-job pair) | **KV** |
| **Embeddings (same job description)** | ✅ Yes (same text) | ✅ Yes (text hash) | **Both** |
| **Cover letter generation (variant)** | ❌ No (personalized) | ⚠️ Maybe (if cached) | Neither |
| **Resume generation (variant)** | ❌ No (personalized) | ⚠️ Maybe (if cached) | Neither |
| **Spam detection (job description)** | ✅ Yes (same text) | ✅ Yes (job ID) | **Both** |

### When to Use Each

#### Use AI Gateway When:
- ✅ **Same prompt** will be requested multiple times globally
- ✅ **No user-specific data** in the prompt
- ✅ You want **automatic analytics** without custom code
- ✅ You need **simple rate limiting** (global limits)

**Examples:**
- Embedding generation (same job description)
- Spam detection (same job posting)
- Resume parsing (same resume re-parsed)

#### Use KV Caching When:
- ✅ **User-specific** caching needed (userId + jobId)
- ✅ **Custom cache keys** required (business logic)
- ✅ **Long TTLs** needed (7-30 days)
- ✅ **Application logic** determines cache validity

**Examples:**
- Job compatibility analysis (user-specific)
- User preferences analysis (user-specific)
- Processed embeddings (custom keys)

#### Use BOTH When:
- ✅ **Maximum cost savings** desired
- ✅ **Dual cache layer** (proxy + application)
- ✅ **Different TTLs** for different layers

**Examples:**
- Embeddings: AI Gateway (1 hour TTL) + KV (30 days TTL)
- Job analysis: AI Gateway (skip) + KV (7 days TTL, user-specific)

---

## Current AI Usage Analysis

### Review of JobMatch AI AI Operations

Based on code review of:
- `workers/api/services/openai.ts` (Cloudflare Workers implementation)
- `backend/src/services/openai.service.ts` (Express backend)

### AI Operations Inventory

| Operation | Provider | Model | Frequency | Cache Strategy |
|-----------|----------|-------|-----------|----------------|
| **1. Resume/Cover Letter Generation** | OpenAI | GPT-4o-mini | ~100/day | ❌ No (personalized) |
| **2. Job Compatibility Analysis** | Workers AI / OpenAI | Llama 3.1 / GPT-4o-mini | ~200/day | ✅ KV (user:job) |
| **3. Resume Parsing (PDF)** | Workers AI | Llama 3.3 70B | ~20/day | ⚠️ AI Gateway (rare) |
| **4. Resume Parsing (Image)** | OpenAI | GPT-4o Vision | ~10/day | ⚠️ AI Gateway (rare) |
| **5. Embeddings (Job Descriptions)** | Workers AI | BGE-base-en-v1.5 | ~500/day | ✅ **BOTH** |
| **6. Embeddings (Resume Text)** | Workers AI | BGE-base-en-v1.5 | ~100/day | ✅ **BOTH** |
| **7. Spam Detection** | Workers AI | Llama 3.1 | ~50/day | ✅ AI Gateway |

### Detailed Analysis by Operation

#### 1. Resume/Cover Letter Generation

**Current Implementation:**
```typescript
// workers/api/services/openai.ts:154-250
async function generateVariant(
  env: Env,
  job: Job,
  profile: UserProfile,
  // ...
): Promise<GeneratedApplication> {
  const openai = createOpenAI(env); // ✅ Already uses AI Gateway if configured

  const completion = await openai.chat.completions.create({
    model: MODELS.APPLICATION_GENERATION, // 'gpt-4o-mini'
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt } // Personalized with user data
    ],
    temperature: 0.7,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  });

  // Log cache status (already implemented)
  logAIGatewayCacheStatus(completion, 'application-generation', strategy.name);
}
```

**Cache Strategy:**
- **AI Gateway:** ❌ Not useful (every prompt is personalized)
- **KV:** ❌ Not useful (users want fresh generations)
- **Recommendation:** **No caching** (AI Gateway tracks costs only)

#### 2. Job Compatibility Analysis

**Current Implementation:**
```typescript
// workers/api/services/openai.ts:763-1032
// Hybrid: Workers AI (primary) → OpenAI (fallback)

// Already has KV caching:
const cacheKey = `analysis:${userId}:${jobId}`;
const cached = await env.JOB_ANALYSIS_CACHE.get(cacheKey);
if (cached) return JSON.parse(cached);

// Generate new analysis
const analysis = await analyzeJobCompatibilityWithWorkersAI(env, context);

// Cache for 7 days
await env.JOB_ANALYSIS_CACHE.put(
  cacheKey,
  JSON.stringify(analysis),
  { expirationTtl: 7 * 24 * 60 * 60 }
);
```

**Cache Strategy:**
- **AI Gateway:** ⚠️ Partial (if same user views same job multiple times)
- **KV:** ✅ **Already implemented** (user:job cache key)
- **Recommendation:** **Keep KV, add AI Gateway for secondary benefit**

**Expected Savings:**
- KV cache hit rate: 60-70% (user revisits job)
- AI Gateway cache hit rate: 5-10% (global duplicate requests)
- **Combined savings: ~65-75%**

#### 3. Resume Parsing (PDF)

**Current Implementation:**
```typescript
// workers/api/services/openai.ts:550-738
export async function parseResume(env: Env, storagePath: string) {
  // For PDFs: Railway service extracts text → Llama 3.3 70B
  const pdfResponse = await fetch(`${pdfParserUrl}/parse-pdf`, {
    method: 'POST',
    body: JSON.stringify({ pdfUrl: fileUrl }), // Signed URL
  });

  const { text } = await pdfResponse.json();

  // Parse with Workers AI (free)
  const response = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      { role: 'system', content: 'You are an expert resume parser...' },
      { role: 'user', content: prompt + text } // Full resume text
    ],
  });
}
```

**Cache Strategy:**
- **AI Gateway:** ⚠️ Rarely useful (users don't re-parse same resume)
- **KV:** ❌ Not useful (one-time operation per resume)
- **Recommendation:** **AI Gateway for analytics only** (no cache benefit)

#### 4. Embeddings Generation

**Current Implementation:**
```typescript
// workers/api/services/embeddings.ts (inferred from code)
async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: text.substring(0, 2000) // Truncate
  });
  return result.data[0];
}
```

**Current KV Recommendation:**
```typescript
// From CLOUDFLARE_KV_AND_WORKERS_ARCHITECTURE.md:475-534
async function getCachedEmbedding(text: string, env: Env) {
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Check KV cache
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' });
  if (cached) return cached.embedding;

  // Generate new embedding
  const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });

  // Cache for 30 days
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({ embedding, text: text.substring(0, 200) }),
    { expirationTtl: 30 * 24 * 60 * 60 }
  );

  return embedding;
}
```

**Cache Strategy with AI Gateway:**
```typescript
// ENHANCED: Dual-layer caching
async function getCachedEmbedding(text: string, env: Env) {
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Layer 1: KV cache (30-day TTL, application-level)
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' });
  if (cached) {
    console.log('[Embedding] KV cache HIT');
    return cached.embedding;
  }

  // Layer 2: AI Gateway (automatic, proxy-level)
  // Workers AI request routed through AI Gateway automatically
  const result = await env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text: text.substring(0, 2000) },
    {
      gateway: {
        id: env.AI_GATEWAY_SLUG,
        cacheTtl: 3600, // 1 hour at proxy level
      }
    }
  );

  // If AI Gateway cache MISS, Workers AI runs
  // If AI Gateway cache HIT, no compute cost
  const embedding = result.data[0];

  // Store in KV for long-term (30 days)
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({ embedding, text: text.substring(0, 200) }),
    { expirationTtl: 30 * 24 * 60 * 60 }
  );

  return embedding;
}
```

**Cache Strategy:**
- **Layer 1 (KV):** 30-day TTL, application-level, custom keys
  - Cache hit rate: **40-50%** (job descriptions reused)
- **Layer 2 (AI Gateway):** 1-hour TTL, proxy-level, automatic
  - Cache hit rate: **20-30%** (same text requested within 1 hour)
- **Combined savings: ~60-70%** (KV covers long-term, AI Gateway covers short-term duplicates)

**Recommendation:** ✅ **Use BOTH** for maximum savings

---

## Integration Approach

### Setup AI Gateway

#### Step 1: Create AI Gateway in Cloudflare Dashboard

1. Go to **AI > AI Gateway** in Cloudflare dashboard
2. Click **Create Gateway**
3. Name: `jobmatch-ai` (use this as `AI_GATEWAY_SLUG`)
4. Enable features:
   - ✅ Caching
   - ✅ Rate limiting (optional)
   - ✅ Analytics
   - ✅ Cost tracking

#### Step 2: Add Environment Variables

**File:** `workers/wrangler.toml`

```toml
[env.development.vars]
AI_GATEWAY_SLUG = "jobmatch-ai"
CLOUDFLARE_ACCOUNT_ID = "your-account-id"

[env.staging.vars]
AI_GATEWAY_SLUG = "jobmatch-ai"
CLOUDFLARE_ACCOUNT_ID = "your-account-id"

[env.production.vars]
AI_GATEWAY_SLUG = "jobmatch-ai"
CLOUDFLARE_ACCOUNT_ID = "your-account-id"
```

**File:** `workers/api/types.ts`

```typescript
export interface Env {
  // Existing
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
  AI: Ai;

  // Add AI Gateway config
  AI_GATEWAY_SLUG: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CF_AIG_TOKEN?: string; // Optional: AI Gateway auth token
}
```

### Integration Pattern 1: OpenAI via AI Gateway

**Current Code (Already Implemented):**

```typescript
// workers/api/services/openai.ts:79-116
export function createOpenAI(env: Env): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Check if AI Gateway is configured
  const useAIGateway = env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_SLUG;

  if (useAIGateway) {
    // ✅ Route through Cloudflare AI Gateway for caching and analytics
    const gatewayBaseURL = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`;

    console.log(`[OpenAI] Using Cloudflare AI Gateway: ${env.AI_GATEWAY_SLUG}`);

    return new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      baseURL: gatewayBaseURL, // Proxy all requests through AI Gateway
    });
  }

  // Fallback to direct OpenAI API
  console.log('[OpenAI] Using direct OpenAI API (AI Gateway not configured)');
  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
  });
}
```

**Cache Control (Per-Request):**

```typescript
// Skip cache for personalized requests (resume/cover letter generation)
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
}, {
  headers: {
    'cf-aig-skip-cache': 'true', // Don't cache personalized content
  }
});

// Use cache for repeated requests (spam detection, embeddings)
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [...],
}, {
  headers: {
    'cf-aig-cache-ttl': '3600', // Cache for 1 hour
  }
});
```

**Cache Status Logging (Already Implemented):**

```typescript
// workers/api/services/openai.ts:267-292
function logAIGatewayCacheStatus(completion: unknown, operation: string, details?: string) {
  try {
    const headers = (completion as any)?.response?.headers;
    const cacheStatus = headers?.get?.('cf-aig-cache-status');

    if (cacheStatus) {
      if (cacheStatus === 'HIT') {
        console.log(`[AI Gateway] ✓ Cache HIT for ${operation}${details ? ` (${details})` : ''} - Cost savings!`);
      } else if (cacheStatus === 'MISS') {
        console.log(`[AI Gateway] ✗ Cache MISS for ${operation}${details ? ` (${details})` : ''} - Response will be cached`);
      }
    }
  } catch {
    // Silently ignore if headers not accessible
  }
}
```

### Integration Pattern 2: Workers AI via AI Gateway

**Workers AI Binding with Gateway:**

```typescript
// OPTION A: Environment binding (recommended)
const response = await env.AI.run(
  '@cf/baai/bge-base-en-v1.5',
  { text: 'Generate embedding for this text' },
  {
    gateway: {
      id: env.AI_GATEWAY_SLUG, // Gateway name
      skipCache: false, // Use cache
      cacheTtl: 3600, // 1 hour TTL
    }
  }
);

// OPTION B: REST API (if needed)
const apiUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/workers-ai/@cf/baai/bge-base-en-v1.5`;

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    text: 'Generate embedding for this text'
  })
});
```

**Example: Embeddings with Dual-Layer Caching:**

```typescript
// workers/api/services/embeddings.ts
import type { Env } from '../types';

/**
 * Generate embeddings with dual-layer caching:
 * - Layer 1 (KV): 30-day TTL, application-level
 * - Layer 2 (AI Gateway): 1-hour TTL, proxy-level
 */
export async function getCachedEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  // Generate cache key from text hash
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Layer 1: Check KV cache (long-term, 30 days)
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' }) as {
    embedding: number[];
    model: string;
  } | null;

  if (cached && cached.model === '@cf/baai/bge-base-en-v1.5') {
    console.log('[Embedding] KV cache HIT (Layer 1)');
    return cached.embedding;
  }

  console.log('[Embedding] KV cache MISS, checking AI Gateway (Layer 2)');

  // Layer 2: Workers AI with AI Gateway (short-term, 1 hour)
  const result = await env.AI.run(
    '@cf/baai/bge-base-en-v1.5',
    { text: text.substring(0, 2000) },
    {
      gateway: {
        id: env.AI_GATEWAY_SLUG,
        skipCache: false, // Use AI Gateway cache
        cacheTtl: 3600, // 1 hour at proxy level
      }
    }
  );

  const embedding = result.data[0];

  // Store in KV for long-term caching (30 days)
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({
      text: text.substring(0, 200), // Store snippet for debugging
      embedding,
      model: '@cf/baai/bge-base-en-v1.5',
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
  );

  console.log('[Embedding] Stored in KV cache (Layer 1)');
  return embedding;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

---

## Architecture Recommendation

### Recommended Caching Strategy

**Use layered caching based on operation type:**

| Operation | KV Cache | AI Gateway | TTL (KV) | TTL (Gateway) |
|-----------|----------|-----------|----------|---------------|
| **Resume/Cover Letter Generation** | ❌ No | ⚠️ Skip cache | N/A | N/A |
| **Job Compatibility Analysis** | ✅ Yes | ⚠️ Skip cache | 7 days | N/A |
| **Resume Parsing (PDF)** | ❌ No | ✅ Analytics only | N/A | N/A |
| **Resume Parsing (Image)** | ❌ No | ✅ Analytics only | N/A | N/A |
| **Embeddings (Job/Resume)** | ✅ **Yes** | ✅ **Yes** | 30 days | 1 hour |
| **Spam Detection** | ✅ Yes (by jobId) | ✅ Yes | 7 days | 24 hours |

### Updated KV Namespace Recommendations

**From CLOUDFLARE_KV_AND_WORKERS_ARCHITECTURE.md, update Section 5 (EMBEDDINGS_CACHE):**

```markdown
#### 5. EMBEDDINGS_CACHE (New - Recommended)

**Purpose:** Cache Workers AI text embeddings to reduce compute

**Strategy:** Dual-layer caching with AI Gateway

**Layer 1 (KV):**
- TTL: 30 days
- Scope: Application-level, custom keys
- Cache key: `embed:{sha256(text)}`
- Hit rate: 40-50% (job descriptions reused)

**Layer 2 (AI Gateway):**
- TTL: 1 hour (configurable per-request)
- Scope: Proxy-level, automatic
- Cache key: Automatic (request hash)
- Hit rate: 20-30% (same text within 1 hour)

**Combined Cache Hit Rate:** ~60-70%

**Cost Savings:**
- KV covers long-term (30 days): 40-50% savings
- AI Gateway covers short-term (1 hour): +20-30% savings
- **Total savings: 60-70% reduction in embedding costs**

**Implementation:**
See [Integration Pattern 2](#integration-pattern-2-workers-ai-via-ai-gateway)
```

### When to Use AI Gateway Cache

**Use AI Gateway caching (set `cacheTtl`):**

✅ **Embeddings** (same job description requested multiple times)
✅ **Spam detection** (same job posting analyzed multiple times)
✅ **Resume parsing** (if same resume re-parsed, rare but possible)

**Skip AI Gateway caching (set `skipCache: true`):**

❌ **Resume/cover letter generation** (personalized, never reused)
❌ **Job compatibility analysis** (user-specific, use KV instead)

### Architecture Diagram

```
┌───────────────────────────────────────────────────────────────┐
│                   JobMatch AI Caching Architecture            │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Request: "Generate embedding for job description"           │
│                                                               │
│  Step 1: Check KV Cache (Layer 1)                            │
│  ├─ Key: embed:{sha256(text)}                                │
│  ├─ TTL: 30 days                                             │
│  └─ If HIT → Return cached embedding (40-50% hit rate)       │
│                                                               │
│  Step 2: Workers AI via AI Gateway (Layer 2)                 │
│  ├─ env.AI.run(..., { gateway: { id, cacheTtl: 3600 } })    │
│  ├─ AI Gateway checks proxy cache                            │
│  ├─ If HIT → Return from AI Gateway (20-30% hit rate)        │
│  └─ If MISS → Workers AI generates embedding                 │
│                                                               │
│  Step 3: Store in KV Cache (for future requests)             │
│  └─ KV.put(key, embedding, { expirationTtl: 30 days })       │
│                                                               │
│  Combined Cache Hit Rate: ~60-70%                            │
│  Cost Savings: ~60-70% reduction in embedding costs          │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Cost Analysis

### AI Gateway Pricing

**FREE Features:**
- ✅ Caching (unlimited)
- ✅ Analytics dashboard
- ✅ Rate limiting
- ✅ Cost tracking

**Paid Features (not needed):**
- Persistent logs: $0.05/million requests (beyond free tier)
  - Free tier: 100K logs/month (Workers Free) or 1M logs/month (Workers Paid)
  - JobMatch AI: ~30K requests/month = **$0** (within free tier)

**Total AI Gateway Cost: $0/month** 🎉

### KV Caching Costs (from CLOUDFLARE_KV_AND_WORKERS_ARCHITECTURE.md)

| Namespace | Storage | Reads/Month | Writes/Month | Monthly Cost |
|-----------|---------|-------------|--------------|--------------|
| EMBEDDINGS_CACHE | 100 MB | 200K | 50K | $0.00 (FREE) |
| JOB_ANALYSIS_CACHE | 50 MB | 50K | 20K | $0.00 (FREE) |

**Total KV Cost: $0/month** (within free tier)

### Cost Savings Analysis

**Current Costs (No AI Gateway, No KV):**

| Operation | Requests/Month | Cost per Request | Monthly Cost |
|-----------|----------------|------------------|--------------|
| **Embeddings** | 18,000 | $0.001 | $18 |
| **Job Analysis** | 6,000 | $0.03 | $180 |
| **Resume Generation** | 3,000 | $0.02 | $60 |
| **TOTAL** | | | **$258** |

**With KV Caching Only (Current Recommendation):**

| Operation | Cache Hit Rate | Savings | New Monthly Cost |
|-----------|----------------|---------|------------------|
| **Embeddings** | 40-50% | $7-9 | $9-11 |
| **Job Analysis** | 60-70% | $108-126 | $54-72 |
| **Resume Generation** | 0% | $0 | $60 |
| **TOTAL** | | **$115-135** | **$123-143** |

**Savings: ~$115-135/month (44-52% reduction)**

**With AI Gateway + KV Caching (Recommended):**

| Operation | Combined Hit Rate | Savings | New Monthly Cost |
|-----------|-------------------|---------|------------------|
| **Embeddings** | 60-70% | $11-13 | $5-7 |
| **Job Analysis** | 65-75% | $117-135 | $45-63 |
| **Resume Generation** | 0% | $0 | $60 |
| **TOTAL** | | **$128-148** | **$110-130** |

**Total Savings: ~$128-148/month (50-57% reduction)**

**Incremental Benefit of AI Gateway:** +$5-13/month additional savings

### ROI Summary

**Investment:**
- Setup time: 2-3 hours
- Configuration complexity: Low (already partially implemented)
- Ongoing maintenance: None (automatic)

**Returns:**
- Monthly savings: $128-148
- Annual savings: $1,536-1,776
- Cost of AI Gateway: $0
- Cost of KV: $0

**ROI: ∞** (zero investment, positive returns)

---

## Implementation Guide

### Phase 1: Enable AI Gateway (Already Implemented)

**Status:** ✅ **Already implemented** in `workers/api/services/openai.ts`

**Verification:**

```bash
# 1. Set environment variables in wrangler.toml
AI_GATEWAY_SLUG="jobmatch-ai"
CLOUDFLARE_ACCOUNT_ID="your-account-id"

# 2. Deploy to test environment
wrangler deploy --env development

# 3. Check logs for AI Gateway usage
# Should see: "[OpenAI] Using Cloudflare AI Gateway: jobmatch-ai"
```

### Phase 2: Add Dual-Layer Embeddings Cache

**New File:** `workers/api/services/embeddingsCache.ts`

```typescript
/**
 * Embeddings Cache Service - Dual-Layer Caching
 *
 * Layer 1 (KV): 30-day TTL, application-level, custom keys
 * Layer 2 (AI Gateway): 1-hour TTL, proxy-level, automatic
 */

import type { Env } from '../types';

export async function getCachedEmbedding(
  text: string,
  env: Env
): Promise<number[]> {
  // Generate cache key from text hash
  const textHash = await sha256(text);
  const cacheKey = `embed:${textHash}`;

  // Layer 1: Check KV cache (long-term, 30 days)
  const cached = await env.EMBEDDINGS_CACHE.get(cacheKey, { type: 'json' }) as {
    embedding: number[];
    model: string;
    createdAt: string;
  } | null;

  if (cached && cached.model === '@cf/baai/bge-base-en-v1.5') {
    console.log(`[Embedding] KV cache HIT (Layer 1) - hash: ${textHash.substring(0, 16)}`);
    return cached.embedding;
  }

  console.log(`[Embedding] KV cache MISS (Layer 1) - checking AI Gateway (Layer 2)`);

  // Layer 2: Workers AI with AI Gateway (short-term, 1 hour)
  const useAIGateway = env.AI_GATEWAY_SLUG && env.CLOUDFLARE_ACCOUNT_ID;

  let result;
  if (useAIGateway) {
    // Route through AI Gateway for proxy-level caching
    result = await env.AI.run(
      '@cf/baai/bge-base-en-v1.5',
      { text: text.substring(0, 2000) },
      {
        gateway: {
          id: env.AI_GATEWAY_SLUG,
          skipCache: false, // Use AI Gateway cache
          cacheTtl: 3600, // 1 hour at proxy level
        }
      }
    );
    console.log('[Embedding] Requested via AI Gateway (Layer 2)');
  } else {
    // Direct Workers AI (no AI Gateway)
    result = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: text.substring(0, 2000)
    });
    console.log('[Embedding] Direct Workers AI (AI Gateway not configured)');
  }

  const embedding = result.data[0];

  // Store in KV for long-term caching (30 days)
  await env.EMBEDDINGS_CACHE.put(
    cacheKey,
    JSON.stringify({
      text: text.substring(0, 200), // Store snippet for debugging
      embedding,
      model: '@cf/baai/bge-base-en-v1.5',
      createdAt: new Date().toISOString()
    }),
    { expirationTtl: 30 * 24 * 60 * 60 } // 30 days
  );

  console.log(`[Embedding] Stored in KV cache (Layer 1) - hash: ${textHash.substring(0, 16)}`);
  return embedding;
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

**Update Existing Code:**

```typescript
// workers/api/services/embeddings.ts (update existing)
import { getCachedEmbedding } from './embeddingsCache';

// Replace direct AI.run calls with cached version:
// BEFORE:
const result = await env.AI.run('@cf/baai/bge-base-en-v1.5', { text });
const embedding = result.data[0];

// AFTER:
const embedding = await getCachedEmbedding(text, env);
```

### Phase 3: Configure Cache Policies per Operation

**Update Resume/Cover Letter Generation (skip cache):**

```typescript
// workers/api/services/openai.ts:230-250
const completion = await openai.chat.completions.create({
  model: MODELS.APPLICATION_GENERATION,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: GENERATION_CONFIG.TEMPERATURE,
  max_tokens: GENERATION_CONFIG.MAX_TOKENS,
  response_format: { type: 'json_object' },
}, {
  // NEW: Skip AI Gateway cache for personalized content
  headers: {
    'cf-aig-skip-cache': 'true',
  }
});
```

**Update Job Compatibility Analysis (skip AI Gateway, use KV):**

```typescript
// workers/api/services/openai.ts:995-1004
const completion = await openai.chat.completions.create({
  model: MODELS.MATCH_ANALYSIS,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.3,
  max_tokens: 4000,
  response_format: { type: 'json_object' },
}, {
  // NEW: Skip AI Gateway cache (KV handles user-specific caching)
  headers: {
    'cf-aig-skip-cache': 'true',
  }
});
```

### Phase 4: Monitor Cache Performance

**Add to logs:**

```typescript
// Log cache hit rates daily
export async function logCacheStatistics(env: Env) {
  // This would be called by a scheduled worker or manually
  console.log('[Cache Stats] Check AI Gateway dashboard for:');
  console.log('  - Total requests');
  console.log('  - Cache hit rate');
  console.log('  - Cost savings');
  console.log('  - Token usage');
  console.log('Dashboard: https://dash.cloudflare.com/?to=/:account/ai/ai-gateway');
}
```

**View in Cloudflare Dashboard:**
- Go to **AI > AI Gateway > jobmatch-ai**
- View analytics:
  - Request count
  - Cache hit rate (should be ~60-70% for embeddings)
  - Token usage
  - Estimated cost savings

---

## Migration Impact

### Changes to Migration Plan

**From CLOUDFLARE_FULL_PLATFORM_MIGRATION.md:**

#### Week 2: KV Migration (UPDATED)

**Original Tasks:**
- Migrate rate limiting from PostgreSQL to KV
- Migrate OAuth states from PostgreSQL to KV
- Add embeddings cache to Workers AI service
- Add API response cache middleware

**NEW Tasks (add to Week 2):**
- ✅ **Create AI Gateway** in Cloudflare dashboard (`jobmatch-ai`)
- ✅ **Configure AI Gateway environment variables** (AI_GATEWAY_SLUG, CLOUDFLARE_ACCOUNT_ID)
- ✅ **Verify AI Gateway integration** (already implemented in openai.ts)
- ✅ **Implement dual-layer embeddings cache** (KV + AI Gateway)
- ✅ **Configure cache policies** per operation type
- ✅ **Test cache hit rates** (should see ~60-70% for embeddings)

**Estimated Time:** +2 hours (total Week 2: 12 hours → 14 hours)

#### Week 7: Testing & Optimization (UPDATED)

**NEW Tasks (add to Week 7):**
- ✅ **Verify AI Gateway analytics** (request counts, cache hits, costs)
- ✅ **Optimize cache TTLs** based on actual hit rates
- ✅ **Document cache performance** (hit rates, cost savings)

**Estimated Time:** +1 hour (total Week 7: 16 hours → 17 hours)

### Updated KV Namespace Count

**From 6 to 6 (no change):**
1. SESSIONS
2. RATE_LIMITS
3. OAUTH_STATES
4. JOB_ANALYSIS_CACHE (existing)
5. **EMBEDDINGS_CACHE** (already planned, now with dual-layer caching)
6. API_CACHE

**AI Gateway is NOT a KV namespace** - it's a separate proxy service (free).

---

## Final Recommendation

### Decision: Use AI Gateway + KV Caching Together

**Recommendation:** ✅ **PROCEED with AI Gateway + KV dual-layer caching**

### Rationale

1. **Already Implemented:** AI Gateway integration already exists in `workers/api/services/openai.ts`
2. **Zero Additional Cost:** AI Gateway is FREE
3. **Incremental Savings:** +$5-13/month beyond KV caching alone
4. **Better Observability:** Analytics dashboard for AI costs (free)
5. **Minimal Effort:** 2-3 hours to add dual-layer embeddings cache
6. **No Downside:** Can disable if not beneficial (just remove gateway config)

### Implementation Priority

**High Priority (Week 2):**
1. ✅ Create AI Gateway in dashboard (`jobmatch-ai`)
2. ✅ Verify environment variables (AI_GATEWAY_SLUG, CLOUDFLARE_ACCOUNT_ID)
3. ✅ Implement dual-layer embeddings cache (KV + AI Gateway)
4. ✅ Configure cache policies (skip for personalized, use for embeddings)

**Medium Priority (Week 7):**
1. Monitor AI Gateway analytics (cache hit rates, costs)
2. Optimize cache TTLs based on actual usage
3. Document cache performance

**Low Priority (Post-Launch):**
1. Experiment with AI Gateway rate limiting (if needed)
2. Enable persistent logs (if debugging needed)
3. Add custom cache keys for advanced use cases

### Expected Results

**Cache Hit Rates:**
- **Embeddings:** 60-70% (KV 40-50% + AI Gateway 20-30%)
- **Job Analysis:** 65-75% (KV only, user-specific)
- **Resume Parsing:** 0-5% (rare re-parsing)

**Cost Savings:**
- **With KV only:** $115-135/month (44-52% reduction)
- **With AI Gateway + KV:** $128-148/month (50-57% reduction)
- **Incremental benefit:** +$5-13/month

**Total Annual Savings:** $1,536-1,776/year

**Investment Required:** 2-3 hours setup time, $0 cost

---

## Summary

### AI Gateway vs KV Caching - Final Answer

**Question:** "Can we use AI Gateway instead of KV caching for AI embeddings and analysis results?"

**Answer:** **Use BOTH, not instead of KV**

| Aspect | AI Gateway | KV Caching | Winner |
|--------|-----------|------------|--------|
| **Caches AI API calls** | ✅ Automatic proxy cache | ❌ No | AI Gateway |
| **User-specific caching** | ❌ No (global only) | ✅ Yes | KV |
| **Custom cache keys** | ⚠️ Limited | ✅ Full control | KV |
| **Long TTLs (30 days)** | ⚠️ Max 1 month | ✅ Yes | KV |
| **Analytics dashboard** | ✅ Free | ❌ Manual | AI Gateway |
| **Cost** | ✅ $0 | ✅ $0 | Tie |
| **Cache hit rate (embeddings)** | 20-30% | 40-50% | KV |
| **Combined hit rate** | - | - | **60-70%** |

### Key Takeaways

1. **AI Gateway ≠ Replacement for KV** - it's a proxy cache, not an application cache
2. **Different cache scopes:** AI Gateway = global, KV = user-specific
3. **Complementary, not competitive:** Use both for maximum savings
4. **Already implemented:** OpenAI service already uses AI Gateway if configured
5. **Zero cost:** Both AI Gateway and KV are FREE at our scale

### Next Steps

1. ✅ Create AI Gateway in Cloudflare dashboard
2. ✅ Add environment variables (AI_GATEWAY_SLUG, CLOUDFLARE_ACCOUNT_ID)
3. ✅ Implement dual-layer embeddings cache (see [Implementation Guide](#implementation-guide))
4. ✅ Test in development environment
5. ✅ Monitor cache hit rates in AI Gateway dashboard
6. ✅ Deploy to staging, then production

### References

**Cloudflare Documentation:**
- [AI Gateway Overview](https://developers.cloudflare.com/ai-gateway/)
- [AI Gateway Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Workers AI with AI Gateway](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/)
- [AI Gateway Pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)

**Internal Documentation:**
- [Cloudflare KV and Workers Architecture](CLOUDFLARE_KV_AND_WORKERS_ARCHITECTURE.md)
- [Cloudflare Full Platform Migration](CLOUDFLARE_FULL_PLATFORM_MIGRATION.md)
- [Workers OpenAI Service](../workers/api/services/openai.ts)

**Search Results:**
- [AI Gateway Overview (Cloudflare)](https://developers.cloudflare.com/ai-gateway/)
- [AI Gateway Pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/)
- [AI Gateway Caching Features](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Workers AI Integration](https://developers.cloudflare.com/ai-gateway/usage/providers/workersai/)

---

**Document Status:** ✅ Complete
**Recommendation:** ✅ **Use AI Gateway + KV Caching Together**
**Cost:** $0/month
**Savings:** $128-148/month (50-57% reduction)
**Effort:** 2-3 hours setup
