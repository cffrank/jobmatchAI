#!/bin/bash

# CORS Debugging Script
# Tests the production backend CORS configuration manually with curl

BACKEND_URL="https://intelligent-celebration-production-57e4.up.railway.app"
FRONTEND_URL="https://jobmatchai-production.up.railway.app"
EVIL_URL="https://evil.com"

echo "======================================================================"
echo "CORS Debugging Script for JobMatch AI Production"
echo "======================================================================"
echo ""
echo "Backend:  $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""
echo "======================================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo ""
echo "======================================================================"
echo "Test 1: Health Check (GET /health)"
echo "======================================================================"
echo ""
response=$(curl -s -w "\n%{http_code}" "$BACKEND_URL/health")
http_code=$(echo "$response" | tail -n 1)
body=$(echo "$response" | head -n -1)

echo "Status Code: $http_code"
echo "Response Body:"
echo "$body" | jq . 2>/dev/null || echo "$body"

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✅ Health check passed${NC}"
else
  echo -e "${RED}❌ Health check failed${NC}"
fi

# Test 2: Health Check with Origin Header
echo ""
echo "======================================================================"
echo "Test 2: Health Check with Origin Header"
echo "======================================================================"
echo ""
echo "Testing with Origin: $FRONTEND_URL"
echo ""

response=$(curl -v -s \
  -H "Origin: $FRONTEND_URL" \
  "$BACKEND_URL/health" \
  2>&1)

echo "$response" | grep -i "< HTTP" || true
echo "$response" | grep -i "< access-control" || echo -e "${RED}❌ No CORS headers found${NC}"

cors_origin=$(echo "$response" | grep -i "< access-control-allow-origin" | cut -d' ' -f3- | tr -d '\r')
if [ "$cors_origin" = "$FRONTEND_URL" ]; then
  echo -e "${GREEN}✅ Correct CORS origin header: $cors_origin${NC}"
else
  echo -e "${RED}❌ CORS origin header missing or incorrect${NC}"
  echo "   Expected: $FRONTEND_URL"
  echo "   Got: $cors_origin"
fi

# Test 3: OPTIONS Preflight to /api/applications/generate
echo ""
echo "======================================================================"
echo "Test 3: OPTIONS Preflight Request (Critical Test)"
echo "======================================================================"
echo ""
echo "Endpoint: $BACKEND_URL/api/applications/generate"
echo "Origin: $FRONTEND_URL"
echo "Method: OPTIONS"
echo ""

response=$(curl -v -s -X OPTIONS \
  -H "Origin: $FRONTEND_URL" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  "$BACKEND_URL/api/applications/generate" \
  2>&1)

echo "=== Response Status ==="
echo "$response" | grep -i "< HTTP"

echo ""
echo "=== CORS Headers ==="
cors_headers=$(echo "$response" | grep -i "< access-control")
if [ -z "$cors_headers" ]; then
  echo -e "${RED}❌ NO CORS HEADERS FOUND - THIS IS THE PROBLEM!${NC}"
  echo ""
  echo "This is why the frontend is getting CORS errors."
  echo "The OPTIONS preflight response is missing CORS headers."
  echo ""
  echo "Full Response Headers:"
  echo "$response" | grep "^<" | grep -v "^< " | head -20
else
  echo "$cors_headers"

  # Check for specific required headers
  if echo "$cors_headers" | grep -qi "access-control-allow-origin"; then
    echo -e "${GREEN}✅ Has Access-Control-Allow-Origin${NC}"
  else
    echo -e "${RED}❌ Missing Access-Control-Allow-Origin${NC}"
  fi

  if echo "$cors_headers" | grep -qi "access-control-allow-methods"; then
    echo -e "${GREEN}✅ Has Access-Control-Allow-Methods${NC}"
  else
    echo -e "${RED}❌ Missing Access-Control-Allow-Methods${NC}"
  fi

  if echo "$cors_headers" | grep -qi "access-control-allow-headers"; then
    echo -e "${GREEN}✅ Has Access-Control-Allow-Headers${NC}"
  else
    echo -e "${RED}❌ Missing Access-Control-Allow-Headers${NC}"
  fi
fi

