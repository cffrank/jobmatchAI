#!/bin/bash

# Fix Cloudflare Pages Environment Variables
# Changes VITE_BACKEND_URL to VITE_API_URL

set -e

echo "🔧 Fixing Cloudflare Pages Environment Variables"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

PROJECT_NAME="jobmatch-ai"

echo "📋 Current environment variables:"
npx wrangler pages project list 2>/dev/null | grep "$PROJECT_NAME" || echo "Project: $PROJECT_NAME"

echo ""
echo "⚠️  Manual steps required:"
echo ""
echo "1. Go to: https://dash.cloudflare.com/"
echo "2. Navigate to: Workers & Pages → $PROJECT_NAME"
echo "3. Click: Settings → Environment Variables"
echo "4. For each environment (Production, Preview):"
echo "   - Find: VITE_BACKEND_URL"
echo "   - Click Edit"
echo "   - Change name to: VITE_API_URL"
echo "   - Keep value as: https://jobmatch-ai-dev.carl-f-frank.workers.dev"
echo "   - Click Save"
echo ""
echo "5. Trigger a new deployment by pushing to develop branch"
echo ""
echo "💡 Note: Cloudflare Pages doesn't support renaming env vars via CLI"
echo "   You must use the dashboard UI"
echo ""

# Optionally show current build settings
echo "📄 Checking project configuration..."
npx wrangler pages project list 2>&1 | grep -A 5 "$PROJECT_NAME" || true

echo ""
echo "✅ Instructions complete!"
echo "   After updating the env var, test at:"
echo "   https://jobmatch-ai-dev.pages.dev"
