# Cloudflare Infrastructure as Code (IaC) Recommendation

**Date:** 2025-12-31
**Project:** JobMatch AI - Cloudflare Workers Migration
**Recommendation:** Hybrid approach using **wrangler.toml** (primary) + **Terraform** (optional advanced features)

---

## Executive Summary

For managing Cloudflare infrastructure (D1, KV, R2, Vectorize, Workers, Pages), we recommend a **two-tier approach**:

1. **Primary: wrangler.toml** - For Workers, D1, KV, R2, Vectorize bindings (70% of use cases)
   - Already in place with IDs for all environments
   - Native Cloudflare tooling with tight integration
   - Declarative configuration stored in Git
   - Part of Worker deployment pipeline

2. **Optional Secondary: Terraform** - For complex multi-resource orchestration, domain management, and policy enforcement (30% of use cases)
   - Manage domains, SSL/TLS, firewall rules
   - Version control for entire infrastructure
   - Advanced features like DDoS protection, rate limiting policies
   - Infrastructure consistency across teams

**Status:** Your current `wrangler.toml` is already best-practice IaC for Workers infrastructure. No immediate changes needed.

---

## Option Comparison

### Option 1: wrangler.toml (Recommended ✅)

**Status:** Already implemented in your project

**What it does:**
- Declares Workers configurations and bindings
- Creates/updates D1, KV, R2, Vectorize resources
- Manages environment-specific configurations
- Stores resource IDs in version control

**Supported Resources:**
- ✅ Workers (scripts, environments)
- ✅ D1 Databases (with schema management via migrations)
- ✅ KV Namespaces
- ✅ R2 Buckets
- ✅ Vectorize Indexes
- ✅ Workers AI bindings
- ✅ Durable Objects
- ✅ Custom domains
- ✅ Secrets (managed via CLI)

**Advantages:**
- Native Cloudflare tooling, single source of truth
- Tight integration with Wrangler CLI
- Bindings automatically created on `wrangler deploy`
- Environment-specific configurations in one file
- Already in use in your project
- Zero learning curve - TOML is simple
- Fast deployments with minimal overhead

**Disadvantages:**
- Limited to Worker-related resources
- Cannot manage DNS records, firewall rules, rate limiting policies
- No multi-project orchestration
- TOML syntax less flexible than HCL/JSON

**Best For:**
- Workers platform projects
- Teams using Cloudflare primarily for Workers
- Rapid iteration and development
- Small to medium complexity projects

**Your Project Status:**
```toml
# Already configured with all required resources:
[env.development.vars]
ENVIRONMENT = "development"

[[env.development.d1_databases]]
binding = "DB"
database_id = "8140efd5-9912-4e31-981d-0566f1efe9dc"

[[env.development.kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "fce1eb2547c14cd0811521246fec5c76"

[[env.development.r2_buckets]]
binding = "AVATARS"
bucket_name = "jobmatch-ai-dev-avatars"
```

---

### Option 2: Terraform Provider (Optional Enhancement ⭐)

**Status:** Available and mature (v5 auto-generated provider in 2025)

**What it does:**
- Manages all Cloudflare resources (Workers, Pages, DNS, Firewall, etc.)
- Declarative infrastructure in HCL (HashiCorp Configuration Language)
- State management and drift detection
- Works alongside wrangler.toml

**Supported Resources:**
- ✅ Workers (via bindings configuration)
- ✅ D1 (bindings, not schema management)
- ✅ KV Namespaces
- ✅ R2 Buckets
- ✅ Zones, DNS records
- ✅ Firewall rules, WAF policies
- ✅ Page Rules, Transform Rules
- ✅ SSL/TLS certificates
- ✅ Rate limiting rules
- ✅ Zero Trust policies
- ⚠️ Pages (limited - primarily via GitHub integration)

**Advantages:**
- Manages entire Cloudflare infrastructure
- HCL is more powerful than TOML
- State files enable drift detection
- Works with Terraform Cloud for remote state
- Can manage DNS, security policies, etc.
- Team-friendly with lock files and state sharing
- Enables complex module patterns
- Auto-generated from OpenAPI (keeps up with API)

**Disadvantages:**
- Additional tool to learn and maintain
- Duplicate configuration (wrangler.toml + Terraform)
- State management complexity
- Slower deployment than direct Wrangler
- Overkill for simple projects
- Two sources of truth risk

**Best For:**
- Enterprise multi-tenant setups
- Teams managing complex Cloudflare configs
- Need drift detection and state management
- Managing domains, DNS, firewall rules
- Infrastructure consistency across projects

**Example Terraform Structure:**
```hcl
# terraform/cloudflare.tf

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Remote state in Terraform Cloud
  cloud {
    organization = "your-org"
    workspaces {
      name = "jobmatch-ai"
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

# KV Namespace
resource "cloudflare_workers_kv_namespace" "analysis_cache" {
  account_id = var.cloudflare_account_id
  title      = "job-analysis-cache-dev"
}

# R2 Bucket
resource "cloudflare_r2_bucket" "avatars" {
  account_id = var.cloudflare_account_id
  bucket_name = "jobmatch-ai-dev-avatars"

  # Optional: Enable versioning
  # version_control_enabled = true
}

# Output resource IDs for wrangler.toml
output "d1_database_id" {
  value = cloudflare_d1_database.development.id
}
```

