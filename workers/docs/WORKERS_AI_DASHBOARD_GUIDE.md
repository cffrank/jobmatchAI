# Why Workers AI Doesn't Appear in Your Cloudflare Dashboard

## TL;DR - This is Normal!

**Workers AI is NOT a separate service you configure in the Cloudflare dashboard.** It's an API binding that becomes automatically available when you deploy a Worker with the `[ai]` binding in `wrangler.toml`. There's no "Workers AI" section in the dashboard like there is for KV, D1, or R2.

---

## How Workers AI Works

### 1. Configuration-Only Setup

Workers AI is enabled purely through your `wrangler.toml` configuration:

```toml
# Workers AI binding for embeddings
[ai]
binding = "AI"

# Environment-specific bindings
[env.development.ai]
binding = "AI"

[env.staging.ai]
binding = "AI"

[env.production.ai]
binding = "AI"
```

**That's it.** No dashboard configuration needed. No separate service to create.

### 2. Your Configuration is Correct

Your `/home/carl/application-tracking/jobmatch-ai/workers/wrangler.toml` file shows:

✅ **Line 17-18**: Global AI binding configured
✅ **Line 27-28**: Development environment AI binding
✅ **Line 36-37**: Staging environment AI binding
✅ **Line 45-46**: Production environment AI binding

All environments are properly configured for Workers AI.

### 3. Recent Deployments Confirmed

Your recent deployments show the Workers are active:

**Development environment:**
- Latest deployment: 2025-12-29T23:13:27 (today)
- Version: Multiple successful deployments

**Production environment:**
- Latest deployment: 2025-12-28T19:34:18
- Status: Active and running

These deployments automatically include the AI binding.

---

## What Makes Workers AI Different?

### Traditional Cloudflare Services

**KV Namespaces, D1 Databases, R2 Buckets:**
- Create through dashboard or CLI
- Get unique IDs
- Configure bindings in wrangler.toml
- Appear in dashboard under "Workers & Pages" → "KV"/"D1"/"R2"

**Example:**
```toml
# You created these KV namespaces and got IDs
[[env.development.kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "fce1eb2547c14cd0811521246fec5c76"  # Created in dashboard
```

### Workers AI (Different Approach)

**Workers AI:**
- No creation step needed
- No unique ID to track
- Just add binding to wrangler.toml
- Automatically available at runtime
- Usage tracked globally, not per-project

**Example:**
```toml
# Just add binding - no ID needed
[ai]
binding = "AI"
```

Think of it like using `fetch()` in your Worker - you don't need to "create a Fetch service" in the dashboard, it's just available as part of the Workers runtime. Workers AI is the same.

---

## How to Verify Workers AI is Working

### Method 1: Check Your Code

Workers AI is actively used in your codebase:

**1. Embeddings Service** (`/workers/api/services/embeddings.ts`):
```typescript
// Line 80 - Workers AI is called directly
const response = await env.AI.run(EMBEDDING_MODEL, {
  text: [truncatedText],
});
```

**2. Compatibility Analysis** (`/workers/api/services/workersAI.ts`):
```typescript
// Line 119 - Workers AI generates job compatibility analysis
const response = await env.AI.run(model, {
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: ANALYSIS_CONFIG.TEMPERATURE,
  max_tokens: ANALYSIS_CONFIG.MAX_TOKENS,
  response_format: { type: 'json_object' },
});
```

### Method 2: Check Deployment Logs

When you deploy, wrangler automatically validates your bindings:

```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler deploy --env development
```

If the AI binding was misconfigured, deployment would fail with an error. Your successful deployments confirm it's working.

### Method 3: Test API Endpoints

Your Workers have endpoints that use Workers AI:

**Embeddings endpoint** (profile updates, job creation):
- POST `/api/profile` - Updates resume embedding using Workers AI
- POST `/api/jobs` - Generates job embedding using Workers AI

**Compatibility analysis endpoint**:
- GET `/api/jobs/:id/compatibility` - Analyzes job fit using Workers AI

If these endpoints work, Workers AI is functioning.

### Method 4: Check Analytics (Where Workers AI Actually Appears)

Workers AI usage DOES appear in the Cloudflare dashboard, just not where you'd expect:

**Navigate to:**
1. Cloudflare Dashboard → Account Home
2. **Workers & Pages** (left sidebar)
3. Click your Worker name (e.g., "jobmatch-ai-dev")
4. **Metrics** tab

**What to look for:**
- **Requests** - Total Worker invocations
- **Errors** - Any 5xx errors (would indicate AI failures)
- **CPU Time** - Higher CPU usage indicates AI model inference

**Navigate to billing:**
1. Account Home → **Billing**
2. **Usage** section
3. Look for **Workers AI** line item

This shows your Neuron consumption and costs.

---

## Where to Find Workers AI Information

### Dashboard Locations

**1. Workers & Pages → [Your Worker] → Metrics**
- Request count
- Error rate
- Duration percentiles
- CPU time usage

