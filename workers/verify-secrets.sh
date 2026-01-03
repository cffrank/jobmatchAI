#!/bin/bash

# Cloudflare Workers Secret Verification Script
# This script helps verify that all required secrets are set correctly

set -e

cd "$(dirname "$0")"

echo "==================================="
echo "Cloudflare Workers Secret Verification"
echo "==================================="
echo ""

ENV="${1:-development}"
echo "Environment: $ENV"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ ERROR: wrangler CLI not found"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

echo "✅ Wrangler CLI found"
echo ""

# List all secrets
echo "📋 Listing secrets for '$ENV' environment..."
echo ""
SECRETS=$(wrangler secret list --env "$ENV" 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Failed to list secrets:"
    echo "$SECRETS"
    exit 1
fi

echo "$SECRETS"
echo ""

# Check for required secrets
echo "🔍 Checking required secrets..."
echo ""

REQUIRED_SECRETS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "OPENAI_API_KEY"
    "APP_URL"
)

MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if echo "$SECRETS" | grep -q "\"name\": \"$secret\""; then
        echo "✅ $secret - Found"
    else
        echo "❌ $secret - MISSING"
        MISSING_SECRETS+=("$secret")
    fi
done

echo ""

if [ ${#MISSING_SECRETS[@]} -eq 0 ]; then
    echo "✅ All required secrets are set!"
else
    echo "❌ Missing secrets: ${MISSING_SECRETS[*]}"
    echo ""
    echo "To set missing secrets, run:"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo "  echo -n 'YOUR_VALUE' | wrangler secret put $secret --env $ENV"
    done
    exit 1
fi

echo ""
echo "==================================="
echo "⚠️  IMPORTANT VALIDATION NOTES"
echo "==================================="
echo ""
echo "The secrets exist, but they may be malformed. Check:"
echo ""
echo "1. SUPABASE_URL should be EXACTLY:"
echo "   https://wpupbucinufbaiphwogc.supabase.co"
echo "   (for development environment)"
echo ""
echo "2. Common issues:"
echo "   - Missing 'https://' prefix"
echo "   - Trailing whitespace or line breaks"
echo "   - Trailing slash at the end"
echo "   - Using 'http://' instead of 'https://'"
echo ""
echo "3. To verify/fix SUPABASE_URL:"
echo "   echo -n 'https://wpupbucinufbaiphwogc.supabase.co' | wrangler secret put SUPABASE_URL --env $ENV"
echo ""
echo "4. After updating secrets, redeploy:"
echo "   wrangler deploy --env $ENV"
echo ""
echo "5. Test the deployment:"
echo "   curl https://jobmatch-ai-dev.carl-f-frank.workers.dev/health"
echo ""
echo "==================================="
echo ""

echo "📊 Testing deployed Worker..."
echo ""

# Test health endpoint
WORKER_URL=""
case "$ENV" in
    development)
        WORKER_URL="https://jobmatch-ai-dev.carl-f-frank.workers.dev"
        ;;
    staging)
        WORKER_URL="https://jobmatch-ai-staging.carl-f-frank.workers.dev"
        ;;
    production)
        WORKER_URL="https://jobmatch-ai-prod.carl-f-frank.workers.dev"
        ;;
    *)
        echo "⚠️  Unknown environment: $ENV"
        echo "Skipping health check"
        exit 0
        ;;
esac

echo "Testing: $WORKER_URL/health"
echo ""

HEALTH_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$WORKER_URL/health")
HTTP_STATUS=$(echo "$HEALTH_RESPONSE" | grep "HTTP_STATUS:" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | sed '/HTTP_STATUS:/d')

echo "Status Code: $HTTP_STATUS"
echo "Response:"
echo "$RESPONSE_BODY" | jq . 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed!"
    echo ""
    echo "🎉 Worker is deployed and responding correctly!"
else
    echo "❌ Health check failed with status: $HTTP_STATUS"
    echo ""
    echo "Possible issues:"
    echo "1. SUPABASE_URL is malformed (missing https://, whitespace, etc.)"
    echo "2. Other secrets are incorrect"
    echo "3. Worker deployment failed"
    echo ""
    echo "To debug, check logs:"
    echo "  wrangler tail --env $ENV"
    echo ""
    echo "Then make a test request to see the error details."
    exit 1
fi

echo ""
echo "==================================="
echo "✅ Verification Complete"
echo "==================================="
