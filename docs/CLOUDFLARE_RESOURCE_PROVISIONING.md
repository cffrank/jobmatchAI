# Cloudflare Resource Provisioning Strategy

**Date:** 2025-12-31
**Project:** JobMatch AI - Cloudflare Workers Migration
**Current State:** All resources exist, need IaC management
**Recommendation:** Keep wrangler.toml as primary, optional Terraform for advanced features

---

## Current Resource Inventory

### D1 Databases (3 total)
```
Development:  jobmatch-dev       (8140efd5-9912-4e31-981d-0566f1efe9dc)
Staging:      jobmatch-staging   (84b09169-503f-4e40-91c1-b3828272c2e3)
Production:   jobmatch-prod      (06159734-6a06-4c4c-89f6-267e47cb8d30)
```

**Schema:** 26 tables, 60+ indexes, 3 FTS5 full-text search indexes
**Size:** ~0.61 MB (empty schema)
**Location:** Managed via Wrangler CLI

### KV Namespaces (18 total - 6 per environment)
```
Types:
  - JOB_ANALYSIS_CACHE (expensive AI analysis results)
  - SESSIONS (user session data)
  - RATE_LIMITS (rate limiting tracking)
  - OAUTH_STATES (OAuth flow state)
  - EMBEDDINGS_CACHE (job embeddings)
  - AI_GATEWAY_CACHE (OpenAI response cache)

Environments: development, staging, production
```

**Currently:** Declared in `workers/wrangler.toml` with namespace IDs

### R2 Buckets (9 total - 3 per environment)
```
Types:
  - AVATARS (user profile photos)
  - RESUMES (uploaded resumes)
  - EXPORTS (generated PDF/DOCX exports)

Security: Private buckets with presigned URL access (most secure)
```

**Currently:** Declared in `workers/wrangler.toml`

### Vectorize Indexes (3 total - 1 per environment)
```
Development:  jobmatch-ai-dev      (768 dimensions)
Staging:      jobmatch-ai-staging  (768 dimensions)
Production:   jobmatch-ai-prod     (768 dimensions)

Model: BGE-base-en-v1.5 (768-dimensional vectors)
Metric: Cosine similarity
Use Case: Job semantic search and matching
```

**Currently:** Configured in `workers/wrangler.toml`

---

## Provisioning Options Analysis

### Option A: Keep Using wrangler.toml (Recommended) ✅

**Current State:** Already implemented

**How It Works:**
```toml
# workers/wrangler.toml

# D1 Database binding
[[env.development.d1_databases]]
binding = "DB"
database_id = "8140efd5-9912-4e31-981d-0566f1efe9dc"
database_name = "jobmatch-dev"

# KV Namespace binding
[[env.development.kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "fce1eb2547c14cd0811521246fec5c76"

# R2 Bucket binding
[[env.development.r2_buckets]]
binding = "AVATARS"
bucket_name = "jobmatch-ai-dev-avatars"

# Vectorize Index binding
[[env.development.vectorize]]
binding = "VECTORIZE"
index_name = "jobmatch-ai-dev"
```

**When Resources Don't Exist:**
```bash
cd workers

# Create new KV namespace (generates ID)
npx wrangler kv namespace create MY_NEW_NAMESPACE --env development

# Create new R2 bucket
npx wrangler r2 bucket create my-new-bucket --env development

# Create new D1 database (with ID)
npx wrangler d1 create my-new-db --env development
```

**Wrangler then outputs the ID to add to wrangler.toml:**
```
Created binding 'MY_NEW_NAMESPACE' with id: 'abc123def456'
```

**Pros:**
- ✅ Already implemented in your project
- ✅ Native Cloudflare tooling
- ✅ Simple TOML syntax
- ✅ Integrated with Worker deployment
- ✅ No external tool dependencies
- ✅ Bindings automatically bound to Worker
- ✅ Fast iteration and development

**Cons:**
- ❌ No drift detection
- ❌ Manual resource creation outside wrangler.toml
- ❌ Cannot manage DNS, firewall, rate limiting policies
- ❌ No state management
- ❌ IDs must be manually added to config

**Best For:**
- Your current use case
- Workers-focused projects
- Teams not needing complex infrastructure

**Recommendation:** ✅ **Keep wrangler.toml as primary**

---

### Option B: Add Terraform for Advanced Features (Optional) ⭐

**When to Use:** Only if you need domain management, DNS, firewall rules, or Zero Trust policies

