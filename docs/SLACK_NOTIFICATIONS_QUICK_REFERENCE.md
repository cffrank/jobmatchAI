# Slack Notifications Quick Reference

## What You'll See in Slack

### D1 Migration Success ✅
```
✅ D1 Migrations Applied Successfully

Environment: `production`
Migrations: 3 applied
Branch: `main`
Commit: `abc1234`
```

**When:** After D1 migrations successfully apply to the database

**What to do:** Nothing, deployment is proceeding normally

---

### D1 Migration Failure 🚨
```
@channel 🚨 D1 Migration Failed

Environment: `production`
Branch: `main`

⚠️ Action Required: Database schema may be incomplete.

[View Logs]
```

**When:** Migration fails due to SQL error, constraint violation, or other database issue

**What to do:**
1. Click "View Logs" to see error details
2. Check the migration file for syntax errors
3. Fix the issue and re-deploy
4. Database may be in inconsistent state - verify manually

**Production failures trigger @channel mention**

---

### Workers Deployment Success 🚀
```
🚀 Workers Deployment Successful

Environment: `production`
Author: cffrank
Branch: `main`
Commit: `abc1234`

Message: fix: improve error handling

Workers URL:
https://jobmatch-ai-prod.carl-f-frank.workers.dev

View Deployment Logs
```

**When:** Backend Workers deploy successfully to Cloudflare

**What to do:** Nothing, backend is live and serving traffic

---

### Workers Deployment Failure ❌
```
@channel ❌ Workers Deployment Failed

Environment: `production`
Branch: `main`

⚠️ Action Required: Deployment failed. Check logs immediately.

[View Logs]
```

**When:** Workers deployment fails (build error, configuration issue, etc.)

**What to do:**
1. Click "View Logs" immediately
2. Check for build errors or configuration issues
3. Backend may be offline - check health endpoint
4. Fix and re-deploy ASAP

**Production failures trigger @channel mention**

---

### Full Deployment Complete ✅
```
✅ Deployment Complete

Environment: `production`
Commit: `abc1234`

URLs:
• Frontend: https://jobmatch-ai-production.pages.dev
• Backend: https://jobmatch-ai-prod.carl-f-frank.workers.dev

✅ Tests • ✅ Workers • ✅ Frontend • ✅ D1 Migrations
```

**When:** All deployment stages complete successfully

**What to do:** Verify the application is working:
1. Check frontend URL
2. Check backend health endpoint
3. Test critical user flows
4. Monitor for errors in next 10-15 minutes

---

## Notification Frequency

| Environment | Trigger | Frequency |
|-------------|---------|-----------|
| Development | Every push to `develop` | Multiple times per day |
| Staging | Every push to `staging` | Few times per week |
| Production | Every push to `main` | Few times per week |

---

## @channel Mentions

`@channel` mentions ONLY happen for **production failures**:
- ❌ D1 migration fails in production
- ❌ Workers deployment fails in production

Development and staging failures notify without @channel.

---

## Useful Links

### GitHub Actions
- [All Workflow Runs](https://github.com/cffrank/jobmatchAI/actions)
- [Cloudflare Deploy Workflow](https://github.com/cffrank/jobmatchAI/actions/workflows/cloudflare-deploy.yml)

### Cloudflare Dashboards
- [Workers](https://dash.cloudflare.com/workers)
- [Pages](https://dash.cloudflare.com/pages)
- [D1 Databases](https://dash.cloudflare.com/d1)

### Application URLs

**Development:**
- Frontend: https://jobmatch-ai-dev.pages.dev
- Backend: https://jobmatch-ai-dev.carl-f-frank.workers.dev

**Staging:**
- Frontend: https://jobmatch-ai-staging.pages.dev
- Backend: https://jobmatch-ai-staging.carl-f-frank.workers.dev

**Production:**
- Frontend: https://jobmatch-ai-production.pages.dev
- Backend: https://jobmatch-ai-prod.carl-f-frank.workers.dev

---

## Troubleshooting Notifications

### I'm not seeing notifications

**Possible causes:**
1. Slack webhook not configured in GitHub secrets
2. Notifications are conditional (check workflow logs)
3. Slack webhook URL expired or revoked

**How to fix:**
1. Verify `SLACK_WEBHOOK_URL` exists in GitHub secrets
2. Test webhook: `curl -X POST "$WEBHOOK_URL" -d '{"text":"test"}'`
3. Re-create webhook if needed

### Notifications look broken

**Check:**
- Webhook URL is correct format
- JSON in workflow is valid (use [Slack Block Kit Builder](https://app.slack.com/block-kit-builder/))
- GitHub Actions logs show notification step succeeded

### Wrong URLs in notifications

**Check:**
- Environment mapping in workflow (development/staging/production)
- Cloudflare Pages project names
- Workers deployment names

**Fix:** Update URLs in `.github/workflows/cloudflare-deploy.yml`

---

## Response Procedures

### Production Deployment Failure

1. **Immediate:** Check Slack notification and click "View Logs"
2. **1 minute:** Assess severity - is production down or degraded?
3. **2 minutes:** If critical, rollback last deployment
4. **5 minutes:** Communicate status to team in Slack
5. **10 minutes:** Investigate root cause
6. **30 minutes:** Fix and re-deploy

### Production Migration Failure

1. **Immediate:** DO NOT MERGE MORE CODE until fixed
2. **2 minutes:** Check database state - is it consistent?
3. **5 minutes:** Review migration file for errors
4. **10 minutes:** Fix migration file or rollback if needed
5. **15 minutes:** Test migration locally before re-deploying

### Development/Staging Failure

1. **Review logs** when convenient (not urgent)
2. **Fix in feature branch** before merging to main
3. **Test thoroughly** in development/staging
4. **No need to rollback** unless blocking other developers

---

## Configuration

### Change Slack Channel
```bash
# 1. Create new webhook pointing to different channel
# 2. Update SLACK_WEBHOOK_URL in GitHub secrets
# 3. Next deployment will use new channel
```

### Disable Notifications Temporarily
```bash
# Option 1: Remove SLACK_WEBHOOK_URL secret from GitHub
# Option 2: Comment out notification steps in workflow
```

### Add Custom Notifications
```bash
# See: .github/workflows/slack-notifications-template.yml
# Follow same pattern with env: blocks for security
```

---

## Team Contact

**On-call rotation:** Check PagerDuty schedule

**Escalation:**
- L1: Development team lead
- L2: Infrastructure team
- L3: CTO

**Slack channels:**
- `#deployments` - Automated notifications
- `#incidents` - Production issues
- `#dev-team` - Development discussion

---

## Related Documentation

- [CICD Improvements Summary](CICD_IMPROVEMENTS_SUMMARY.md)
- [CICD Deployment Checklist](CICD_DEPLOYMENT_CHECKLIST.md)
- [Slack Integration Quick Start](SLACK_INTEGRATION_QUICK_START.md)
- [D1 Migration Workflow Fix](D1_MIGRATION_WORKFLOW_FIX.md)
