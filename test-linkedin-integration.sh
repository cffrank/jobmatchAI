#!/bin/bash

# LinkedIn OAuth Integration Test Script
# This script verifies that the LinkedIn integration is properly configured

set -e

echo "=========================================="
echo "LinkedIn OAuth Integration Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project ID
PROJECT_ID=$(firebase projects:list 2>/dev/null | grep "current" | awk '{print $1}')

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}✗ Firebase project not selected${NC}"
    echo "Run: firebase use <project-id>"
    exit 1
fi

echo -e "${GREEN}✓ Firebase project: $PROJECT_ID${NC}"
echo ""

# Test 1: Check if secrets are configured
echo "Test 1: Checking Firebase Secrets..."
CLIENT_ID_CHECK=$(firebase functions:secrets:access LINKEDIN_CLIENT_ID 2>&1 || true)
CLIENT_SECRET_CHECK=$(firebase functions:secrets:access LINKEDIN_CLIENT_SECRET 2>&1 || true)

if echo "$CLIENT_ID_CHECK" | grep -q "does not exist"; then
    echo -e "${RED}✗ LINKEDIN_CLIENT_ID secret not set${NC}"
    echo "Run: firebase functions:secrets:set LINKEDIN_CLIENT_ID"
    exit 1
else
    echo -e "${GREEN}✓ LINKEDIN_CLIENT_ID is configured${NC}"
fi

if echo "$CLIENT_SECRET_CHECK" | grep -q "does not exist"; then
    echo -e "${RED}✗ LINKEDIN_CLIENT_SECRET secret not set${NC}"
    echo "Run: firebase functions:secrets:set LINKEDIN_CLIENT_SECRET"
    exit 1
else
    echo -e "${GREEN}✓ LINKEDIN_CLIENT_SECRET is configured${NC}"
fi
echo ""

# Test 2: Check if functions exist
echo "Test 2: Checking Cloud Functions..."
FUNCTIONS_LIST=$(firebase functions:list 2>&1 || true)

if echo "$FUNCTIONS_LIST" | grep -q "linkedInAuth"; then
    echo -e "${GREEN}✓ linkedInAuth function deployed${NC}"
else
    echo -e "${RED}✗ linkedInAuth function not deployed${NC}"
    echo "Run: firebase deploy --only functions:linkedInAuth"
fi

if echo "$FUNCTIONS_LIST" | grep -q "linkedInCallback"; then
    echo -e "${GREEN}✓ linkedInCallback function deployed${NC}"
else
    echo -e "${RED}✗ linkedInCallback function not deployed${NC}"
    echo "Run: firebase deploy --only functions:linkedInCallback"
fi
echo ""

# Test 3: Check function code
echo "Test 3: Verifying function code..."

if grep -q "exports.linkedInAuth" functions/index.js; then
    echo -e "${GREEN}✓ linkedInAuth function exists in code${NC}"
else
    echo -e "${RED}✗ linkedInAuth function missing from code${NC}"
fi

if grep -q "exports.linkedInCallback" functions/index.js; then
    echo -e "${GREEN}✓ linkedInCallback function exists in code${NC}"
else
    echo -e "${RED}✗ linkedInCallback function missing from code${NC}"
fi
echo ""

# Test 4: Display callback URL
echo "Test 4: OAuth Callback URL..."
CALLBACK_URL="https://us-central1-${PROJECT_ID}.cloudfunctions.net/linkedInCallback"
echo "Your callback URL is:"
echo -e "${YELLOW}${CALLBACK_URL}${NC}"
echo ""
echo "Add this URL to your LinkedIn app settings:"
echo "1. Go to https://www.linkedin.com/developers/apps"
echo "2. Select your app"
echo "3. Go to 'Auth' tab"
echo "4. Add to 'Authorized redirect URLs'"
echo ""

# Test 5: Check dependencies
echo "Test 5: Checking dependencies..."

if [ -f "functions/package.json" ]; then
    if grep -q "firebase-functions" functions/package.json; then
        echo -e "${GREEN}✓ firebase-functions dependency found${NC}"
    else
        echo -e "${RED}✗ firebase-functions dependency missing${NC}"
    fi
else
    echo -e "${RED}✗ functions/package.json not found${NC}"
fi
echo ""

# Test 6: Check frontend integration
echo "Test 6: Checking frontend integration..."

EDIT_PROFILE_FORM="src/sections/profile-resume-management/components/EditProfileForm.tsx"

if [ -f "$EDIT_PROFILE_FORM" ]; then
    if grep -q "handleLinkedInImport" "$EDIT_PROFILE_FORM"; then
        echo -e "${GREEN}✓ LinkedIn import button handler exists${NC}"
    else
        echo -e "${RED}✗ LinkedIn import handler missing${NC}"
    fi

    if grep -q "linkedInAuth" "$EDIT_PROFILE_FORM"; then
        echo -e "${GREEN}✓ linkedInAuth function call exists${NC}"
    else
        echo -e "${RED}✗ linkedInAuth function call missing${NC}"
    fi
else
    echo -e "${RED}✗ EditProfileForm.tsx not found${NC}"
fi
echo ""

# Test 7: Security check
echo "Test 7: Security validation..."

if grep -q "crypto.randomBytes" functions/index.js; then
    echo -e "${GREEN}✓ CSRF protection implemented${NC}"
else
    echo -e "${YELLOW}⚠ CSRF protection may be missing${NC}"
fi

if grep -q "_oauth_states" functions/index.js; then
    echo -e "${GREEN}✓ State token validation implemented${NC}"
else
    echo -e "${YELLOW}⚠ State token validation may be missing${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Ensure all tests pass (green checkmarks)"
echo "2. Configure LinkedIn app with callback URL shown above"
echo "3. Deploy functions if not already deployed:"
echo "   firebase deploy --only functions:linkedInAuth,functions:linkedInCallback"
echo "4. Test the OAuth flow in your app"
echo ""
echo "For detailed setup instructions, see:"
echo "- LINKEDIN_QUICK_START.md (fast setup)"
echo "- LINKEDIN_SETUP.md (comprehensive guide)"
echo "- DEPLOY_LINKEDIN.md (deployment checklist)"
echo ""
echo "To view function logs:"
echo "firebase functions:log --only linkedInAuth,linkedInCallback --follow"
echo ""
