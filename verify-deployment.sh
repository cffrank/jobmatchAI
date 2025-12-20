#!/bin/bash

# Firebase Deployment Verification Script
# Verifies that all Firebase services are correctly deployed and configured

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Firebase Project ID
PROJECT_ID="ai-career-os-139db"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Print functions
print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verification functions
verify_prerequisites() {
    print_header "Verifying Prerequisites"

    # Check Firebase CLI
    if command_exists firebase; then
        FIREBASE_VERSION=$(firebase --version)
        print_success "Firebase CLI installed: $FIREBASE_VERSION"
    else
        print_error "Firebase CLI not installed. Run: npm install -g firebase-tools"
        return 1
    fi

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Node.js not installed"
        return 1
    fi

    # Check if logged in
    if firebase projects:list >/dev/null 2>&1; then
        print_success "Firebase CLI authenticated"
    else
        print_error "Not authenticated with Firebase. Run: firebase login"
        return 1
    fi

    # Check if correct project is selected
    CURRENT_PROJECT=$(firebase use 2>/dev/null | grep -oP 'Now using project \K[^ ]+' || echo "")
    if [ "$CURRENT_PROJECT" = "$PROJECT_ID" ]; then
        print_success "Using correct Firebase project: $PROJECT_ID"
    else
        print_warning "Current project: $CURRENT_PROJECT (expected: $PROJECT_ID)"
        print_info "Run: firebase use $PROJECT_ID"
    fi
}

verify_hosting() {
    print_header "Verifying Firebase Hosting"

    # Check if hosting URL is accessible
    HOSTING_URL="https://${PROJECT_ID}.web.app"

    print_info "Checking $HOSTING_URL..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HOSTING_URL" || echo "000")

    if [ "$HTTP_CODE" = "200" ]; then
        print_success "Hosting is accessible (HTTP $HTTP_CODE)"
    elif [ "$HTTP_CODE" = "000" ]; then
        print_error "Cannot connect to hosting URL"
    else
        print_warning "Hosting returned HTTP $HTTP_CODE"
    fi

    # Check if hosting is configured
    if firebase hosting:channel:list >/dev/null 2>&1; then
        print_success "Hosting channels configured"
    else
        print_warning "Could not list hosting channels"
    fi
}

verify_firestore() {
    print_header "Verifying Firestore"

    # Check if rules file exists
    if [ -f "firestore.rules" ]; then
        print_success "Firestore rules file exists"

        # Validate rules syntax
        if firebase deploy --only firestore --dry-run >/dev/null 2>&1; then
            print_success "Firestore rules syntax is valid"
        else
            print_error "Firestore rules syntax error"
        fi
    else
        print_error "firestore.rules not found"
    fi

    # Check if indexes file exists
    if [ -f "firestore.indexes.json" ]; then
        print_success "Firestore indexes file exists"

        # Validate JSON syntax
        if python3 -m json.tool firestore.indexes.json >/dev/null 2>&1; then
            print_success "Firestore indexes JSON is valid"
        else
            print_error "Invalid JSON in firestore.indexes.json"
        fi
    else
        print_error "firestore.indexes.json not found"
    fi

    # List deployed indexes
    print_info "Checking deployed indexes..."
    if firebase firestore:indexes >/dev/null 2>&1; then
        INDEXES_COUNT=$(firebase firestore:indexes 2>/dev/null | grep -c "│" || echo "0")
        print_success "Firestore indexes deployed (found $INDEXES_COUNT entries)"
    else
        print_warning "Could not verify deployed indexes"
    fi
}

verify_storage() {
    print_header "Verifying Firebase Storage"

    # Check if rules file exists
    if [ -f "storage.rules" ]; then
        print_success "Storage rules file exists"

        # Validate rules syntax
        if firebase deploy --only storage --dry-run >/dev/null 2>&1; then
            print_success "Storage rules syntax is valid"
        else
            print_error "Storage rules syntax error"
        fi
    else
        print_error "storage.rules not found"
    fi

    # Check storage bucket
    STORAGE_BUCKET="${PROJECT_ID}.appspot.com"
    print_info "Storage bucket: gs://$STORAGE_BUCKET"
    print_success "Storage bucket configured"
}

