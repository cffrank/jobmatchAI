#!/bin/bash
# Update Cloudflare Workers secrets with correct Supabase credentials

set -e

SUPABASE_URL="https://vkstdibhypprasyiswny.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E"

echo "=== Updating Cloudflare Workers Secrets ==="
echo "Target: jobmatch-ai-dev"
echo "Supabase Project: vkstdibhypprasyiswny"
echo ""

cd /home/carl/application-tracking/jobmatch-ai/workers

# Update SUPABASE_URL
echo "Updating SUPABASE_URL..."
echo "$SUPABASE_URL" | wrangler secret put SUPABASE_URL --name jobmatch-ai-dev

# Update SUPABASE_ANON_KEY
echo "Updating SUPABASE_ANON_KEY..."
echo "$SUPABASE_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --name jobmatch-ai-dev

echo ""
echo "=== Secrets Updated Successfully ==="
echo "Workers will now validate JWT tokens from the correct Supabase project."
