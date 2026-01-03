#!/bin/bash
# Test deployed Workers Supabase configuration

echo "=== Testing Deployed Workers Configuration ==="
echo ""

# Test health endpoint to confirm Workers are running
echo "1. Health check:"
curl -s https://jobmatch-ai-dev.carl-f-frank.workers.dev/health | jq .
echo ""

# Check if we can decode which Supabase project the Workers are using
# This would require the Workers to expose this info (which they don't for security)
# So we need to check the deployed secrets instead

echo "2. Deployed secrets (from wrangler):"
cd /home/carl/application-tracking/jobmatch-ai/workers
wrangler secret list --name jobmatch-ai-dev
echo ""

echo "3. Local .dev.vars (what's configured locally):"
grep "SUPABASE_URL" .dev.vars 2>/dev/null || echo "No SUPABASE_URL in .dev.vars"
echo ""

echo "4. Frontend .env.development (what frontend is using):"
grep "VITE_SUPABASE_URL" ../.env.development 2>/dev/null || echo "No VITE_SUPABASE_URL"
echo ""

echo "=== Analysis ==="
echo "If frontend and Workers have different SUPABASE_URL values,"
echo "JWT tokens from frontend will fail validation in Workers."
echo ""
echo "Expected: vkstdibhypprasyiswny (correct project ID from docs)"
echo "Frontend: $(grep VITE_SUPABASE_URL ../.env.development | cut -d'/' -f3 | cut -d'.' -f1)"
echo "Workers:  $(grep SUPABASE_URL .dev.vars | cut -d'/' -f3 | cut -d'.' -f1)"
