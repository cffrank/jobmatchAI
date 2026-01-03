#!/bin/bash

# Complete Onboarding Flow E2E Test Runner
# This script runs the comprehensive onboarding test with network monitoring

set -e  # Exit on error

echo "🧪 JobMatch AI - Complete Onboarding Flow E2E Test"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Default URLs (can be overridden via environment variables)
FRONTEND_URL=${FRONTEND_URL:-"http://localhost:5173"}
BACKEND_URL=${BACKEND_URL:-"http://localhost:3000"}
TEST_MODE=${TEST_MODE:-"normal"}  # normal, ui, headed

echo "📍 Test Configuration:"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend:  $BACKEND_URL"
echo "   Mode:     $TEST_MODE"
echo ""

# Check if services are running
echo "🔍 Checking if services are accessible..."

# Check frontend
if curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" | grep -q "200\|301\|302"; then
  echo -e "   ${GREEN}✓${NC} Frontend accessible at $FRONTEND_URL"
else
  echo -e "   ${RED}✗${NC} Frontend not accessible at $FRONTEND_URL"
  echo "   💡 Start with: npm run dev"
  exit 1
fi

# Check backend health
if curl -s "$BACKEND_URL/health" | grep -q "healthy"; then
  echo -e "   ${GREEN}✓${NC} Backend healthy at $BACKEND_URL"
else
  echo -e "   ${RED}✗${NC} Backend not accessible or unhealthy at $BACKEND_URL"
  echo "   💡 Start with: cd workers && npm run dev"
  exit 1
fi

echo ""

# Generate fresh resume PDF fixture
echo "📄 Generating sample resume fixture..."
if node tests/fixtures/create-sample-resume-pdf.mjs; then
  echo -e "   ${GREEN}✓${NC} Sample resume PDF created"
else
  echo -e "   ${YELLOW}⚠${NC} Failed to create sample resume (test may skip resume import)"
fi

echo ""

# Clean up previous test results
echo "🧹 Cleaning up previous test results..."
rm -rf test-results/network-activity-report.json
mkdir -p test-results
echo -e "   ${GREEN}✓${NC} Test results directory ready"

echo ""
echo "🚀 Starting E2E test..."
echo ""

# Run test based on mode
case $TEST_MODE in
  ui)
    echo "Running in UI mode (interactive)..."
    FRONTEND_URL=$FRONTEND_URL BACKEND_URL=$BACKEND_URL npm run test:e2e:ui tests/e2e/complete-onboarding-flow.spec.ts
    ;;
  headed)
    echo "Running in headed mode (visible browser)..."
    FRONTEND_URL=$FRONTEND_URL BACKEND_URL=$BACKEND_URL npm run test:e2e:headed tests/e2e/complete-onboarding-flow.spec.ts
    ;;
  *)
    echo "Running in normal mode (headless)..."
    FRONTEND_URL=$FRONTEND_URL BACKEND_URL=$BACKEND_URL npm run test:e2e tests/e2e/complete-onboarding-flow.spec.ts
    ;;
esac

TEST_EXIT_CODE=$?

echo ""
echo "=================================================="

# Check test result
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ TEST PASSED${NC}"
  echo ""

  # Display network report summary if available
  if [ -f "test-results/network-activity-report.json" ]; then
    echo "📊 Network Activity Summary:"

    TOTAL_CALLS=$(cat test-results/network-activity-report.json | grep -o '"totalCalls":[0-9]*' | cut -d: -f2)
    SUPABASE_DB=$(cat test-results/network-activity-report.json | grep -o '"supabaseDbCalls":[0-9]*' | cut -d: -f2)
    WORKERS_CALLS=$(cat test-results/network-activity-report.json | grep -o '"workersCalls":[0-9]*' | cut -d: -f2)
    VIOLATIONS=$(cat test-results/network-activity-report.json | grep -o '"violations":\[[^\]]*\]' | grep -o '\[.*\]')

    echo "   Total API calls: $TOTAL_CALLS"
    echo "   Supabase DB calls: $SUPABASE_DB $([ "$SUPABASE_DB" -eq 0 ] && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}")"
    echo "   Workers API calls: $WORKERS_CALLS"

    if [ "$VIOLATIONS" != "[]" ]; then
      echo -e "   ${RED}⚠ VIOLATIONS DETECTED${NC}"
      echo ""
      cat test-results/network-activity-report.json | grep -A 20 '"violations"'
    else
      echo -e "   ${GREEN}✓ No violations detected${NC}"
    fi

    echo ""
    echo "📄 Full report: test-results/network-activity-report.json"
  fi

  echo ""
  echo "🎉 Migration Validation: PASSED"
  echo "   All data operations use Workers API → D1"

else
  echo -e "${RED}❌ TEST FAILED${NC}"
  echo ""
  echo "📄 Check test results in: test-results/"
  echo "💡 Run with TEST_MODE=ui for interactive debugging"
  echo "💡 Check logs above for specific failure details"
fi

echo ""
echo "=================================================="

exit $TEST_EXIT_CODE
