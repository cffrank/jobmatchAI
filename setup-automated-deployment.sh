#!/bin/bash

# Automated Deployment Setup Script for JobMatch AI
# This script helps you gather all credentials and set up GitHub Secrets for CICD

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║              JobMatch AI - Automated Deployment Setup                       ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "This script will help you:"
echo "  1. Generate required secrets (Railway token, JWT secret)"
echo "  2. Verify Supabase credentials"
echo "  3. Set up GitHub Secrets for CICD"
echo "  4. Trigger automated deployment"
echo ""

# Check prerequisites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Checking prerequisites..."
echo ""

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
else
    echo "✅ Railway CLI installed ($(railway --version))"
fi

# Check GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "⚠️  GitHub CLI not found. You'll need to set secrets manually."
    echo "   Install: https://cli.github.com"
    USE_GH_CLI=false
else
    echo "✅ GitHub CLI installed ($(gh --version | head -n1))"
    USE_GH_CLI=true
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Generate Railway Token"
echo ""

echo "Opening Railway login in browser..."
railway login

echo ""
echo "Generating Railway token..."
RAILWAY_TOKEN=$(railway token)
echo "✅ Railway token generated: ${RAILWAY_TOKEN:0:10}..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Generate JWT Secret"
echo ""

JWT_SECRET=$(openssl rand -base64 32)
echo "✅ JWT secret generated: ${JWT_SECRET:0:10}..."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Get Supabase Credentials"
echo ""

echo "Opening Supabase API settings..."
echo "URL: https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api"
echo ""

# Try to open in browser
if command -v xdg-open &> /dev/null; then
    xdg-open "https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api" &> /dev/null
elif command -v open &> /dev/null; then
    open "https://supabase.com/dashboard/project/lrzhpnsykasqrousgmdh/settings/api"
fi

echo "Please copy the following from the Supabase dashboard:"
echo ""
echo "1. Project URL (should be: https://lrzhpnsykasqrousgmdh.supabase.co)"
read -p "   Confirm Project URL: " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-https://lrzhpnsykasqrousgmdh.supabase.co}

echo ""
echo "2. Anon/Public Key (starts with 'eyJhbG...')"
read -p "   Paste Anon Key: " SUPABASE_ANON_KEY

echo ""
echo "3. Service Role Key (Click 'Reveal' next to service_role)"
echo "   ⚠️  WARNING: Keep this secret - never commit to git!"
read -s -p "   Paste Service Role Key: " SUPABASE_SERVICE_ROLE_KEY
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Get OpenAI API Key"
echo ""

echo "Opening OpenAI API keys page..."
echo "URL: https://platform.openai.com/api-keys"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "https://platform.openai.com/api-keys" &> /dev/null
elif command -v open &> /dev/null; then
    open "https://platform.openai.com/api-keys"
fi

echo "Create a new key named 'JobMatch AI Backend'"
read -s -p "Paste OpenAI API Key (starts with 'sk-'): " OPENAI_API_KEY
echo ""

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 5: Get SendGrid Credentials"
echo ""

echo "Opening SendGrid API keys page..."
echo "URL: https://app.sendgrid.com/settings/api_keys"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "https://app.sendgrid.com/settings/api_keys" &> /dev/null
elif command -v open &> /dev/null; then
    open "https://app.sendgrid.com/settings/api_keys"
fi

echo "Create a new key with 'Full Access' permissions"
read -s -p "Paste SendGrid API Key (starts with 'SG.'): " SENDGRID_API_KEY
echo ""

echo ""
echo "Opening SendGrid sender authentication..."
echo "URL: https://app.sendgrid.com/settings/sender_auth"
echo ""

if command -v xdg-open &> /dev/null; then
    xdg-open "https://app.sendgrid.com/settings/sender_auth" &> /dev/null
elif command -v open &> /dev/null; then
    open "https://app.sendgrid.com/settings/sender_auth"
fi

echo "Verify your sender email address"
read -p "Enter verified sender email: " SENDGRID_FROM_EMAIL
SENDGRID_FROM_EMAIL=${SENDGRID_FROM_EMAIL:-carl.f.frank@gmail.com}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 6: Set Frontend URL"
echo ""

read -p "Frontend URL (default: http://localhost:5173): " FRONTEND_URL
FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 7: Configure GitHub Secrets"
echo ""

