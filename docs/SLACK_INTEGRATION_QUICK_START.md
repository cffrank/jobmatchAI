# Slack Integration Quick Start

Complete Slack notification setup in 5 minutes.

## Step 1: Create Slack Webhook (2 minutes)

1. Go to https://api.slack.com/apps → **Create New App** → **From scratch**
2. Name: `GitHub Deployments` → Select your workspace → **Create App**
3. Click **Incoming Webhooks** → Toggle **ON**
4. **Add New Webhook to Workspace** → Select channel (e.g., `#deployments`) → **Allow**
5. **Copy the webhook URL** (looks like `https://hooks.slack.com/services/T.../B.../XXX...`)

## Step 2: Add to GitHub Secrets (1 minute)

1. Go to https://github.com/cffrank/jobmatchAI/settings/secrets/actions
2. **New repository secret**
3. Name: `SLACK_WEBHOOK_URL`
4. Value: Paste the webhook URL
5. **Add secret**

## Step 3: Add Notifications to Workflow (2 minutes)

The notification steps are ready in `.github/workflows/slack-notifications-template.yml`

You can either:
- **Copy/paste** the steps into `cloudflare-deploy.yml` manually
- **Use a script** to automatically add them

### Manual Method

Open `.github/workflows/cloudflare-deploy.yml` and add the notification steps from the template file at these locations:

1. After "Run D1 Migrations" step (~line 322)
2. At end of "deploy-workers" job (~line 580)
3. At end of "deploy-frontend" job (~line 500)

### Quick Test

Push a commit to `develop` branch:

```bash
git commit --allow-empty -m "test: Slack notifications"
git push origin develop
```

Check your Slack channel in 2-3 minutes!

## What You'll See

### On Successful Deployment:
```
✅ Deployment Complete
Environment: development
Commit: abc1234
URLs:
• Frontend: https://jobmatch-ai-dev.pages.dev
• Backend: https://jobmatch-ai-dev.carl-f-frank.workers.dev
```

### On Failed Migration:
```
🚨 D1 Migration Failed
Environment: production
Action Required: Database schema may be incomplete.
[View Logs Button]
```

### On Failed Deployment:
```
❌ @channel Workers Deployment Failed
Environment: production
Action Required: Deployment failed. Check logs immediately.
[View Logs Button]
```

## Customization

### Change Channel

Create a new webhook pointing to a different channel, update the GitHub secret.

### Disable Notifications Temporarily

Remove or comment out the `SLACK_WEBHOOK_URL` secret in GitHub.

### Add More Detail

Edit the notification steps in the workflow to include additional fields.

## Security Notes

✅ **Secure**: Webhook URL is stored in GitHub Secrets (encrypted)
✅ **Safe**: All GitHub context variables use `env:` to prevent injection
✅ **Private**: Only your workspace receives notifications

## Troubleshooting

**No notifications?**
1. Check webhook URL is correct: `curl -X POST "YOUR_WEBHOOK" -d '{"text":"test"}'`
2. Verify secret exists in GitHub Settings → Secrets
3. Check GitHub Actions logs for "Slack Notification" steps

**Messages look broken?**
- Ensure `Content-Type: application/json` header is present
- Check JSON syntax in workflow YAML

## Full Documentation

See `docs/SLACK_NOTIFICATIONS_SETUP.md` for:
- Advanced configuration
- Custom message templates
- Integration with PagerDuty/Datadog
- Monitoring & maintenance

---

**That's it!** You now have Slack notifications for all deployments and migrations.
