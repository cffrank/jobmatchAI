#!/bin/bash

# Setup GitHub Secrets for Supabase Migration
# This script adds the required Supabase secrets to GitHub Actions

set -e

echo "🔐 Setting up GitHub Secrets for Supabase"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Please install it with:"
    echo "  sudo apt install gh"
    echo ""
    echo "Or add secrets manually via the GitHub web UI:"
    echo "  https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
    echo ""
    echo "See docs/GITHUB_SECRETS_SETUP.md for details."
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI."
    echo ""
    echo "Please run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is installed and authenticated"
echo ""

# Read credentials from local .env files
SUPABASE_URL="https://lrzhpnsykasqrousgmdh.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxyemhwbnN5a2FzcXJvdXNnbWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYyNTkxMDcsImV4cCI6MjA4MTgzNTEwN30.aKqsPCJb-EwkYeuD1Zmv_FXQUyKLEEG5pXIKEiSX9ZE"
SUPABASE_SERVICE_ROLE_KEY="sb_secret_gg4QrTYInH96FqySfouuKA_1bH0Fj6u"

echo "Adding secrets to GitHub repository..."
echo ""

# Add SUPABASE_URL
echo "📝 Adding SUPABASE_URL..."
if gh secret set SUPABASE_URL --body "$SUPABASE_URL"; then
    echo "✅ SUPABASE_URL added successfully"
else
    echo "❌ Failed to add SUPABASE_URL"
    exit 1
fi

# Add SUPABASE_ANON_KEY
echo "📝 Adding SUPABASE_ANON_KEY..."
if gh secret set SUPABASE_ANON_KEY --body "$SUPABASE_ANON_KEY"; then
    echo "✅ SUPABASE_ANON_KEY added successfully"
else
    echo "❌ Failed to add SUPABASE_ANON_KEY"
    exit 1
fi

# Add SUPABASE_SERVICE_ROLE_KEY
echo "📝 Adding SUPABASE_SERVICE_ROLE_KEY..."
if gh secret set SUPABASE_SERVICE_ROLE_KEY --body "$SUPABASE_SERVICE_ROLE_KEY"; then
    echo "✅ SUPABASE_SERVICE_ROLE_KEY added successfully"
else
    echo "❌ Failed to add SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo ""
echo "=========================================="
echo "✅ All Supabase secrets added successfully!"
echo ""

# List all secrets to verify
echo "Current GitHub Secrets:"
gh secret list

echo ""
echo "Next steps:"
echo "1. Push a commit to trigger GitHub Actions"
echo "2. Watch the test run: gh run watch"
echo ""
echo "See docs/GITHUB_SECRETS_SETUP.md for more details."
