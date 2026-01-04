# Cloudflare AI Quick Start Guide

**Goal:** Get AI Gateway and embeddings working in 1 hour

---

## Prerequisites

- Cloudflare account
- Wrangler CLI installed
- Workers backend deployed
- OpenAI API key configured

---

## Step 1: Enable AI Gateway (15 minutes)

### 1.1 Create AI Gateway

```bash
# Login to Cloudflare dashboard
# Navigate to: AI > AI Gateway > Create Gateway

Gateway name: jobmatch-ai-gateway
Slug: jobmatch-ai-gateway
```

### 1.2 Get Your Account ID

```bash
# View account ID
wrangler whoami

# Or from dashboard URL:
# https://dash.cloudflare.com/{ACCOUNT_ID}/
```

### 1.3 Update Environment Variables

```bash
# Add to workers/.dev.vars
echo "CLOUDFLARE_ACCOUNT_ID=your-account-id" >> workers/.dev.vars
echo "AI_GATEWAY_SLUG=jobmatch-ai-gateway" >> workers/.dev.vars

# Add production secrets
wrangler secret put CLOUDFLARE_ACCOUNT_ID
wrangler secret put AI_GATEWAY_SLUG
```

### 1.4 Update OpenAI Service

```typescript
// workers/api/services/openai.ts

export function createOpenAI(env: Env): OpenAI {
  // Use AI Gateway if configured
  const baseURL = env.CLOUDFLARE_ACCOUNT_ID && env.AI_GATEWAY_SLUG
    ? `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.AI_GATEWAY_SLUG}/openai`
    : undefined;

  return new OpenAI({
    apiKey: env.OPENAI_API_KEY,
    baseURL,
  });
}
```

### 1.5 Deploy & Test

```bash
cd workers
wrangler deploy

# Test resume parsing - should see cache MISS first time
curl -X POST https://your-worker.workers.dev/api/resume/parse \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"storagePath": "test-resume.png"}'

# Test again - should see cache HIT second time
# Check AI Gateway dashboard for analytics
```

**Expected Result:** All OpenAI requests now routed through AI Gateway, cache hit rate visible in dashboard

---

## Step 2: Add Workers AI Binding (10 minutes)

### 2.1 Update wrangler.toml

```toml
# workers/wrangler.toml

[ai]
binding = "AI"
```

### 2.2 Update Types

```typescript
// workers/api/types.ts

export interface Env {
  // ... existing bindings
  AI: any; // Workers AI binding
  CLOUDFLARE_ACCOUNT_ID?: string;
  AI_GATEWAY_SLUG?: string;
}
```

### 2.3 Deploy

```bash
wrangler deploy
```

**Expected Result:** Workers AI available via `c.env.AI` in all routes

---

## Step 3: Create Embedding Service (15 minutes)

### 3.1 Create Embedding Service File

```typescript
// workers/api/services/embeddings.ts

import type { Env } from '../types';

export async function generateEmbedding(
  env: Env,
  text: string
): Promise<number[]> {
  const response = await env.AI.run('@cf/google/embeddinggemma-300m', {
    text,
  });

  return response.data[0];
}

export async function generateJobEmbedding(
  env: Env,
  job: { title: string; company: string; description: string }
): Promise<number[]> {
  const text = `${job.title} ${job.company} ${job.description}`;
  return generateEmbedding(env, text);
}
```

### 3.2 Create Test Endpoint

```typescript
// workers/api/routes/embeddings.ts

import { Hono } from 'hono';
import { generateEmbedding } from '../services/embeddings';

const app = new Hono();

app.post('/test', async (c) => {
  const { text } = await c.req.json();
  const embedding = await generateEmbedding(c.env, text);

  return c.json({
    dimensions: embedding.length,
    preview: embedding.slice(0, 5),
  });
});

export default app;
```

### 3.3 Register Route

```typescript
// workers/api/index.ts

import embeddings from './routes/embeddings';

app.route('/api/embeddings', embeddings);
```

### 3.4 Deploy & Test

```bash
wrangler deploy

# Test embedding generation
curl -X POST https://your-worker.workers.dev/api/embeddings/test \
  -H "Content-Type: application/json" \
  -d '{"text": "Senior Software Engineer with 5 years experience in React and Node.js"}'

# Expected response:
# {
#   "dimensions": 768,
#   "preview": [0.123, -0.456, 0.789, -0.234, 0.567]
# }
```

**Expected Result:** Working embedding generation using Workers AI

