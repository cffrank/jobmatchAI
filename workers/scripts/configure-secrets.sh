#!/bin/bash

# Configure Cloudflare Worker Secrets for Development Environment
# This script helps you set all required secrets for the jobmatch-ai-dev Worker

set -e

ENVIRONMENT="development"
WORKER_NAME="jobmatch-ai-${ENVIRONMENT}"

echo "=================================="
echo "Cloudflare Worker Secrets Setup"
echo "=================================="
echo ""
echo "This script will configure all required secrets for: ${WORKER_NAME}"
echo ""

# Check if wrangler is authenticated
if ! npx wrangler whoami &>/dev/null; then
    echo "❌ Error: Not authenticated with Wrangler"
    echo "Please run: npx wrangler login"
    exit 1
fi

echo "✅ Wrangler authenticated"
echo ""

# Function to set a secret
set_secret() {
    local SECRET_NAME=$1
    local SECRET_DESCRIPTION=$2
    local IS_REQUIRED=${3:-true}

    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📝 ${SECRET_NAME}"
    echo "   ${SECRET_DESCRIPTION}"

    if [ "$IS_REQUIRED" = false ]; then
        echo "   (Optional - press Enter to skip)"
    fi

    echo ""
    read -sp "   Enter value: " SECRET_VALUE
    echo ""

    if [ -z "$SECRET_VALUE" ]; then
        if [ "$IS_REQUIRED" = true ]; then
            echo "   ⚠️  This secret is required. Please provide a value."
            return 1
        else
            echo "   ⏭️  Skipped"
            return 0
        fi
    fi

    # Set the secret using wrangler
    echo "$SECRET_VALUE" | npx wrangler secret put "$SECRET_NAME" --env "$ENVIRONMENT" &>/dev/null

    if [ $? -eq 0 ]; then
        echo "   ✅ Set successfully"
    else
        echo "   ❌ Failed to set secret"
        return 1
    fi

    echo ""
}

echo "Setting up required secrets..."
echo ""

# Critical secrets for AI functionality
set_secret "OPENAI_API_KEY" "OpenAI API key for AI generation features (starts with sk-...)" true

# Supabase secrets
set_secret "SUPABASE_URL" "Supabase project URL (e.g., https://xxx.supabase.co)" true
set_secret "SUPABASE_ANON_KEY" "Supabase anonymous key (public, respects RLS)" true
set_secret "SUPABASE_SERVICE_ROLE_KEY" "Supabase service role key (admin access, keep secure!)" true

# Application URL
set_secret "APP_URL" "Frontend application URL (e.g., https://jobmatch-ai-dev.pages.dev)" true

# Optional secrets
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Optional Secrets"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

set_secret "SENDGRID_API_KEY" "SendGrid API key for email functionality" false
set_secret "LINKEDIN_CLIENT_ID" "LinkedIn OAuth client ID" false
set_secret "LINKEDIN_CLIENT_SECRET" "LinkedIn OAuth client secret" false
set_secret "LINKEDIN_REDIRECT_URI" "LinkedIn OAuth redirect URI" false
set_secret "APIFY_API_TOKEN" "Apify API token for job scraping" false

# AI Gateway configuration (optional - can be set via wrangler.toml)
set_secret "CLOUDFLARE_ACCOUNT_ID" "Cloudflare account ID (optional if in wrangler.toml)" false
set_secret "AI_GATEWAY_SLUG" "AI Gateway slug (e.g., jobmatch-ai-gateway-dev)" false

echo ""
echo "=================================="
echo "✅ Secret Configuration Complete"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Create AI Gateway in Cloudflare Dashboard:"
echo "   - Go to: https://dash.cloudflare.com/?to=/:account/ai/ai-gateway"
echo "   - Create gateway: jobmatch-ai-gateway-dev"
echo "   - Provider: OpenAI"
echo "   - Enable caching and logging"
echo ""
echo "2. Test the Worker:"
echo "   curl https://${WORKER_NAME}.carl-f-frank.workers.dev/health"
echo ""
echo "3. Monitor AI Gateway:"
echo "   https://dash.cloudflare.com/?to=/:account/ai/ai-gateway/jobmatch-ai-gateway-dev"
echo ""
