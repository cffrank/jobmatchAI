# Railway CLI Token Setup - Quick Start

Fast setup guide for authenticating Railway CLI with a user token.

## 5-Minute Setup

### 1. Generate Token (2 min)

1. Go to [railway.com](https://railway.com)
2. Click your avatar → Settings
3. Click **Tokens** → **Generate Token**
4. Name it (e.g., "JobMatch AI")
5. Copy the token: `rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 2. Save Token (2 min)

**Choose ONE method:**

**Method A: Shell Config (Recommended)**

Add to `~/.zshrc` or `~/.bashrc`:

```bash
export RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Reload: `source ~/.zshrc` (or restart terminal)

**Method B: Environment File**

Create `~/.env`:

```bash
export RAILWAY_API_TOKEN="rwe_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Load in terminal: `source ~/.env`

**Method C: CI/CD Secret**

Add to your repository (GitHub/GitLab):
- Secret name: `RAILWAY_API_TOKEN`
- Secret value: Your token

### 3. Verify (1 min)

```bash
# Test token works
railway whoami

# Should show: your-email@example.com
```

## Done!

You're authenticated. You can now:

```bash
# Check status
railway status

# List projects
railway list

# Deploy
railway up

# View logs
railway logs
```

## Troubleshooting

**Token not working?**

```bash
# Check if token is set
echo $RAILWAY_API_TOKEN

# Should show your token (rwe_xxx...)

# If empty:
# 1. Make sure you exported it: export RAILWAY_API_TOKEN="..."
# 2. Reload shell: source ~/.zshrc
# 3. Test in new terminal
```

**"Not authenticated" error?**

```bash
# Verify token is valid
railway whoami

# If fails:
# 1. Check token in Railway dashboard
# 2. Try new token
# 3. Or use browser login: railway login
```

## Token Management

### View All Tokens

In Railway dashboard: Account Settings → Tokens

### Rotate Token (Security)

1. Generate new token in Railway dashboard
2. Update `~/.zshrc` or `~/.env` with new token
3. Delete old token in Railway dashboard
4. Test with `railway whoami`

### Revoke Token (Emergency)

In Railway dashboard → Tokens → Delete

Then generate new token and update everywhere.

## For CI/CD (GitHub Actions/GitLab)

### GitHub Actions

1. Go to Settings → Secrets → New repository secret
2. Name: `RAILWAY_API_TOKEN`
3. Value: Paste your token
4. Save

In workflow `.yml`:

```yaml
env:
  RAILWAY_API_TOKEN: ${{ secrets.RAILWAY_API_TOKEN }}
```

### GitLab CI

1. Go to Settings → CI/CD → Variables
2. Key: `RAILWAY_API_TOKEN`
3. Value: Paste your token
4. Check "Protect variable"
5. Save

In `.gitlab-ci.yml`:

```yaml
variables:
  RAILWAY_API_TOKEN: $RAILWAY_API_TOKEN
```

## Security Tips

- Never commit tokens to git
- Use `.gitignore` for `.env` files
- Use CI/CD secrets, not environment files
- Rotate tokens monthly
- Revoke immediately if compromised

## More Info

- Full guide: `docs/RAILWAY_CLI_AUTHENTICATION.md`
- Verification script: `./scripts/verify-railway-deployment.sh check-cli`
- Railway Docs: https://docs.railway.com/guides/cli
