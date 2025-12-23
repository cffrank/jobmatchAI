#!/bin/bash

#
# Railway Deployment Verification Script
# Verifies that both frontend and backend are deployed correctly with proper CORS configuration
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default URLs
BACKEND_URL="${BACKEND_URL:-https://intelligent-celebration-production-57e4.up.railway.app}"
FRONTEND_URL="${FRONTEND_URL:-https://jobmatchai-production.up.railway.app}"

echo "=========================================="
echo "Railway Deployment Verification"
echo "=========================================="
echo "Backend URL: $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo ""

# Function to print success
success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print error
error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to print warning
warning() {
    echo -e "${YELLOW}!${NC} $1"
}

# Test counter
PASSED=0
FAILED=0

# Test 1: Backend health check
echo "Test 1: Backend Health Check"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    success "Backend health endpoint returns 200"
    PASSED=$((PASSED + 1))

    if echo "$BODY" | grep -q "healthy"; then
        success "Response contains 'healthy' status"
        PASSED=$((PASSED + 1))
    else
        error "Response does not contain 'healthy' status"
        FAILED=$((FAILED + 1))
    fi
else
    error "Backend health check failed with status $HTTP_CODE"
    FAILED=$((FAILED + 1))
    echo "Response: $BODY"
fi
echo ""

# Test 2: CORS headers on health endpoint
echo "Test 2: CORS Headers on Health Endpoint"
CORS_RESPONSE=$(curl -s -i -H "Origin: $FRONTEND_URL" "$BACKEND_URL/health")

if echo "$CORS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    success "CORS headers present on health endpoint"
    PASSED=$((PASSED + 1))
else
    error "CORS headers missing on health endpoint"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 3: OPTIONS preflight for /api/applications/generate
echo "Test 3: OPTIONS Preflight for /api/applications/generate"
OPTIONS_RESPONSE=$(curl -s -i -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    -H "Access-Control-Request-Headers: Content-Type,Authorization" \
    "$BACKEND_URL/api/applications/generate")

if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-origin"; then
    success "CORS allow-origin header present"
    PASSED=$((PASSED + 1))
else
    error "CORS allow-origin header missing"
    FAILED=$((FAILED + 1))
fi

if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-methods.*POST"; then
    success "POST method allowed via CORS"
    PASSED=$((PASSED + 1))
else
    error "POST method not allowed via CORS"
    FAILED=$((FAILED + 1))
fi

if echo "$OPTIONS_RESPONSE" | grep -qi "access-control-allow-headers.*authorization"; then
    success "Authorization header allowed via CORS"
    PASSED=$((PASSED + 1))
else
    error "Authorization header not allowed via CORS"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 4: Environment configuration
echo "Test 4: Environment Configuration"
if echo "$BODY" | grep -q "environment"; then
    ENV=$(echo "$BODY" | grep -o '"environment":"[^"]*"' | cut -d'"' -f4)
    success "Environment field present: $ENV"
    PASSED=$((PASSED + 1))
else
    warning "Environment field not found"
fi

if echo "$BODY" | grep -q "version"; then
    VERSION=$(echo "$BODY" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    success "Version field present: $VERSION"
    PASSED=$((PASSED + 1))
else
    warning "Version field not found"
fi
echo ""

# Test 5: Frontend accessibility
echo "Test 5: Frontend Accessibility"
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

if [ "$FRONTEND_CODE" = "200" ]; then
    success "Frontend is accessible (HTTP $FRONTEND_CODE)"
    PASSED=$((PASSED + 1))
else
    error "Frontend not accessible (HTTP $FRONTEND_CODE)"
    FAILED=$((FAILED + 1))
fi
echo ""

# Test 6: Unauthenticated request handling
echo "Test 6: Unauthenticated Request Handling"
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -H "Origin: $FRONTEND_URL" \
    -d '{"jobId":"test"}' \
    "$BACKEND_URL/api/applications/generate")

UNAUTH_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n 1)

if [ "$UNAUTH_CODE" = "401" ]; then
    success "Unauthenticated requests are properly rejected (401)"
    PASSED=$((PASSED + 1))
else
    warning "Unexpected status for unauthenticated request: $UNAUTH_CODE"
fi
echo ""

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo ""
    echo "Deployment is ready for use."
    exit 0
else
    echo -e "${RED}✗ Some tests failed.${NC}"
    echo ""
    echo "Common issues:"
    echo "  1. Missing environment variables in Railway:"
    echo "     - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
    echo "     - OPENAI_API_KEY, APIFY_API_TOKEN"
    echo "  2. CORS misconfiguration (check APP_URL matches frontend)"
    echo "  3. Backend build or startup errors"
    echo ""
    echo "Check Railway logs for more details:"
    echo "  railway logs --service backend"
    exit 1
fi