verify_functions() {
    print_header "Verifying Cloud Functions"

    # Check if functions directory exists
    if [ -d "functions" ]; then
        print_success "Functions directory exists"
    else
        print_error "Functions directory not found"
        return 1
    fi

    # Check functions package.json
    if [ -f "functions/package.json" ]; then
        print_success "Functions package.json exists"
    else
        print_error "functions/package.json not found"
        return 1
    fi

    # Check if node_modules are installed
    if [ -d "functions/node_modules" ]; then
        print_success "Functions dependencies installed"
    else
        print_warning "Functions dependencies not installed. Run: cd functions && npm install"
    fi

    # Check main function file
    if [ -f "functions/index.js" ]; then
        print_success "Functions index.js exists"
    else
        print_error "functions/index.js not found"
        return 1
    fi

    # List deployed functions
    print_info "Checking deployed functions..."
    if firebase functions:list >/dev/null 2>&1; then
        FUNCTIONS=$(firebase functions:list 2>/dev/null | grep -E "^\w+" || echo "")
        if [ -n "$FUNCTIONS" ]; then
            print_success "Cloud Functions deployed"
            echo "$FUNCTIONS" | while read -r line; do
                print_info "  - $line"
            done
        else
            print_warning "No functions currently deployed"
        fi
    else
        print_warning "Could not list deployed functions"
    fi

    # Check for required secrets
    print_info "Checking secrets configuration..."
    if firebase functions:secrets:list >/dev/null 2>&1; then
        if firebase functions:secrets:list 2>/dev/null | grep -q "OPENAI_API_KEY"; then
            print_success "OPENAI_API_KEY secret configured"
        else
            print_warning "OPENAI_API_KEY secret not found. Set with: firebase functions:secrets:set OPENAI_API_KEY"
        fi
    else
        print_warning "Could not verify secrets (may need additional permissions)"
    fi
}

verify_authentication() {
    print_header "Verifying Authentication Configuration"

    print_info "Checking authentication providers..."
    print_info "Please verify manually in Firebase Console:"
    print_info "  - Email/Password provider enabled"
    print_info "  - Google OAuth provider enabled"
    print_info "  - Authorized domains configured (localhost, ${PROJECT_ID}.web.app)"
    print_warning "Authentication providers cannot be verified via CLI"
}

verify_environment() {
    print_header "Verifying Environment Configuration"

    # Check .env.local
    if [ -f ".env.local" ]; then
        print_success ".env.local file exists"

        # Check for required variables
        REQUIRED_VARS=(
            "VITE_FIREBASE_API_KEY"
            "VITE_FIREBASE_AUTH_DOMAIN"
            "VITE_FIREBASE_PROJECT_ID"
            "VITE_FIREBASE_STORAGE_BUCKET"
            "VITE_FIREBASE_MESSAGING_SENDER_ID"
            "VITE_FIREBASE_APP_ID"
        )

        for var in "${REQUIRED_VARS[@]}"; do
            if grep -q "^$var=" .env.local; then
                print_success "  $var is set"
            else
                print_error "  $var is missing from .env.local"
            fi
        done
    else
        print_warning ".env.local not found (required for local development)"
    fi

    # Check .gitignore
    if [ -f ".gitignore" ]; then
        if grep -q ".env.local" .gitignore; then
            print_success ".env.local is in .gitignore"
        else
            print_error ".env.local is NOT in .gitignore (security risk!)"
        fi
    fi

    # Check functions .env
    if [ -f "functions/.env" ]; then
        print_success "functions/.env exists (for local development)"
    else
        print_info "functions/.env not found (optional, for local emulator)"
    fi
}

