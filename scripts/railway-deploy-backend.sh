#!/bin/bash
# =============================================================================
# Railway Backend Deployment Script
# =============================================================================
# This script helps deploy the JobMatch AI backend to Railway using the CLI.
# It prompts for all required environment variables and deploys the service.
#
# Usage: ./scripts/railway-deploy-backend.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# =============================================================================
# Prerequisites Check
# =============================================================================

print_header "Railway Backend Deployment"

echo "Checking prerequisites..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi
print_success "Railway CLI installed"

# Check if we're in the correct directory
if [ ! -d "backend" ]; then
    print_error "Must run from project root directory"
    exit 1
fi
print_success "Correct directory"

# Check if backend has package.json
if [ ! -f "backend/package.json" ]; then
    print_error "backend/package.json not found"
    exit 1
fi
print_success "Backend package.json found"

# =============================================================================
# Login to Railway
# =============================================================================

print_header "Railway Authentication"

if ! railway whoami &> /dev/null; then
    print_warning "Not logged in to Railway"
    echo "Opening browser for authentication..."
    railway login
    print_success "Logged in to Railway"
else
    RAILWAY_USER=$(railway whoami 2>&1 || echo "unknown")
    print_success "Already logged in as: $RAILWAY_USER"
fi

# =============================================================================
# Navigate to Backend
# =============================================================================

cd backend
print_success "Changed to backend directory"

# =============================================================================
# Initialize Railway Project
# =============================================================================

print_header "Railway Project Setup"

# Check if already linked to a project
if railway status &> /dev/null; then
    print_warning "Already linked to a Railway project"
    read -p "Do you want to unlink and create a new project? (y/N): " unlink_choice
    if [[ $unlink_choice =~ ^[Yy]$ ]]; then
        railway unlink
        print_success "Unlinked from project"
    fi
fi

if ! railway status &> /dev/null; then
    echo "Initializing new Railway project..."
    railway init
    print_success "Railway project initialized"
fi

# =============================================================================
# Set Environment Variables
# =============================================================================

print_header "Environment Variables Configuration"

echo "Please provide the following environment variables."
echo "Press Enter to skip optional variables."
echo ""

# Required variables
read -p "SUPABASE_URL (required): " SUPABASE_URL
read -p "SUPABASE_ANON_KEY (required): " SUPABASE_ANON_KEY
read -sp "SUPABASE_SERVICE_ROLE_KEY (required): " SUPABASE_SERVICE_ROLE_KEY
echo ""
read -sp "OPENAI_API_KEY (required): " OPENAI_API_KEY
echo ""
read -sp "SENDGRID_API_KEY (required): " SENDGRID_API_KEY
echo ""
read -p "SENDGRID_FROM_EMAIL (required): " SENDGRID_FROM_EMAIL

# Generate JWT secret if not provided
echo ""
print_warning "Generating secure JWT_SECRET..."
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)
print_success "JWT_SECRET generated: ${JWT_SECRET:0:10}..."

# Optional variables
echo ""
echo "Optional variables (press Enter to skip):"
read -p "LINKEDIN_CLIENT_ID (optional): " LINKEDIN_CLIENT_ID
read -sp "LINKEDIN_CLIENT_SECRET (optional): " LINKEDIN_CLIENT_SECRET
echo ""
read -p "APIFY_API_TOKEN (optional): " APIFY_API_TOKEN

# Set required variables
echo ""
print_header "Setting Environment Variables"

railway variables set SUPABASE_URL="$SUPABASE_URL"
railway variables set SUPABASE_ANON_KEY="$SUPABASE_ANON_KEY"
railway variables set SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY"
railway variables set OPENAI_API_KEY="$OPENAI_API_KEY"
railway variables set SENDGRID_API_KEY="$SENDGRID_API_KEY"
railway variables set SENDGRID_FROM_EMAIL="$SENDGRID_FROM_EMAIL"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set PORT="3000"
railway variables set NODE_ENV="production"

print_success "Required variables set"

# Set optional variables if provided
if [ ! -z "$LINKEDIN_CLIENT_ID" ]; then
    railway variables set LINKEDIN_CLIENT_ID="$LINKEDIN_CLIENT_ID"
    print_success "LINKEDIN_CLIENT_ID set"
fi

if [ ! -z "$LINKEDIN_CLIENT_SECRET" ]; then
    railway variables set LINKEDIN_CLIENT_SECRET="$LINKEDIN_CLIENT_SECRET"
    print_success "LINKEDIN_CLIENT_SECRET set"
fi

if [ ! -z "$APIFY_API_TOKEN" ]; then
    railway variables set APIFY_API_TOKEN="$APIFY_API_TOKEN"
    print_success "APIFY_API_TOKEN set"
fi

# =============================================================================
# Build Test (Optional)
# =============================================================================

print_header "Local Build Test"

read -p "Test build locally before deploying? (Y/n): " build_test
if [[ ! $build_test =~ ^[Nn]$ ]]; then
    echo "Running npm install..."
    npm install
    echo "Running build..."
    npm run build
    print_success "Local build successful"
else
    print_warning "Skipping local build test"
fi

# =============================================================================
# Deploy to Railway
# =============================================================================

print_header "Deployment"

read -p "Ready to deploy to Railway? (Y/n): " deploy_choice
if [[ $deploy_choice =~ ^[Nn]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

echo "Deploying to Railway..."
railway up

print_success "Deployment initiated"

# =============================================================================
# Post-Deployment
# =============================================================================

print_header "Post-Deployment"

echo "Waiting for deployment to complete..."
sleep 5

# Get deployment status
echo ""
railway status

# Get domain
echo ""
print_header "Deployment URLs"
echo "Getting your Railway domain..."
BACKEND_URL=$(railway domain 2>&1 || echo "")

if [ ! -z "$BACKEND_URL" ]; then
    print_success "Backend URL: $BACKEND_URL"
    echo ""
    echo "Save this URL! You'll need it for:"
    echo "1. Frontend configuration (VITE_BACKEND_URL)"
    echo "2. LinkedIn OAuth redirect URI configuration"
    echo ""

    # Test health endpoint
    print_header "Testing Deployment"
    echo "Testing health endpoint..."
    sleep 10  # Wait for service to be ready

    if curl -f -s "$BACKEND_URL/health" > /dev/null; then
        print_success "Health check passed!"
        curl -s "$BACKEND_URL/health" | jq 2>/dev/null || curl -s "$BACKEND_URL/health"
    else
        print_warning "Health check failed (service may still be starting)"
        echo "Check logs with: railway logs"
    fi
else
    print_warning "Could not retrieve domain automatically"
    echo "Get it manually with: railway domain"
fi

# =============================================================================
# Next Steps
# =============================================================================

print_header "Next Steps"

echo "1. Update APP_URL variable with your frontend URL:"
echo "   cd backend && railway variables set APP_URL=<frontend-url>"
echo ""
echo "2. If using LinkedIn OAuth, set redirect URI:"
echo "   railway variables set LINKEDIN_REDIRECT_URI=<backend-url>/api/auth/linkedin/callback"
echo ""
echo "3. Deploy the frontend with: ./scripts/railway-deploy-frontend.sh"
echo ""
echo "4. View logs: railway logs"
echo "5. View dashboard: railway open"
echo ""

print_success "Backend deployment complete!"

cd ..
