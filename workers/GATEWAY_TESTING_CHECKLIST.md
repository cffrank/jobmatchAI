# AI Gateway Testing Checklist

## Current Status: Job Matching Running ✅

Your console shows job matching calculations working:
```
[JobMatching] Total years of experience: 29.3
[JobMatching] Industry match found: Envision Information Technologies, LLC
```

**But no AI generation has been triggered yet!**

---

## 🎯 Step-by-Step Testing Guide

### **Test 1: Trigger AI Generation**

#### **What to Do:**
1. On the jobs page, find a job card
2. Click on the job to view details
3. Look for one of these buttons:
   - **"Generate Application"**
   - **"AI Generate"**
   - **"Create Application"**
   - **"Generate with AI"**
4. **Click that button**
5. Wait 30-60 seconds

#### **What to Watch For in Browser Console:**

You should see logs like:
```javascript
[AI] Generating application for job: {jobId}
[AI] Calling OpenAI API...
[AI] Generation complete
```

Or API calls to:
```
POST /api/applications/generate
POST /api/applications/{id}/variants
```

#### **If You See Errors:**

**500 Error:**
```javascript
AI generation error: Error: Failed to generate application: 500
```
→ Check Worker logs: `npx wrangler tail --env development`

**"AI service temporarily unavailable":**
→ Secrets might be missing or gateway misconfigured

**"Not authenticated" or 401:**
→ User needs to be logged in first

---

### **Test 2: Check AI Gateway Dashboard**

After clicking "Generate Application":

1. **Open AI Gateway Dashboard:**
   https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway

2. **Go to Analytics tab**

3. **Look for new requests** (refresh if needed)

4. **Expected to see:**
   ```
   Request: POST /v1/chat/completions
   Model: gpt-4o-mini
   Status: 200 OK
   Cache: MISS (first time)
   Duration: 2-5 seconds
   Tokens: ~2000-3000
   ```

5. **If you don't see requests:**
   - Generation might not have triggered
   - Check browser Network tab (F12 → Network)
   - Look for calls to `/api/applications/generate`

---

### **Test 3: Test Caching (Second Request)**

After first generation succeeds:

1. **Go back to jobs list** (don't refresh!)
2. **Click the SAME job** you just generated for
3. **Click "Generate Application" again**
4. **Should be MUCH faster** (<1 second if cache hit)

5. **Check AI Gateway Dashboard:**
   ```
   Request: POST /v1/chat/completions
   Model: gpt-4o-mini
   Status: 200 OK
   Cache: HIT ✅✅✅
   Duration: <100ms
   Tokens: 0 (served from cache)
   Cost: $0.00
   ```

---

## 🐛 Troubleshooting

### "I clicked Generate but nothing happened"

**Check if button is disabled or grayed out:**
- User might not be logged in
- User profile might be incomplete (no resume data)
- Job might already have an application

**Check browser console for errors:**
```javascript
// Good signs:
POST /api/applications/generate 200 OK

// Bad signs:
POST /api/applications/generate 401 Unauthorized → Not logged in
POST /api/applications/generate 500 Server Error → Check Worker logs
POST /api/applications/generate 400 Bad Request → Missing data
```

### "I see requests but not in AI Gateway dashboard"

**Possible causes:**
1. Requests going directly to OpenAI (bypassing gateway)
   - Check Worker logs for: `[OpenAI] Using direct OpenAI API`
   - Should say: `[OpenAI] Using Cloudflare AI Gateway: jobmatch-ai-gateway`

2. Wrong gateway name in configuration
   - Check `wrangler.toml` has correct `AI_GATEWAY_SLUG`

3. Dashboard delay (can take 30-60 seconds to appear)
   - Refresh the analytics page

### "I see 500 errors in console"

**Check Worker logs:**
```bash
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler tail --env development
```

**Common errors:**
```
OpenAI API error: Incorrect API key
→ Check OPENAI_API_KEY secret

TypeError: Cannot read property 'OPENAI_API_KEY'
→ Secret not configured

AI Gateway authentication failed
→ Very rare - gateway should auto-authenticate Worker
```

---

## ✅ Success Criteria

You'll know it's working when you see:

### **Browser Console:**
```javascript
✅ No errors
✅ POST /api/applications/generate returns 200
✅ Application data returned in response
✅ 3 variants visible on screen
```

### **AI Gateway Dashboard:**
```
✅ Requests appear in Analytics
✅ Status: 200 OK
✅ Cache MISS on first request
✅ Cache HIT on repeat requests
✅ Token usage tracked
✅ Cost metrics visible
```

### **Frontend UI:**
```
✅ Loading spinner shows during generation
✅ 3 application variants appear:
   - Impact-Focused
   - Keyword-Optimized
   - Concise
✅ Resume and cover letter for each
✅ AI rationale/notes displayed
```

---

## 📊 Expected Behavior

### **First Generation (Cache Miss):**
- **Duration:** 30-60 seconds
- **Gateway:** Cache MISS
- **Cost:** ~$0.05 (3 variants × OpenAI API cost)
- **Tokens:** ~6000-9000 total

### **Second Generation (Same Job):**
- **Duration:** <1 second
- **Gateway:** Cache HIT ✅
- **Cost:** $0.00 ✅
- **Tokens:** 0 (from cache)

### **Third Generation (Different Job):**
- **Duration:** 30-60 seconds
- **Gateway:** Cache MISS
- **Cost:** ~$0.05
- **Tokens:** ~6000-9000

**Cache Hit Rate After Testing 3 Jobs Twice Each:**
- 6 total requests
- 3 cache hits
- **50% cache hit rate = 50% cost savings!** 🎯

---

## 🎬 Quick Test Script

If you want to test systematically:

```bash
# Terminal 1: Watch Worker logs
cd /home/carl/application-tracking/jobmatch-ai/workers
npx wrangler tail --env development

# Browser 1: Open app
# → https://jobmatch-ai-dev.pages.dev/jobs

# Browser 2: Open AI Gateway
# → https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway

# Then in the app:
# 1. Select job #1, click "Generate"
# 2. Wait for completion
# 3. Check gateway dashboard (should see request)
# 4. Go back, select job #1 again, click "Generate"
# 5. Should be instant (cache hit)
# 6. Check gateway dashboard (should see cache hit)
```

---

## 📝 What You've Tested So Far

Based on your console logs:

✅ **Job matching/compatibility calculations** - Working
✅ **Frontend loaded** - No errors
✅ **User profile loaded** - 29.3 years experience detected
✅ **Industry matching** - Working

⏳ **AI generation** - Not triggered yet
⏳ **AI Gateway requests** - Waiting for generation
⏳ **Cache testing** - Pending

---

## 🚀 Next Action

**Click the "Generate Application" button on a job!**

Then tell me:
1. What you see in the browser console
2. What appears in the AI Gateway dashboard
3. Any errors or issues

Let's get those AI requests flowing through the gateway! 🎯
