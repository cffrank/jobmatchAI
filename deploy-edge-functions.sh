#!/bin/bash

# Deploy all Supabase Edge Functions
# Run this script from the project root

set -e

echo "🚀 Deploying Supabase Edge Functions..."
echo "Project ID: lrzhpnsykasqrousgmdh"
echo ""

# Function to deploy an edge function
deploy_function() {
  local func_name=$1
  echo "📦 Deploying $func_name..."
  supabase functions deploy $func_name --project-ref lrzhpnsykasqrousgmdh
  echo "✅ $func_name deployed successfully"
  echo ""
}

# Deploy all functions
deploy_function "rate-limit"
deploy_function "send-email"
deploy_function "generate-application"
deploy_function "scrape-jobs"
deploy_function "linkedin-oauth"

echo "🎉 All Edge Functions deployed successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Set environment secrets using: supabase secrets set KEY=value --project-ref lrzhpnsykasqrousgmdh"
echo "2. Required secrets:"
echo "   - OPENAI_API_KEY"
echo "   - SENDGRID_API_KEY"
echo "   - SENDGRID_FROM_EMAIL"
echo "   - APIFY_API_KEY"
echo "   - LINKEDIN_CLIENT_ID"
echo "   - LINKEDIN_CLIENT_SECRET"
echo "   - APP_URL"