**Resources Terraform Can Manage:**
```
✅ Workers scripts and bindings
✅ D1 databases (bindings only, not schema)
✅ KV namespaces
✅ R2 buckets
✅ Zones and DNS records
✅ SSL/TLS certificates
✅ Firewall rules and WAF
✅ Rate limiting rules
✅ Zero Trust access policies
❌ Pages (minimal support)
❌ D1 schema migrations (use Wrangler instead)
```

**Terraform Structure:**
```
terraform/
├── main.tf              # Provider and version
├── cloudflare.tf        # Cloudflare resources
├── outputs.tf           # Outputs for reference
├── variables.tf         # Input variables
└── terraform.tfvars     # Variable values (gitignored)
```

**Example: Create D1 Database**
```hcl
# terraform/cloudflare.tf

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# D1 Database
resource "cloudflare_d1_database" "development" {
  account_id = var.cloudflare_account_id
  name       = "jobmatch-dev"
}

# Import existing database
# terraform import cloudflare_d1_database.development {accountId}/{databaseId}
```

**Example: Create KV Namespace**
```hcl
resource "cloudflare_workers_kv_namespace" "analysis_cache" {
  account_id = var.cloudflare_account_id
  title      = "job-analysis-cache-dev"
}

resource "cloudflare_workers_kv_namespace" "sessions" {
  account_id = var.cloudflare_account_id
  title      = "sessions-dev"
}
```

**Example: Create R2 Bucket**
```hcl
resource "cloudflare_r2_bucket" "avatars" {
  account_id = var.cloudflare_account_id
  bucket_name = "jobmatch-ai-dev-avatars"

  # Optional: Enable versioning
  # version_control_enabled = true
}
```

**Example: Create Domain/DNS**
```hcl
resource "cloudflare_zone" "example" {
  account_id = var.cloudflare_account_id
  zone       = "jobmatch.ai"
}

resource "cloudflare_zone_settings_override" "example" {
  zone_id = cloudflare_zone.example.id
  settings {
    # Enable HTTPS only
    https_redirect = "on"
    # Enable caching
    cache_level = "cache_everything"
  }
}

resource "cloudflare_record" "api" {
  zone_id = cloudflare_zone.example.id
  name    = "api"
  value   = "jobmatch-ai-prod.carl-f-frank.workers.dev"
  type    = "CNAME"
  ttl     = 1  # Auto TTL
}
```

**How to Import Existing Resources:**
```bash
# Initialize Terraform
terraform init

# Import existing D1 database
terraform import cloudflare_d1_database.development \
  280c58ea17d9fe3235c33bd0a52a256b/8140efd5-9912-4e31-981d-0566f1efe9dc

# Import existing KV namespace
terraform import cloudflare_workers_kv_namespace.analysis_cache \
  280c58ea17d9fe3235c33bd0a52a256b/fce1eb2547c14cd0811521246fec5c76

# Verify imported state
terraform state list
terraform state show cloudflare_d1_database.development
```

**Pros:**
- ✅ Manages entire Cloudflare infrastructure
- ✅ State-based drift detection
- ✅ Version control for all infrastructure
- ✅ Can manage DNS, firewall, rate limiting
- ✅ Repeatable resource creation
- ✅ Team collaboration via state files
- ✅ Can scale to multiple projects

**Cons:**
- ❌ Duplicate configuration (wrangler.toml + Terraform)
- ❌ Two sources of truth (complexity)
- ❌ State management overhead
- ❌ Longer learning curve
- ❌ D1 schema migrations still via Wrangler
- ❌ Slower deployment than direct Wrangler

**Best For:**
- Enterprise environments
- Multi-project infrastructure
- Complex Cloudflare configurations
- Team infrastructure governance

**Recommendation:** ⭐ **Optional - add only if managing DNS/firewall**

---

### Option C: Terraform + Wrangler Hybrid (Best Practices)

**Recommended Approach:** Use both tools strategically

**Separation of Concerns:**
```
Wrangler (primary):
  - Workers deployment
  - D1 bindings and migrations
  - KV, R2, Vectorize bindings
  - Secrets management
  - Worker-specific configuration

Terraform (secondary - optional):
  - Zone and DNS management
  - SSL/TLS certificates
  - Firewall rules and WAF
  - Rate limiting policies
  - Zero Trust access
  - Infrastructure documentation
```

**Example Hybrid Setup:**
```
.
├── workers/
│   ├── wrangler.toml          # Wrangler config (bindings)
│   ├── src/
│   └── migrations/
│
└── terraform/                 # Optional - only for advanced features
    ├── main.tf
    ├── cloudflare.tf          # DNS, firewall, policies
    ├── variables.tf
    └── terraform.tfvars.example
```

**Deployment Flow:**
```
1. Make infrastructure changes in Terraform
   terraform plan
   terraform apply

2. Worker deployment uses wrangler.toml
   wrangler deploy

3. D1 migrations via Wrangler
   wrangler d1 migrations apply
```

