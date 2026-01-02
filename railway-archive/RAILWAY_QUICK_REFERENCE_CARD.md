# Railway Authentication - Quick Reference Card

**Print this card for quick access to common commands and procedures**

---

## Token Creation (5 min)

```
1. https://railway.app/dashboard
2. Profile → Account → Tokens
3. Create Token
4. Name: "JobMatch AI CLI"
5. Copy token
6. Store in password manager
```

---

## GitHub Actions Setup (2 min)

```
1. Repository Settings
2. Secrets and variables → Actions
3. New secret
4. Name: RAILWAY_TOKEN
5. Value: [paste token]
6. Add secret
```

---

## Verification Commands

| Task | Command |
|------|---------|
| Check token is set | `echo $RAILWAY_TOKEN` |
| Verify authentication | `railway whoami` |
| Run full verification | `./scripts/verify-railway-token.sh` |
| Check deployment | `./scripts/verify-railway-deployment.sh` |
| View logs | `railway logs --tail 100` |

---

## Environment Setup (Local Testing)

```bash
# Set token temporarily
export RAILWAY_TOKEN="your-token-here"

# Verify it works
railway whoami

# Test deployment
cd backend
railway up --service backend --detach

# Clean up (when done)
unset RAILWAY_TOKEN
```

---

## Token Types

| Variable | Scope | Usage |
|----------|-------|-------|
| `RAILWAY_TOKEN` | Single project | CI/CD (recommended) |
| `RAILWAY_API_TOKEN` | All projects | Multi-project |

Use: `RAILWAY_TOKEN` for JobMatch AI

---

## Storage Locations

| Location | Security | Use Case |
|----------|----------|----------|
| Password Manager | Excellent | Primary storage |
| GitHub Secret | Excellent | CI/CD pipelines |
| .env file | Poor | NEVER use |

---

## Common Errors & Solutions

| Error | Solution |
|-------|----------|
| Token not found | `export RAILWAY_TOKEN="..."` |
| Invalid token | Create new token at railway.app |
| Auth fails | Check GitHub secret name: RAILWAY_TOKEN |
| Project not linked | Run: `railway link --project jobmatch-ai` |

---

## Monthly Tasks

```
1. Create new token (railway.app)
2. Test locally: railway whoami
3. Update GitHub secret
4. Verify deployment succeeds
5. Delete old token
```

---

## Troubleshooting Flow

```
Issue? → Run: ./scripts/verify-railway-token.sh
        ↓
Got error message?
        ↓
Check: docs/RAILWAY_AUTHENTICATION_REFERENCE.md
(Troubleshooting section)
        ↓
Follow suggested fix
        ↓
Re-run verification
```

---

## Quick Setup (15 min)

```
1. Create token (5 min)
   https://railway.app/dashboard → Account → Tokens

2. Add to GitHub (2 min)
   Settings → Secrets → New: RAILWAY_TOKEN

3. Verify setup (5 min)
   ./scripts/verify-railway-token.sh

4. Deploy (auto)
   Push to main branch
```

---

## File Locations

| Document | Path |
|----------|------|
| Quick setup | `docs/RAILWAY_TOKEN_SETUP.md` |
| Security guide | `docs/RAILWAY_TOKEN_MANAGEMENT.md` |
| Full reference | `docs/RAILWAY_AUTHENTICATION_REFERENCE.md` |
| Index/Navigation | `docs/RAILWAY_COMPLETE_SETUP_INDEX.md` |
| Token verification | `scripts/verify-railway-token.sh` |

---

## GitHub Workflow

```
1. Push to main → Triggers workflow
2. Workflow uses RAILWAY_TOKEN secret
3. Deploys to Railway
4. Health check runs
5. Done!
```

---

## Getting Help

1. **Quick issue**: Check "Common Errors" above
2. **Setup question**: Read `docs/RAILWAY_TOKEN_SETUP.md`
3. **Security question**: Read `docs/RAILWAY_TOKEN_MANAGEMENT.md`
4. **Complete reference**: Read `docs/RAILWAY_AUTHENTICATION_REFERENCE.md`
5. **Need to navigate**: Read `docs/RAILWAY_COMPLETE_SETUP_INDEX.md`

---

## Key Variables

```bash
# Set before using Railway CLI
export RAILWAY_TOKEN="your-token-here"

# Check if set
echo $RAILWAY_TOKEN

# From .env file
set -a
source .env
set +a
```

---

## Deployment Verification

```bash
# Check CLI is installed and authenticated
./scripts/verify-railway-deployment.sh check-cli

# Check backend service status
./scripts/verify-railway-deployment.sh check-service

# Check environment variables
./scripts/verify-railway-deployment.sh check-variables

# Test health endpoint
./scripts/verify-railway-deployment.sh health-check

# Run all checks
./scripts/verify-railway-deployment.sh full-check
```

---

## Token Rotation Checklist

```
[ ] Create new token at railway.app
[ ] Test locally: export RAILWAY_TOKEN="new" && railway whoami
[ ] Update GitHub secret RAILWAY_TOKEN
[ ] Push code to trigger workflow
[ ] Verify deployment succeeds
[ ] Delete old token from railway.app
```

---

## Security Checklist

```
[ ] Token created
[ ] Token in password manager (NOT in Git)
[ ] Token in GitHub secret RAILWAY_TOKEN
[ ] .env added to .gitignore
[ ] Token tested locally: railway whoami
[ ] Verification script passes
[ ] Deployment works
[ ] Health check passes
[ ] Token rotation scheduled (monthly)
```

---

## Useful Links

- Railway Dashboard: https://railway.app/dashboard
- Railway CLI Docs: https://docs.railway.com/develop/cli
- Railway Tokens: https://docs.railway.com/develop/tokens
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/encrypted-secrets

---

## Summary

**Token Creation**: 5 minutes
**GitHub Setup**: 2 minutes
**Verification**: 2 minutes
**Deployment**: Automatic (push to main)

**Total Setup**: ~15 minutes

---

**Created**: 2025-12-24
**For**: JobMatch AI
**Keep**: Near your desk for quick reference
