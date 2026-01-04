#!/bin/bash
# Verify and Fix Cloudflare Workers Secrets
# Ensures deployed Workers have correct Supabase configuration

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
ENV="development"
WORKER_NAME="jobmatch-ai-dev"
EXPECTED_SUPABASE_URL="https://vkstdibhypprasyiswny.supabase.co"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}Cloudflare Workers Secret Verification & Fix${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""
echo -e "${YELLOW}Environment:${NC} $ENV"
echo -e "${YELLOW}Worker:${NC} $WORKER_NAME"
echo -e "${YELLOW}Expected Supabase:${NC} $EXPECTED_SUPABASE_URL"
echo ""

# Change to workers directory
cd "$(dirname "$0")/.."

# =============================================================================
# Step 1: Read local .dev.vars
# =============================================================================
echo -e "${BLUE}[1/3] Reading Local Configuration${NC}"

if [ ! -f ".dev.vars" ]; then
  echo -e "${RED}✗ .dev.vars not found!${NC}"
  echo "Please ensure you're in the workers directory"
  exit 1
fi

# Extract values from .dev.vars
SUPABASE_URL=$(grep "^SUPABASE_URL=" .dev.vars | cut -d= -f2)
SUPABASE_ANON_KEY=$(grep "^SUPABASE_ANON_KEY=" .dev.vars | cut -d= -f2)
SUPABASE_SERVICE_ROLE_KEY=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .dev.vars | cut -d= -f2)

echo -e "${GREEN}✓ Local configuration loaded${NC}"
echo "  SUPABASE_URL: $SUPABASE_URL"
echo "  SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:50}..."
echo "  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:50}..."
echo ""

# Verify correct project
if [ "$SUPABASE_URL" != "$EXPECTED_SUPABASE_URL" ]; then
  echo -e "${RED}✗ ERROR: Local .dev.vars has wrong Supabase URL!${NC}"
  echo "  Expected: $EXPECTED_SUPABASE_URL"
  echo "  Found: $SUPABASE_URL"
  echo ""
  echo "Run fix-supabase-mismatch.sh first"
  exit 1
fi

echo -e "${GREEN}✓ Local configuration matches expected Supabase project${NC}"
echo ""

# =============================================================================
# Step 2: Check Deployed Secrets
# =============================================================================
echo -e "${BLUE}[2/3] Checking Deployed Secrets${NC}"

DEPLOYED_SECRETS=$(wrangler secret list --env "$ENV" 2>&1)

if echo "$DEPLOYED_SECRETS" | grep -q "SUPABASE_URL"; then
  echo -e "${GREEN}✓ SUPABASE_URL exists in deployed secrets${NC}"
else
  echo -e "${YELLOW}⚠ SUPABASE_URL missing from deployed secrets${NC}"
fi

if echo "$DEPLOYED_SECRETS" | grep -q "SUPABASE_ANON_KEY"; then
  echo -e "${GREEN}✓ SUPABASE_ANON_KEY exists in deployed secrets${NC}"
else
  echo -e "${YELLOW}⚠ SUPABASE_ANON_KEY missing from deployed secrets${NC}"
fi

if echo "$DEPLOYED_SECRETS" | grep -q "SUPABASE_SERVICE_ROLE_KEY"; then
  echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY exists in deployed secrets${NC}"
else
  echo -e "${YELLOW}⚠ SUPABASE_SERVICE_ROLE_KEY missing from deployed secrets${NC}"
fi

echo ""

# =============================================================================
# Step 3: Update Deployed Secrets
# =============================================================================
echo -e "${BLUE}[3/3] Updating Deployed Secrets${NC}"
echo ""
echo -e "${YELLOW}This will update the following secrets in the $ENV environment:${NC}"
echo "  - SUPABASE_URL"
echo "  - SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo -e "${YELLOW}The Worker will be redeployed with the new secrets.${NC}"
echo ""

read -p "Proceed? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}Cancelled by user${NC}"
  exit 0
fi

echo ""
echo "Updating SUPABASE_URL..."
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --env "$ENV" >/dev/null 2>&1
echo -e "${GREEN}✓ SUPABASE_URL updated${NC}"

echo "Updating SUPABASE_ANON_KEY..."
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env "$ENV" >/dev/null 2>&1
echo -e "${GREEN}✓ SUPABASE_ANON_KEY updated${NC}"

echo "Updating SUPABASE_SERVICE_ROLE_KEY..."
echo "$SUPABASE_SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env "$ENV" >/dev/null 2>&1
echo -e "${GREEN}✓ SUPABASE_SERVICE_ROLE_KEY updated${NC}"

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}Secrets Updated Successfully!${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Wait 10-15 seconds for Workers to redeploy"
echo "2. Run: ../test-deployed-workers.sh"
echo "3. Test with valid JWT token from browser"
echo ""
echo -e "${BLUE}Get token from browser:${NC}"
echo "1. Open DevTools (F12)"
echo "2. Application → Local Storage → http://localhost:5173"
echo "3. Copy 'jobmatch-auth-token' value"
echo "4. Test: curl -H \"Authorization: Bearer \$TOKEN\" https://jobmatch-ai-dev.carl-f-frank.workers.dev/api/profile"
echo ""