---

## Environment Management Strategy

### For Each Environment (dev, staging, prod)

**Option 1: Separate Terraform Workspaces** (Advanced)
```bash
# Create workspaces
terraform workspace new development
terraform workspace new staging
terraform workspace new production

# Use in Terraform
variable "environment" {
  default = "development"
}

resource "cloudflare_d1_database" "main" {
  name = "jobmatch-${var.environment}"
}
```

**Option 2: Separate Terraform Directories** (Simpler)
```
terraform/
├── development/
│   ├── main.tf
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   └── terraform.tfvars
└── production/
    ├── main.tf
    └── terraform.tfvars
```

**Option 3: Variables File per Environment** (Recommended)
```
terraform/
├── main.tf
├── cloudflare.tf
├── development.tfvars    # environment=development
├── staging.tfvars        # environment=staging
└── production.tfvars     # environment=production

# Deploy to development
terraform apply -var-file="development.tfvars"

# Deploy to staging
terraform apply -var-file="staging.tfvars"

# Deploy to production
terraform apply -var-file="production.tfvars"
```

---

## Migration Path: Manual → IaC

### Phase 1: Current State (Now) ✅
```
Status: All resources created manually
Location: In wrangler.toml with IDs
Management: Wrangler CLI for CRUD

Resources:
  - 3 D1 databases (created via wrangler d1 create)
  - 18 KV namespaces (created via wrangler kv namespace create)
  - 9 R2 buckets (created via wrangler r2 bucket create)
  - 3 Vectorize indexes (created via Cloudflare dashboard)

Actions:
  - ✅ No changes needed
  - Store in Git (already done in wrangler.toml)
  - Document IDs (added to comments in wrangler.toml)
```

### Phase 2: Version Control as IaC (In Progress) 🔄
```
Status: wrangler.toml stored in Git
Location: workers/wrangler.toml
Bindings: All resource IDs documented

Actions:
  - ✅ Version control wrangler.toml
  - ✅ Document all resource IDs
  - ✅ Create README for environment setup
  - ✅ Add to CI/CD pipeline (via GitHub Actions)
```

### Phase 3: Optional Terraform (If Needed) ⏳
```
Status: Not yet implemented
Trigger: Only if managing domains/DNS/firewall

Actions (if decided to implement):
  1. Create terraform/ directory
  2. Define Cloudflare provider
  3. Create resources for domains/DNS
  4. Import existing D1/KV/R2 (optional)
  5. Run terraform plan to verify
  6. Run terraform apply

Timeline: 2-3 weeks if needed
```

---

## Creating New Resources

### Adding a New D1 Database

**Using Wrangler:**
```bash
cd workers

# Create database
npx wrangler d1 create jobmatch-new --env development

# Output:
# Created database 'jobmatch-new'
# id = 'new-uuid-here'

# Add to wrangler.toml
# [[env.development.d1_databases]]
# binding = "DB"
# database_id = "new-uuid-here"
# database_name = "jobmatch-new"

# Verify
npx wrangler d1 info jobmatch-new --env development
```

### Adding a New KV Namespace

**Using Wrangler:**
```bash
cd workers

# Create namespace
npx wrangler kv namespace create MY_NEW_CACHE --env development

# Output:
# Created namespace 'MY_NEW_CACHE'
# id = 'abc123...'

# Add to wrangler.toml
# [[env.development.kv_namespaces]]
# binding = "MY_NEW_CACHE"
# id = "abc123..."

# Verify
npx wrangler kv namespace list --env development
```

### Adding a New R2 Bucket

**Using Wrangler:**
```bash
cd workers

# Create bucket
npx wrangler r2 bucket create jobmatch-ai-dev-new --env development

# Output:
# Created bucket 'jobmatch-ai-dev-new'

# Add to wrangler.toml
# [[env.development.r2_buckets]]
# binding = "NEW_BUCKET"
# bucket_name = "jobmatch-ai-dev-new"

# Verify
npx wrangler r2 bucket list --env development
```

### Adding a New Vectorize Index

**Note:** Vectorize indexes must be created via Cloudflare Dashboard or API

```bash
# Via API
curl -X POST https://api.cloudflare.com/client/v4/accounts/{account}/vectorize \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "jobmatch-ai-new",
    "config": {
      "dimensions": 768,
      "metric": "cosine"
    }
  }'

# Add to wrangler.toml
# [[env.development.vectorize]]
# binding = "VECTORIZE"
# index_name = "jobmatch-ai-new"
```

---

## Resource Deletion

### Deleting a D1 Database

