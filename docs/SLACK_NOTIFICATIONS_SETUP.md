# Slack Notifications for CI/CD Pipeline

This guide explains how to set up Slack notifications for your Cloudflare Workers deployments, D1 migrations, and other CI/CD events.

## Overview

Slack notifications will alert your team about:
- ✅ Successful deployments
- ❌ Failed deployments
- 🗄️ D1 migration status
- ⚠️ Migration failures
- 🚀 New releases to staging/production

## Prerequisites

- Slack workspace admin access
- GitHub repository admin access
- 10 minutes for setup

---

## Step 1: Create a Slack Incoming Webhook

### 1.1 Create Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Choose **"From scratch"**
4. Enter app details:
   - **App Name:** `GitHub Deployments`
   - **Workspace:** Your workspace
5. Click **"Create App"**

### 1.2 Enable Incoming Webhooks

1. In your app settings, click **"Incoming Webhooks"** in the sidebar
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Scroll down and click **"Add New Webhook to Workspace"**
4. Select the channel where notifications should appear (e.g., `#deployments`)
5. Click **"Allow"**

### 1.3 Copy Webhook URL

You'll see a webhook URL like:
```
https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
```

**⚠️ Keep this URL secret!** It's like a password.

---

## Step 2: Add Webhook to GitHub Secrets

### 2.1 Add Secret via GitHub UI

1. Go to your repository: https://github.com/cffrank/jobmatchAI
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add the following secret:
   - **Name:** `SLACK_WEBHOOK_URL`
   - **Value:** Your webhook URL from Step 1.3
5. Click **"Add secret"**

### 2.2 Verify Secret

The workflow will now have access to `${{ secrets.SLACK_WEBHOOK_URL }}`

---

## Step 3: Test Slack Notifications

### 3.1 Trigger a Deployment

Push a commit to the `develop` branch:

```bash
git commit --allow-empty -m "test: trigger Slack notification"
git push origin develop
```

### 3.2 Check Slack Channel

Within 1-2 minutes, you should see a notification in your Slack channel like:

```
🚀 Deployment Started
Environment: development
Branch: develop
Commit: abc1234
Author: @yourname
```

And after completion:

```
✅ Deployment Successful
Environment: development
Duration: 2m 15s
Workers URL: https://jobmatch-ai-dev.carl-f-frank.workers.dev
D1 Migrations: 2 applied
```

---

## Notification Types

### Deployment Started
Sent when deployment begins:
- Environment (dev/staging/production)
- Branch name
- Commit SHA and message
- Author

### Deployment Success
Sent when deployment completes successfully:
- Deployment duration
- Workers URL
- D1 migration count
- Link to GitHub Actions run

### Deployment Failure
Sent when deployment fails:
- Error message
- Failed step
- Link to logs
- Mentions @channel for production failures

### D1 Migration Failure
Sent when database migration fails:
- Migration file name
- Error message
- Environment
- Immediate action required (mentions @channel)

---

## Customization

### Change Notification Channel

To send notifications to a different channel:

1. Go to https://api.slack.com/apps
2. Select your app
3. Click **"Incoming Webhooks"**
4. Click **"Add New Webhook to Workspace"**
5. Select the new channel
6. Update the `SLACK_WEBHOOK_URL` secret in GitHub

### Add User Mentions

To mention specific users on failures:

1. Get the user's Slack ID:
   - In Slack, click on their profile
   - Click **"More"** → **"Copy member ID"**
2. Use `<@USER_ID>` in notification messages

Example:
```yaml
text: "⚠️ Production deployment failed! <@U12345678>"
```

### Customize Message Format

Messages use Slack's Block Kit format. Customize in the workflow YAML:

```yaml
- name: Slack Notification - Deployment Success
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "✅ Custom deployment message",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*Deployment Complete*\nYour custom fields here"
            }
          }
        ]
      }'
```

**Block Kit Builder:** https://app.slack.com/block-kit-builder

---

## Monitoring & Alerts

### Set Up Alert Rules

Create separate channels for different alert severities:

- `#deployments-info` - All deployments (dev/staging/prod)
- `#deployments-critical` - Production failures only
- `#deployments-migrations` - D1 migration alerts

Update webhook URLs accordingly in GitHub secrets:
- `SLACK_WEBHOOK_URL` (general deployments)
- `SLACK_WEBHOOK_CRITICAL` (production failures)
- `SLACK_WEBHOOK_MIGRATIONS` (database alerts)

### Slack Workflow Automation

Set up Slack workflows to:
1. Create incident ticket on production failure
2. Notify on-call engineer via PagerDuty
3. Auto-create rollback PR

**Slack Workflow Builder:** Settings → Tools → Workflow Builder

---

## Troubleshooting

### No Notifications Appearing

**Check 1: Verify webhook URL**
```bash
curl -X POST "YOUR_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "Test message"}'
```

If you see `ok`, the webhook works.

**Check 2: Check GitHub Actions logs**
- Go to Actions → Latest workflow run
- Look for "Slack Notification" steps
- Check for HTTP errors (401, 404, 500)

**Check 3: Verify secret is set**
- Go to Settings → Secrets → Actions
- Confirm `SLACK_WEBHOOK_URL` exists

### Messages Look Broken

**Issue:** Messages show raw JSON instead of formatted blocks

**Fix:** Ensure `Content-Type: application/json` header is set:
```bash
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \  # ← Required!
  -d '{"text": "..."}'
```

### Getting Rate Limited

