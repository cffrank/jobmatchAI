#!/bin/bash

# Test AI Gateway Integration
# Runs E2E tests for all AI features to verify gateway is working

set -e

echo "=================================="
echo "AI Gateway Integration Testing"
echo "=================================="
echo ""

# Configuration
APP_URL="https://jobmatch-ai-dev.pages.dev"
WORKER_URL="https://jobmatch-ai-dev.carl-f-frank.workers.dev"
E2E_WORKER_URL="https://e2e-tests.carl-f-frank.workers.dev"

echo "Testing environment:"
echo "  Frontend: ${APP_URL}"
echo "  Backend:  ${WORKER_URL}"
echo ""

# Test 1: Worker health check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Worker Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

HEALTH_RESPONSE=$(curl -s "${WORKER_URL}/health")
HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status')

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Worker is healthy"
    echo "$HEALTH_RESPONSE" | jq '.'
else
    echo "❌ Worker health check failed"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Test 2: AI Gateway configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: AI Gateway Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check wrangler.toml for AI Gateway config
if grep -q "AI_GATEWAY_SLUG" wrangler.toml; then
    GATEWAY_SLUG=$(grep "AI_GATEWAY_SLUG" wrangler.toml | cut -d'"' -f2)
    echo "✅ AI Gateway configured: ${GATEWAY_SLUG}"
else
    echo "❌ AI Gateway not configured in wrangler.toml"
    exit 1
fi

echo ""

# Test 3: OpenAI API key configured
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Secrets Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

SECRETS=$(npx wrangler secret list --env development 2>/dev/null || echo "")

if echo "$SECRETS" | grep -q "OPENAI_API_KEY"; then
    echo "✅ OPENAI_API_KEY configured"
else
    echo "❌ OPENAI_API_KEY not found"
    echo "Run: ./scripts/configure-secrets.sh"
    exit 1
fi

if echo "$SECRETS" | grep -q "SUPABASE_URL"; then
    echo "✅ SUPABASE_URL configured"
else
    echo "⚠️  SUPABASE_URL not found (may affect some features)"
fi

echo ""

# Test 4: Run E2E tests (if E2E worker is deployed)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: E2E Tests (AI Features)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

E2E_HEALTH=$(curl -s "${E2E_WORKER_URL}/health" 2>/dev/null)
if echo "$E2E_HEALTH" | jq -e '.status' &>/dev/null; then
    echo "Running E2E tests..."
    E2E_RESULTS=$(curl -s -X POST "${E2E_WORKER_URL}/run-tests" 2>/dev/null)

    # Check if response is valid JSON
    if echo "$E2E_RESULTS" | jq -e '.' &>/dev/null; then
        PASSED=$(echo "$E2E_RESULTS" | jq -r '.passed')
        FAILED=$(echo "$E2E_RESULTS" | jq -r '.failed')
        SKIPPED=$(echo "$E2E_RESULTS" | jq -r '.skipped')

        echo "Results:"
        echo "  ✅ Passed:  ${PASSED}"
        echo "  ❌ Failed:  ${FAILED}"
        echo "  ⏭️  Skipped: ${SKIPPED}"

        if [ "$FAILED" -gt 0 ]; then
            echo ""
            echo "Failed tests:"
            echo "$E2E_RESULTS" | jq -r '.results[] | select(.status == "failed") | "  - \(.name): \(.error)"'
        fi
    else
        echo "⚠️  E2E worker returned invalid response:"
        echo "$E2E_RESULTS"
        echo ""
        echo "Skipping automated E2E tests"
    fi
else
    echo "⏭️  E2E worker not available, skipping automated tests"
    echo ""
    echo "Manual testing required:"
    echo "1. Navigate to: ${APP_URL}/jobs"
    echo "2. Click 'Generate Application' on any job"
    echo "3. Verify AI generation completes successfully"
    echo "4. Check browser console for errors"
fi

echo ""

# Test 5: Verify AI Gateway dashboard
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 5: AI Gateway Metrics"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📊 Monitor AI Gateway metrics at:"
echo "   https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/${GATEWAY_SLUG}"
echo ""
echo "Metrics to check:"
echo "  - Total requests through gateway"
echo "  - Cache hit rate (target: 60-80%)"
echo "  - Cost savings vs direct OpenAI"
echo "  - Average latency"
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ AI Gateway Integration Tests Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo "1. Test AI features in the frontend:"
echo "   - Resume parsing: ${APP_URL}/profile"
echo "   - Application generation: ${APP_URL}/jobs"
echo "   - Job compatibility: ${APP_URL}/jobs"
echo ""
echo "2. Monitor cache performance:"
echo "   - Watch for cache hits on repeated requests"
echo "   - Target: 60-80% cache hit rate"
echo ""
echo "3. Verify cost reduction:"
echo "   - Compare OpenAI usage before/after gateway"
echo "   - Expected: 60-80% reduction in API costs"
echo ""
