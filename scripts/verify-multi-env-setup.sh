#!/bin/bash
# Verification script for multi-environment deployment setup
# This script checks that all components of the multi-env setup are in place

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
WARN=0

echo "=========================================="
echo "Multi-Environment Setup Verification"
echo "=========================================="
echo ""

# Helper functions
check_pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
    ((WARN++))
}

# Section 1: Git Branches
echo "1. Checking Git Branches..."
echo "----------------------------"

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    check_fail "Not in a git repository"
    exit 1
fi

# Check main branch exists
if git show-ref --verify --quiet refs/heads/main; then
    check_pass "main branch exists locally"
else
    check_fail "main branch does not exist locally"
fi

# Check develop branch exists
if git show-ref --verify --quiet refs/heads/develop; then
    check_pass "develop branch exists locally"
else
    check_fail "develop branch does not exist locally"
fi

# Check staging branch exists
if git show-ref --verify --quiet refs/heads/staging; then
    check_pass "staging branch exists locally"
else
    check_fail "staging branch does not exist locally"
fi

# Check remote branches
if git ls-remote --exit-code --heads origin main > /dev/null 2>&1; then
    check_pass "main branch exists on remote"
else
    check_fail "main branch does not exist on remote"
fi

if git ls-remote --exit-code --heads origin develop > /dev/null 2>&1; then
    check_pass "develop branch exists on remote"
else
    check_fail "develop branch does not exist on remote"
fi

if git ls-remote --exit-code --heads origin staging > /dev/null 2>&1; then
    check_pass "staging branch exists on remote"
else
    check_fail "staging branch does not exist on remote"
fi

echo ""

# Section 2: GitHub Actions Workflows
echo "2. Checking GitHub Actions Workflows..."
echo "----------------------------------------"

# Check workflow files exist
WORKFLOW_DIR=".github/workflows"

if [ -f "$WORKFLOW_DIR/deploy-backend-railway.yml" ]; then
    check_pass "deploy-backend-railway.yml exists"

    # Check if it supports multi-branch
    if grep -q "develop" "$WORKFLOW_DIR/deploy-backend-railway.yml"; then
        check_pass "deploy-backend-railway.yml configured for develop branch"
    else
        check_fail "deploy-backend-railway.yml not configured for develop branch"
    fi

    if grep -q "staging" "$WORKFLOW_DIR/deploy-backend-railway.yml"; then
        check_pass "deploy-backend-railway.yml configured for staging branch"
    else
        check_fail "deploy-backend-railway.yml not configured for staging branch"
    fi
else
    check_fail "deploy-backend-railway.yml does not exist"
fi

if [ -f "$WORKFLOW_DIR/test.yml" ]; then
    check_pass "test.yml exists"

    # Check if it supports develop branch
    if grep -q "develop" "$WORKFLOW_DIR/test.yml"; then
        check_pass "test.yml configured for develop branch"
    else
        check_warn "test.yml not configured for develop branch"
    fi
else
    check_fail "test.yml does not exist"
fi

if [ -f "$WORKFLOW_DIR/deploy-pr-preview.yml" ]; then
    check_pass "deploy-pr-preview.yml exists (PR previews configured)"
else
    check_warn "deploy-pr-preview.yml does not exist (PR previews not configured)"
fi

echo ""

# Section 3: Documentation
echo "3. Checking Documentation..."
echo "-----------------------------"

