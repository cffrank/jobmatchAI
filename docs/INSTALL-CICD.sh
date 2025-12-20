#!/bin/bash

# CI/CD Pipeline Installation Script for JobMatch AI
# This script helps set up the GitHub Actions workflows

set -e

echo "=========================================="
echo "JobMatch AI - CI/CD Pipeline Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found package.json"

# Check if .github/workflows directory exists
if [ ! -d ".github/workflows" ]; then
    echo "Creating .github/workflows directory..."
    mkdir -p .github/workflows
    echo -e "${GREEN}✓${NC} Created .github/workflows directory"
else
    echo -e "${GREEN}✓${NC} .github/workflows directory exists"
fi

# Copy workflow files from docs/workflows to .github/workflows
echo ""
echo "Installing workflow files..."

if [ -f "docs/workflows/ci.yml" ]; then
    cp docs/workflows/ci.yml .github/workflows/ci.yml
    echo -e "${GREEN}✓${NC} Installed ci.yml"
else
    echo -e "${RED}✗${NC} docs/workflows/ci.yml not found"
fi

if [ -f "docs/workflows/deploy.yml" ]; then
    cp docs/workflows/deploy.yml .github/workflows/deploy.yml
    echo -e "${GREEN}✓${NC} Installed deploy.yml"
else
    echo -e "${RED}✗${NC} docs/workflows/deploy.yml not found"
fi

if [ -f "docs/workflows/security-scan.yml" ]; then
    cp docs/workflows/security-scan.yml .github/workflows/security-scan.yml
    echo -e "${GREEN}✓${NC} Installed security-scan.yml"
else
    echo -e "${RED}✗${NC} docs/workflows/security-scan.yml not found"
fi

# Remove old firebase-deploy.yml if it exists
if [ -f ".github/workflows/firebase-deploy.yml" ]; then
    echo ""
    echo -e "${YELLOW}Found old firebase-deploy.yml${NC}"
    read -p "Remove old firebase-deploy.yml? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm .github/workflows/firebase-deploy.yml
        echo -e "${GREEN}✓${NC} Removed old firebase-deploy.yml"
    fi
fi

echo ""
echo "=========================================="
echo "Workflow files installed!"
echo "=========================================="
echo ""

# Check for required secrets
echo "Checking GitHub Secrets configuration..."
echo ""
echo "Required secrets (configure in GitHub repository settings):"
echo ""
echo "Firebase Secrets:"
echo "  1. FIREBASE_SERVICE_ACCOUNT"
echo "  2. FIREBASE_PROJECT_ID"
echo "  3. FIREBASE_TOKEN"
echo ""
echo "Frontend Environment Variables:"
echo "  4. VITE_FIREBASE_API_KEY"
echo "  5. VITE_FIREBASE_AUTH_DOMAIN"
echo "  6. VITE_FIREBASE_PROJECT_ID"
echo "  7. VITE_FIREBASE_STORAGE_BUCKET"
echo "  8. VITE_FIREBASE_MESSAGING_SENDER_ID"
echo "  9. VITE_FIREBASE_APP_ID"
echo ""
echo "Third-Party API Keys:"
echo "  10. OPENAI_API_KEY"
echo "  11. SENDGRID_API_KEY"
echo ""
echo -e "${YELLOW}⚠ Configure these secrets at:${NC}"
echo "https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
echo ""

# Verify local setup
echo "Verifying local setup..."
echo ""

# Check for Firebase CLI
if command -v firebase &> /dev/null; then
    echo -e "${GREEN}✓${NC} Firebase CLI installed"
else
    echo -e "${YELLOW}⚠${NC} Firebase CLI not found"
    echo "  Install: npm install -g firebase-tools"
fi

# Check for Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -ge 20 ]; then
    echo -e "${GREEN}✓${NC} Node.js version $NODE_VERSION (>= 20 required)"
else
    echo -e "${RED}✗${NC} Node.js version $NODE_VERSION (>= 20 required)"
    echo "  Please upgrade Node.js to version 20 or higher"
fi

# Check for .env.local
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✓${NC} .env.local exists"
else
    echo -e "${YELLOW}⚠${NC} .env.local not found"
    echo "  Create .env.local for local development (see .env.example)"
fi

# Check for .env.example
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example not found"
    echo "  Creating .env.example..."
    cat > .env.example << 'EOF'
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=ai-career-os-139db
VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
VITE_FIREBASE_APP_ID=your_app_id_here

# Development
VITE_USE_EMULATORS=true
EOF
    echo -e "${GREEN}✓${NC} Created .env.example"
fi

echo ""
echo "=========================================="
echo "Next Steps"
echo "=========================================="
echo ""
echo "1. Configure GitHub Secrets:"
echo "   https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
echo ""
echo "2. Set up GitHub Branch Protection:"
echo "   https://github.com/cffrank/jobmatchAI/settings/branches"
echo "   - Protect 'main' branch"
echo "   - Require status checks to pass"
echo "   - Require pull request reviews"
echo ""
echo "3. Create GitHub Environments:"
echo "   https://github.com/cffrank/jobmatchAI/settings/environments"
echo "   - Create 'staging' environment"
echo "   - Create 'production' environment"
echo ""
echo "4. Test the pipeline:"
echo "   git checkout -b test/cicd-setup"
echo "   git add .github/workflows/"
echo "   git commit -m 'Add CI/CD pipeline'"
echo "   git push origin test/cicd-setup"
echo "   # Create PR on GitHub"
echo ""
echo "5. Review documentation:"
echo "   - docs/CI-CD-ARCHITECTURE.md"
echo "   - docs/ENVIRONMENT-SETUP.md"
echo "   - docs/DEPLOYMENT-RUNBOOK.md"
echo "   - docs/CI-CD-README.md"
echo ""
echo -e "${GREEN}Setup complete!${NC}"
echo ""