**Important:** This is destructive and cannot be undone

```bash
cd workers

# Delete from Cloudflare
npx wrangler d1 delete jobmatch-old --env development

# Remove from wrangler.toml
# Delete the [[env.development.d1_databases]] section

# Verify deletion
npx wrangler d1 info jobmatch-old --env development
# Should show: database not found
```

### Deleting a KV Namespace

```bash
cd workers

# Delete from Cloudflare
npx wrangler kv namespace delete MY_OLD_CACHE --env development

# Remove from wrangler.toml
# Delete the [[env.development.kv_namespaces]] section

# Verify
npx wrangler kv namespace list --env development
```

### Deleting an R2 Bucket

```bash
cd workers

# Delete from Cloudflare (must be empty)
npx wrangler r2 bucket delete jobmatch-ai-dev-old --env development

# Remove from wrangler.toml
# Delete the [[env.development.r2_buckets]] section

# Verify
npx wrangler r2 bucket list --env development
```

---

## Cost Implications

### Wrangler IaC Only (Recommended)

**Monthly Cost:**
- 3 D1 Databases: $25 (included in plan)
- 18 KV Namespaces: Included in Workers plan
- 9 R2 Buckets: $0.015/GB stored + data transfer
- 3 Vectorize Indexes: Included in plan
- **Total:** $25 + storage costs

**No additional tooling costs**

### Terraform + Wrangler Hybrid

**Monthly Cost:**
- Same as above (Cloudflare resources)
- Optional: Terraform Cloud: $0-20/month
- **Total:** $25-45 + storage costs

---

## Recommended Configuration Files

### `workers/README.md` - Document Resources

```markdown
# JobMatch AI Workers

## Resources

### D1 Databases
- Development: jobmatch-dev (8140efd5-9912-4e31-981d-0566f1efe9dc)
- Staging: jobmatch-staging (84b09169-503f-4e40-91c1-b3828272c2e3)
- Production: jobmatch-prod (06159734-6a06-4c4c-89f6-267e47cb8d30)

### KV Namespaces (6 per environment)
- JOB_ANALYSIS_CACHE - 7-day TTL
- SESSIONS - User session storage
- RATE_LIMITS - Rate limiting tracking
- OAUTH_STATES - OAuth flow state
- EMBEDDINGS_CACHE - Job embeddings
- AI_GATEWAY_CACHE - OpenAI cache

### R2 Buckets (3 per environment)
- AVATARS - User profile photos (presigned URLs)
- RESUMES - Uploaded resumes (presigned URLs)
- EXPORTS - Generated exports (presigned URLs)

### Vectorize Indexes
- All 768-dimensional BGE-base-en-v1.5
- Cosine similarity metric

## Adding New Resources

See CLOUDFLARE_RESOURCE_PROVISIONING.md for detailed steps.
```

### `.gitignore` - Protect Sensitive Files

```
# Terraform
terraform/.terraform/
terraform/terraform.tfvars
terraform/terraform.tfstate*
terraform/.terraform.lock.hcl

# Wrangler
.wrangler/
dist/
wrangler.toml.local

# Environment
.env
.env.local
.env.*.local

# Secrets
*.key
*.pem
```

---

## Verification Checklist

- [ ] All D1 databases listed in wrangler.toml with correct IDs
- [ ] All KV namespaces listed with correct IDs
- [ ] All R2 buckets listed with correct bucket names
- [ ] All Vectorize indexes listed with correct names
- [ ] wrangler.toml committed to Git
- [ ] Resource IDs documented in comments
- [ ] Workers can bind to all resources
- [ ] D1 migrations tracked in version control
- [ ] No manual resources outside of wrangler.toml
- [ ] CI/CD pipeline deploys using wrangler.toml

---

## Summary

| Aspect | Recommendation | Status |
|--------|-----------------|--------|
| **Primary IaC Tool** | wrangler.toml | ✅ Implemented |
| **D1 Databases** | Declare in wrangler.toml | ✅ Done |
| **KV Namespaces** | Declare in wrangler.toml | ✅ Done |
| **R2 Buckets** | Declare in wrangler.toml | ✅ Done |
| **Vectorize Indexes** | Declare in wrangler.toml | ✅ Done |
| **Version Control** | Store wrangler.toml in Git | ✅ Done |
| **Terraform** | Optional for DNS/firewall | ⏳ Defer |
| **Secrets** | Use wrangler secret CLI | ⏳ Next |
| **D1 Migrations** | Wrangler migrations/ dir | ✅ Done |

---

**Recommendation:** Keep wrangler.toml as primary IaC. Move to Phase 2 (GitHub Actions CI/CD setup).
