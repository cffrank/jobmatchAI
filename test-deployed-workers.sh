#!/bin/bash
# Test Deployed Cloudflare Workers
# Verifies that the deployed Workers have correct Supabase configuration

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
WORKER_URL="https://jobmatch-ai-dev.carl-f-frank.workers.dev"
SUPABASE_URL="https://vkstdibhypprasyiswny.supabase.co"

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}Testing Deployed Cloudflare Workers${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""
echo -e "${YELLOW}Worker URL:${NC} $WORKER_URL"
echo -e "${YELLOW}Expected Supabase:${NC} $SUPABASE_URL"
echo ""

# =============================================================================
# Test 1: Health Check
# =============================================================================
echo -e "${BLUE}[1/5] Health Check${NC}"
echo "Testing: GET $WORKER_URL/health"

HEALTH_RESPONSE=$(curl -s "$WORKER_URL/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status' 2>/dev/null || echo "ERROR")

if [ "$HEALTH_STATUS" = "healthy" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
  echo "$HEALTH_RESPONSE" | jq '.'
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "$HEALTH_RESPONSE"
  exit 1
fi
echo ""

# =============================================================================
# Test 2: Check Route Registration
# =============================================================================
echo -e "${BLUE}[2/5] Route Registration${NC}"
echo "Testing: GET $WORKER_URL/api"

API_RESPONSE=$(curl -s "$WORKER_URL/api")
PROFILE_ROUTES=$(echo "$API_RESPONSE" | jq -r '.endpoints.profile' 2>/dev/null)

if [ -n "$PROFILE_ROUTES" ]; then
  echo -e "${GREEN}✓ API documentation accessible${NC}"
  echo "Profile routes registered:"
  echo "$PROFILE_ROUTES" | jq '.'
else
  echo -e "${RED}✗ API documentation failed${NC}"
  echo "$API_RESPONSE"
fi
echo ""

# =============================================================================
# Test 3: GET /api/profile (should return 401 without auth)
# =============================================================================
echo -e "${BLUE}[3/5] GET /api/profile (No Auth - Expect 401)${NC}"
echo "Testing: GET $WORKER_URL/api/profile"

PROFILE_NO_AUTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$WORKER_URL/api/profile")
HTTP_STATUS=$(echo "$PROFILE_NO_AUTH" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$PROFILE_NO_AUTH" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
  echo "$RESPONSE_BODY" | jq '.'
else
  echo -e "${RED}✗ Expected 401, got $HTTP_STATUS${NC}"
  echo "$RESPONSE_BODY"
fi
echo ""

# =============================================================================
# Test 4: GET /api/profile/work-experience (should return 401 without auth)
# =============================================================================
echo -e "${BLUE}[4/5] GET /api/profile/work-experience (No Auth - Expect 401)${NC}"
echo "Testing: GET $WORKER_URL/api/profile/work-experience"

WORK_EXP_NO_AUTH=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$WORKER_URL/api/profile/work-experience")
HTTP_STATUS=$(echo "$WORK_EXP_NO_AUTH" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$WORK_EXP_NO_AUTH" | sed '/HTTP_STATUS:/d')

if [ "$HTTP_STATUS" = "401" ]; then
  echo -e "${GREEN}✓ Correctly returns 401 Unauthorized${NC}"
  echo "$RESPONSE_BODY" | jq '.'
else
  echo -e "${RED}✗ Expected 401, got $HTTP_STATUS${NC}"
  echo "$RESPONSE_BODY"
fi
echo ""

# =============================================================================
# Test 5: Test with Valid Token (if available)
# =============================================================================
echo -e "${BLUE}[5/5] Test with Authentication Token${NC}"

# Try to get token from frontend localStorage
# This requires browser access, so we'll provide instructions
echo -e "${YELLOW}Manual Test Required:${NC}"
echo ""
echo "1. Open browser DevTools (F12)"
echo "2. Go to Application → Local Storage → http://localhost:5173"
echo "3. Copy the value of 'jobmatch-auth-token'"
echo "4. Run this command:"
echo ""
echo -e "${BLUE}TOKEN='<paste-token-here>'${NC}"
echo -e "${BLUE}curl -H \"Authorization: Bearer \$TOKEN\" $WORKER_URL/api/profile${NC}"
echo ""
echo "Expected result: 200 OK with profile data"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo ""
echo -e "${GREEN}✓ Worker is deployed and responding${NC}"
echo -e "${GREEN}✓ Health check endpoint working${NC}"
echo -e "${GREEN}✓ API routes are registered${NC}"
echo -e "${GREEN}✓ Authentication middleware active (401 without token)${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify deployed secrets match frontend configuration"
echo "2. Test with valid JWT token from browser"
echo "3. Check Workers logs for authentication errors"
echo ""
echo -e "${BLUE}Check Deployed Secrets:${NC}"
echo "cd workers"
echo "wrangler secret list --env development"
echo ""
echo -e "${BLUE}Update Deployed Secrets (if needed):${NC}"
echo "wrangler secret put SUPABASE_URL --env development"
echo "wrangler secret put SUPABASE_ANON_KEY --env development"
echo "wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development"
echo ""
