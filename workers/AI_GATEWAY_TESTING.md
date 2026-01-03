# AI Gateway Testing & Verification Guide

This guide walks through testing all AI features to verify the AI Gateway is working correctly and achieving cost savings.

## ✅ Setup Complete

- [x] Worker deployed to Cloudflare
- [x] Secrets configured (OPENAI_API_KEY, etc.)
- [x] AI Gateway created: `jobmatch-ai-gateway-dev`
- [x] Health check passing

## 🧪 Testing AI Features

All AI requests should now route through the AI Gateway for caching and cost reduction.

### 1. Test Resume Parsing (Vision Model)

**Frontend Action:**
1. Navigate to: https://jobmatch-ai-dev.pages.dev/profile
2. Click "Upload Resume" or "Parse Resume"
3. Upload a resume image (PNG/JPG) or PDF
4. Wait for AI parsing to complete

**Expected Result:**
- Profile fields auto-populated (name, email, experience, skills)
- No errors in browser console
- Fast response (especially on repeated uploads of same resume)

**Gateway Metrics to Check:**
- Model: `gpt-4o` (vision model)
- Request logged in AI Gateway dashboard
- Cache hit on subsequent identical resume uploads

---

### 2. Test Application Generation (All 3 Variants)

**Frontend Action:**
1. Navigate to: https://jobmatch-ai-dev.pages.dev/jobs
2. Select any job listing
3. Click "Generate Application" or "AI Generate"
4. Wait for generation to complete (typically 30-60 seconds)

**Expected Result:**
- 3 application variants generated:
  - **Impact-focused**: Emphasizes achievements
  - **Keyword-optimized**: Matches job description keywords
  - **Concise**: Shorter, direct approach
- Resume and cover letter for each variant
- AI rationale/notes explaining optimizations

**Gateway Metrics to Check:**
- Model: `gpt-4o`
- 3 requests logged (one per variant)
- Cache hit if generating for same job multiple times

---

### 3. Test Job Compatibility Analysis

**Frontend Action:**
1. Navigate to: https://jobmatch-ai-dev.pages.dev/jobs
2. View any job listing detail page
3. Check for match score/compatibility percentage
4. Review AI-generated compatibility insights

**Expected Result:**
- Match score displayed (e.g., "85% match")
- Breakdown of match factors (skills, experience, location, salary)
- AI insights explaining why job is a good/poor match

**Gateway Metrics to Check:**
- Model: `gpt-4o`
- Request logged per job analyzed
- Cache hit on re-analyzing same job

---

## 📊 AI Gateway Dashboard Monitoring

### Access Dashboard
https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway-dev

### Metrics to Monitor

#### **1. Request Volume**
- Total requests through gateway
- Requests per endpoint (resume parsing, application generation, compatibility)
- Success rate (should be 100% or near 100%)

#### **2. Cache Performance**
**Target: 60-80% cache hit rate after initial testing**

- **Cache Hits**: Requests served from cache (free!)
- **Cache Misses**: Requests sent to OpenAI (costs money)
- **Cache Hit Rate** = Hits / (Hits + Misses)

**Example:**
- 10 requests total
- 7 cache hits, 3 cache misses
- Cache hit rate: 70%
- **Cost savings: 70%**

#### **3. Cost Analysis**
**Baseline (without caching):**
- Resume parsing: ~$0.01 per request (gpt-4o vision)
- Application generation: ~$0.05 per request (3 variants)
- Compatibility analysis: ~$0.01 per request

**With 70% cache hit rate:**
- Resume parsing: ~$0.003 per request (70% savings)
- Application generation: ~$0.015 per request (70% savings)
- Compatibility analysis: ~$0.003 per request (70% savings)

**Monthly savings** (assuming 1000 AI requests/month):
- Without gateway: ~$300/month
- With gateway (70% cache): ~$90/month
- **Savings: $210/month (70%)**

#### **4. Latency Analysis**
- **Cache hit latency**: <100ms (very fast!)
- **Cache miss latency**: 2-5 seconds (OpenAI API call)
- **Average latency**: Should decrease as cache hit rate increases

---

## 🔍 What to Look For

### ✅ Good Signs
- No 500 errors in browser console
- AI features working identically to before migration
- Cache hit rate increasing over time
- Requests appearing in AI Gateway dashboard
- Fast response times for cached requests

### ❌ Warning Signs
- 500 errors or "AI service unavailable" messages
- Requests not appearing in AI Gateway dashboard
- 0% cache hit rate (check TTL settings)
- Slower response times than before

---

## 🐛 Troubleshooting

### Issue: 500 Errors from Worker

**Check:**
1. All secrets configured correctly:
   ```bash
   npx wrangler secret list --env dev
   ```
2. AI Gateway created with correct name: `jobmatch-ai-gateway-dev`
3. Worker logs for detailed error:
   ```bash
   npx wrangler tail --env dev
   ```

### Issue: 0% Cache Hit Rate

**Check:**
1. AI Gateway caching enabled
2. TTL set to 3600 seconds (1 hour)
3. Requests have identical inputs (cache key includes full prompt)

### Issue: Requests Not Appearing in Dashboard

**Check:**
1. AI Gateway logging enabled
2. Correct account ID in `wrangler.toml`
3. Gateway slug matches: `jobmatch-ai-gateway-dev`

---

## 📈 Success Criteria for Phase 1.7

- [ ] All AI features working without errors
- [ ] Requests appearing in AI Gateway dashboard
- [ ] Cache hit rate > 50% after 10+ identical requests
- [ ] No degradation in response quality
- [ ] Cost reduction metrics visible in dashboard

---

## 🎯 Next Steps After Verification

Once Phase 1 is verified successful:

**Phase 2: Embeddings with Workers AI**
- Migrate text embeddings from OpenAI to Cloudflare Workers AI
- Target: 95% cost reduction on embeddings
- Implementation time: 1 week

**Phase 3: Vectorize Setup**
- Set up Cloudflare Vectorize for semantic search
- Replace traditional keyword search with vector similarity
- Implementation time: 2 weeks

---

## 📝 Notes

- Cache keys are based on full request payload (prompt + model + parameters)
- Changing user profile or job description will invalidate cache
- Cache TTL of 1 hour balances cost savings with data freshness
- AI Gateway is transparent - no code changes needed beyond baseURL