---

### Option 3: Pulumi (Alternative Multi-Language IaC)

**Status:** Available (v6.12.0 as of Dec 2025)

**What it does:**
- Infrastructure as code using Python, TypeScript, Go, Java, .NET
- Similar capabilities to Terraform
- State management and drift detection

**Supported Resources:**
- ✅ Workers scripts, versions, deployments
- ✅ KV namespaces
- ✅ D1 (limited binding support)
- ✅ Pages projects
- ✅ Zones, DNS, SSL/TLS
- ✅ Firewall, WAF
- ✅ Rate limiting rules

**Advantages:**
- Program in familiar languages (TypeScript, Python, etc.)
- More expressive than HCL
- Excellent for complex logic
- Strong community support
- Can use npm modules in infrastructure code

**Disadvantages:**
- Learning curve if not familiar with Pulumi
- Less Cloudflare-specific docs than Terraform
- Smaller Cloudflare provider maturity vs Terraform
- Another state management system

**Best For:**
- Teams already using Pulumi
- Complex multi-region deployments
- Programmatic infrastructure generation
- Heavy TypeScript teams

---

### Option 4: Cloudflare API + Custom Scripts

**Status:** Possible but not recommended

**What it does:**
- Write shell/Node.js scripts calling Cloudflare API
- Manual resource creation
- Custom scripts in Git

**Advantages:**
- No tool learning required
- Full control

**Disadvantages:**
- No state management
- Drift detection impossible
- Error-prone manual scripts
- No idempotency
- Difficult to maintain at scale

**Status:** NOT RECOMMENDED - poor DevOps practices

---

## Recommendation: Hybrid Approach

For your project, use **both** tools strategically:

### wrangler.toml (Primary - Keep As-Is)
Use for Workers, D1 migrations, KV, R2, Vectorize bindings:

```toml
# workers/wrangler.toml
name = "jobmatch-ai"
main = "api/index.ts"

[env.development]
name = "jobmatch-ai-dev"

[[env.development.d1_databases]]
binding = "DB"
database_id = "8140efd5-9912-4e31-981d-0566f1efe9dc"

[[env.development.kv_namespaces]]
binding = "JOB_ANALYSIS_CACHE"
id = "fce1eb2547c14cd0811521246fec5c76"

[[env.development.r2_buckets]]
binding = "AVATARS"
bucket_name = "jobmatch-ai-dev-avatars"
```

**Why:** Native Cloudflare tooling, already implemented, fast deployments

---

### Terraform (Optional Secondary - For Future)
Only if you need:
- Domain management
- DNS records
- Firewall rules
- Zero Trust policies
- Infrastructure consistency across multiple projects
- State-based drift detection

**Timeline:** Defer this to Phase 6 (Production) if needed

---

## Implementation Roadmap

### Phase 1: Now (No Changes)
- ✅ Keep wrangler.toml as primary IaC
- ✅ Store in Git (`workers/wrangler.toml`)
- ✅ Resource IDs already documented
- ✅ Environments already configured

### Phase 2: GitHub Actions (Immediate)
- Setup CI/CD with `cloudflare/wrangler-action@v3`
- GitHub secrets for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`
- Automatic deployments on push to develop/staging/main

### Phase 3: Documentation (This Week)
- Document resource IDs in wrangler.toml
- Create runbooks for creating new environments
- Version control as source of truth

### Phase 4: Terraform (If Needed - 2-3 weeks)
- Only if managing complex infrastructure beyond Workers
- Can be added alongside wrangler.toml
- Terraform manages domains/DNS/firewall, wrangler manages Workers/bindings
- Avoids duplication and complexity

---

## Current State Analysis

Your project is **already implementing best-practice IaC** using wrangler.toml:

| Resource | Storage | Status | IaC | Comment |
|----------|---------|--------|-----|---------|
| D1 Databases | wrangler.toml | ✅ Configured | ✅ Yes | IDs hardcoded, migrations separate |
| KV Namespaces | wrangler.toml | ✅ Configured | ✅ Yes | All 18 namespaces declared |
| R2 Buckets | wrangler.toml | ✅ Configured | ✅ Yes | 9 buckets, presigned URLs |
| Vectorize | wrangler.toml | ✅ Configured | ✅ Yes | 3 indexes across environments |
| Workers | wrangler.toml | ✅ Configured | ✅ Yes | Hono app, environment-specific |
| Pages | wrangler-pages.toml | ✅ Configured | ✅ Yes | Separate config for frontend |
| Secrets | CLI (wrangler secret put) | ✅ Managed | ✅ Yes | Environment-specific |

---

## Migration of Existing Resources

Your resources were created manually via Wrangler CLI. Here's the status:

### D1 Databases
```bash
# Already in wrangler.toml with IDs
# To manage via Terraform (optional):
terraform import cloudflare_d1_database.development "account_id/8140efd5-9912-4e31-981d-0566f1efe9dc"
```

### KV Namespaces
```bash
# Already in wrangler.toml with IDs
# To manage via Terraform (optional):
terraform import cloudflare_workers_kv_namespace.analysis_cache "account_id/fce1eb2547c14cd0811521246fec5c76"
```

### R2 Buckets
```bash
# Already in wrangler.toml
# To manage via Terraform (optional):
terraform import cloudflare_r2_bucket.avatars "account_id/jobmatch-ai-dev-avatars"
```

**Recommendation:** Keep using wrangler.toml. Only migrate to Terraform if you need features beyond Workers infrastructure.

---

## D1 Schema Management

For D1 database schema, use **Wrangler migrations**:

```bash
# Create migration
wrangler d1 migrations create --local jobmatch-dev initial_schema

