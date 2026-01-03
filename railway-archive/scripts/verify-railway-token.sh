#!/bin/bash

###############################################################################
# Railway Token Authentication Verification Script
#
# Purpose: Verify Railway CLI token authentication is properly configured
# Usage: ./scripts/verify-railway-token.sh [command]
# Commands:
#   check-token        - Verify token is set in environment
#   test-auth          - Test authentication with Railway API
#   verify-scope       - Check token scope and permissions
#   full-check         - Run all token verification checks (default)
#   help              - Show this help message
#
# Environment Variables:
#   RAILWAY_TOKEN     - Token to verify (required)
#   RAILWAY_API_TOKEN - Alternative token (if RAILWAY_TOKEN not set)
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
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

print_tip() {
    echo -e "${CYAN}→ $1${NC}"
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed"
        echo ""
        print_tip "Install with: npm install -g @railway/cli"
        return 1
    fi

    local version=$(railway --version 2>/dev/null || echo "unknown")
    print_success "Railway CLI installed (version: $version)"
    return 0
}

# Check if token is set in environment
check_token() {
    print_header "Token Environment Check"

    local token_found=0
    local active_token=""

    # Check RAILWAY_TOKEN
    if [ -n "${RAILWAY_TOKEN:-}" ]; then
        print_success "RAILWAY_TOKEN is set"
        local token_length=${#RAILWAY_TOKEN}
        print_info "Token length: $token_length characters"
        token_found=1
        active_token="RAILWAY_TOKEN"
    else
        print_warning "RAILWAY_TOKEN not set in environment"
    fi

    # Check RAILWAY_API_TOKEN
    if [ -n "${RAILWAY_API_TOKEN:-}" ]; then
        print_success "RAILWAY_API_TOKEN is set"
        local token_length=${#RAILWAY_API_TOKEN}
        print_info "Token length: $token_length characters"

        if [ $token_found -eq 0 ]; then
            active_token="RAILWAY_API_TOKEN"
        fi
        token_found=1
    else
        if [ $token_found -eq 0 ]; then
            print_warning "RAILWAY_API_TOKEN not set in environment"
        fi
    fi

    if [ $token_found -eq 0 ]; then
        echo ""
        print_error "No Railway tokens found in environment"
        echo ""
        echo "To set token temporarily:"
        print_tip "export RAILWAY_TOKEN=\"your-token-here\""
        echo ""
        echo "To test with a .env file:"
        print_tip "source .env && ./scripts/verify-railway-token.sh"
        echo ""
        echo "To check GitHub Actions secret:"
        print_tip "Go to: https://github.com/YOUR_REPO/settings/secrets/actions"
        return 1
    fi

    if [ -n "$active_token" ]; then
        echo ""
        print_info "Active token variable: $active_token"
    fi

    return 0
}

# Test authentication
test_auth() {
    print_header "Railway Authentication Test"

    if ! check_railway_cli; then
        return 1
    fi

    if ! [ -n "${RAILWAY_TOKEN:-}" ] && ! [ -n "${RAILWAY_API_TOKEN:-}" ]; then
        print_error "No token set in environment"
        return 1
    fi

    echo "Testing authentication..."
    echo ""

    # Test whoami command
    if output=$(railway whoami 2>&1); then
        print_success "Authentication successful"
        echo ""
        echo "Account Information:"
        echo "$output" | sed 's/^/  /'
        return 0
    else
        print_error "Authentication failed"
        echo ""
        echo "Error output:"
        echo "$output" | sed 's/^/  /'
        echo ""
        echo "Possible causes:"
        print_tip "1. Token is invalid or expired"
        print_tip "2. Token was revoked"
        print_tip "3. Token doesn't have required permissions"
        echo ""
        echo "Solutions:"
        print_tip "1. Create a new token: https://railway.app/dashboard → Account → Tokens"
        print_tip "2. Update environment: export RAILWAY_TOKEN=\"new-token\""
        print_tip "3. Test again: railway whoami"
        return 1
    fi
}

# Verify token scope
verify_scope() {
    print_header "Token Scope Verification"

    if ! check_railway_cli; then
        return 1
    fi

    if ! [ -n "${RAILWAY_TOKEN:-}" ] && ! [ -n "${RAILWAY_API_TOKEN:-}" ]; then
        print_error "No token set in environment"
        return 1
    fi

    echo "Checking token capabilities..."
    echo ""

    # Try to list projects (requires account access)
    if railway project list > /tmp/railway-projects.json 2>&1; then
        local project_count=$(jq 'length' /tmp/railway-projects.json 2>/dev/null || echo "unknown")
        print_success "Can access projects (found: $project_count)"
    else
        print_warning "Cannot list projects (may have limited scope)"
    fi

    # Check current environment
    if railway status > /tmp/railway-status.json 2>&1; then
        print_success "Can access current project"

        # Extract project and environment info
        local project=$(jq -r '.project.name' /tmp/railway-status.json 2>/dev/null || echo "unknown")
        local environment=$(jq -r '.environment.name' /tmp/railway-status.json 2>/dev/null || echo "unknown")

        echo ""
        print_info "Current project: $project"
        print_info "Current environment: $environment"
    else
        print_warning "Cannot access current project status"
        print_info "Make sure you're in a Railway-linked directory"
    fi

    echo ""
    print_info "Token capabilities verified"
    return 0
}

# Run all checks
full_check() {
    print_header "Railway Token Full Verification"

    local failed=0

    # Check Railway CLI
    if ! check_railway_cli; then
        failed=$((failed + 1))
    fi

    echo ""

    # Check token environment
    if ! check_token; then
        failed=$((failed + 1))
    fi

    echo ""

    # Test authentication
    if ! test_auth; then
        failed=$((failed + 1))
    fi

    echo ""

    # Verify scope
    if ! verify_scope; then
        failed=$((failed + 1))
    fi

    echo ""
    print_header "Token Verification Summary"

    if [ $failed -eq 0 ]; then
        print_success "All token checks passed!"
        echo ""
        echo "Your Railway CLI is properly authenticated and ready for deployment."
        echo ""
        echo "Next steps:"
        print_tip "1. Verify GitHub Actions secret: Settings → Secrets and variables → Actions"
        print_tip "2. Run deployment workflow: Push to main or trigger manually"
        print_tip "3. Monitor deployment: Actions tab → Deploy Backend to Railway"
        return 0
    else
        print_error "$failed check(s) failed"
        echo ""
        echo "See errors above for details on what needs to be fixed."
        echo ""
        echo "Quick troubleshooting:"
        print_tip "1. Check token is set: echo \$RAILWAY_TOKEN"
        print_tip "2. Create new token: https://railway.app/dashboard → Account → Tokens"
        print_tip "3. Test locally: export RAILWAY_TOKEN=\"...\" && railway whoami"
        return 1
    fi
}

# Show help
show_help() {
    cat << 'HELP_EOF'
Railway Token Authentication Verification Script

USAGE:
  ./scripts/verify-railway-token.sh [command]

COMMANDS:
  check-token        Verify token is set in environment
  test-auth          Test authentication with Railway API
  verify-scope       Check token scope and permissions
  full-check         Run all token verification checks (default)
  help              Show this help message

EXAMPLES:
  ./scripts/verify-railway-token.sh                    # Run full verification
  ./scripts/verify-railway-token.sh check-token        # Check if token is set
  ./scripts/verify-railway-token.sh test-auth          # Test authentication
  RAILWAY_TOKEN="abc..." ./scripts/verify-railway-token.sh  # With token

SETTING UP A TOKEN:

  1. Create token:
     - Go to https://railway.app/dashboard
     - Click your profile → Account → Tokens
     - Click "Create Token"
     - Copy the token immediately

  2. Set token locally (testing):
     export RAILWAY_TOKEN="your-token-here"

  3. Add to GitHub Actions (CI/CD):
     - Go to GitHub repo Settings
     - Secrets and variables → Actions
     - Create secret RAILWAY_TOKEN with token value

  4. Verify:
     ./scripts/verify-railway-token.sh

ENVIRONMENT VARIABLES:
  RAILWAY_TOKEN     Project-level token (recommended for JobMatch AI)
  RAILWAY_API_TOKEN Account-level token (alternative)

TOKEN PRIORITY:
  If both are set, RAILWAY_TOKEN takes precedence.
  Only set one token to avoid confusion.

TROUBLESHOOTING:
  Token not found:   Set RAILWAY_TOKEN or check .env file
  Auth failed:       Token may be invalid or expired
  Project not found: Ensure you're in backend/ directory

For more help, see:
  - docs/RAILWAY_TOKEN_SETUP.md
  - docs/RAILWAY_CLI_AUTHENTICATION.md

HELP_EOF
}

# Main
main() {
    local command="${1:-full-check}"

    case "$command" in
        check-token)
            check_token
            ;;
        test-auth)
            test_auth
            ;;
        verify-scope)
            verify_scope
            ;;
        full-check)
            full_check
            ;;
        help|-h|--help)
            show_help
            ;;
        *)
            echo "Unknown command: $command"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

main "$@"