if [ "$USE_GH_CLI" = true ]; then
    echo "Setting GitHub Secrets using GitHub CLI..."
    echo ""

    # Check if logged in
    if ! gh auth status &> /dev/null; then
        echo "Logging in to GitHub..."
        gh auth login
    fi

    # Set secrets
    echo "$RAILWAY_TOKEN" | gh secret set RAILWAY_TOKEN
    echo "✅ RAILWAY_TOKEN set"

    echo "$SUPABASE_URL" | gh secret set SUPABASE_URL
    echo "✅ SUPABASE_URL set"

    echo "$SUPABASE_ANON_KEY" | gh secret set SUPABASE_ANON_KEY
    echo "✅ SUPABASE_ANON_KEY set"

    echo "$SUPABASE_SERVICE_ROLE_KEY" | gh secret set SUPABASE_SERVICE_ROLE_KEY
    echo "✅ SUPABASE_SERVICE_ROLE_KEY set"

    echo "$OPENAI_API_KEY" | gh secret set OPENAI_API_KEY
    echo "✅ OPENAI_API_KEY set"

    echo "$SENDGRID_API_KEY" | gh secret set SENDGRID_API_KEY
    echo "✅ SENDGRID_API_KEY set"

    echo "$SENDGRID_FROM_EMAIL" | gh secret set SENDGRID_FROM_EMAIL
    echo "✅ SENDGRID_FROM_EMAIL set"

    echo "$JWT_SECRET" | gh secret set JWT_SECRET
    echo "✅ JWT_SECRET set"

    echo "$FRONTEND_URL" | gh secret set FRONTEND_URL
    echo "✅ FRONTEND_URL set"

    echo ""
    echo "✅ All GitHub Secrets configured!"
else
    echo "GitHub CLI not available. Please set secrets manually:"
    echo ""
    echo "Go to: https://github.com/YOUR_USERNAME/jobmatch-ai/settings/secrets/actions"
    echo ""
    echo "Add these secrets:"
    echo ""
    echo "RAILWAY_TOKEN=$RAILWAY_TOKEN"
    echo "SUPABASE_URL=$SUPABASE_URL"
    echo "SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY"
    echo "SUPABASE_SERVICE_ROLE_KEY=[HIDDEN]"
    echo "OPENAI_API_KEY=[HIDDEN]"
    echo "SENDGRID_API_KEY=[HIDDEN]"
    echo "SENDGRID_FROM_EMAIL=$SENDGRID_FROM_EMAIL"
    echo "JWT_SECRET=[HIDDEN]"
    echo "FRONTEND_URL=$FRONTEND_URL"
    echo ""
    read -p "Press Enter after setting all secrets..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 8: Trigger Automated Deployment"
echo ""

echo "To trigger automated deployment, you have two options:"
echo ""
echo "Option 1: Push to main branch"
echo "  git add .github/workflows/deploy-backend-railway.yml"
echo "  git commit -m 'Add automated backend deployment'"
echo "  git push origin main"
echo ""
echo "Option 2: Manually trigger workflow"
echo "  gh workflow run deploy-backend-railway.yml"
echo ""

read -p "Would you like to trigger deployment now? (y/n): " TRIGGER_NOW

if [ "$TRIGGER_NOW" = "y" ] || [ "$TRIGGER_NOW" = "Y" ]; then
    if [ "$USE_GH_CLI" = true ]; then
        echo ""
        echo "Triggering deployment workflow..."
        gh workflow run deploy-backend-railway.yml
        echo ""
        echo "✅ Deployment triggered!"
        echo ""
        echo "Monitor progress:"
        echo "  gh run watch"
        echo "  OR visit: https://github.com/YOUR_USERNAME/jobmatch-ai/actions"
    else
        echo ""
        echo "Please trigger deployment manually:"
        echo "  Visit: https://github.com/YOUR_USERNAME/jobmatch-ai/actions"
        echo "  Click: Deploy Backend to Railway → Run workflow"
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Setup Complete!"
echo ""
echo "Next Steps:"
echo "  1. Monitor deployment in GitHub Actions"
echo "  2. Get backend URL from workflow output"
echo "  3. Update FRONTEND_URL secret with backend URL"
echo "  4. Continue with frontend migration and deployment"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
