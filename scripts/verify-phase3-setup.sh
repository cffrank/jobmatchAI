#!/bin/bash

#
# Phase 3 Verification Script
# Verifies that Phase 3 native git deployment is properly configured
#
# Usage: ./scripts/verify-phase3-setup.sh
#

set -e

echo ""
echo "==================================================================="
echo "  Phase 3 Setup Verification - Native Git Deployment"
echo "==================================================================="
echo ""

FAILED=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check 1: Railway CLI installed
echo "Check 1: Verifying Railway CLI..."
if command -v railway &> /dev/null; then
    VERSION=$(railway --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓${NC} Railway CLI installed: $VERSION"
else
    echo -e "${RED}✗${NC} Railway CLI not installed"
    echo "  Install: npm install -g @railway/cli"
    FAILED=1
fi
echo ""

# Check 2: Railway authentication
echo "Check 2: Checking Railway authentication..."
if [ -n "$RAILWAY_TOKEN" ]; then
    echo -e "${GREEN}✓${NC} RAILWAY_TOKEN is set in environment"
else
    echo -e "${YELLOW}⚠${NC} RAILWAY_TOKEN not in environment (OK if logged in via CLI)"
    WARNINGS=1
fi

if command -v railway &> /dev/null; then
    if railway whoami &> /dev/null; then
        USER=$(railway whoami 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓${NC} Logged in to Railway as: $USER"
    else
        echo -e "${YELLOW}⚠${NC} Not logged in to Railway CLI"
        echo "  Run: railway login"
        WARNINGS=1
    fi
fi
echo ""

# Check 3: Git repository
echo "Check 3: Verifying git repository..."
if git rev-parse --git-dir > /dev/null 2>&1; then
    REPO_URL=$(git config --get remote.origin.url || echo "unknown")
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓${NC} Git repository detected"
    echo "  Repository: $REPO_URL"
    echo "  Current branch: $CURRENT_BRANCH"

    # Check if on main branch
    if [ "$CURRENT_BRANCH" = "main" ]; then
        echo -e "${GREEN}✓${NC} On main branch"
    else
        echo -e "${YELLOW}⚠${NC} Not on main branch (currently on: $CURRENT_BRANCH)"
        WARNINGS=1
    fi
else
    echo -e "${RED}✗${NC} Not a git repository"
    FAILED=1
fi
echo ""

# Check 4: Watch patterns in railway.toml
echo "Check 4: Checking watch patterns in railway.toml..."
if [ -f "backend/railway.toml" ]; then
    echo -e "${GREEN}✓${NC} backend/railway.toml exists"

    if grep -q "watchPatterns" "backend/railway.toml"; then
        echo -e "${GREEN}✓${NC} Watch patterns configured"
        echo "  Patterns:"
        grep -A 5 "watchPatterns" "backend/railway.toml" | sed 's/^/    /'
    else
        echo -e "${YELLOW}⚠${NC} Watch patterns not found (using Railway defaults)"
        WARNINGS=1
    fi
else
    echo -e "${RED}✗${NC} backend/railway.toml not found"
    FAILED=1
fi
echo ""

# Check 5: Railway project linkage
echo "Check 5: Checking Railway project configuration..."
if command -v railway &> /dev/null && railway whoami &> /dev/null; then
    if railway status --service backend &> /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} Railway project linked"

        # Get project info
        PROJECT_INFO=$(railway status --service backend --json 2>/dev/null || echo "{}")

        if [ "$PROJECT_INFO" != "{}" ]; then
            SERVICE_NAME=$(echo "$PROJECT_INFO" | jq -r '.service.name // "backend"' 2>/dev/null || echo "backend")
            echo "  Service: $SERVICE_NAME"

            # Check for recent deployments
            DEPLOYMENT_COUNT=$(echo "$PROJECT_INFO" | jq '.deployments | length' 2>/dev/null || echo "0")
            if [ "$DEPLOYMENT_COUNT" -gt 0 ]; then
                echo -e "${GREEN}✓${NC} Recent deployments found: $DEPLOYMENT_COUNT"

                # Get most recent deployment
                LATEST_TRIGGER=$(echo "$PROJECT_INFO" | jq -r '.deployments[0].meta.repo // "unknown"' 2>/dev/null || echo "unknown")
                if [ "$LATEST_TRIGGER" != "unknown" ] && [ "$LATEST_TRIGGER" != "null" ]; then
                    echo -e "${GREEN}✓${NC} Latest deployment triggered by: $LATEST_TRIGGER"
                else
                    echo -e "${YELLOW}⚠${NC} Latest deployment trigger source unknown"
                    echo "  May be manual deployment or Railway API"
                    WARNINGS=1
                fi
            else
                echo -e "${YELLOW}⚠${NC} No recent deployments found"
                WARNINGS=1
            fi
        fi
    else
        echo -e "${YELLOW}⚠${NC} Backend service not found or not accessible"
        echo "  This is OK if you haven't linked the project yet"
        WARNINGS=1
    fi
else
    echo -e "${YELLOW}⚠${NC} Cannot check Railway project (CLI not authenticated)"
    echo "  Run: railway login"
    WARNINGS=1
fi
echo ""

# Check 6: GitHub workflow status
echo "Check 6: Checking GitHub Actions workflow configuration..."
if [ -f ".github/workflows/deploy-backend-railway.yml" ]; then
    echo -e "${BLUE}ℹ${NC} Manual deployment workflow exists"

    if grep -q "workflow_dispatch:" ".github/workflows/deploy-backend-railway.yml"; then
        echo -e "${GREEN}✓${NC} Workflow is manual-only (workflow_dispatch trigger)"
        echo "  This is GOOD - keeps it as emergency fallback"
    elif grep -q "push:" ".github/workflows/deploy-backend-railway.yml"; then
        echo -e "${YELLOW}⚠${NC} Workflow still triggers on push"
        echo "  Consider converting to manual-only (workflow_dispatch)"
        echo "  See: docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md"
        WARNINGS=1
    else
        echo -e "${BLUE}ℹ${NC} Workflow trigger configuration unclear"
    fi
else
    echo -e "${BLUE}ℹ${NC} Manual deployment workflow not found (deleted or archived)"
    echo "  This is OK if you chose to remove it"
fi
echo ""

# Check 7: PR preview workflow (should still exist)
echo "Check 7: Verifying PR preview workflow (Phase 2)..."
if [ -f ".github/workflows/deploy-pr-preview.yml" ]; then
    echo -e "${GREEN}✓${NC} PR preview workflow exists"
    echo "  Phase 2 (PR previews) will continue to work"
else
    echo -e "${YELLOW}⚠${NC} PR preview workflow not found"
    echo "  Phase 2 may not be set up yet"
    WARNINGS=1
fi
echo ""

# Check 8: Documentation files
echo "Check 8: Verifying documentation files..."
DOCS=(
    "PHASE3-IMPLEMENTATION-COMPLETE.md"
    "docs/PHASE3-QUICK-START.md"
    "docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} Found: $doc"
    else
        echo -e "${YELLOW}⚠${NC} Missing: $doc"
        WARNINGS=1
    fi
done
echo ""

# Check 9: Railway.toml configuration
echo "Check 9: Verifying railway.toml configuration..."
if [ -f "backend/railway.toml" ]; then
    # Check for required sections
    if grep -q "^\[build\]" "backend/railway.toml"; then
        echo -e "${GREEN}✓${NC} [build] section found"
    else
        echo -e "${RED}✗${NC} [build] section missing"
        FAILED=1
    fi

    if grep -q "^\[deploy\]" "backend/railway.toml"; then
        echo -e "${GREEN}✓${NC} [deploy] section found"
    else
        echo -e "${RED}✗${NC} [deploy] section missing"
        FAILED=1
    fi

    if grep -q "healthcheckPath" "backend/railway.toml"; then
        HEALTH_PATH=$(grep "healthcheckPath" "backend/railway.toml" | cut -d'"' -f2 | head -1)
        echo -e "${GREEN}✓${NC} Health check configured: $HEALTH_PATH"
    else
        echo -e "${YELLOW}⚠${NC} Health check path not configured"
        WARNINGS=1
    fi

    if grep -q "startCommand" "backend/railway.toml"; then
        START_CMD=$(grep "startCommand" "backend/railway.toml" | cut -d'"' -f2 | head -1)
        echo -e "${GREEN}✓${NC} Start command configured: $START_CMD"
    else
        echo -e "${YELLOW}⚠${NC} Start command not configured"
        WARNINGS=1
    fi
fi
echo ""

# Check 10: GitHub webhook (if Railway CLI available)
echo "Check 10: Checking GitHub integration status..."
if command -v railway &> /dev/null && railway whoami &> /dev/null; then
    # Note: Railway CLI doesn't directly expose webhook info
    # This check is informational
    echo -e "${BLUE}ℹ${NC} GitHub webhook status can be verified in Railway dashboard"
    echo "  Go to: Railway → Settings → GitHub Repo"
    echo "  Should show: Connected to cffrank/jobmatchAI"
else
    echo -e "${YELLOW}⚠${NC} Cannot check webhook status (Railway CLI not authenticated)"
    WARNINGS=1
fi
echo ""

# Summary
echo "==================================================================="
echo "  Verification Summary"
echo "==================================================================="
echo ""

if [ $FAILED -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Phase 3 is ready to use:"
    echo ""
    echo "Next steps:"
    echo "1. Link GitHub repository (if not already done):"
    echo "   - Railway dashboard → Settings → Connect GitHub Repo"
    echo "   - Select: cffrank/jobmatchAI"
    echo "   - Root directory: backend"
    echo ""
    echo "2. Test automatic deployment:"
    echo "   - Make a change to backend/src/"
    echo "   - Commit and push to main"
    echo "   - Watch Railway dashboard → Deployments"
    echo ""
    echo "3. Verify GitHub Actions NOT running:"
    echo "   - GitHub → Actions should NOT show backend deployment"
    echo ""
    echo "Documentation:"
    echo "- Quick Start: docs/PHASE3-QUICK-START.md"
    echo "- Detailed Guide: docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md"
    echo "- Implementation: PHASE3-IMPLEMENTATION-COMPLETE.md"
    echo ""
    exit 0
elif [ $FAILED -eq 0 ]; then
    echo -e "${YELLOW}⚠ Checks passed with warnings${NC}"
    echo ""
    echo "Warnings found: $WARNINGS"
    echo ""
    echo "These are non-critical issues that should be addressed:"
    echo "- Review warnings above"
    echo "- Follow suggestions to resolve"
    echo "- Re-run script to verify fixes"
    echo ""
    echo "Phase 3 can still work with warnings, but optimal setup requires addressing them."
    echo ""
    echo "See documentation:"
    echo "- Quick Start: docs/PHASE3-QUICK-START.md"
    echo "- Troubleshooting: docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some checks failed${NC}"
    echo ""
    echo "Failed checks: $FAILED"
    echo "Warnings: $WARNINGS"
    echo ""
    echo "Critical issues must be resolved before Phase 3 can work:"
    echo "- Review failing checks above"
    echo "- Follow suggestions to resolve"
    echo "- Re-run script to verify fixes"
    echo ""
    echo "Common fixes:"
    echo "1. Install Railway CLI: npm install -g @railway/cli"
    echo "2. Login to Railway: railway login"
    echo "3. Ensure backend/railway.toml exists"
    echo "4. Verify git repository is initialized"
    echo ""
    echo "See documentation:"
    echo "- Quick Start: docs/PHASE3-QUICK-START.md"
    echo "- Setup Guide: docs/PHASE3-NATIVE-GIT-DEPLOYMENT.md"
    echo "- Implementation: PHASE3-IMPLEMENTATION-COMPLETE.md"
    echo ""
    exit 1
fi
