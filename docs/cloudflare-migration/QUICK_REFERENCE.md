# Cloudflare Workers Migration - Quick Reference

## One-Page Overview

### Why Migrate?
- **93% cost reduction:** $81/month → $5.50/month
- **20-60x faster cold starts:** 1-3s → <50ms
- **Global edge network:** 300+ locations vs single region
- **Zero egress charges:** Save on data transfer costs
- **Simplified infrastructure:** Single platform for all environments

### Timeline: 8 Weeks

```
Week 1: Setup        → Install Wrangler, configure project
Week 2: Infrastructure → Migrate middleware, services
Week 3-4: Routes     → Migrate 18 API endpoints
Week 5: Cron Jobs    → Convert scheduled tasks
Week 6: Testing      → Unit, integration, E2E, performance
Week 7: Deployment   → Dev → Staging → Canary → Production
Week 8: Optimization → Performance tuning, monitoring
```

### Migration Complexity by Route

**Simple (1-2 hours each):**
- Health check
- Get job/application by ID
- Delete operations
- List operations (pagination)

**Moderate (2-4 hours each):**
- Update operations
- Email sending
- LinkedIn OAuth initiate

**Complex (4-6 hours each):**
- Application generation (OpenAI integration)
- Job scraping (Apify integration)
- Resume parsing
- LinkedIn OAuth callback

**Very Complex (6-8 hours each):**
- PDF export (requires library replacement or proxy)
- DOCX export (requires library replacement or proxy)

### Key Files to Read

| Document | Audience | Time | Purpose |
|----------|----------|------|---------|
| [README.md](./README.md) | Everyone | 5 min | Overview, getting started |
| [COST_ANALYSIS.md](./COST_ANALYSIS.md) | Decision-makers | 20 min | Financial justification |
| [MIGRATION_STRATEGY.md](./MIGRATION_STRATEGY.md) | Tech leads | 45 min | High-level plan, timeline |
| [CLOUDFLARE_WORKERS_SETUP.md](./CLOUDFLARE_WORKERS_SETUP.md) | Developers | 60 min | Technical setup guide |
| [API_MIGRATION_CHECKLIST.md](./API_MIGRATION_CHECKLIST.md) | Developers | Reference | Endpoint-by-endpoint tasks |

### Express → Hono Cheat Sheet

```typescript
// Express
app.get('/api/jobs', authenticateUser, async (req, res) => {
  const userId = req.userId;
  const page = parseInt(req.query.page);
  const jobs = await getJobs(userId, page);
  res.json({ jobs });
});

// Hono
app.get('/api/jobs', authenticateUser, async (c) => {
  const userId = c.get('userId');
  const page = parseInt(c.req.query('page') || '1');
  const jobs = await getJobs(userId, page);
  return c.json({ jobs });
});
```

Key differences:
- `req, res` → `c` (Context)
- `req.userId` → `c.get('userId')`
- `req.query.page` → `c.req.query('page')`
- `res.json()` → `return c.json()`

### Cost Comparison at a Glance

| Traffic | Railway | Workers | Savings |
|---------|---------|---------|---------|
| 10K req/month | $81 | $5.50 | 93% |
| 100K req/month | $81 | $5.50 | 93% |
| 1M req/month | $146 | $5.50 | 96% |
| 10M req/month | $312 | $7.00 | 98% |

**Break-even:** 160M requests/month (years away)

### Compatibility Matrix

| Component | Compatible? | Notes |
|-----------|-------------|-------|
| Supabase PostgreSQL | ✅ Yes | HTTP-based, fully compatible |
| OpenAI API | ✅ Yes | HTTP-based, fully compatible |
| Apify API | ✅ Yes | HTTP-based, fully compatible |
| SendGrid API | ✅ Yes | HTTP-based, fully compatible |
| JWT Authentication | ✅ Yes | Supabase Auth works from edge |
| Rate Limiting (PostgreSQL) | ✅ Yes | Already database-backed |
| Rate Limiting (IP) | ⚠️ Adapt | Replace in-memory with Workers KV |
| Scheduled Jobs | ⚠️ Adapt | Replace node-cron with Cron Triggers |
| PDF Generation (PDFKit) | ❌ No | Use pdf-lib or proxy to Railway |
| DOCX Generation | ❌ No | Use external service or client-side |

### High-Risk Items

1. **PDF/DOCX Export**
   - **Risk:** Node.js libraries incompatible
   - **Solution:** Proxy to Railway (temporary) → migrate to pdf-lib or external service

2. **Long-Running Operations**
   - **Risk:** 30s CPU time limit (OpenAI, Apify can take 10-60s)
   - **Solution:** Workers Paid plan ($5/month) has 30s limit (sufficient)

3. **Scheduled Jobs**
   - **Risk:** Different cron system
   - **Solution:** Cloudflare Cron Triggers (well-documented, reliable)

### Success Metrics