# Apply locally
wrangler d1 migrations apply --local jobmatch-dev

# Apply to development
wrangler d1 migrations apply jobmatch-dev --env development

# Apply to staging
wrangler d1 migrations apply jobmatch-staging --env staging

# Apply to production
wrangler d1 migrations apply jobmatch-prod --env production
```

Migrations live in `workers/migrations/` and are version controlled.

---

## Secret Management

### Option A: CLI (Current - Recommended)
```bash
# Set secret for each environment
npx wrangler secret put OPENAI_API_KEY --env development
npx wrangler secret put OPENAI_API_KEY --env staging
npx wrangler secret put OPENAI_API_KEY --env production
```

Pros: Simple, secure, Cloudflare manages encryption
Cons: Not in version control (by design)

### Option B: GitHub Actions (For CI/CD)
```yaml
- name: Set Workers Secrets
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
  run: |
    npx wrangler secret put OPENAI_API_KEY --env production
```

### Option C: Terraform (Optional)
```hcl
resource "cloudflare_workers_secret" "openai_key" {
  account_id = var.cloudflare_account_id
  name       = "OPENAI_API_KEY"
  secret     = var.openai_api_key
}
```

**Recommendation:** Use Option A for manual management, Option B for CI/CD.

---

## Best Practices

### 1. Version Control as Source of Truth
```
✅ DO:
- Commit wrangler.toml to Git
- Commit migrations to Git
- Document all resource IDs in README or wiki
- Use .gitignore for secrets

❌ DON'T:
- Commit .env files
- Create resources outside wrangler.toml
- Store secrets in version control
```

### 2. Environment Separation
```toml
[env.development]
name = "jobmatch-ai-dev"

[env.staging]
name = "jobmatch-ai-staging"

[env.production]
name = "jobmatch-ai-prod"
```

✅ Already implemented in your project

### 3. Secrets Rotation
Rotate API keys every 90 days using Cloudflare dashboard or scripts.

### 4. Testing Infrastructure Changes
```bash
# Test locally before pushing
wrangler dev --local

# Test against development environment
wrangler dev --env development

# Test deployment
wrangler deploy --dry-run --env development
```

### 5. Change Documentation
Document any infrastructure changes in pull requests:
```
## Infrastructure Changes
- Added KV namespace for caching
- Updated D1 schema migration
- Modified R2 bucket policies
```

---

## Next Steps

### Immediate (This Week)
1. ✅ Keep wrangler.toml as primary IaC (no changes needed)
2. ⏭️ Set up GitHub Actions CI/CD (see: `CLOUDFLARE_CICD_PIPELINE.md`)
3. ⏭️ Document resource IDs in `workers/README.md`

### Short-term (2 weeks)
1. Setup wrangler secret management for all environments
2. Configure GitHub secrets for CI/CD
3. Test full CI/CD pipeline with develop branch

### Medium-term (If Needed)
1. Add Terraform for advanced features (domains, DNS, firewall)
2. Setup Terraform Cloud for state management
3. Create reusable Terraform modules

### Long-term (Post-Launch)
1. Monitor infrastructure costs
2. Optimize resource configurations
3. Scale to multiple projects if needed

---

## Summary

| Aspect | Recommendation |
|--------|-----------------|
| **Primary IaC Tool** | wrangler.toml ✅ |
| **D1, KV, R2, Vectorize** | Declare in wrangler.toml |
| **D1 Schema** | Wrangler migrations in version control |
| **Secrets** | Wrangler CLI + GitHub Actions |
| **Terraform** | Optional - add only if managing domains/DNS/firewall |
| **Pulumi** | Not recommended for this project |
| **Custom Scripts** | Not recommended - use Wrangler instead |

---

## References

- [Cloudflare IaC Documentation](https://developers.cloudflare.com/workers/platform/infrastructure-as-code/)
- [Wrangler Configuration Reference](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Cloudflare Terraform Provider](https://developers.cloudflare.com/terraform/)
- [Pulumi Cloudflare Package](https://www.pulumi.com/registry/packages/cloudflare/)

---

**Recommendation:** Use wrangler.toml as primary IaC. Setup GitHub Actions CI/CD. Terraform optional for future advanced features.
