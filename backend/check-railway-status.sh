#!/bin/bash
# Helper script to check Railway deployment status

echo "🔍 Checking Railway Backend Deployment Status"
echo "=============================================="
echo ""

# Test Development
echo "📊 DEVELOPMENT Environment:"
response=$(curl -s -w "\n%{http_code}" https://jobmatchai-backend-development.up.railway.app/health)
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ Status: HEALTHY"
    echo "Response: $body"
else
    echo "❌ Status: HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test Staging
echo "📊 STAGING Environment:"
response=$(curl -s -w "\n%{http_code}" https://jobmatchai-backend-staging.up.railway.app/health)
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ Status: HEALTHY"
    echo "Response: $body"
else
    echo "❌ Status: HTTP $http_code"
    echo "Response: $body"
fi
echo ""

# Test Production
echo "📊 PRODUCTION Environment:"
response=$(curl -s -w "\n%{http_code}" https://jobmatchai-backend-production.up.railway.app/health)
http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | head -n -1)

if [ "$http_code" = "200" ]; then
    echo "✅ Status: HEALTHY"
    echo "Response: $body"
else
    echo "❌ Status: HTTP $http_code"
    echo "Response: $body"
fi
echo ""

echo "=============================================="
echo "Next Steps:"
echo "1. Check Railway Dashboard → Backend → Deployments"
echo "2. Verify 'Config-as-code' has path: railway.toml"
echo "3. Check build logs for latest deployment"
echo "4. Verify all environment variables are set"