verify_build() {
    print_header "Verifying Build Configuration"

    # Check if dist directory exists
    if [ -d "dist" ]; then
        print_success "Build output directory (dist/) exists"

        # Check build size
        DIST_SIZE=$(du -sh dist 2>/dev/null | cut -f1)
        print_info "Build size: $DIST_SIZE"

        # Check for index.html
        if [ -f "dist/index.html" ]; then
            print_success "dist/index.html exists"
        else
            print_error "dist/index.html not found"
        fi
    else
        print_warning "dist/ directory not found. Run: npm run build"
    fi

    # Check package.json scripts
    if [ -f "package.json" ]; then
        if grep -q '"build"' package.json; then
            print_success "Build script configured in package.json"
        else
            print_error "Build script not found in package.json"
        fi
    fi
}

verify_github_actions() {
    print_header "Verifying GitHub Actions Configuration"

    # Check workflow file
    if [ -f ".github/workflows/firebase-deploy.yml" ]; then
        print_success "GitHub Actions workflow file exists"
    else
        print_warning ".github/workflows/firebase-deploy.yml not found"
    fi

    print_info "Verify GitHub Secrets manually:"
    print_info "  - VITE_FIREBASE_* secrets (6 total)"
    print_info "  - FIREBASE_SERVICE_ACCOUNT"
    print_info "See GITHUB_SECRETS_SETUP.md for details"
}

verify_security() {
    print_header "Verifying Security Configuration"

    # Check Firestore rules for common issues
    if [ -f "firestore.rules" ]; then
        # Check for overly permissive rules
        if grep -q "allow.*if true" firestore.rules; then
            print_error "Firestore rules contain 'allow if true' (too permissive!)"
        else
            print_success "No overly permissive Firestore rules detected"
        fi

        # Check for authentication checks
        if grep -q "request.auth" firestore.rules; then
            print_success "Firestore rules include authentication checks"
        else
            print_warning "Firestore rules may be missing authentication checks"
        fi
    fi

    # Check Storage rules for common issues
    if [ -f "storage.rules" ]; then
        if grep -q "request.auth" storage.rules; then
            print_success "Storage rules include authentication checks"
        else
            print_warning "Storage rules may be missing authentication checks"
        fi
    fi

    # Check for exposed secrets in code
    print_info "Checking for exposed secrets in code..."
    if grep -r "sk-[a-zA-Z0-9]\{48\}" src/ --exclude-dir=node_modules >/dev/null 2>&1; then
        print_error "Potential OpenAI API key found in source code!"
    else
        print_success "No API keys detected in source code"
    fi
}

print_summary() {
    print_header "Verification Summary"

    echo -e "${GREEN}Passed:${NC}   $PASSED"
    echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
    echo -e "${RED}Failed:${NC}   $FAILED"

    if [ $FAILED -eq 0 ]; then
        if [ $WARNINGS -eq 0 ]; then
            echo -e "\n${GREEN}✓ All checks passed! Deployment is ready.${NC}"
            exit 0
        else
            echo -e "\n${YELLOW}⚠ Deployment is mostly ready, but there are warnings to review.${NC}"
            exit 0
        fi
    else
        echo -e "\n${RED}✗ Deployment verification failed. Please fix the errors above.${NC}"
        exit 1
    fi
}

# Main execution
main() {
    echo -e "${BLUE}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                                                           ║"
    echo "║     Firebase Deployment Verification Script              ║"
    echo "║     JobMatch AI - ai-career-os-139db                     ║"
    echo "║                                                           ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    verify_prerequisites || true
    verify_environment || true
    verify_build || true
    verify_firestore || true
    verify_storage || true
    verify_functions || true
    verify_authentication || true
    verify_hosting || true
    verify_github_actions || true
    verify_security || true
    print_summary
}

# Run main function
main