**Must-Have:**
- ✅ All 18 endpoints migrated and working
- ✅ P95 latency <300ms
- ✅ Error rate <0.5%
- ✅ Zero data loss
- ✅ Cost <$10/month

**Nice-to-Have:**
- ✅ P95 latency <200ms
- ✅ Deployment time <2 minutes
- ✅ 100% test coverage for new code

### Rollback Plan

**If something goes wrong:**
1. **Immediate:** Route traffic back to Railway (DNS/routing change, <5 min)
2. **Partial:** Proxy failing endpoints to Railway from Workers
3. **Full:** Redeploy Railway from backup (15-30 min)

**Keep Railway running for 48 hours post-cutover as safety net.**

### Commands Cheat Sheet

```bash
# Setup
npm install -g wrangler
wrangler login
wrangler whoami

# Development
wrangler dev                  # Local dev server (localhost:8787)
wrangler dev --remote         # Test on real Workers
wrangler tail                 # View production logs

# Deployment
wrangler deploy               # Deploy to production
wrangler deploy --env staging # Deploy to staging
wrangler rollback             # Rollback to previous

# Secrets
wrangler secret put SECRET_NAME
wrangler secret list
wrangler secret delete SECRET_NAME

# KV (Key-Value storage)
wrangler kv:namespace create NAMESPACE_NAME
wrangler kv:key put KEY VALUE --namespace-id=xxx
wrangler kv:key get KEY --namespace-id=xxx

# Testing
npm run test                  # Run all tests
npm run test:watch            # Watch mode
npm run test:coverage         # Coverage report
```

### Key Configuration Files

**wrangler.toml** - Workers configuration
```toml
name = "jobmatch-ai-backend"
main = "src/index.ts"
compatibility_date = "2024-12-27"
node_compat = true

[vars]
NODE_ENV = "production"
APP_URL = "https://jobmatch-ai.com"

# Secrets managed via: wrangler secret put
```

**.dev.vars** - Local development secrets (gitignored)
```bash
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
OPENAI_API_KEY=...
# ... other secrets
```

### Resource Links

**Cloudflare:**
- Workers Docs: https://developers.cloudflare.com/workers/
- Pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Discord: https://discord.gg/cloudflaredev

**Hono:**
- Documentation: https://hono.dev/
- Examples: https://github.com/honojs/examples
- Discord: https://discord.gg/hono

**Migration:**
- Hono Migration Guide: https://hono.dev/docs/guides/migrating-to-hono
- Workers Examples: https://developers.cloudflare.com/workers/examples/

### Decision Checklist

Before migrating, confirm:
- ✅ Team has 2 months capacity
- ✅ Stakeholders approve cost/benefit
- ✅ Comfortable with Workers platform
- ✅ Can tolerate PDF/DOCX export workaround (temporary)
- ✅ Railway can stay online for 2 weeks (rollback safety)

**If all checked:** Proceed with migration!

### Phase 1 Checklist (Week 1)

First steps to get started:
- ⬜ Install Wrangler CLI: `npm install -g wrangler`
- ⬜ Create Cloudflare account (free): https://dash.cloudflare.com/sign-up
- ⬜ Authenticate: `wrangler login`
- ⬜ Create project directory: `mkdir workers && cd workers`
- ⬜ Initialize project: `wrangler init`
- ⬜ Install dependencies: `npm install hono @cloudflare/workers-types`
- ⬜ Create basic index.ts with health endpoint
- ⬜ Test locally: `wrangler dev`
- ⬜ Deploy to development: `wrangler deploy --env development`
- ⬜ Verify health endpoint works from Workers URL

**Time estimate:** 2-4 hours

### Questions & Answers

**Q: Why Hono over other frameworks?**
A: Express-like API, Workers-first design, excellent TypeScript support, rich middleware ecosystem. Best balance of familiarity and performance.

**Q: Can we stay on Railway free tier?**
A: No, free tier gives $5 credit/month, actual usage is ~$81/month.

**Q: What if we exceed 10M requests/month on Workers?**
A: Only $0.50 per additional million. Even at 50M/month, Workers is $30 vs Railway's $750+.

**Q: How do we handle PDF generation?**
A: Three options: (1) Proxy to Railway temporarily, (2) Use pdf-lib (Workers-compatible), (3) External service. Recommend start with (1), migrate to (2) or (3) later.

**Q: What about scheduled jobs?**
A: Cloudflare Cron Triggers replace node-cron. Well-documented, reliable, free. Same syntax as cron.

**Q: Can we roll back if needed?**
A: Yes! Keep Railway running for 48 hours. Instant rollback via DNS routing. Full recovery in 15-30 minutes if needed.

**Q: How long until we see cost savings?**
A: Immediate. First Workers bill will be ~$5.50 vs Railway's ~$81. 93% reduction from day one.

---

**Last Updated:** 2025-12-27
**Status:** Ready to begin Phase 1
