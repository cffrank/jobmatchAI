# Quick Start - AI Model Selection

## TL;DR - What Should I Use?

### 🏆 **Recommended: GPT-4o-mini (Already Configured)**
- **Cost**: $1-2 per 1,000 applications
- **Quality**: Excellent
- **Setup**: Just add your OpenAI API key

```bash
firebase functions:config:set openai.api_key="sk-your-key"
firebase deploy --only functions
```

### 💎 **Best Quality: Claude 3.5 Haiku**
- **Cost**: $5-10 per 1,000 applications
- **Quality**: Superior writing
- **Setup**: 5 minutes (switch to index-claude.js)

---

## Step-by-Step Setup

### Option A: Use GPT-4o-mini (Default)

**Cost: ~$1-2 per 1,000 applications** ✅ Start here!

1. Get OpenAI API key at https://platform.openai.com/api-keys
2. Set the key:
   ```bash
   firebase functions:config:set openai.api_key="sk-..."
   ```
3. Deploy:
   ```bash
   firebase deploy --only functions
   ```

Done! ✅

### Option B: Switch to Claude 3.5 Haiku

**Cost: ~$5-10 per 1,000 applications** (5x more expensive, but noticeably better quality)

1. Get Anthropic API key at https://console.anthropic.com/
2. Install Anthropic SDK:
   ```bash
   cd functions
   npm install @anthropic-ai/sdk
   ```
3. Switch to Claude version:
   ```bash
   mv index.js index-openai.js
   mv index-claude.js index.js
   ```
4. Set the key:
   ```bash
   firebase functions:config:set anthropic.api_key="sk-ant-..."
   ```
5. Deploy:
   ```bash
   firebase deploy --only functions
   ```

Done! ✅

---

## Cost Comparison

| Your Usage | GPT-4o-mini | Claude 3.5 Haiku | Difference |
|------------|-------------|------------------|------------|
| 100 apps/month | $0.15 | $0.80 | +$0.65 |
| 1,000 apps/month | $1.50 | $8.00 | +$6.50 |
| 10,000 apps/month | $15 | $80 | +$65 |

## Quality Comparison

**GPT-4o-mini**:
- ✅ Excellent structure
- ✅ Good keyword optimization
- ✅ Fast (2-3 seconds)
- ⚠️ Occasionally generic phrases
- 💰 Best value

**Claude 3.5 Haiku**:
- ✅ Superior writing quality
- ✅ Better cover letters
- ✅ More natural language
- ✅ Very fast (1-2 seconds)
- 💰 5x more expensive

## My Recommendation

**Start with GPT-4o-mini** (already set up):
- You'll spend ~$1-2/month for 1,000 applications
- Quality is excellent for 95% of use cases
- Easy to upgrade later if needed

**Upgrade to Claude 3.5 Haiku if**:
- Quality is your top priority
- You're charging users for the service
- You can afford $5-10/month for 1,000 generations

---

## Testing Your Setup

After deployment, test in your app:

1. Sign in
2. Browse jobs
3. Click "Apply" on any job
4. Wait 5-10 seconds
5. You should see 3 tailored resume variants!

Check the logs:
```bash
firebase functions:log --only generateApplication
```

---

## Switching Models Later

You can always switch between models. Your data stays the same!

**From GPT-4o-mini to Claude**:
```bash
cd functions
mv index.js index-openai.js
mv index-claude.js index.js
npm install @anthropic-ai/sdk
firebase functions:config:set anthropic.api_key="sk-ant-..."
firebase deploy --only functions
```

**From Claude back to GPT-4o-mini**:
```bash
cd functions
mv index.js index-claude.js
mv index-openai.js index.js
firebase deploy --only functions
```

---

## Need Help?

- **Detailed comparison**: See `AI_MODEL_COMPARISON.md`
- **Full setup guide**: See `README.md`
- **Deployment guide**: See `../DEPLOYMENT.md`

## Questions?

**Q: Can I use both GPT and Claude?**
A: Not simultaneously in one function. Pick one.

**Q: What if I run out of credits?**
A: Function will fail gracefully and use fallback templates.

**Q: Can I use GPT-4 instead of GPT-4o-mini?**
A: Yes, just change line 245 in `index.js` to `model: 'gpt-4o'`

**Q: Is Claude really better?**
A: For writing quality, yes. For value, GPT-4o-mini wins.
