#!/bin/bash
# Test Deployed Workers Authentication
# This script verifies that the deployed Workers can validate JWT tokens

echo "🧪 Testing Deployed Cloudflare Workers Authentication"
echo "======================================================"
echo ""

# Check if JWT token is provided
if [ -z "$1" ]; then
  echo "❌ ERROR: JWT token required"
  echo ""
  echo "Usage:"
  echo "  ./test-deployed-auth.sh <JWT_TOKEN>"
  echo ""
  echo "To get your JWT token:"
  echo "1. Login to the frontend (http://localhost:5173)"
  echo "2. Open DevTools → Application → Local Storage"
  echo "3. Copy the value of 'jobmatch-auth-token' or similar"
  echo "4. Run: ./test-deployed-auth.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  echo ""
  exit 1
fi

TOKEN="$1"
API_URL="https://jobmatch-ai-dev.carl-f-frank.workers.dev"

echo "Testing endpoint: $API_URL"
echo "Token: ${TOKEN:0:30}..."
echo ""

# Test endpoints
endpoints=(
  "/api/profile"
  "/api/profile/work-experience"
  "/api/profile/education"
  "/api/skills"
  "/api/resume"
)

passed=0
failed=0

for endpoint in "${endpoints[@]}"; do
  url="$API_URL$endpoint"

  response=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$url")
  body=$(echo "$response" | head -n -1)
  status=$(echo "$response" | tail -n 1)

  if [ "$status" -eq 200 ] || [ "$status" -eq 404 ]; then
    echo "✅ $endpoint → $status OK"
    ((passed++))
  elif [ "$status" -eq 401 ]; then
    echo "❌ $endpoint → $status UNAUTHORIZED"
    ((failed++))
  else
    echo "⚠️  $endpoint → $status"
  fi
done

echo ""
echo "======================================================"
echo "Results:"
echo "  ✅ Passed: $passed"
echo "  ❌ Failed (401): $failed"
echo ""

if [ $failed -eq 0 ]; then
  echo "🎉 SUCCESS! Authentication is working!"
  exit 0
else
  echo "❌ FAILURE! Authentication still broken."
  echo ""
  echo "Troubleshooting:"
  echo "1. Make sure you logged out and logged in again"
  echo "2. Check that you're using a fresh JWT token"
  echo "3. Verify the token is from: https://vkstdibhypprasyiswny.supabase.co"
  exit 1
fi