**Issue:** `429 Too Many Requests` errors

**Fix:** Slack limits webhooks to 1 message per second. Add delay between notifications:
```yaml
- name: Wait before next notification
  run: sleep 2
```

### Webhook URL Expired

**Issue:** `invalid_payload` or `404` errors

**Fix:** Webhook URLs can expire if:
- App is deleted
- Channel is deleted
- App permissions changed

**Solution:** Create a new webhook (Step 1) and update GitHub secret

---

## Security Best Practices

### ✅ DO:
- Store webhook URL in GitHub Secrets (never in code)
- Use separate webhooks for different channels
- Rotate webhook URLs periodically (every 6 months)
- Limit webhook to specific channels
- Monitor webhook usage in Slack app settings

### ❌ DON'T:
- Commit webhook URLs to git
- Share webhook URLs in public channels
- Use the same webhook for multiple apps
- Include sensitive data in notification messages
- Send secrets or API keys in notifications

---

## Advanced: Conditional Notifications

### Notify Only on Production Failures

```yaml
- name: Slack Notification - Production Failure
  if: failure() && github.ref == 'refs/heads/main'
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "🚨 @channel Production deployment failed!",
        "blocks": [...]
      }'
```

### Notify Only on First Failure

```yaml
- name: Slack Notification - First Failure
  if: failure() && github.run_attempt == '1'
  run: |
    # Send notification
```

### Notify on Manual Triggers

```yaml
- name: Slack Notification - Manual Deployment
  if: github.event_name == 'workflow_dispatch'
  run: |
    curl -X POST "${{ secrets.SLACK_WEBHOOK_URL }}" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "🔧 Manual deployment triggered by ${{ github.actor }}"
      }'
```

---

## Integration with Other Tools

### PagerDuty Integration

Trigger PagerDuty incidents on critical failures:

```yaml
- name: Trigger PagerDuty Incident
  if: failure() && github.ref == 'refs/heads/main'
  run: |
    curl -X POST "https://events.pagerduty.com/v2/enqueue" \
      -H "Content-Type: application/json" \
      -d '{
        "routing_key": "${{ secrets.PAGERDUTY_INTEGRATION_KEY }}",
        "event_action": "trigger",
        "payload": {
          "summary": "Production deployment failed",
          "severity": "critical",
          "source": "GitHub Actions"
        }
      }'
```

### Datadog Integration

Send deployment events to Datadog:

```yaml
- name: Send Datadog Event
  run: |
    curl -X POST "https://api.datadoghq.com/api/v1/events" \
      -H "DD-API-KEY: ${{ secrets.DATADOG_API_KEY }}" \
      -H "Content-Type: application/json" \
      -d '{
        "title": "Deployment to ${{ env.DEPLOY_ENV }}",
        "text": "Deployed commit ${{ github.sha }}",
        "tags": ["environment:${{ env.DEPLOY_ENV }}"]
      }'
```

---

## Message Templates

### Deployment Success Template

```json
{
  "text": "✅ Deployment Successful",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "✅ Deployment Successful"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\nDevelopment"
        },
        {
          "type": "mrkdwn",
          "text": "*Duration:*\n2m 15s"
        },
        {
          "type": "mrkdwn",
          "text": "*Branch:*\ndevelop"
        },
        {
          "type": "mrkdwn",
          "text": "*Commit:*\nabc1234"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Workers URL:*\nhttps://jobmatch-ai-dev.carl-f-frank.workers.dev"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "D1 Migrations: 2 applied | <https://github.com/cffrank/jobmatchAI/actions|View Logs>"
        }
      ]
    }
  ]
}
```

### Migration Failure Template

```json
{
  "text": "🚨 @channel D1 Migration Failed",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🚨 D1 Migration Failed"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Environment:*\nProduction"
        },
        {
          "type": "mrkdwn",
          "text": "*Migration:*\n0002_add_user_preferences.sql"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Error:*\n```UNIQUE constraint failed: users.email```"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "⚠️ *Action Required:* Database schema is incomplete. Production deployment blocked."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Logs"
          },
          "url": "https://github.com/cffrank/jobmatchAI/actions"
        }
      ]
    }
  ]
}
```

---

## Maintenance

### Regular Tasks

**Monthly:**
- Review notification volume (too noisy?)
- Check webhook usage in Slack app settings
- Verify all alerts are being received

**Quarterly:**
- Test incident response procedures
- Update notification templates
- Review and archive old deployment channels

**Annually:**
- Rotate webhook URLs for security
- Audit who has access to deployment channels
- Review and update alert severity levels

---

## References

- **Slack API Documentation:** https://api.slack.com/messaging/webhooks
- **Block Kit Builder:** https://app.slack.com/block-kit-builder
- **GitHub Actions Contexts:** https://docs.github.com/en/actions/learn-github-actions/contexts
- **Slack App Management:** https://api.slack.com/apps

---

## Getting Help

**Slack API Issues:**
- Slack API Community: https://slackcommunity.com
- Status Page: https://status.slack.com

**GitHub Actions Issues:**
- GitHub Community: https://github.community
- Status Page: https://www.githubstatus.com

**Project-Specific Issues:**
- Create issue: https://github.com/cffrank/jobmatchAI/issues
- Internal docs: `/docs/` directory

---

**Next Steps:**
1. Complete Step 1-2 (create webhook, add to GitHub)
2. Test with a deployment (Step 3)
3. Customize notification messages (optional)
4. Set up additional channels for critical alerts (optional)
