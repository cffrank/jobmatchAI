# Cloudflare API Token Setup for GitHub Actions

**Purpose:** Create a Cloudflare API token with the minimum required permissions for GitHub Actions CI/CD deployments.

---

## Token Permissions Required

### Minimum Required Permissions

| Permission Category | Resource | Access Level | Why Needed |
|---------------------|----------|--------------|------------|
| **Account** | Cloudflare Pages | **Edit** | Deploy frontend to Pages |
| **Account** | Workers Scripts | **Edit** | Deploy backend to Workers |

### Optional (Recommended for Future)

| Permission Category | Resource | Access Level | Why Needed |
|---------------------|----------|--------------|------------|
| **Account** | Workers KV Storage | **Edit** | For distributed rate limiting |
| **Account** | Workers R2 Storage | **Edit** | If migrating from Supabase Storage |

---

## Step-by-Step Token Creation

### 1. Navigate to API Tokens Page

Go to: **https://dash.cloudflare.com/profile/api-tokens**

Or navigate manually:
1. Log in to Cloudflare Dashboard
2. Click on your profile (top right)
3. Click "API Tokens"

### 2. Create Custom Token

- Click **"Create Token"**
- Select **"Create Custom Token"** (NOT a template)

### 3. Configure Token Settings

#### Token Name
```
GitHub Actions - JobMatch AI
```

#### Permissions

Click **"+ Add more"** for each permission:

**Permission 1:**
- **Type:** Account
- **Resource:** Cloudflare Pages
- **Access:** Edit

**Permission 2:**
- **Type:** Account
- **Resource:** Workers Scripts
- **Access:** Edit

**Permission 3 (Optional):**
- **Type:** Account
- **Resource:** Workers KV Storage
- **Access:** Edit

#### Account Resources

- **Select:** "All accounts" (or choose your specific account)

#### Zone Resources

- **Leave as:** "All zones" (or choose specific zones if you have custom domains)

#### Client IP Address Filtering