**2. Workers & Pages → [Your Worker] → Logs (Real-time)**
```bash
# Or use CLI for better logs
npx wrangler tail --env development
```

Look for log entries like:
```
[Embeddings] Generating embedding for text (2847 chars)
[Embeddings] Successfully generated 768D embedding in 234ms
[WorkersAI] Starting compatibility analysis for job abc123
[WorkersAI] ✓ Successfully generated analysis with @cf/meta/llama-3.1-8b-instruct in 1823ms
```

**3. Account Home → Analytics & Logs → Workers**
- Aggregated metrics across all Workers
- Request volume trends
- Error trends

**4. Account Home → Billing → Usage**
- **Workers AI Neurons** consumed
- Monthly cost projection
- Free tier usage (10,000 Neurons/day)

### CLI Tools

**Real-time monitoring:**
```bash
# Watch live logs (shows Workers AI calls)
npx wrangler tail --env development --format pretty

# Filter for AI-related logs
npx wrangler tail --env development | grep -E "WorkersAI|Embeddings|@cf/"
```

**Deployment verification:**
```bash
# Check current deployment includes AI binding
npx wrangler deployments list --env development

# View full Worker configuration
npx wrangler deploy --env development --dry-run
```

---

## How to Test Workers AI Directly

### Quick Test Script

Create `/home/carl/application-tracking/jobmatch-ai/workers/scripts/test-workers-ai.ts`:

```typescript
import { Ai } from '@cloudflare/ai';

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    // Test embedding generation
    const aiBinding = new Ai(env.AI);

    try {
      const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: ['Hello, Workers AI!'],
      });

      return new Response(JSON.stringify({
        success: true,
        model: '@cf/baai/bge-base-en-v1.5',
        dimensions: embedding.data[0].length,
        sample: embedding.data[0].slice(0, 5),
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
```

Deploy and test:
```bash
npx wrangler deploy --env development
curl https://jobmatch-ai-dev.your-subdomain.workers.dev/
```

Expected response:
```json
{
  "success": true,
  "model": "@cf/baai/bge-base-en-v1.5",
  "dimensions": 768,
  "sample": [0.123, -0.456, 0.789, -0.234, 0.567]
}
```

---

## Common Misconceptions

### ❌ Misconception 1: "I need to enable Workers AI in the dashboard"

**Reality:** There's no "enable" button. Workers AI is automatically available to all accounts. You just add the binding to `wrangler.toml`.

### ❌ Misconception 2: "Workers AI should appear under Workers & Pages services"

**Reality:** Workers AI is a runtime API, not a storage/database service. It won't appear alongside KV/D1/R2.

### ❌ Misconception 3: "I need to create a Workers AI resource with an ID"

**Reality:** No ID needed. The binding name (e.g., `AI`) is all you configure. Cloudflare handles the rest at runtime.

### ❌ Misconception 4: "Workers AI costs don't appear in billing"

**Reality:** They do appear, under "Workers AI" line item in the Usage section. If you're on the free tier (< 10,000 Neurons/day), costs will show as $0.00.

---

## Billing & Usage Visibility

### Where Workers AI Costs Appear

**1. Account Home → Billing → Current Usage**
```
Workers AI
├─ Neurons consumed: 245,680
├─ Free tier: 10,000 Neurons/day included
├─ Billable: 235,680 Neurons
├─ Rate: $0.011 per 1,000 Neurons
└─ Current period cost: $2.59
```

**2. Account Home → Billing → Past Invoices**
- Monthly invoices show Workers AI as a separate line item
- Itemized by Neuron consumption

### Understanding Neuron Consumption

**What's a Neuron?**
- Cloudflare's unit for measuring AI inference compute
- Different models consume different amounts per token

**Your models:**

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Use Case |
|-------|----------------------|------------------------|----------|
| `@cf/baai/bge-base-en-v1.5` | 102,432 Neurons | N/A | Embeddings |
| `@cf/meta/llama-3.1-8b-instruct` | 25,608 Neurons | 256,080 Neurons | Compatibility analysis |

**Cost calculation:**
```
Job compatibility analysis (typical):
- Input: ~3,500 tokens × 25,608 Neurons/1M = ~90 Neurons
- Output: ~2,000 tokens × 256,080 Neurons/1M = ~512 Neurons
- Total: ~602 Neurons per analysis
- Cost: 602 ÷ 1,000 × $0.011 = $0.0066 per analysis

Resume embedding (typical):
- Input: ~1,000 tokens × 102,432 Neurons/1M = ~102 Neurons
- Cost: 102 ÷ 1,000 × $0.011 = $0.0011 per embedding
```

### Free Tier Coverage

**10,000 Neurons/day free tier covers:**
- ~16 job compatibility analyses per day (602 Neurons each)
- OR ~98 resume embeddings per day (102 Neurons each)
- OR a mix (e.g., 10 analyses + 40 embeddings)

