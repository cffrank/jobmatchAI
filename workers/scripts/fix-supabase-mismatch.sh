#!/bin/bash
# Fix Supabase Project Mismatch - Update Workers to Use Frontend's Supabase Project
#
# This script updates Workers configuration to use the same Supabase project as frontend
# Fixes 401 Unauthorized errors caused by JWT validation against wrong project

set -e

echo "🔧 Fixing Supabase Project Mismatch"
echo "===================================="
echo ""

# Frontend Supabase project (from .env.local)
FRONTEND_SUPABASE_URL="https://vkstdibhypprasyiswny.supabase.co"
FRONTEND_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrc3RkaWJoeXBwcmFzeWlzd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTE4NDAsImV4cCI6MjA4MjcyNzg0MH0.hPn1GVfmNAuHk3-VcqSw1khJChhSYZ5TRwePTUl553E"

echo "Frontend Supabase Project: $FRONTEND_SUPABASE_URL"
echo ""

# Check if SERVICE_ROLE_KEY is provided as argument
if [ -z "$1" ]; then
  echo "❌ ERROR: SERVICE_ROLE_KEY required"
  echo ""
  echo "Usage:"
  echo "  ./scripts/fix-supabase-mismatch.sh <SERVICE_ROLE_KEY>"
  echo ""
  echo "To get your SERVICE_ROLE_KEY:"
  echo "1. Go to: https://supabase.com/dashboard/project/vkstdibhypprasyiswny/settings/api"
  echo "2. Copy the 'service_role' key (NOT the anon key)"
  echo "3. Run this script with the key:"
  echo "   ./scripts/fix-supabase-mismatch.sh eyJhbGci..."
  echo ""
  exit 1
fi

SERVICE_ROLE_KEY="$1"

echo "✓ SERVICE_ROLE_KEY provided"
echo ""

# Backup current .dev.vars
echo "📦 Backing up current .dev.vars..."
cp .dev.vars .dev.vars.backup
echo "✓ Backup saved to .dev.vars.backup"
echo ""

# Update .dev.vars
echo "📝 Updating .dev.vars..."
sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$FRONTEND_SUPABASE_URL|" .dev.vars
sed -i "s|SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=$FRONTEND_ANON_KEY|" .dev.vars
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY|" .dev.vars

echo "✓ .dev.vars updated"
echo ""

# Update Cloudflare secrets for development environment
echo "🔐 Updating Cloudflare Workers secrets for development environment..."
echo ""

echo "Setting SUPABASE_URL..."
echo "$FRONTEND_SUPABASE_URL" | wrangler secret put SUPABASE_URL --env development

echo "Setting SUPABASE_ANON_KEY..."
echo "$FRONTEND_ANON_KEY" | wrangler secret put SUPABASE_ANON_KEY --env development

echo "Setting SUPABASE_SERVICE_ROLE_KEY..."
echo "$SERVICE_ROLE_KEY" | wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env development

echo ""
echo "✅ Configuration Updated Successfully!"
echo ""
echo "Next steps:"
echo "1. Restart your Workers dev server: npm run dev"
echo "2. Reload frontend in browser"
echo "3. Login and verify API calls return 200 OK (not 401)"
echo ""
echo "If still seeing 401 errors:"
echo "- Check browser DevTools Network tab"
echo "- Verify Authorization header contains Bearer token"
echo "- Check Workers logs for JWT validation errors"
echo ""