DOCS=(
    "docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md"
    "docs/GITHUB-ACTIONS-MULTI-ENV.md"
    "docs/BRANCH-PROTECTION-SETUP.md"
    "docs/DEPLOYMENT-WORKFLOW-EXPLAINED.md"
    "CONTRIBUTING.md"
    "README.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        check_pass "$doc exists"
    else
        check_fail "$doc does not exist"
    fi
done

echo ""

# Section 4: Environment Files
echo "4. Checking Environment Configuration..."
echo "-----------------------------------------"

if [ -f ".env.example" ]; then
    check_pass ".env.example exists"
else
    check_warn ".env.example does not exist"
fi

if [ -f "backend/.env.example" ] || [ -f "backend/.env" ]; then
    check_pass "Backend environment file template exists"
else
    check_warn "Backend environment file template does not exist"
fi

# Check .gitignore
if [ -f ".gitignore" ]; then
    if grep -q ".env" ".gitignore"; then
        check_pass ".gitignore includes .env files"
    else
        check_warn ".gitignore does not include .env files"
    fi
else
    check_warn ".gitignore does not exist"
fi

echo ""

# Section 5: Backend Structure
echo "5. Checking Backend Structure..."
echo "---------------------------------"

if [ -d "backend" ]; then
    check_pass "backend directory exists"

    if [ -f "backend/package.json" ]; then
        check_pass "backend/package.json exists"
    else
        check_fail "backend/package.json does not exist"
    fi

    if [ -d "backend/src" ]; then
        check_pass "backend/src directory exists"
    else
        check_fail "backend/src directory does not exist"
    fi

    if [ -d "backend/tests" ]; then
        check_pass "backend/tests directory exists"
    else
        check_warn "backend/tests directory does not exist"
    fi
else
    check_fail "backend directory does not exist"
fi

echo ""

# Section 6: Frontend Structure
echo "6. Checking Frontend Structure..."
echo "----------------------------------"

if [ -f "package.json" ]; then
    check_pass "Frontend package.json exists"
else
    check_fail "Frontend package.json does not exist"
fi

if [ -d "src" ]; then
    check_pass "src directory exists"
else
    check_fail "src directory does not exist"
fi

if [ -f "vite.config.ts" ]; then
    check_pass "vite.config.ts exists"
else
    check_fail "vite.config.ts does not exist"
fi

echo ""

# Section 7: Railway Configuration
echo "7. Checking Railway Configuration..."
echo "-------------------------------------"

if [ -f "railway.toml" ]; then
    check_pass "railway.toml exists"
else
    check_warn "railway.toml does not exist (optional)"
fi

# Check if Railway CLI is installed
if command -v railway &> /dev/null; then
    check_pass "Railway CLI is installed"

    # Check if logged in (this will fail if not logged in, but that's okay)
    if railway whoami &> /dev/null; then
        check_pass "Logged in to Railway CLI"
    else
        check_warn "Not logged in to Railway CLI (run 'railway login')"
    fi
else
    check_warn "Railway CLI not installed (install: npm install -g @railway/cli)"
fi

echo ""

# Section 8: GitHub Secrets
echo "8. Checking GitHub Configuration..."
echo "------------------------------------"

check_warn "Manual verification required: Check GitHub secrets"
echo "   Required secrets in GitHub repository settings:"
echo "   - RAILWAY_TOKEN"
echo "   - SUPABASE_URL"
echo "   - SUPABASE_ANON_KEY"
echo "   - SUPABASE_SERVICE_ROLE_KEY"
echo ""

check_warn "Manual verification required: Check branch protection rules"
echo "   Go to: https://github.com/cffrank/jobmatchAI/settings/branches"
echo "   Verify protection rules for: main, staging, develop"
echo ""

# Section 9: Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASS"
echo -e "${YELLOW}Warnings:${NC} $WARN"
echo -e "${RED}Failed:${NC} $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All critical checks passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up Railway environments (see docs/RAILWAY-MULTI-ENVIRONMENT-SETUP.md)"
    echo "2. Configure GitHub branch protection (see docs/BRANCH-PROTECTION-SETUP.md)"
    echo "3. Add required GitHub secrets"
    echo "4. Test deployment to each environment"
    exit 0
else
    echo -e "${RED}✗ Some critical checks failed.${NC}"
    echo "Please review the failures above and fix them before proceeding."
    exit 1
fi
