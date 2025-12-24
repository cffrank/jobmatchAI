#!/bin/bash

###############################################################################
# Railway Deployment Verification Script
#
# Purpose: Verify Railway backend deployment configuration and health
# Usage: ./scripts/verify-railway-deployment.sh [command]
# Commands:
#   check-cli         - Verify Railway CLI is installed and authenticated
#   check-service     - Check backend service status in Railway
#   check-variables   - List configured environment variables
#   health-check      - Test the health endpoint
#   full-check        - Run all checks (default)
#   measure-deploy    - Measure deployment time (requires pushing to main)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"

# Functions
print_header() {
    echo -e "\n${BLUE}=====================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=====================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Check if Railway CLI is installed
check_cli() {
    print_header "Railway CLI Check"

    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed"
        echo ""
        echo "Install it with:"
        echo "  npm install -g @railway/cli"
        return 1
    fi

    print_success "Railway CLI is installed"
    local version=$(railway --version 2>/dev/null || echo "unknown")
    print_info "Version: $version"

    # Check if authenticated
    if railway status > /dev/null 2>&1; then
        print_success "Railway CLI is authenticated"

        # Show authentication method
        if [ -n "${RAILWAY_TOKEN:-}" ]; then
            print_info "Authentication method: Token (RAILWAY_TOKEN)"
        elif [ -n "${RAILWAY_API_TOKEN:-}" ]; then
            print_info "Authentication method: Token (RAILWAY_API_TOKEN)"
        else
            print_info "Authentication method: Interactive session"
        fi
    else
        print_error "Railway CLI is not authenticated"
        echo ""
        echo "Authenticate with one of these methods:"
        echo ""
        echo "  Option 1: Interactive browser login"
        echo "    railway login"
        echo ""
        echo "  Option 2: Token-based authentication"
        echo "    export RAILWAY_TOKEN=\"your-token-here\""
        echo "    railway status"
        echo ""
        echo "  Option 3: For CI/CD, set GitHub secret:"
        echo "    Settings → Secrets and variables → Actions → RAILWAY_TOKEN"
        echo ""
        echo "To create a token:"
        echo "  1. Go to https://railway.app/dashboard"
        echo "  2. Click your profile → Account → Tokens"
        echo "  3. Create new token and copy immediately"
        return 1
    fi

    return 0
}

# Check backend service status
check_service() {
    print_header "Backend Service Status"

    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Please run: npm install -g @railway/cli"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Get service status
    if ! railway status --service backend --json > /tmp/railway-status.json 2>/dev/null; then
        print_error "Failed to get service status"
        print_info "Make sure you're in a Railway-linked project directory"
        return 1
    fi

    # Parse status
    local deployments=$(jq '.deployments | length' /tmp/railway-status.json)
    if [ "$deployments" -eq 0 ]; then
        print_warning "No deployments found"
        return 1
    fi

    print_success "Found $deployments deployment(s)"

    # Get latest deployment info
    local latest_status=$(jq -r '.deployments[0].status' /tmp/railway-status.json)
    local latest_url=$(jq -r '.deployments[0].url' /tmp/railway-status.json)
    local deployed_at=$(jq -r '.deployments[0].deployedAt' /tmp/railway-status.json)

    echo ""
    echo "Latest Deployment:"
    echo "  Status: $latest_status"
    echo "  URL: $latest_url"
    echo "  Deployed: $deployed_at"

    if [ "$latest_status" = "SUCCESS" ]; then
        print_success "Latest deployment succeeded"
    else
        print_warning "Latest deployment status: $latest_status"
    fi

    # Show recent deployments
    echo ""
    echo "Recent Deployments:"
    jq -r '.deployments[0:5] | .[] | "  \(.createdAt) - \(.status)"' /tmp/railway-status.json

    return 0
}

# Check environment variables
check_variables() {
    print_header "Environment Variables Check"

    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Please run: npm install -g @railway/cli"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Required variables
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "OPENAI_API_KEY"
        "SENDGRID_API_KEY"
        "SENDGRID_FROM_EMAIL"
        "NODE_ENV"
        "PORT"
        "JWT_SECRET"
        "APP_URL"
        "STORAGE_BUCKET"
    )

    # Optional variables
    local optional_vars=(
        "LINKEDIN_CLIENT_ID"
        "LINKEDIN_CLIENT_SECRET"
        "LINKEDIN_REDIRECT_URI"
        "APIFY_API_TOKEN"
    )

    # Get variables from Railway
    if ! railway variables list --service backend --json > /tmp/railway-vars.json 2>/dev/null; then
        print_warning "Could not fetch variables (requires Railway API access)"
        echo ""
        echo "To view variables, go to:"
        echo "  https://railway.app/dashboard → Backend Service → Variables"
        return 0
    fi

    local found_vars=$(jq 'keys | length' /tmp/railway-vars.json)
    print_info "Found $found_vars configured variables"

    echo ""
    echo "Required Variables:"
    local missing_required=0
    for var in "${required_vars[@]}"; do
        if jq -e ".\"$var\"" /tmp/railway-vars.json > /dev/null 2>&1; then
            print_success "$var is set"
        else
            print_error "$var is MISSING"
            missing_required=$((missing_required + 1))
        fi
    done

    echo ""
    echo "Optional Variables:"
    for var in "${optional_vars[@]}"; do
        if jq -e ".\"$var\"" /tmp/railway-vars.json > /dev/null 2>&1; then
            print_success "$var is set"
        else
            print_warning "$var is not set"
        fi
    done

    if [ $missing_required -gt 0 ]; then
        echo ""
        print_error "Missing $missing_required required variable(s)"
        echo "Set them in Railway dashboard:"
        echo "  https://railway.app/dashboard → Backend Service → Variables"
        return 1
    fi

    return 0
}

