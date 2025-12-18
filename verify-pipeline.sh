#!/bin/bash

echo "=================================="
echo "CI/CD Pipeline Verification Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        return 0
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        return 1
    fi
}

echo "1. Checking Configuration Files..."
echo "-----------------------------------"
check_file ".firebaserc"
check_file "firebase.json"
check_file ".github/workflows/firebase-deploy.yml"
check_file ".gitignore"
echo ""

echo "2. Checking Documentation..."
echo "----------------------------"
check_file "DEPLOYMENT.md"
check_file "QUICK-START.md"
check_file "CI-CD-SUMMARY.md"
check_file "README-CICD.md"
check_file ".github/SETUP-CHECKLIST.md"
echo ""

echo "3. Verifying Firebase Configuration..."
echo "---------------------------------------"
if grep -q "ai-career-os-139db" .firebaserc; then
    echo -e "${GREEN}✓${NC} Firebase project ID: ai-career-os-139db"
else
    echo -e "${RED}✗${NC} Firebase project ID not found"
fi

if grep -q '"public": "dist"' firebase.json; then
    echo -e "${GREEN}✓${NC} Build output directory: dist/"
else
    echo -e "${RED}✗${NC} Build output directory not configured"
fi

if grep -q '"destination": "/index.html"' firebase.json; then
    echo -e "${GREEN}✓${NC} SPA routing configured"
else
    echo -e "${RED}✗${NC} SPA routing not configured"
fi
echo ""

echo "4. Verifying GitHub Actions Workflow..."
echo "----------------------------------------"
if grep -q "FirebaseExtended/action-hosting-deploy@v0" .github/workflows/firebase-deploy.yml; then
    echo -e "${GREEN}✓${NC} Firebase deployment action configured"
else
    echo -e "${RED}✗${NC} Firebase deployment action not found"
fi

if grep -q "FIREBASE_SERVICE_ACCOUNT" .github/workflows/firebase-deploy.yml; then
    echo -e "${GREEN}✓${NC} Service account secret referenced"
else
    echo -e "${RED}✗${NC} Service account secret not found"
fi

if grep -q "deploy-preview" .github/workflows/firebase-deploy.yml; then
    echo -e "${GREEN}✓${NC} Preview deployment job configured"
else
    echo -e "${RED}✗${NC} Preview deployment job not found"
fi

if grep -q "deploy-production" .github/workflows/firebase-deploy.yml; then
    echo -e "${GREEN}✓${NC} Production deployment job configured"
else
    echo -e "${RED}✗${NC} Production deployment job not found"
fi
echo ""

echo "5. Checking .gitignore..."
echo "-------------------------"
if grep -q ".firebase/" .gitignore; then
    echo -e "${GREEN}✓${NC} Firebase files excluded"
else
    echo -e "${YELLOW}!${NC} Firebase files not in .gitignore"
fi

if grep -q "service-account" .gitignore; then
    echo -e "${GREEN}✓${NC} Service account keys excluded"
else
    echo -e "${RED}✗${NC} Service account keys not excluded (SECURITY RISK!)"
fi
echo ""

echo "6. Testing Build Commands..."
echo "-----------------------------"
if command -v npm &> /dev/null; then
    echo -e "${GREEN}✓${NC} npm is installed"
    
    if [ -f "package.json" ]; then
        echo -e "${GREEN}✓${NC} package.json exists"
        
        if grep -q '"lint"' package.json; then
            echo -e "${GREEN}✓${NC} npm run lint script defined"
        else
            echo -e "${YELLOW}!${NC} npm run lint script not found"
        fi
        
        if grep -q '"build"' package.json; then
            echo -e "${GREEN}✓${NC} npm run build script defined"
        else
            echo -e "${RED}✗${NC} npm run build script not found"
        fi
    else
        echo -e "${RED}✗${NC} package.json not found"
    fi
else
    echo -e "${RED}✗${NC} npm is not installed"
fi
echo ""

echo "7. Next Steps..."
echo "----------------"
echo -e "${YELLOW}TODO:${NC} Add FIREBASE_SERVICE_ACCOUNT secret to GitHub"
echo "      → https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
echo ""
echo -e "${YELLOW}TODO:${NC} Commit and push configuration files"
echo "      → git add .firebaserc firebase.json .github/"
echo "      → git commit -m 'Add Firebase CI/CD pipeline'"
echo "      → git push origin main"
echo ""
echo -e "${YELLOW}TODO:${NC} Verify deployment"
echo "      → https://github.com/cffrank/jobmatchAI/actions"
echo "      → https://ai-career-os-139db.web.app"
echo ""

echo "=================================="
echo "Verification Complete"
echo "=================================="
echo ""
echo "For detailed setup instructions, see:"
echo "  - QUICK-START.md (step-by-step guide)"
echo "  - .github/SETUP-CHECKLIST.md (interactive checklist)"
echo "  - DEPLOYMENT.md (complete documentation)"
echo ""
