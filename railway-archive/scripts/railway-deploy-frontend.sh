#!/bin/bash
# =============================================================================
# Railway Frontend Deployment Script
# =============================================================================
# This script helps deploy the JobMatch AI frontend to Railway using the CLI.
# Run this AFTER deploying the backend to get the backend URL.
#
# Usage: ./scripts/railway-deploy-frontend.sh
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

print_header "Railway Frontend Deployment"

echo "Checking prerequisites..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    print_error "Railway CLI is not installed"
    echo "Install it with: npm install -g @railway/cli"
    exit 1
fi
print_success "Railway CLI installed"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "Must run from project root directory"
    exit 1
fi
print_success "Correct directory"

# Check for vite.config.ts
if [ ! -f "vite.config.ts" ]; then
    print_error "vite.config.ts not found (is this a Vite project?)"
    exit 1
fi
print_success "Vite configuration found"

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
echo ""

# Required variables
read -p "VITE_SUPABASE_URL (required): " VITE_SUPABASE_URL
read -p "VITE_SUPABASE_ANON_KEY (required): " VITE_SUPABASE_ANON_KEY
echo ""
echo "Enter your BACKEND URL from the previous deployment:"
echo "Example: https://backend-production-xxxx.up.railway.app"
read -p "VITE_BACKEND_URL (required): " VITE_BACKEND_URL

# Optional variables
echo ""
echo "Optional variables (press Enter to skip):"
read -p "VITE_LINKEDIN_CLIENT_ID (optional): " VITE_LINKEDIN_CLIENT_ID
read -p "VITE_APP_NAME (default: JobMatch AI): " VITE_APP_NAME
VITE_APP_NAME=${VITE_APP_NAME:-"JobMatch AI"}

# Set required variables
echo ""
print_header "Setting Environment Variables"

railway variables set VITE_SUPABASE_URL="$VITE_SUPABASE_URL"
railway variables set VITE_SUPABASE_ANON_KEY="$VITE_SUPABASE_ANON_KEY"
railway variables set VITE_BACKEND_URL="$VITE_BACKEND_URL"
railway variables set VITE_APP_NAME="$VITE_APP_NAME"

print_success "Required variables set"

# Set optional variables if provided
if [ ! -z "$VITE_LINKEDIN_CLIENT_ID" ]; then
    railway variables set VITE_LINKEDIN_CLIENT_ID="$VITE_LINKEDIN_CLIENT_ID"
    print_success "VITE_LINKEDIN_CLIENT_ID set"
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

    # Check dist directory
    if [ -d "dist" ]; then
        DIST_SIZE=$(du -sh dist | cut -f1)
        print_success "Build output size: $DIST_SIZE"
    fi
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
FRONTEND_URL=$(railway domain 2>&1 || echo "")

if [ ! -z "$FRONTEND_URL" ]; then
    print_success "Frontend URL: $FRONTEND_URL"
    echo ""
    echo "Save this URL! You'll need it for:"
    echo "1. Updating backend APP_URL variable"
    echo "2. LinkedIn OAuth redirect URI configuration"
    echo "3. Setting VITE_LINKEDIN_REDIRECT_URI"
    echo ""

    # Test frontend
    print_header "Testing Deployment"
    echo "Testing frontend..."
    sleep 10  # Wait for service to be ready

    if curl -f -s "$FRONTEND_URL" > /dev/null; then
        print_success "Frontend is accessible!"
    else
        print_warning "Frontend not accessible yet (service may still be starting)"
        echo "Check logs with: railway logs"
    fi
else
    print_warning "Could not retrieve domain automatically"
    echo "Get it manually with: railway domain"
fi

# =============================================================================
# Update Backend Configuration
# =============================================================================

print_header "Update Backend Configuration"

echo "You need to update your backend with the frontend URL."
echo ""
echo "Run the following commands in the backend directory:"
echo ""
echo "  cd backend"
echo "  railway variables set APP_URL=$FRONTEND_URL"
if [ ! -z "$VITE_LINKEDIN_CLIENT_ID" ]; then
    echo "  railway variables set VITE_LINKEDIN_REDIRECT_URI=$FRONTEND_URL/auth/callback/linkedin"
fi
echo "  railway up  # Redeploy backend"
echo "  cd .."
echo ""

read -p "Do you want to update backend now? (Y/n): " update_backend
if [[ ! $update_backend =~ ^[Nn]$ ]]; then
    if [ -d "backend" ]; then
        cd backend
        echo "Updating backend variables..."
        railway variables set APP_URL="$FRONTEND_URL"

        if [ ! -z "$VITE_LINKEDIN_CLIENT_ID" ]; then
            railway variables set VITE_LINKEDIN_REDIRECT_URI="$FRONTEND_URL/auth/callback/linkedin"
        fi

        print_success "Backend variables updated"

        read -p "Redeploy backend now? (Y/n): " redeploy_backend
        if [[ ! $redeploy_backend =~ ^[Nn]$ ]]; then
            echo "Redeploying backend..."
            railway up
            print_success "Backend redeployed"
        fi

        cd ..
    else
        print_warning "Backend directory not found, skipping update"
    fi
fi

# =============================================================================
# Next Steps
# =============================================================================

print_header "Next Steps"

echo "1. Test your frontend at: $FRONTEND_URL"
echo ""
echo "2. If using LinkedIn OAuth:"
echo "   - Go to LinkedIn Developer Portal"
echo "   - Add redirect URIs:"
echo "     • $VITE_BACKEND_URL/api/auth/linkedin/callback"
echo "     • $FRONTEND_URL/auth/callback/linkedin"
echo ""
echo "3. Test all features:"
echo "   - User signup/login"
echo "   - Job search"
echo "   - Application generation"
echo "   - Email sending"
echo ""
echo "4. Monitor logs: railway logs"
echo "5. View dashboard: railway open"
echo ""

print_success "Frontend deployment complete!"
print_success "Your app is live at: $FRONTEND_URL"
