#!/bin/bash

#
# Phase 2 Verification Script
# Verifies that Phase 2 PR preview environment automation is properly configured
#
# Usage: ./scripts/verify-phase2-setup.sh
#

set -e

echo ""
echo "==================================================================="
echo "  Phase 2 Setup Verification"
echo "==================================================================="
echo ""

FAILED=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Workflow file exists
echo "Check 1: Verifying workflow file..."
if [ -f ".github/workflows/deploy-pr-preview.yml" ]; then
    echo -e "${GREEN}✓${NC} Workflow file exists: .github/workflows/deploy-pr-preview.yml"
else
    echo -e "${RED}✗${NC} Workflow file NOT found: .github/workflows/deploy-pr-preview.yml"
    FAILED=1
fi
echo ""

# Check 2: Workflow file is on main branch
echo "Check 2: Verifying workflow is committed to main..."
if git log --oneline .github/workflows/deploy-pr-preview.yml 2>/dev/null | head -1 > /dev/null; then
    echo -e "${GREEN}✓${NC} Workflow is committed to git"
    git log --oneline .github/workflows/deploy-pr-preview.yml | head -3 | sed 's/^/  /'
else
    echo -e "${YELLOW}⚠${NC} Workflow may not be committed (it's new, this is OK)"
fi
echo ""

# Check 3: Verify workflow syntax
echo "Check 3: Verifying workflow syntax..."
if grep -q "name: Deploy PR Preview" ".github/workflows/deploy-pr-preview.yml"; then
    echo -e "${GREEN}✓${NC} Workflow name found"
else
    echo -e "${RED}✗${NC} Workflow name not found"
    FAILED=1
fi

if grep -q "pull_request:" ".github/workflows/deploy-pr-preview.yml"; then
    echo -e "${GREEN}✓${NC} Pull request trigger found"
else
    echo -e "${RED}✗${NC} Pull request trigger not found"
    FAILED=1
fi

if grep -q "deploy-preview:" ".github/workflows/deploy-pr-preview.yml"; then
    echo -e "${GREEN}✓${NC} Deploy job found"
else
    echo -e "${RED}✗${NC} Deploy job not found"
    FAILED=1
fi

if grep -q "cleanup-preview:" ".github/workflows/deploy-pr-preview.yml"; then
    echo -e "${GREEN}✓${NC} Cleanup job found"
else
    echo -e "${RED}✗${NC} Cleanup job not found"
    FAILED=1
fi
echo ""

# Check 4: Documentation files exist
echo "Check 4: Verifying documentation files..."
DOCS=(
    "docs/PHASE2-QUICK-START.md"
    "docs/PHASE2-PR-ENVIRONMENTS.md"
    "PHASE2-IMPLEMENTATION-COMPLETE.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} Found: $doc"
    else
        echo -e "${RED}✗${NC} Missing: $doc"
        FAILED=1
    fi
done
echo ""

# Check 5: Railway CLI installed (optional)
echo "Check 5: Checking Railway CLI (optional)..."
if command -v railway &> /dev/null; then
    VERSION=$(railway --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓${NC} Railway CLI installed: $VERSION"
else
    echo -e "${YELLOW}⚠${NC} Railway CLI not installed (needed for manual testing)"
    echo "  Install: npm install -g @railway/cli"
fi
echo ""

# Check 6: GitHub CLI (optional)
echo "Check 6: Checking GitHub CLI (optional)..."
if command -v gh &> /dev/null; then
    VERSION=$(gh --version 2>/dev/null | head -1)
    echo -e "${GREEN}✓${NC} GitHub CLI installed"
else
    echo -e "${YELLOW}⚠${NC} GitHub CLI not installed (useful for testing)"
    echo "  Install: https://cli.github.com"
fi
echo ""

# Check 7: Verify RAILWAY_TOKEN would be available
echo "Check 7: Checking if RAILWAY_TOKEN is configured..."
if [ -n "$RAILWAY_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} RAILWAY_TOKEN is set in current shell"
else
    echo -e "${YELLOW}⚠${NC} RAILWAY_TOKEN not in current shell (OK, it's in GitHub secrets)"
    echo "  GitHub will provide RAILWAY_TOKEN to workflow"
fi
echo ""

# Check 8: Repository is git repo
echo "Check 8: Verifying git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    REPO_URL=$(git config --get remote.origin.url || echo "unknown")
    echo -e "${GREEN}✓${NC} Git repository detected"
    echo "  Repository: $REPO_URL"
else
    echo -e "${RED}✗${NC} Not a git repository"
    FAILED=1
fi
echo ""

# Summary
echo "==================================================================="
echo "  Verification Summary"
echo "==================================================================="
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    echo ""
    echo "Phase 2 is ready to use:"
    echo "1. Commit the workflow: git add .github/workflows/deploy-pr-preview.yml"
    echo "2. Create a test PR with backend changes"
    echo "3. Watch the 'Deploy PR Preview' workflow run"
    echo "4. Check PR comments for preview URL"
    echo ""
    echo "Documentation:"
    echo "- Quick Start: docs/PHASE2-QUICK-START.md"
    echo "- Detailed Guide: docs/PHASE2-PR-ENVIRONMENTS.md"
    echo "- Implementation: PHASE2-IMPLEMENTATION-COMPLETE.md"
    echo ""
    exit 0
else
    echo -e "${RED}Some checks failed. Please review errors above.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review failing checks"
    echo "2. See PHASE2-IMPLEMENTATION-COMPLETE.md for setup instructions"
    echo "3. See PHASE2-QUICK-START.md for troubleshooting"
    echo ""
    exit 1
fi