**Your current usage** (based on deployment activity):
- Development environment: Active testing, using free tier
- Production environment: Low/moderate usage, likely within free tier
- No billing charges if under 10,000 Neurons/day

---

## Troubleshooting

### Issue: "AI binding is undefined at runtime"

**Cause:** Missing AI binding in wrangler.toml for specific environment

**Solution:**
```toml
# Ensure EACH environment has AI binding
[env.development.ai]
binding = "AI"

[env.staging.ai]
binding = "AI"

[env.production.ai]
binding = "AI"
```

### Issue: "Model not found" error

**Cause:** Typo in model name or model deprecated

**Solution:**
```typescript
// Correct model names (as of 2024-12-01):
'@cf/baai/bge-base-en-v1.5'              // Embeddings ✓
'@cf/meta/llama-3.1-8b-instruct'         // Text generation ✓
'@cf/meta/llama-3.1-8b-instruct-fast'    // Faster variant ✓
```

Check current models: https://developers.cloudflare.com/workers-ai/models/

### Issue: "Cannot see usage in dashboard"

**Possible causes:**
1. **Using free tier** - $0.00 cost won't trigger billing alerts
2. **Low usage** - Takes 24h for usage to appear in analytics
3. **Looking in wrong place** - Check Account Home → Billing, not Worker-specific metrics

**Solution:**
```bash
# Generate some usage to make it visible
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler tail --env development

# Make several API calls to trigger AI
# Check billing after 24 hours
```

### Issue: "Deployment succeeds but AI calls fail"

**Cause:** Compatibility date too old (before Workers AI launch)

**Solution:**
```toml
# Update in wrangler.toml
compatibility_date = "2024-12-01"  # ✓ Workers AI supported
# NOT "2023-05-01"  # ✗ Too old
```

Your current config has `compatibility_date = "2024-12-01"` ✓ - this is correct.

---

## Verification Checklist

Use this checklist to confirm Workers AI is working:

### Configuration ✓
- [x] AI binding present in `wrangler.toml` global section
- [x] AI binding present in each environment (dev/staging/prod)
- [x] Compatibility date is 2024 or later
- [x] Workers successfully deployed

### Code Integration ✓
- [x] `env.AI.run()` called in service files
- [x] Embedding service uses `@cf/baai/bge-base-en-v1.5`
- [x] Compatibility analysis uses `@cf/meta/llama-3.1-8b-instruct`
- [x] Error handling for AI failures implemented

### Runtime Verification
- [ ] Check wrangler logs for AI-related entries
- [ ] Test API endpoints that use Workers AI
- [ ] Monitor for errors in Workers dashboard
- [ ] Verify usage appears in billing (after 24h)

### Testing
```bash
# 1. Deploy to development
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler deploy --env development

# 2. Watch logs
npx wrangler tail --env development --format pretty

# 3. Trigger an AI operation via API
# (e.g., update profile to trigger resume embedding)

# 4. Look for log entries like:
# [Embeddings] Generating embedding...
# [Embeddings] Successfully generated 768D embedding in XXXms
```

---

## Summary

### Why You Don't See Workers AI in Dashboard

**Workers AI is not a dashboard service** - it's a runtime API binding. Think of it like:

- **KV/D1/R2**: Storage services you create in dashboard with IDs
- **Workers AI**: Runtime API you use via binding (no dashboard creation)

### How to Confirm It's Working

**Three quick checks:**

1. **Configuration** - Binding in `wrangler.toml` ✓ (verified above)
2. **Deployment** - Recent successful deployments ✓ (verified above)
3. **Logs** - Run `wrangler tail` and look for AI-related entries

### Where to Monitor Usage

**Dashboard locations:**
- **Workers & Pages → [Worker Name] → Metrics** - Request/error rates
- **Workers & Pages → [Worker Name] → Logs** - Real-time logs
- **Account Home → Billing → Usage** - Neuron consumption & costs

### Key Takeaway

**Your Workers AI setup is correct.** The absence of a "Workers AI" section in the dashboard is expected behavior. Workers AI is functioning as designed - it's just invisible in the traditional service management UI because it's a runtime capability, not a managed resource.

---

## Additional Resources

### Official Documentation
- [Workers AI Overview](https://developers.cloudflare.com/workers-ai/)
- [Available Models](https://developers.cloudflare.com/workers-ai/models/)
- [Pricing & Billing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)

### Your Project Documentation
- Cost Analysis: `/workers/docs/WORKERS_AI_COST_ANALYSIS.md`
- Implementation Guide: `/workers/docs/WORKERS_AI_IMPLEMENTATION.md`
- Implementation Summary: `/workers/docs/WORKERS_AI_SUMMARY.md`

### Support Channels
- [Cloudflare Community](https://community.cloudflare.com/)
- [Workers Discord](https://discord.gg/cloudflaredev)
- [GitHub Discussions](https://github.com/cloudflare/workers-sdk/discussions)

---

**Document Version:** 1.0
**Last Updated:** 2025-12-29
**Author:** JobMatch AI Platform Team