# Test 4: OPTIONS with Evil Origin
echo ""
echo "======================================================================"
echo "Test 4: OPTIONS with Unauthorized Origin (Should Reject)"
echo "======================================================================"
echo ""
echo "Testing with Origin: $EVIL_URL"
echo ""

response=$(curl -v -s -X OPTIONS \
  -H "Origin: $EVIL_URL" \
  -H "Access-Control-Request-Method: POST" \
  "$BACKEND_URL/api/applications/generate" \
  2>&1)

cors_origin=$(echo "$response" | grep -i "< access-control-allow-origin" | cut -d' ' -f3- | tr -d '\r')
if [ "$cors_origin" = "$EVIL_URL" ]; then
  echo -e "${RED}❌ SECURITY ISSUE: Evil origin was allowed!${NC}"
else
  echo -e "${GREEN}✅ Evil origin was correctly rejected${NC}"
fi

# Test 5: POST without Auth (should get 401, not CORS error)
echo ""
echo "======================================================================"
echo "Test 5: POST Request Without Auth (Should get 401)"
echo "======================================================================"
echo ""

response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Origin: $FRONTEND_URL" \
  -H "Content-Type: application/json" \
  -d '{"jobId":"test"}' \
  "$BACKEND_URL/api/applications/generate" \
  2>&1)

http_code=$(echo "$response" | tail -n 1)
echo "Status Code: $http_code"

if [ "$http_code" = "401" ]; then
  echo -e "${GREEN}✅ Got 401 Unauthorized (expected)${NC}"
  echo "   This means the request made it past CORS to the auth middleware"
else
  echo -e "${YELLOW}⚠️  Got status $http_code (might indicate CORS blocking)${NC}"
fi

# Test 6: Check if Railway is adding/removing headers
echo ""
echo "======================================================================"
echo "Test 6: Railway Proxy Detection"
echo "======================================================================"
echo ""

response=$(curl -v -s "$BACKEND_URL/health" 2>&1)
echo "Server Header:"
echo "$response" | grep -i "< server:" || echo "(none)"
echo ""
echo "X-Powered-By:"
echo "$response" | grep -i "< x-powered-by:" || echo "(none)"
echo ""
echo "Via:"
echo "$response" | grep -i "< via:" || echo "(none)"
echo ""

# Test 7: Test all critical endpoints
echo ""
echo "======================================================================"
echo "Test 7: Test OPTIONS on All Critical Endpoints"
echo "======================================================================"
echo ""

endpoints=(
  "/api/applications/generate"
  "/api/jobs/scrape"
  "/api/emails/send"
  "/api/exports/pdf"
  "/api/exports/docx"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing: $endpoint"

  response=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: POST" \
    "$BACKEND_URL$endpoint")

  if [ "$response" = "200" ] || [ "$response" = "204" ]; then
    echo -e "  Status: ${GREEN}$response ✅${NC}"
  else
    echo -e "  Status: ${RED}$response ❌${NC}"
  fi
done

# Test 8: Environment Check
echo ""
echo "======================================================================"
echo "Test 8: Backend Environment Verification"
echo "======================================================================"
echo ""

response=$(curl -s "$BACKEND_URL/health")
environment=$(echo "$response" | jq -r '.environment' 2>/dev/null)
version=$(echo "$response" | jq -r '.version' 2>/dev/null)

echo "Environment: $environment"
echo "Version: $version"

if [ "$environment" = "production" ]; then
  echo -e "${GREEN}✅ Backend is in production mode${NC}"
else
  echo -e "${RED}❌ Backend is NOT in production mode: $environment${NC}"
fi

# Final Summary
echo ""
echo "======================================================================"
echo "Summary"
echo "======================================================================"
echo ""
echo "If you see '❌ NO CORS HEADERS FOUND' in Test 3, that's the issue."
echo "The OPTIONS preflight response is not including CORS headers."
echo ""
echo "Possible causes:"
echo "  1. CORS middleware not configured correctly in index.ts"
echo "  2. Railway proxy stripping CORS headers"
echo "  3. OPTIONS requests not reaching Express (handled by Railway)"
echo "  4. Environment variables not set correctly in Railway"
echo ""
echo "Next steps:"
echo "  - Check Railway environment variables (NODE_ENV, APP_URL)"
echo "  - Check Railway logs for CORS middleware output"
echo "  - Verify Express CORS middleware is actually running"
echo ""