# Health check
health_check() {
    print_header "Backend Health Check"

    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found. Please run: npm install -g @railway/cli"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Get backend URL
    local backend_url=$(railway status --service backend --json | jq -r '.deployments[0].url' 2>/dev/null || echo "")

    if [ -z "$backend_url" ] || [ "$backend_url" = "null" ]; then
        print_error "Could not determine backend URL"
        return 1
    fi

    print_info "Testing: $backend_url/health"
    echo ""

    # Try health check with retries
    local max_attempts=5
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        if response=$(curl -s -w "\n%{http_code}" "$backend_url/health" 2>/dev/null); then
            local http_code=$(echo "$response" | tail -n1)
            local body=$(echo "$response" | head -n-1)

            if [ "$http_code" = "200" ]; then
                print_success "Health check passed (HTTP 200)"
                echo ""
                echo "Response:"
                echo "$body" | jq '.' 2>/dev/null || echo "$body"
                return 0
            else
                print_warning "Got HTTP $http_code on attempt $attempt/$max_attempts"
            fi
        else
            print_warning "Connection failed on attempt $attempt/$max_attempts"
        fi

        if [ $attempt -lt $max_attempts ]; then
            echo "Retrying in 5 seconds..."
            sleep 5
        fi

        attempt=$((attempt + 1))
    done

    print_error "Health check failed after $max_attempts attempts"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check backend URL is correct: $backend_url"
    echo "2. Verify environment variables are set in Railway dashboard"
    echo "3. Check Railway deployment logs for errors"
    echo "4. Ensure backend service is running: railway status --service backend"

    return 1
}

# Run all checks
full_check() {
    print_header "Railway Deployment Full Verification"

    local failed=0

    if ! check_cli; then
        failed=$((failed + 1))
    fi

    echo ""

    if ! check_service; then
        failed=$((failed + 1))
    fi

    echo ""

    if ! check_variables; then
        failed=$((failed + 1))
    fi

    echo ""

    if ! health_check; then
        failed=$((failed + 1))
    fi

    echo ""
    print_header "Verification Summary"

    if [ $failed -eq 0 ]; then
        print_success "All checks passed!"
        echo ""
        echo "Your Railway deployment is properly configured and healthy."
        return 0
    else
        print_error "$failed check(s) failed"
        echo ""
        echo "See errors above for details on what needs to be fixed."
        return 1
    fi
}

# Main
main() {
    local command="${1:-full-check}"

    case "$command" in
        check-cli)
            check_cli
            ;;
        check-service)
            check_service
            ;;
        check-variables)
            check_variables
            ;;
        health-check)
            health_check
            ;;
        full-check)
            full_check
            ;;
        *)
            echo "Railway Deployment Verification Script"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  check-cli         - Verify Railway CLI is installed and authenticated"
            echo "  check-service     - Check backend service status"
            echo "  check-variables   - Verify environment variables are set"
            echo "  health-check      - Test the health endpoint"
            echo "  full-check        - Run all checks (default)"
            echo ""
            echo "Examples:"
            echo "  $0                # Run full verification"
            echo "  $0 health-check   # Check health endpoint only"
            exit 1
            ;;
    esac
}

main "$@"
