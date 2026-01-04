# Cloudflare AI Architecture for JobMatch AI

**Version:** 1.0
**Date:** 2025-12-28
**Status:** Architecture Design & Implementation Roadmap

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Architecture](#current-architecture)
3. [Cloudflare AI Services Overview](#cloudflare-ai-services-overview)
4. [Proposed AI Architecture](#proposed-ai-architecture)
5. [Cost-Benefit Analysis](#cost-benefit-analysis)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Sample Code & Integration Examples](#sample-code--integration-examples)
8. [Performance Considerations](#performance-considerations)
9. [Migration Strategy](#migration-strategy)
10. [References & Resources](#references--resources)

---

## Executive Summary

This document outlines a comprehensive AI architecture for JobMatch AI leveraging Cloudflare's AI/ML services to create a world-class, AI-driven job application platform. The proposed architecture combines Cloudflare Workers AI, Vectorize, AI Gateway, and D1 to deliver:

- **80-90% cost reduction** compared to current OpenAI-only approach
- **Sub-100ms latency** for AI responses via edge caching
- **Semantic job matching** using vector embeddings
- **Scalable RAG pipeline** for context-aware application generation
- **Zero cold starts** with global edge deployment

### Key Recommendations

1. **Hybrid AI Approach**: Use Cloudflare Workers AI for embeddings, caching, and simple tasks; keep OpenAI GPT-4o for complex generation
2. **Implement Vectorize**: Build semantic job-resume matching with vector search
3. **Deploy AI Gateway**: Cache AI responses, reduce API costs by 60-80%
4. **Add D1 Database**: Store metadata and enable fast hybrid search
5. **Phased Migration**: Start with caching and embeddings, gradually migrate generation workloads

---

## Current Architecture

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    Current Architecture                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (Cloudflare Pages)                                │
│  └─ React + Vite + TypeScript                               │
│                                                              │
│  Backend (Cloudflare Workers)                               │
│  ├─ Hono framework                                          │
│  ├─ PostgreSQL rate limiting (via Supabase)                 │
│  └─ RESTful API endpoints                                   │
│                                                              │
│  AI Services (OpenAI)                                       │
│  ├─ GPT-4o (resume parsing with Vision API)                │
│  ├─ GPT-4o-mini (application generation)                    │
│  └─ Direct API calls, no caching                            │
│                                                              │
│  Data Layer (Supabase)                                      │
│  ├─ PostgreSQL database                                     │
│  ├─ Authentication (JWT)                                     │
│  ├─ File storage (R2-like)                                  │
│  └─ Row-level security (RLS)                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Current AI Workloads

| Feature | Model | Avg Tokens | Frequency | Monthly Cost |
|---------|-------|------------|-----------|--------------|
| Resume Parsing | GPT-4o | ~4,000 output | ~100/month | $40 |
| Application Generation | GPT-4o-mini | ~3,000 output | ~200/month | $36 |
| Cover Letter Generation | GPT-4o-mini | ~1,500 output | ~200/month | $18 |
| **Total** | | | | **~$94/month** |

### Pain Points

1. **No semantic job matching** - Relies on manual keyword search
2. **No AI response caching** - Every request hits OpenAI API
3. **No embeddings** - Can't do similarity-based recommendations
4. **High latency** - OpenAI API can take 2-5 seconds
5. **No cost optimization** - No request deduplication or caching

---

## Cloudflare AI Services Overview

### 1. Workers AI

**What it is:** Serverless GPU-powered inference on Cloudflare's global network

**Key Features:**
- Pre-trained LLMs (Llama 3.3 70B, Mistral, Gemma, DeepSeek-R1)
- Text embeddings (Google EmbeddingGemma, BAAI BGE)
- Image models (FLUX.2, Stable Diffusion)
- Speech-to-text (Whisper Large v3 Turbo)
- Text-to-speech (MeloTTS)
- OpenAI-compatible endpoints

**Pricing:** $0.011 per 1,000 Neurons (10,000 Neurons/day free)

**Use Cases for JobMatch AI:**
- Generate embeddings for jobs and resumes
- Semantic similarity search
- Lightweight text generation tasks
- Resume summarization

### 2. Vectorize

**What it is:** Globally distributed vector database for semantic search

**Key Features:**
- Stores up to 5 million vectors per index
- Supports metadata filtering (string, number, boolean)
- Cosine similarity search
- Low-latency queries from edge
- Integrates with Workers AI for embeddings

**Pricing:** Formula: `((queried_vectors + stored_vectors) * dimensions * $0.01 / 1M) + (stored_vectors * dimensions * $0.05 / 100M)`

**Example:** 10,000 vectors of 768 dimensions, queried 30,000 times/month = **$0.31/month**

**Use Cases for JobMatch AI:**
- Store job description embeddings
- Store resume embeddings
- Semantic job matching
- Similar job recommendations
- Resume-job compatibility scoring

### 3. AI Gateway

**What it is:** Observability, caching, and control layer for AI requests

**Key Features:**
- Response caching (up to 90% latency reduction)
- Request analytics and logging
- Rate limiting and cost controls
- Works with OpenAI, Anthropic, Workers AI
- Dynamic routing across providers
- **100% FREE** - no usage charges

**Caching Configuration:**
- Default TTL: 5 minutes (configurable)
- Cache headers: `cf-aig-cache-status` (HIT/MISS)
- Per-request override: `cf-aig-cache-ttl`
- Bypass cache: `cf-aig-skip-cache`

**Use Cases for JobMatch AI:**
- Cache duplicate resume parsing requests
- Cache common application generation patterns
- Reduce OpenAI API costs by 60-80%
- Monitor AI usage and costs
- Load balancing between Workers AI and OpenAI

### 4. D1 Database

**What it is:** Serverless SQLite database at the edge

**Key Features:**
- Built on SQLite
- Up to 10 GB per database
- JSON parsing and full-text search
- 30-day point-in-time recovery
- No egress/bandwidth charges

**Pricing:** Pay only for queries and storage
- Rows read/written charges
- Storage charges
- Free tier available

**Use Cases for JobMatch AI:**
- Store job metadata for hybrid search
- Cache AI-generated content
- Store embedding metadata
- Track user interactions for personalization

### 5. AutoRAG / AI Search (New in 2025)

**What it is:** Fully-managed RAG pipeline (currently in open beta, **FREE**)

**Key Features:**
- Automatic data chunking and embedding
- Vector storage in Vectorize
- Semantic retrieval
- Response generation with Workers AI
- End-to-end managed solution

**Use Cases for JobMatch AI:**
- Context-aware application generation
- Job description understanding
- Resume analysis with historical context

---

## Proposed AI Architecture

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          Cloudflare Edge Network                         │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     Frontend (Pages)                             │   │
│  │  React + Vite → Semantic Job Search UI                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│                                  ▼                                       │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                Backend (Cloudflare Workers)                      │   │
│  │                                                                   │   │
│  │  ┌──────────────────┐   ┌──────────────────┐                   │   │
│  │  │ Job Search API   │   │ Application API  │                   │   │
│  │  │  - Vectorize     │   │  - AI Gateway    │                   │   │
│  │  │  - Hybrid Search │   │  - Workers AI    │                   │   │
│  │  └──────────────────┘   └──────────────────┘                   │   │
│  │                                                                   │   │
│  │  ┌──────────────────┐   ┌──────────────────┐                   │   │
│  │  │ Resume Parser    │   │ Embedding Gen    │                   │   │
│  │  │  - AI Gateway    │   │  - Workers AI    │                   │   │
│  │  │  - OpenAI GPT-4o │   │  - Vectorize     │                   │   │
│  │  └──────────────────┘   └──────────────────┘                   │   │
│  │                                                                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                  │                                       │
│         ┌────────────────────────┼────────────────────────┐            │
│         ▼                        ▼                        ▼            │
│  ┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐    │
│  │ AI Gateway  │     │   Vectorize     │     │   D1 Database   │    │
│  │             │     │                 │     │                 │    │
│  │ • Cache AI  │     │ • Job vectors   │     │ • Job metadata  │    │
│  │ • Analytics │     │ • Resume vectors│     │ • User prefs    │    │
│  │ • Routing   │     │ • Semantic      │     │ • Cache         │    │
│  │ • FREE      │     │   search        │     │ • Analytics     │    │
│  └─────────────┘     │ • $0.31/month   │     └─────────────────┘    │
│         │            └─────────────────┘              │               │
│         │                     │                       │               │
│         ▼                     │                       │               │
│  ┌─────────────┐             │                       │               │
│  │ Workers AI  │◄────────────┘                       │               │
│  │             │                                      │               │
│  │ • Embeddings│                                      │               │
│  │ • LLMs      │                                      │               │
│  │ • 10k/day   │                                      │               │
│  │   free      │                                      │               │
│  └─────────────┘                                      │               │
│         │                                             │               │
│         └──────────────────┬──────────────────────────┘              │
│                            ▼                                          │
│                    ┌───────────────┐                                 │
│                    │   OpenAI API  │                                 │
│                    │               │                                 │
│                    │ • GPT-4o      │                                 │
│                    │   (complex)   │                                 │
│                    │ • Fallback    │                                 │
│                    └───────────────┘                                 │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │    Supabase Backend      │
                    │                          │
                    │  • PostgreSQL Database   │
                    │  • Authentication        │
                    │  • File Storage (R2)     │
                    │  • RLS Security          │
                    └──────────────────────────┘
```

### Component Breakdown

#### 1. Embedding Generation Service

**Purpose:** Convert text to vector embeddings for semantic search

**Technology:** Workers AI → `@cf/google/embeddinggemma-300m`

**Flow:**
```
Job Description → Workers AI Embedding Model → 768-dim vector → Vectorize
Resume Content → Workers AI Embedding Model → 768-dim vector → Vectorize
```

**Benefits:**
- Free (within 10k Neurons/day limit)
- Edge-based, low latency
- Multilingual support (100+ languages)

#### 2. Semantic Job Matching

**Purpose:** Find best-matching jobs for a user's profile

**Technology:** Vectorize + D1 hybrid search

**Flow:**
```
1. User Profile → Generate embedding (Workers AI)
2. Query Vectorize for top 50 similar jobs (cosine similarity)
3. Apply metadata filters via D1 (location, salary, experience)
4. Rank by combined score (75% semantic + 25% keyword match)
5. Return top 20 jobs
```

**Performance:** <100ms for semantic search at edge

#### 3. AI-Powered Application Generation

**Purpose:** Generate tailored resumes and cover letters

**Technology:** AI Gateway → OpenAI GPT-4o-mini (cached) + Workers AI (for simple tasks)

**Flow:**
```
1. Check AI Gateway cache for similar requests (60% hit rate)
2. If cache MISS:
   a. Fetch job + resume data from Supabase
   b. Use Workers AI for basic summarization
   c. Use OpenAI GPT-4o-mini for final generation
   d. Cache response in AI Gateway (TTL: 24 hours)
3. Return generated content
```

**Cost Savings:** 60-80% reduction via caching

#### 4. Resume Parsing

**Purpose:** Extract structured data from resume images/PDFs

**Technology:** AI Gateway → OpenAI GPT-4o Vision API

**Flow:**
```
1. Upload resume to Supabase Storage
2. Generate signed URL
3. Call OpenAI GPT-4o Vision via AI Gateway
4. Cache result (same resume = cache HIT)
5. Parse JSON response
6. Store in PostgreSQL + generate embedding
```

**Cost Savings:** ~40% via deduplication caching

#### 5. RAG-Enhanced Context

**Purpose:** Provide relevant context for AI generation

**Technology:** Vectorize + Workers AI + AutoRAG

**Flow:**
```
1. User query: "Generate application for Senior DevOps role"
2. Generate query embedding
3. Retrieve top 5 similar past applications from Vectorize
4. Fetch user's work experience context
5. Combine into prompt for LLM
6. Generate personalized application
```

**Benefits:**
- More relevant, personalized outputs
- Learn from successful applications
- Reduce hallucinations

---

## Cost-Benefit Analysis

### Current Costs (OpenAI Only)

| Service | Volume/Month | Unit Cost | Monthly Cost |
|---------|-------------|-----------|--------------|
| Resume Parsing (GPT-4o Vision) | 100 requests × 4k tokens | $10/1M output | **$40** |
| Application Generation (GPT-4o-mini) | 200 requests × 3k tokens | $0.60/1M output | **$36** |
| Cover Letter (GPT-4o-mini) | 200 requests × 1.5k tokens | $0.60/1M output | **$18** |
| **Total** | | | **$94/month** |

### Proposed Costs (Cloudflare + OpenAI Hybrid)

| Service | Volume/Month | Unit Cost | Monthly Cost |
|---------|-------------|-----------|--------------|
| **Workers AI** | | | |
| Embeddings (10k jobs + 500 resumes) | ~50k Neurons | $0.011/1k Neurons | **FREE** (under limit) |
| **Vectorize** | | | |
| Storage (10k vectors × 768 dims) | 30k queries/month | Formula | **$0.31** |
| **AI Gateway** | | | |
| Caching & Analytics | Unlimited | Free tier | **$0** |
| **D1 Database** | | | |
| Query + Storage | 100k rows read/month | Pay-per-use | **~$2** |
| **OpenAI (Reduced)** | | | |
| Resume Parsing (60% cached) | 40 requests × 4k tokens | $10/1M output | **$16** |
| Application Generation (80% cached) | 40 requests × 3k tokens | $0.60/1M output | **$7.20** |
| Cover Letter (80% cached) | 40 requests × 1.5k tokens | $0.60/1M output | **$3.60** |
| **Total** | | | **$29.11/month** |

### Cost Savings

- **Old Cost:** $94/month
- **New Cost:** $29.11/month
- **Savings:** $64.89/month (69% reduction)
- **Annual Savings:** $778.68/year

### Additional Benefits

| Benefit | Value |
|---------|-------|
| Latency Reduction | 70-90% faster (cached responses) |
| Semantic Job Matching | Enable new feature (previously impossible) |
| Recommendation Engine | Enable personalized job suggestions |
| Scalability | Auto-scaling at edge (no cold starts) |
| Observability | AI Gateway analytics (free) |
| Geographic Performance | Global edge deployment |

---

## Implementation Roadmap

### Phase 1: Foundation & Caching (Week 1-2)

**Goal:** Set up AI Gateway and enable response caching

**Tasks:**
1. Create AI Gateway in Cloudflare dashboard
2. Update OpenAI service to route through AI Gateway
3. Configure cache TTLs (24h for resume parsing, 1h for generation)
4. Add cache hit/miss logging
5. Measure cost reduction

**Expected Impact:** 60-70% cost reduction immediately

**Deliverables:**
- AI Gateway configured
- OpenAI requests routed through gateway
- Cache analytics dashboard
- Updated `workers/api/services/openai.ts`

### Phase 2: Embedding Generation (Week 3-4)

**Goal:** Generate embeddings for all jobs and resumes

**Tasks:**
1. Add Workers AI binding to `wrangler.toml`
2. Create embedding service using `@cf/google/embeddinggemma-300m`
3. Build batch embedding generation script
4. Generate embeddings for existing jobs
5. Generate embeddings for user resumes on upload
6. Store embeddings (temporary: in D1, later: Vectorize)

**Expected Impact:** Enable semantic search foundation

**Deliverables:**
- `workers/api/services/embeddings.ts`
- Batch embedding script
- D1 schema for embeddings
- API endpoint: `POST /api/embeddings/generate`

### Phase 3: Vectorize Setup (Week 5-6)

**Goal:** Deploy Vectorize for semantic job matching

**Tasks:**
1. Create Vectorize index via Wrangler CLI
2. Migrate embeddings from D1 to Vectorize
3. Build semantic search API endpoint
4. Add metadata filtering (location, salary, skills)
5. Implement hybrid search (semantic + keyword)
6. Create job recommendation endpoint

**Expected Impact:** Enable intelligent job matching

**Deliverables:**
- Vectorize index configured
- `workers/api/routes/search.ts`
- API endpoint: `POST /api/jobs/semantic-search`
- API endpoint: `GET /api/jobs/recommendations`
- Frontend search UI with semantic toggle

### Phase 4: D1 Database Integration (Week 7-8)

**Goal:** Add D1 for metadata and hybrid search

**Tasks:**
1. Create D1 database binding
2. Design schema for job metadata
3. Migrate job metadata to D1
4. Build hybrid search combining Vectorize + D1
5. Add full-text search capabilities
6. Implement query performance optimization

**Expected Impact:** 10x faster hybrid queries

**Deliverables:**
- D1 database configured
- Migration scripts
- Hybrid search implementation
- Performance benchmarks

### Phase 5: RAG Pipeline (Week 9-10)

**Goal:** Implement context-aware application generation

**Tasks:**
1. Design RAG pipeline architecture
2. Store past successful applications in Vectorize
3. Build context retrieval system
4. Enhance prompts with retrieved context
5. A/B test RAG vs non-RAG outputs
6. Fine-tune retrieval parameters

**Expected Impact:** 30-40% better application quality

**Deliverables:**
- RAG service implementation
- Context retrieval API
- Enhanced prompt templates
- Quality metrics dashboard

### Phase 6: Workers AI Migration (Week 11-12)

**Goal:** Migrate simple tasks from OpenAI to Workers AI

**Tasks:**
1. Identify tasks suitable for Workers AI (summarization, simple generation)
2. Test Workers AI models (Llama 3.3, Mistral, Gemma)
3. Create fallback logic (Workers AI → OpenAI on failure)
4. A/B test quality vs OpenAI
5. Migrate low-complexity tasks
6. Monitor quality and adjust

**Expected Impact:** Additional 20-30% cost reduction

**Deliverables:**
- Workers AI service wrapper
- Fallback logic
- Quality comparison report
- Migrated tasks list

### Phase 7: AutoRAG Beta Testing (Week 13-14)

**Goal:** Test Cloudflare's managed RAG solution

**Tasks:**
1. Enable AutoRAG beta
2. Ingest job descriptions and resumes
3. Test semantic retrieval quality
4. Compare with custom Vectorize implementation
5. Evaluate cost and performance
6. Decide on long-term approach

**Expected Impact:** Simplified RAG maintenance (if adopted)

**Deliverables:**
- AutoRAG test environment
- Performance comparison report
- Migration decision document

### Phase 8: Optimization & Monitoring (Week 15-16)

**Goal:** Fine-tune and monitor production AI system

**Tasks:**
1. Set up AI Gateway analytics dashboards
2. Configure cost alerts
3. Optimize cache TTLs based on usage patterns
4. Fine-tune vector search parameters
5. Implement A/B testing framework
6. Create AI performance SLIs/SLOs

**Expected Impact:** Continuous improvement

**Deliverables:**
- Monitoring dashboards
- Cost alert system
- Performance optimization guide
- SLI/SLO documentation

---

## Sample Code & Integration Examples

### 1. AI Gateway Integration

```typescript
// workers/api/services/ai-gateway.ts

import OpenAI from 'openai';
import type { Env } from '../types';

/**
 * Create OpenAI client with AI Gateway
 * Routes all requests through Cloudflare AI Gateway for caching and analytics
 */
export function createOpenAIWithGateway(env: Env): OpenAI {
  // AI Gateway endpoint format:
  // https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_slug}/openai
  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`;

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL: gatewayUrl,
  });
}

/**
 * Make AI request with custom cache TTL
 */
export async function makeAIRequestWithCache(
  openai: OpenAI,
  messages: any[],
  cacheTTL: number = 3600, // 1 hour default
  skipCache: boolean = false
) {
  const headers: Record<string, string> = {};

  if (skipCache) {
    headers['cf-aig-skip-cache'] = 'true';
  } else {
    headers['cf-aig-cache-ttl'] = cacheTTL.toString();
  }

  const completion = await openai.chat.completions.create(
    {
      model: 'gpt-4o-mini',
      messages,
    },
    { headers }
  );

  // Log cache status
  const cacheStatus = completion.headers?.get('cf-aig-cache-status');
  console.log(`AI Gateway Cache Status: ${cacheStatus}`); // HIT or MISS

  return completion;
}
```

**Usage in application generation:**

```typescript
// workers/api/services/openai.ts

export async function generateApplicationVariants(
  env: Env,
  context: GenerationContext
): Promise<ApplicationVariant[]> {
  const openai = createOpenAIWithGateway(env);

  // Cache for 24 hours (resume parsing results are stable)
  const cacheTTL = 24 * 60 * 60; // 86400 seconds

  const completion = await makeAIRequestWithCache(
    openai,
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(context) }
    ],
    cacheTTL
  );

  return JSON.parse(completion.choices[0]?.message.content || '{}');
}
```

### 2. Workers AI Embedding Generation

```typescript
// workers/api/services/embeddings.ts

import type { Env } from '../types';

/**
 * Generate text embeddings using Workers AI
 * Model: @cf/google/embeddinggemma-300m
 * Dimensions: 768
 */
export async function generateEmbedding(
  env: Env,
  text: string
): Promise<number[]> {
  const response = await env.AI.run('@cf/google/embeddinggemma-300m', {
    text,
  });

  // Response format: { data: [[0.123, 0.456, ...]] }
  return response.data[0];
}

/**
 * Batch generate embeddings for multiple texts
 */
export async function generateEmbeddingsBatch(
  env: Env,
  texts: string[]
): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(env, text))
  );

  return embeddings;
}

/**
 * Generate job description embedding
 * Combines title, company, description, and skills
 */
export async function generateJobEmbedding(
  env: Env,
  job: {
    title: string;
    company: string;
    description: string;
    requiredSkills?: string[];
  }
): Promise<number[]> {
  // Combine relevant fields into searchable text
  const text = [
    job.title,
    job.company,
    job.description,
    ...(job.requiredSkills || [])
  ].join(' ');

  return generateEmbedding(env, text);
}

/**
 * Generate resume embedding
 * Combines profile, experience, education, skills
 */
export async function generateResumeEmbedding(
  env: Env,
  resume: {
    headline?: string;
    summary?: string;
    workExperience: Array<{ position: string; description: string }>;
    education: Array<{ degree: string; field: string }>;
    skills: Array<{ name: string }>;
  }
): Promise<number[]> {
  // Combine all resume sections
  const text = [
    resume.headline || '',
    resume.summary || '',
    ...resume.workExperience.map(exp => `${exp.position} ${exp.description}`),
    ...resume.education.map(edu => `${edu.degree} ${edu.field}`),
    ...resume.skills.map(skill => skill.name)
  ].join(' ');

  return generateEmbedding(env, text);
}
```

### 3. Vectorize Integration

```typescript
// workers/api/services/vectorize.ts

import type { Env } from '../types';

/**
 * Insert job embedding into Vectorize
 */
export async function indexJobEmbedding(
  env: Env,
  jobId: string,
  embedding: number[],
  metadata: {
    title: string;
    company: string;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    experienceLevel?: string;
  }
) {
  await env.VECTORIZE_INDEX.insert([
    {
      id: jobId,
      values: embedding,
      metadata,
    },
  ]);
}

/**
 * Search for similar jobs using vector similarity
 */
export async function searchSimilarJobs(
  env: Env,
  queryEmbedding: number[],
  options: {
    topK?: number;
    filter?: Record<string, any>;
    returnMetadata?: boolean;
  } = {}
): Promise<Array<{ id: string; score: number; metadata?: any }>> {
  const results = await env.VECTORIZE_INDEX.query(queryEmbedding, {
    topK: options.topK || 20,
    filter: options.filter,
    returnMetadata: options.returnMetadata !== false,
  });

  return results.matches.map(match => ({
    id: match.id,
    score: match.score,
    metadata: match.metadata,
  }));
}

/**
 * Semantic job search endpoint
 */
export async function semanticJobSearch(
  env: Env,
  userResumeEmbedding: number[],
  filters?: {
    location?: string;
    salaryMin?: number;
    experienceLevel?: string;
  }
) {
  // Build metadata filter
  const filter: Record<string, any> = {};
  if (filters?.location) {
    filter.location = { $eq: filters.location };
  }
  if (filters?.salaryMin) {
    filter.salaryMin = { $gte: filters.salaryMin };
  }
  if (filters?.experienceLevel) {
    filter.experienceLevel = { $eq: filters.experienceLevel };
  }

  // Search Vectorize
  const results = await searchSimilarJobs(env, userResumeEmbedding, {
    topK: 50,
    filter: Object.keys(filter).length > 0 ? filter : undefined,
    returnMetadata: true,
  });

  return results;
}
```

### 4. Hybrid Search (Vectorize + D1)

```typescript
// workers/api/services/hybrid-search.ts

import type { Env } from '../types';
import { searchSimilarJobs } from './vectorize';

/**
 * Hybrid search combining semantic similarity and keyword matching
 *
 * Approach:
 * 1. Vectorize for semantic similarity (75% weight)
 * 2. D1 full-text search for keyword matching (25% weight)
 * 3. Combine and re-rank results
 */
export async function hybridJobSearch(
  env: Env,
  params: {
    resumeEmbedding: number[];
    keywords?: string[];
    filters?: {
      location?: string;
      salaryMin?: number;
      experienceLevel?: string;
    };
    limit?: number;
  }
) {
  const limit = params.limit || 20;

  // 1. Semantic search via Vectorize
  const semanticResults = await searchSimilarJobs(
    env,
    params.resumeEmbedding,
    {
      topK: 50,
      filter: params.filters,
      returnMetadata: true,
    }
  );

  // 2. Keyword search via D1 (if keywords provided)
  let keywordScores: Record<string, number> = {};

  if (params.keywords && params.keywords.length > 0) {
    const keywordQuery = params.keywords.join(' OR ');

    // Use D1 full-text search
    const stmt = env.D1.prepare(`
      SELECT
        id,
        bm25(jobs_fts) as keyword_score
      FROM jobs_fts
      WHERE jobs_fts MATCH ?
      ORDER BY keyword_score DESC
      LIMIT 50
    `).bind(keywordQuery);

    const { results } = await stmt.all();

    results.forEach((row: any) => {
      keywordScores[row.id] = row.keyword_score;
    });
  }

  // 3. Combine scores (75% semantic, 25% keyword)
  const combinedResults = semanticResults.map(result => {
    const semanticScore = result.score;
    const keywordScore = keywordScores[result.id] || 0;

    // Normalize and combine
    const finalScore = (semanticScore * 0.75) + (keywordScore * 0.25);

    return {
      jobId: result.id,
      score: finalScore,
      semanticScore,
      keywordScore,
      metadata: result.metadata,
    };
  });

  // 4. Sort by combined score and limit
  combinedResults.sort((a, b) => b.score - a.score);

  return combinedResults.slice(0, limit);
}
```

### 5. RAG Context Retrieval

```typescript
// workers/api/services/rag.ts

import type { Env } from '../types';
import { generateEmbedding, searchSimilarJobs } from './vectorize';

/**
 * Retrieve relevant context for AI generation using RAG
 *
 * Steps:
 * 1. Generate query embedding
 * 2. Search Vectorize for similar past applications
 * 3. Fetch full context from D1/Supabase
 * 4. Return structured context for LLM prompt
 */
export async function retrieveApplicationContext(
  env: Env,
  params: {
    jobTitle: string;
    jobDescription: string;
    userId: string;
  }
): Promise<{
  similarApplications: any[];
  userContext: any;
}> {
  // 1. Generate query embedding from job title + description
  const queryText = `${params.jobTitle} ${params.jobDescription}`;
  const queryEmbedding = await generateEmbedding(env, queryText);

  // 2. Search for similar past applications in Vectorize
  const similarAppEmbeddings = await env.VECTORIZE_INDEX.query(
    queryEmbedding,
    {
      topK: 5,
      filter: {
        type: { $eq: 'application' },
        userId: { $eq: params.userId },
      },
      returnMetadata: true,
    }
  );

  // 3. Fetch full application data from D1
  const applicationIds = similarAppEmbeddings.matches.map(m => m.id);

  const stmt = env.D1.prepare(`
    SELECT
      id,
      job_title,
      company,
      cover_letter,
      ai_rationale
    FROM applications
    WHERE id IN (${applicationIds.map(() => '?').join(',')})
    AND status = 'submitted'
  `).bind(...applicationIds);

  const { results: applications } = await stmt.all();

  // 4. Fetch user's recent work experience
  const userStmt = env.D1.prepare(`
    SELECT position, company, description, accomplishments
    FROM work_experience
    WHERE user_id = ?
    ORDER BY start_date DESC
    LIMIT 3
  `).bind(params.userId);

  const { results: workExperience } = await userStmt.all();

  return {
    similarApplications: applications,
    userContext: {
      recentExperience: workExperience,
    },
  };
}

/**
 * Enhanced prompt with RAG context
 */
export function buildRAGPrompt(
  job: any,
  profile: any,
  context: {
    similarApplications: any[];
    userContext: any;
  }
): string {
  const similarAppsContext = context.similarApplications
    .map((app, i) => `
Example ${i + 1}:
- Job: ${app.job_title} at ${app.company}
- Successful approach: ${app.ai_rationale}
- Cover letter excerpt: ${app.cover_letter.substring(0, 200)}...
    `)
    .join('\n');

  return `
You are generating an application for:
Job Title: ${job.title}
Company: ${job.company}

Based on the candidate's successful past applications to similar roles:
${similarAppsContext}

Recent work experience:
${context.userContext.recentExperience.map((exp: any) =>
  `- ${exp.position} at ${exp.company}: ${exp.description}`
).join('\n')}

Generate a tailored application following the successful patterns shown above.
`;
}
```

### 6. Wrangler Configuration

```toml
# workers/wrangler.toml

name = "jobmatch-ai"
main = "api/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Workers AI binding
[ai]
binding = "AI"

# Vectorize index binding
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "jobmatch-embeddings"

# D1 database binding
[[d1_databases]]
binding = "D1"
database_name = "jobmatch"
database_id = "your-d1-database-id"

# AI Gateway (environment variables)
[vars]
CLOUDFLARE_ACCOUNT_ID = "your-account-id"
AI_GATEWAY_SLUG = "jobmatch-ai-gateway"

# Production environment
[env.production]
name = "jobmatch-ai-prod"
vars = { ENVIRONMENT = "production" }
```

### 7. API Endpoint Examples

```typescript
// workers/api/routes/semantic-search.ts

import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types';
import { authenticateUser, getUserId } from '../middleware/auth';
import { generateResumeEmbedding } from '../services/embeddings';
import { hybridJobSearch } from '../services/hybrid-search';
import { createSupabaseAdmin } from '../services/supabase';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const searchSchema = z.object({
  keywords: z.array(z.string()).optional(),
  location: z.string().optional(),
  salaryMin: z.number().optional(),
  experienceLevel: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
});

/**
 * POST /api/jobs/semantic-search
 * Semantic job search using user's resume embedding
 */
app.post('/semantic-search', authenticateUser, async (c) => {
  const userId = getUserId(c);
  const body = await c.req.json();

  const parseResult = searchSchema.safeParse(body);
  if (!parseResult.success) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const params = parseResult.data;
  const supabase = createSupabaseAdmin(c.env);

  // Fetch user's resume data
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  const { data: workExp } = await supabase
    .from('work_experience')
    .select('*')
    .eq('user_id', userId);

  const { data: skills } = await supabase
    .from('skills')
    .select('*')
    .eq('user_id', userId);

  // Generate resume embedding
  const resumeEmbedding = await generateResumeEmbedding(c.env, {
    headline: profile.headline,
    summary: profile.summary,
    workExperience: workExp || [],
    education: [], // fetch if needed
    skills: skills || [],
  });

  // Perform hybrid search
  const results = await hybridJobSearch(c.env, {
    resumeEmbedding,
    keywords: params.keywords,
    filters: {
      location: params.location,
      salaryMin: params.salaryMin,
      experienceLevel: params.experienceLevel,
    },
    limit: params.limit,
  });

  // Fetch full job details from Supabase
  const jobIds = results.map(r => r.jobId);
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .in('id', jobIds);

  // Merge with scores
  const jobsWithScores = jobs?.map(job => ({
    ...job,
    matchScore: results.find(r => r.jobId === job.id)?.score || 0,
  }));

  return c.json({
    jobs: jobsWithScores,
    total: results.length,
  });
});

export default app;
```

---

## Performance Considerations

### Latency Targets

| Operation | Current | Target | Method |
|-----------|---------|--------|--------|
| Semantic Job Search | N/A | <100ms | Vectorize at edge |
| Resume Parsing (cached) | 3-5s | <50ms | AI Gateway cache HIT |
| Resume Parsing (uncached) | 3-5s | 2-3s | AI Gateway routing |
| Application Generation (cached) | 2-4s | <50ms | AI Gateway cache HIT |
| Application Generation (uncached) | 2-4s | 1-2s | Workers AI for simple tasks |

### Caching Strategy

**Resume Parsing:**
- TTL: 24 hours (resumes don't change frequently)
- Cache key: Hash of resume file content
- Hit rate target: 40%+

**Application Generation:**
- TTL: 1 hour (job descriptions can update)
- Cache key: Hash of job ID + user ID
- Hit rate target: 60%+

**Embeddings:**
- TTL: 7 days (embeddings are stable)
- Cache key: Hash of input text
- Hit rate target: 80%+

### Scaling Considerations

**Vectorize Limits:**
- Max 5 million vectors per index
- Current need: ~10,000 jobs + ~1,000 resumes = 11,000 vectors
- Headroom: 454x current usage
- Strategy: Implement TTL-based cleanup for old jobs

**Workers AI Limits:**
- 10,000 Neurons/day free
- Current usage: ~500 Neurons/day (embeddings)
- Headroom: 20x free tier
- Upgrade trigger: >8,000 Neurons/day sustained

**D1 Limits:**
- 10 GB per database
- Current need: <100 MB (metadata only)
- Headroom: 100x current usage

### Monitoring & Alerting

**Key Metrics:**

1. **AI Gateway Cache Hit Rate**
   - Target: >60% overall
   - Alert: <40% for 1 hour

2. **Workers AI Usage**
   - Target: <8,000 Neurons/day
   - Alert: >9,000 Neurons/day

3. **OpenAI Costs**
   - Target: <$30/month
   - Alert: >$50/month

4. **Vectorize Query Latency**
   - Target: p95 <100ms
   - Alert: p95 >200ms

5. **End-to-End Latency**
   - Target: p95 <500ms
   - Alert: p95 >1,000ms

---

## Migration Strategy

### Phased Approach

**Phase 1: Non-Breaking Additions (Low Risk)**
- Add AI Gateway (transparent to users)
- Generate embeddings in background
- Set up Vectorize (not yet used in production)
- Deploy D1 database

**Phase 2: Parallel Deployment (Medium Risk)**
- Deploy semantic search as beta feature
- A/B test hybrid search vs keyword search
- Collect user feedback
- Optimize based on metrics

**Phase 3: Gradual Migration (Medium Risk)**
- Enable semantic search for 10% of users
- Monitor performance and quality
- Gradually increase to 50%, then 100%
- Keep keyword search as fallback

**Phase 4: Advanced Features (Low Risk)**
- Deploy RAG-enhanced application generation
- Migrate simple tasks to Workers AI
- Enable AutoRAG for testing
- Optimize caching policies

### Rollback Plan

**Each phase has a rollback strategy:**

1. **AI Gateway Rollback**: Remove gateway URL, direct to OpenAI
2. **Vectorize Rollback**: Disable semantic search, fallback to keyword
3. **Workers AI Rollback**: Fallback to OpenAI for all tasks
4. **D1 Rollback**: Read from Supabase instead of D1

**Rollback triggers:**
- Error rate >5%
- Latency p95 >2x baseline
- User complaints >10% increase
- Cost >2x budget

### Testing Strategy

**Unit Tests:**
- Embedding generation (compare output dimensions)
- Vectorize queries (mock responses)
- Cache logic (verify TTLs)
- RAG context retrieval

**Integration Tests:**
- End-to-end semantic search
- AI Gateway caching behavior
- Hybrid search accuracy
- Fallback mechanisms

**Performance Tests:**
- Load test Vectorize (1000 QPS)
- Cache hit rate validation
- Latency benchmarks
- Cost simulation

**Quality Tests:**
- A/B test semantic vs keyword search
- RAG vs non-RAG application quality
- Workers AI vs OpenAI output comparison
- User satisfaction surveys

---

## References & Resources

### Official Documentation

**Cloudflare Workers AI:**
- [Overview](https://developers.cloudflare.com/workers-ai/)
- [Models](https://developers.cloudflare.com/workers-ai/models/)
- [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)

**Cloudflare Vectorize:**
- [Overview](https://developers.cloudflare.com/vectorize/)
- [Pricing](https://developers.cloudflare.com/vectorize/platform/pricing/)
- [Get Started](https://developers.cloudflare.com/vectorize/get-started/intro/)

**Cloudflare AI Gateway:**
- [Overview](https://developers.cloudflare.com/ai-gateway/)
- [Caching](https://developers.cloudflare.com/ai-gateway/features/caching/)
- [Pricing](https://developers.cloudflare.com/ai-gateway/reference/pricing/) (FREE)

**Cloudflare D1:**
- [Overview](https://developers.cloudflare.com/d1/)
- [Pricing](https://developers.cloudflare.com/d1/platform/pricing/)

**RAG Tutorials:**
- [Build RAG AI](https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/)
- [RAG Reference Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/)
- [AutoRAG Introduction](https://blog.cloudflare.com/introducing-autorag-on-cloudflare/)

### External Resources

**Semantic Search Best Practices:**
- [Talent Matching with Vector Embeddings](https://www.ingedata.ai/blog/2025/04/01/talent-matching-with-vector-embeddings/)
- [Building Jobly: Semantic Job Matching](https://huggingface.co/blog/MCP-1st-Birthday/building-jobly-semantic-job-matching-with-rag-and)
- [Hyper-Relevant Semantic Hiring](https://www.v2solutions.com/blogs/semantic-hiring-vector-search-rag/)

**OpenAI Pricing:**
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [GPT-4o Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4o)
- [GPT-4o-mini Pricing](https://pricepertoken.com/pricing-page/model/openai-gpt-4o-mini)

### Example Repositories

- [Cloudflare RAG Example](https://github.com/kristianfreeman/cloudflare-retrieval-augmented-generation-example)
- [Fullstack PDF Chat RAG](https://github.com/RafalWilinski/cloudflare-rag)
- [Contextual RAG Tutorial](https://boristane.com/blog/cloudflare-contextual-rag/)

---

## Appendix: Architecture Decision Records

### ADR-001: Hybrid AI Approach (Cloudflare + OpenAI)

**Status:** Accepted

**Context:** Need to balance cost, quality, and feature capabilities

**Decision:** Use hybrid approach:
- Cloudflare Workers AI for embeddings, caching, simple tasks
- OpenAI GPT-4o for complex generation (resume parsing, applications)
- AI Gateway for all requests (caching, analytics)

**Rationale:**
- Workers AI embeddings are free and fast
- OpenAI GPT-4o provides superior quality for complex tasks
- AI Gateway reduces OpenAI costs by 60-80% via caching
- Hybrid approach gives best cost/quality ratio

**Consequences:**
- More complex implementation (two AI providers)
- Need fallback logic
- Excellent cost savings (69% reduction)
- High quality maintained for critical features

### ADR-002: Vectorize for Semantic Search

**Status:** Accepted

**Context:** Need semantic job matching capability

**Decision:** Use Cloudflare Vectorize for vector storage and similarity search

**Rationale:**
- Purpose-built for vector search
- Global edge deployment (low latency)
- Extremely low cost ($0.31/month for our scale)
- Native integration with Workers AI
- Metadata filtering support

**Consequences:**
- Need to generate embeddings for all jobs/resumes
- Implement batch processing for embeddings
- Simpler than self-hosted vector DB
- Scalable to millions of vectors

### ADR-003: D1 for Hybrid Search

**Status:** Accepted

**Context:** Need to combine semantic search with metadata filtering

**Decision:** Use D1 for job metadata and full-text search

**Rationale:**
- Built-in full-text search (SQLite FTS5)
- Low latency at edge
- Pay-per-use pricing
- Easy integration with Workers
- Enables hybrid search (semantic + keyword)

**Consequences:**
- Need to sync job data to D1
- Implement hybrid ranking algorithm
- Better search quality than Vectorize alone
- Minimal cost increase (~$2/month)

### ADR-004: AI Gateway for All Requests

**Status:** Accepted

**Context:** High OpenAI costs, no caching or analytics

**Decision:** Route all AI requests through Cloudflare AI Gateway

**Rationale:**
- 100% free (no usage charges)
- Automatic response caching
- 60-80% cost reduction via deduplication
- Built-in analytics and monitoring
- No code changes required (just change baseURL)

**Consequences:**
- Requests routed through Cloudflare network (minimal latency)
- Need to manage cache TTLs appropriately
- Immediate cost savings with zero downside
- Better observability into AI usage

---

**End of Document**

For questions or implementation support, refer to:
- Workers API: `/home/carl/application-tracking/jobmatch-ai/workers/`
- Cloudflare Dashboard: `https://dash.cloudflare.com/`
- Project README: `/home/carl/application-tracking/jobmatch-ai/README-CLOUDFLARE.md`
