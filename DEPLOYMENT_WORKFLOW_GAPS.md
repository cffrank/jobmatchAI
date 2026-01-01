# Deployment Workflow Analysis - Critical Gaps

**Date:** 2025-12-31
**Current Workflow:** `.github/workflows/cloudflare-deploy.yml`

---

## What the Workflow Currently Does ✅

### 1. Frontend Deployment
- **Tool Used:** `cloudflare/pages-action` GitHub Action (NOT wrangler)
- **What it deploys:** Built HTML/JS/CSS from `dist/` folder
- **Deployment method:** GitHub Action calls Cloudflare Pages API directly

### 2. Backend Deployment
- **Tool Used:** `wrangler deploy` CLI command
- **What it deploys:** Workers code (API routes, services, middleware)
- **Deployment method:** Runs `npx wrangler deploy --env <environment>`

### 3. Tests
- **Frontend:** TypeScript check, ESLint
- **Backend:** TypeScript check, ESLint, unit tests, integration tests

---

## What the Workflow Does NOT Handle ❌

### Critical Gap #1: D1 Database Migrations

**Problem:**
```
Your code adds a new column → column_name VARCHAR(255)
         ↓
Workflow deploys Workers code → queries expect new column
         ↓
Database still has old schema → NO MIGRATION APPLIED
         ↓
❌ Runtime Error: "column does not exist"
```

**Current situation:**
- Migrations exist in `workers/migrations/`
- But workflow NEVER runs them
- You must manually run: `wrangler d1 migrations apply DB --env <environment> --remote`

**Impact:** 🔴 HIGH
- Every database schema change requires manual migration
- Risk of deploying code before database is ready
- Production outages if migrations forgotten

---

### Critical Gap #2: KV Namespace Changes

**What's affected:**
- Creating new KV namespaces
- Deleting unused namespaces
- Renaming bindings

**How to handle:**
- Add to `wrangler.toml` (tracked in git ✅)
- But you must manually create the namespace first:
  ```bash
  wrangler kv namespace create NAMESPACE_NAME --env production
  # Copy the ID into wrangler.toml
  ```

**Impact:** 🟡 MEDIUM
- Infrequent changes (only when adding new features)
- Deployment fails loudly if namespace missing (easy to catch)

---

### Critical Gap #3: R2 Bucket Changes

**What's affected:**
- Creating new R2 buckets
- Changing bucket names
- CORS policy changes

**How to handle:**
- Buckets declared in `wrangler.toml` (tracked in git ✅)
- But buckets must exist before deployment:
  ```bash
  wrangler r2 bucket create bucket-name
  ```

**Impact:** 🟡 MEDIUM
- Infrequent changes
- Deployment fails if bucket missing

---

### Critical Gap #4: Vectorize Index Changes

**What's affected:**
- Creating new indexes
- Changing dimensions
- Changing similarity metric

**How to handle:**
- Can't be changed after creation (requires delete + recreate)
- Must manually create:
  ```bash
  wrangler vectorize create INDEX_NAME --dimensions=768 --metric=cosine
  ```

**Impact:** 🟢 LOW
- Very rare changes (set once during initial setup)

---

### Critical Gap #5: Secrets Management

**What's affected:**
- Adding new API keys
- Rotating credentials
- Environment-specific secrets

**How to handle:**
- Must manually run:
  ```bash
  echo "new-secret-value" | wrangler secret put SECRET_NAME --env production
  ```

**Impact:** 🟡 MEDIUM
- Happens during initial setup and periodic rotation
- Not part of code deployment flow (by design - secrets not in git)

---

## Recommended Fix: Add Migration Job

Add this job to the workflow **BEFORE** deploying code:

```yaml
# NEW JOB - runs after tests, before deployment
run-migrations:
  name: Run D1 Migrations
  runs-on: ubuntu-latest
  needs: run-tests
  timeout-minutes: 5

  steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '22.x'

    - name: Determine environment
      id: env
      env:
        BRANCH_NAME: ${{ github.ref_name }}
      run: |
        case "$BRANCH_NAME" in
          develop) echo "environment=development" >> $GITHUB_OUTPUT ;;
          staging) echo "environment=staging" >> $GITHUB_OUTPUT ;;
          main) echo "environment=production" >> $GITHUB_OUTPUT ;;
        esac

    - name: Install wrangler
      working-directory: workers
      run: npm ci

    - name: Run D1 migrations
      working-directory: workers
      env:
        CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        DEPLOY_ENV: ${{ steps.env.outputs.environment }}
      run: |
        npx wrangler d1 migrations apply DB --env "$DEPLOY_ENV" --remote

# Then update deployment jobs to depend on migrations:
deploy-frontend:
  needs: [run-tests, run-migrations]  # ← Add run-migrations

deploy-backend:
  needs: [run-tests, run-migrations]  # ← Add run-migrations
```

---

## Correct Deployment Flow (After Fix)

```
Push to develop
      ↓
Run Tests
      ↓
  ✅ Pass?
      ↓
Run D1 Migrations ← NEW STEP
      ↓
  ┌───┴───┐
  ↓       ↓
Deploy  Deploy
Pages   Workers
```

**Benefits:**
- ✅ Database schema always updated before code deployment
- ✅ No manual migration step needed
- ✅ Prevents "column does not exist" errors
- ✅ Safe rollback (migrations applied atomically)

---

## Other Infrastructure Changes - Manual Process

For KV, R2, Vectorize, Secrets:

**Development Workflow:**
1. Update `wrangler.toml` with new binding
2. Manually create resource: `wrangler <service> create <name>`
3. Copy ID into `wrangler.toml`
4. Commit `wrangler.toml` to git
5. Push - deployment will use new resource

**Why manual?**
- One-time setup per resource
- Infrastructure changes are rare
- Manual control prevents accidental resource creation
- Terraform/Pulumi can automate this later if needed

---

## Summary

| Service | Tracked in Git? | Auto-Deployed? | Manual Step Required |
|---------|----------------|----------------|---------------------|
| Workers code | ✅ Yes | ✅ Yes | None |
| Pages frontend | ✅ Yes | ✅ Yes | None |
| D1 migrations | ✅ Yes | ❌ **NO** | **Add migration job** |
| KV namespaces | ✅ Yes (IDs) | ⚠️ Partial | Create namespace first |
| R2 buckets | ✅ Yes (names) | ⚠️ Partial | Create bucket first |
| Vectorize | ✅ Yes (names) | ⚠️ Partial | Create index first |
| Secrets | ❌ No | ❌ No | Always manual (by design) |

**Recommendation:** Add D1 migration job to workflow immediately - this is the highest impact fix.
