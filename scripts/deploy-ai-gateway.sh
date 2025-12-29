#!/bin/bash
# ==============================================================================
# AI Gateway Deployment Script
# ==============================================================================
#
# This script deploys Cloudflare AI Gateway configuration to JobMatch AI workers.
# It performs pre-deployment checks, configures secrets, and validates deployment.
#
# Usage:
#   ./scripts/deploy-ai-gateway.sh [environment]
#
# Arguments:
#   environment - Target environment: development, staging, or production
#
# Prerequisites:
#   - Cloudflare AI Gateway created in dashboard
#   - wrangler CLI installed and authenticated
#   - CLOUDFLARE_ACCOUNT_ID known
#   - All tests passing
#
# See: docs/AI_GATEWAY_ROLLOUT_PLAN.md for full deployment instructions
# ==============================================================================

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# Configuration
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKERS_DIR="$PROJECT_ROOT/workers"

# Default environment
ENVIRONMENT="${1:-development}"

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
  echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
  echo "Usage: $0 [development|staging|production]"
  exit 1
fi

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}AI Gateway Deployment Script${NC}"
echo -e "${BLUE}Environment: $ENVIRONMENT${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# ==============================================================================
# Helper Functions
# ==============================================================================

log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
  if ! command -v "$1" &> /dev/null; then
    log_error "$1 is not installed or not in PATH"
    exit 1
  fi
  log_success "$1 is installed"
}

# ==============================================================================
# Pre-deployment Checks
# ==============================================================================

log_info "Running pre-deployment checks..."
echo ""

# Check required commands
log_info "Checking required tools..."
check_command "wrangler"
check_command "npm"
check_command "jq"
echo ""

# Verify wrangler authentication
log_info "Checking wrangler authentication..."
if ! wrangler whoami &> /dev/null; then
  log_error "Not authenticated with Cloudflare. Run: wrangler login"
  exit 1
fi
log_success "Wrangler is authenticated"
echo ""

# Change to workers directory
cd "$WORKERS_DIR"

# Check if package.json exists
if [[ ! -f "package.json" ]]; then
  log_error "package.json not found in $WORKERS_DIR"
  exit 1
fi

# Install dependencies
log_info "Installing dependencies..."
npm install --silent
log_success "Dependencies installed"
echo ""

# Run TypeScript type checking
log_info "Running TypeScript type checking..."
if ! npx tsc --noEmit; then
  log_error "TypeScript compilation failed"
  exit 1
fi
log_success "TypeScript compilation passed"
echo ""

# Run tests (if available)
if grep -q "\"test\"" package.json; then
  log_info "Running tests..."
  if ! npm test; then
    log_error "Tests failed"
    exit 1
  fi
  log_success "All tests passed"
  echo ""
else
  log_warning "No tests found in package.json"
  echo ""
fi

# ==============================================================================
# Gather AI Gateway Configuration
# ==============================================================================

log_info "Configuring AI Gateway secrets..."
echo ""

# Prompt for Cloudflare Account ID
echo -e "${YELLOW}Enter your Cloudflare Account ID:${NC}"
echo "(Find it at: Cloudflare Dashboard > Workers & Pages > Overview)"
read -r CLOUDFLARE_ACCOUNT_ID

if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
  log_error "Cloudflare Account ID is required"
  exit 1
fi

# Prompt for AI Gateway slug
echo ""
echo -e "${YELLOW}Enter your AI Gateway slug:${NC}"
echo "(The name you created in Cloudflare Dashboard > AI > AI Gateway)"
echo "Example: jobmatch-ai-gateway"
read -r AI_GATEWAY_SLUG

if [[ -z "$AI_GATEWAY_SLUG" ]]; then
  log_error "AI Gateway slug is required"
  exit 1
fi

echo ""
log_info "Configuration:"
log_info "  Account ID: $CLOUDFLARE_ACCOUNT_ID"
log_info "  Gateway Slug: $AI_GATEWAY_SLUG"
log_info "  Environment: $ENVIRONMENT"
echo ""

# Confirm deployment
echo -e "${YELLOW}Continue with deployment? (y/n)${NC}"
read -r CONFIRM

if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
  log_warning "Deployment cancelled"
  exit 0
fi

# ==============================================================================
# Deploy Secrets
# ==============================================================================

log_info "Deploying AI Gateway secrets to $ENVIRONMENT..."
echo ""

# Deploy CLOUDFLARE_ACCOUNT_ID
log_info "Setting CLOUDFLARE_ACCOUNT_ID..."
echo "$CLOUDFLARE_ACCOUNT_ID" | wrangler secret put CLOUDFLARE_ACCOUNT_ID --env "$ENVIRONMENT"
log_success "CLOUDFLARE_ACCOUNT_ID configured"

# Deploy AI_GATEWAY_SLUG
log_info "Setting AI_GATEWAY_SLUG..."
echo "$AI_GATEWAY_SLUG" | wrangler secret put AI_GATEWAY_SLUG --env "$ENVIRONMENT"
log_success "AI_GATEWAY_SLUG configured"

echo ""

# ==============================================================================
# Deploy Worker (to refresh configuration)
# ==============================================================================

log_info "Deploying worker to $ENVIRONMENT..."
if ! wrangler deploy --env "$ENVIRONMENT"; then
  log_error "Worker deployment failed"
  exit 1
fi
log_success "Worker deployed successfully"
echo ""

# ==============================================================================
# Verify Deployment
# ==============================================================================

log_info "Verifying AI Gateway configuration..."
echo ""

# Get worker URL
WORKER_URL=$(wrangler deployments list --env "$ENVIRONMENT" 2>/dev/null | grep -oP 'https://[^\s]+' | head -1 || echo "")

if [[ -z "$WORKER_URL" ]]; then
  log_warning "Could not determine worker URL automatically"
  log_info "Check deployment manually at: https://dash.cloudflare.com"
else
  log_info "Worker URL: $WORKER_URL"

  # Test health endpoint
  log_info "Testing health endpoint..."
  if curl -sf "$WORKER_URL/health" > /dev/null; then
    log_success "Health check passed"
  else
    log_warning "Health check failed - worker may still be initializing"
  fi
fi

echo ""

# ==============================================================================
# Post-deployment Instructions
# ==============================================================================

log_success "AI Gateway deployment complete!"
echo ""
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Next Steps:${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""
echo "1. Monitor AI Gateway dashboard:"
echo "   https://dash.cloudflare.com > AI > AI Gateway > $AI_GATEWAY_SLUG"
echo ""
echo "2. Verify caching is working:"
echo "   - Make identical OpenAI requests"
echo "   - Check cache hit rate in dashboard"
echo ""
echo "3. Monitor costs:"
echo "   - OpenAI usage should decrease by 60-80%"
echo "   - Track in OpenAI dashboard and Cloudflare analytics"
echo ""
echo "4. Test application functionality:"
echo "   - Generate resume variants"
echo "   - Analyze job compatibility"
echo "   - Parse resumes"
echo ""
echo "5. If issues occur, rollback using:"
echo "   See: docs/AI_GATEWAY_ROLLBACK.md"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