---

## Step 4: Create Vectorize Index (10 minutes)

### 4.1 Create Index via Wrangler

```bash
# Create Vectorize index
wrangler vectorize create jobmatch-embeddings \
  --dimensions=768 \
  --metric=cosine

# Note the index ID from output
```

### 4.2 Update wrangler.toml

```toml
# workers/wrangler.toml

[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "jobmatch-embeddings"
```

### 4.3 Update Types

```typescript
// workers/api/types.ts

export interface Env {
  // ... existing
  VECTORIZE_INDEX: VectorizeIndex;
}
```

### 4.4 Deploy

```bash
wrangler deploy
```

**Expected Result:** Vectorize index ready to store embeddings

---

## Step 5: Test End-to-End (10 minutes)

### 5.1 Create Test Script

```typescript
// workers/scripts/test-embeddings.ts

// 1. Generate job embedding
const jobEmbedding = await generateJobEmbedding(env, {
  title: 'Senior React Developer',
  company: 'Tech Corp',
  description: 'Build scalable web applications...',
});

// 2. Store in Vectorize
await env.VECTORIZE_INDEX.insert([
  {
    id: 'job-123',
    values: jobEmbedding,
    metadata: {
      title: 'Senior React Developer',
      company: 'Tech Corp',
    },
  },
]);

// 3. Search for similar jobs
const queryEmbedding = await generateEmbedding(env, 'React developer position');

const results = await env.VECTORIZE_INDEX.query(queryEmbedding, {
  topK: 5,
  returnMetadata: true,
});

console.log('Similar jobs:', results.matches);
```

### 5.2 Run Test

```bash
wrangler dev

# Use Postman or curl to trigger test endpoint
```

**Expected Result:** Job indexed and searchable via semantic similarity

---

## Verification Checklist

- [ ] AI Gateway showing requests in dashboard
- [ ] Cache hit rate >0% after multiple identical requests
- [ ] Workers AI binding accessible
- [ ] Embeddings generating 768-dimension vectors
- [ ] Vectorize index created and queryable
- [ ] End-to-end semantic search working

---

## Next Steps

1. **Batch Generate Embeddings**: Create script to embed all existing jobs
2. **Add Semantic Search UI**: Update frontend with semantic search toggle
3. **Enable D1**: Set up D1 for hybrid search
4. **Optimize Caching**: Tune cache TTLs based on usage patterns
5. **Monitor Costs**: Track Neurons usage and OpenAI cost reduction

---

## Troubleshooting

### AI Gateway not caching

**Issue:** Every request shows cache MISS

**Solution:**
- Check identical requests (same job ID, same user)
- Verify cache TTL headers
- Wait 5 minutes for cache to populate
- Check AI Gateway logs in dashboard

### Workers AI binding not found

**Issue:** `env.AI is undefined`

**Solution:**
```bash
# Ensure wrangler.toml has AI binding
cat workers/wrangler.toml | grep -A 2 "\[ai\]"

# Re-deploy
wrangler deploy
```

### Vectorize insert fails

**Issue:** `VectorizeIndex is not defined`

**Solution:**
```bash
# Verify index exists
wrangler vectorize list

# Check binding in wrangler.toml
cat workers/wrangler.toml | grep -A 3 "vectorize"

# Re-deploy
wrangler deploy
```

### Embeddings wrong dimension

**Issue:** Generated embeddings not 768 dimensions

**Solution:**
- Verify model name: `@cf/google/embeddinggemma-300m`
- Check response format: `response.data[0]`
- Log embedding length: `console.log(embedding.length)`

---

## Cost Tracking

After setup, monitor costs:

| Metric | Dashboard Location | Target |
|--------|-------------------|--------|
| Workers AI Neurons | Workers AI > Analytics | <10k/day (free) |
| AI Gateway Requests | AI Gateway > Analytics | Any (free) |
| AI Gateway Cache Hit Rate | AI Gateway > Analytics | >60% |
| Vectorize Queries | Vectorize > Analytics | <1M/month |
| OpenAI Costs | OpenAI Dashboard | <$30/month |

---

## Resources

- AI Gateway Dashboard: `https://dash.cloudflare.com/{account}/ai/ai-gateway`
- Workers AI Docs: `https://developers.cloudflare.com/workers-ai/`
- Vectorize Docs: `https://developers.cloudflare.com/vectorize/`
- Full Architecture: `/docs/CLOUDFLARE_AI_ARCHITECTURE.md`