- **Leave blank** (GitHub Actions IPs change frequently)
- Alternative: Add GitHub Actions IP ranges if desired (see: https://docs.github.com/en/actions/using-github-hosted-runners/about-github-hosted-runners#ip-addresses)

#### TTL (Time to Live)

- **Recommended:** Start with "1 year"
- **Note:** Set a calendar reminder to rotate before expiry

---

## Visual Configuration

Here's what your token configuration should look like:

```
┌─────────────────────────────────────────────────────┐
│ Create Custom Token                                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Token name                                          │
│ ┌─────────────────────────────────────────────┐   │
│ │ GitHub Actions - JobMatch AI                │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Permissions                                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ Account | Cloudflare Pages     | Edit       │   │
│ │ Account | Workers Scripts      | Edit       │   │
│ │ Account | Workers KV Storage   | Edit       │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Account Resources                                   │
│ ┌─────────────────────────────────────────────┐   │
│ │ All accounts                            ✓   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Zone Resources                                      │
│ ┌─────────────────────────────────────────────┐   │
│ │ All zones                               ✓   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ Client IP Address Filtering                         │
│ ┌─────────────────────────────────────────────┐   │
│ │ (blank - allow all)                         │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ TTL                                                 │
│ ┌─────────────────────────────────────────────┐   │
│ │ 1 year                                  ▼   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│           [Continue to summary]                     │
└─────────────────────────────────────────────────────┘
```

---

## 4. Review and Create

1. Click **"Continue to summary"**
2. Review your token settings
3. Click **"Create Token"**

---

## 5. Copy Token Immediately

⚠️ **IMPORTANT:** The token will only be shown ONCE. Copy it immediately.

```bash
# Example token (not real):
dYZqJ3jF8r9Kp2_3mNvXwQrTuYvWxYz0AbCdEfGhIjKlMnOpQrStUvWx

# Copy this entire string
```

**DO NOT:**
- ❌ Close the page before copying
- ❌ Refresh the page
- ❌ Share the token in chat/email/public repos
- ❌ Commit the token to git

**DO:**
- ✅ Copy to a secure password manager
- ✅ Add to GitHub Secrets immediately
- ✅ Delete from clipboard after adding to GitHub

---

## 6. Add Token to GitHub Secrets

### Navigate to GitHub Secrets

1. Go to your repository: **https://github.com/cffrank/jobmatchAI**
2. Click **"Settings"** (top menu)
3. Click **"Secrets and variables"** → **"Actions"** (left sidebar)

### Add Secret

1. Click **"New repository secret"**
2. **Name:** `CLOUDFLARE_API_TOKEN`
3. **Secret:** Paste the token you copied
4. Click **"Add secret"**

### Verify Secret Added

You should see:
```
CLOUDFLARE_API_TOKEN    Updated now by you
```

---

## 7. Get Cloudflare Account ID

### Method 1: From Dashboard

1. Go to: **https://dash.cloudflare.com/**
2. Click on any domain/zone
3. Scroll down in the right sidebar
4. Look for **"Account ID"**
5. Click the copy icon
6. Example: `280c58ea17d9fe3235c33bd0a52a256b`

### Method 2: From URL

When viewing any zone, the URL contains your account ID:
```
https://dash.cloudflare.com/280c58ea17d9fe3235c33bd0a52a256b/...
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              This is your Account ID
```

### Add to GitHub Secrets

1. Click **"New repository secret"**
2. **Name:** `CLOUDFLARE_ACCOUNT_ID`
3. **Secret:** Paste your account ID
4. Click **"Add secret"**

---

## 8. Verify Token Works (Optional)

Test the token locally before using in CI/CD:

```bash
cd workers

# Export token
export CLOUDFLARE_API_TOKEN="your-token-here"
export CLOUDFLARE_ACCOUNT_ID="your-account-id-here"

# Test: List Workers
npx wrangler whoami

# Expected output:
# You are logged in with an API Token, associated with the email 'your-email@example.com'.
```

If this works, the token is configured correctly!

---

## Token Security Best Practices

### ✅ DO

- Store in GitHub Secrets (encrypted at rest)
- Rotate token every 6-12 months
- Use minimum required permissions
- Monitor token usage in Cloudflare dashboard
- Set expiration date and calendar reminder

### ❌ DON'T

- Commit to git repositories
- Share in Slack/Discord/email
- Use in development (.env files)
- Grant more permissions than needed
- Set "never expires" without monitoring

---

## Token Rotation Schedule

**Recommended schedule:**
- **Every 12 months:** Rotate API token
- **Before expiry:** Create new token 1 week before old token expires
- **Immediate rotation if:** Token exposed, team member leaves, security incident

**Rotation process:**
1. Create new token with same permissions
2. Update `CLOUDFLARE_API_TOKEN` in GitHub Secrets
3. Test deployment workflow
4. Delete old token in Cloudflare dashboard
5. Update documentation with rotation date

---

## Troubleshooting

### Error: "Invalid API token"

**Cause:** Token not copied correctly or expired

**Solution:**
1. Verify token in GitHub Secrets (no extra spaces)
2. Check token expiration in Cloudflare dashboard
3. Create new token if needed

### Error: "Insufficient permissions"

**Cause:** Token missing required permissions

**Solution:**
1. Go to Cloudflare → API Tokens
2. Find your token
3. Click "Edit"
4. Verify permissions match this guide
5. Save changes

### Error: "Account ID not found"

**Cause:** Wrong account ID in GitHub Secrets

**Solution:**
1. Go to Cloudflare dashboard
2. Verify account ID from URL or sidebar
3. Update `CLOUDFLARE_ACCOUNT_ID` secret in GitHub
4. Ensure no extra spaces or characters

---

## Required GitHub Secrets Summary

After following this guide, you should have:

| Secret Name | Example Value | Where to Get |
|-------------|---------------|--------------|
| `CLOUDFLARE_API_TOKEN` | `dYZqJ3...vWx` | Create custom token (this guide) |
| `CLOUDFLARE_ACCOUNT_ID` | `280c58ea...256b` | Cloudflare dashboard sidebar |

Plus Supabase secrets (see `CLOUDFLARE_CI_CD_SETUP.md`):

| Secret Name | Where to Get |
|-------------|--------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API |

---

## Next Steps

1. ✅ Create Cloudflare API token (this guide)
2. ✅ Add to GitHub Secrets
3. ✅ Add Supabase secrets (see `CLOUDFLARE_CI_CD_SETUP.md`)
4. ✅ Configure Workers secrets (see `CLOUDFLARE_CI_CD_SETUP.md`)
5. ✅ Test deployment by pushing to `develop` branch

---

## References

- Cloudflare API Tokens: https://developers.cloudflare.com/fundamentals/api/get-started/create-token/
- GitHub Encrypted Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets
- Wrangler Authentication: https://developers.cloudflare.com/workers/wrangler/authentication/

---

**Status:** Ready to create token ✅

**Next:** Create token → Add to GitHub → Push to test deployment
