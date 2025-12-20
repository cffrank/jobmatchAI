#!/bin/bash

# LinkedIn OAuth Testing Script
# Validates the LinkedIn OAuth configuration

set -e

echo "======================================"
echo "LinkedIn OAuth Configuration Test"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}TEST${NC} $1"
}

print_pass() {
    echo -e "${GREEN}PASS${NC} $1"
}

print_fail() {
    echo -e "${RED}FAIL${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}WARN${NC} $1"
}

FAIL_COUNT=0

# Test 1: Firebase CLI installed
print_test "Checking Firebase CLI installation..."
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    print_pass "Firebase CLI installed ($FIREBASE_VERSION)"
else
    print_fail "Firebase CLI not found. Install: npm install -g firebase-tools"
    ((FAIL_COUNT++))
fi

# Test 2: Firebase authentication
print_test "Checking Firebase authentication..."
if firebase projects:list &> /dev/null; then
    print_pass "Firebase authentication valid"
else
    print_fail "Not logged in to Firebase. Run: firebase login"
    ((FAIL_COUNT++))
fi

# Test 3: Firebase project
print_test "Checking Firebase project..."
if [ -f .firebaserc ]; then
    PROJECT_ID=$(grep -oP '(?<="default": ")[^"]*' .firebaserc)
    if [ -z "$PROJECT_ID" ]; then
        print_fail "Project ID not found in .firebaserc"
        ((FAIL_COUNT++))
    else
        print_pass "Firebase project: $PROJECT_ID"
    fi
else
    print_fail ".firebaserc not found. Run: firebase init"
    ((FAIL_COUNT++))
    PROJECT_ID="unknown"
fi

# Test 4: Functions directory exists
print_test "Checking functions directory..."
if [ -d "functions" ]; then
    print_pass "Functions directory exists"
else
    print_fail "Functions directory not found"
    ((FAIL_COUNT++))
fi

# Test 5: Functions dependencies
print_test "Checking functions dependencies..."
if [ -f "functions/package.json" ]; then
    if [ -d "functions/node_modules" ]; then
        print_pass "Functions dependencies installed"
    else
        print_warn "Dependencies not installed. Run: cd functions && npm install"
    fi
else
    print_fail "functions/package.json not found"
    ((FAIL_COUNT++))
fi

# Test 6: LinkedIn secrets
print_test "Checking LINKEDIN_CLIENT_ID secret..."
if firebase functions:secrets:access LINKEDIN_CLIENT_ID &> /dev/null; then
    CLIENT_ID=$(firebase functions:secrets:access LINKEDIN_CLIENT_ID 2>&1 | tail -1)
    if [ -n "$CLIENT_ID" ] && [ "$CLIENT_ID" != "Error" ]; then
        print_pass "LINKEDIN_CLIENT_ID is set (${CLIENT_ID:0:10}...)"
    else
        print_fail "LINKEDIN_CLIENT_ID is empty or invalid"
        ((FAIL_COUNT++))
    fi
else
    print_fail "LINKEDIN_CLIENT_ID secret not found. Run: firebase functions:secrets:set LINKEDIN_CLIENT_ID"
    ((FAIL_COUNT++))
fi

print_test "Checking LINKEDIN_CLIENT_SECRET secret..."
if firebase functions:secrets:access LINKEDIN_CLIENT_SECRET &> /dev/null; then
    print_pass "LINKEDIN_CLIENT_SECRET is set"
else
    print_fail "LINKEDIN_CLIENT_SECRET secret not found. Run: firebase functions:secrets:set LINKEDIN_CLIENT_SECRET"
    ((FAIL_COUNT++))
fi

# Test 7: Functions code
print_test "Checking Cloud Functions code..."
if [ -f "functions/index.js" ]; then
    if grep -q "linkedInAuth" functions/index.js && grep -q "linkedInCallback" functions/index.js; then
        print_pass "LinkedIn OAuth functions found in code"
    else
        print_fail "LinkedIn OAuth functions not found in functions/index.js"
        ((FAIL_COUNT++))
    fi
else
    print_fail "functions/index.js not found"
    ((FAIL_COUNT++))
fi

# Test 8: Frontend component
print_test "Checking frontend component..."
PROFILE_FORM="src/sections/profile-resume-management/components/EditProfileForm.tsx"
if [ -f "$PROFILE_FORM" ]; then
    if grep -q "handleLinkedInImport" "$PROFILE_FORM" && grep -q "linkedInAuth" "$PROFILE_FORM"; then
        print_pass "LinkedIn import button found in EditProfileForm"
    else
        print_fail "LinkedIn import handler not found in EditProfileForm.tsx"
        ((FAIL_COUNT++))
    fi
else
    print_fail "EditProfileForm.tsx not found"
    ((FAIL_COUNT++))
fi

# Test 9: Firestore rules
print_test "Checking Firestore security rules..."
if [ -f "firestore.rules" ]; then
    if grep -q "_oauth_states" firestore.rules; then
        print_pass "OAuth state tokens rule found in firestore.rules"
    else
        print_fail "_oauth_states rule not found in firestore.rules"
        ((FAIL_COUNT++))
    fi

    if grep -q "notifications" firestore.rules; then
        print_pass "Notifications rule found in firestore.rules"
    else
        print_warn "Notifications rule not found in firestore.rules (will be created automatically)"
    fi
else
    print_fail "firestore.rules not found"
    ((FAIL_COUNT++))
fi

# Test 10: Deployed functions (if online)
print_test "Checking deployed functions..."
if firebase functions:list 2>&1 | grep -q "linkedInAuth"; then
    print_pass "linkedInAuth function is deployed"
else
    print_warn "linkedInAuth function not deployed. Run: firebase deploy --only functions:linkedInAuth"
fi

if firebase functions:list 2>&1 | grep -q "linkedInCallback"; then
    print_pass "linkedInCallback function is deployed"
else
    print_warn "linkedInCallback function not deployed. Run: firebase deploy --only functions:linkedInCallback"
fi

# Test 11: Configuration
print_test "Checking app URL configuration..."
APP_CONFIG=$(firebase functions:config:get 2>&1 || echo "{}")
if echo "$APP_CONFIG" | grep -q "app"; then
    APP_URL=$(echo "$APP_CONFIG" | grep -oP '(?<="url": ")[^"]*' || echo "not set")
    if [ "$APP_URL" != "not set" ]; then
        print_pass "App URL configured: $APP_URL"
    else
        print_warn "App URL not configured. Run: firebase functions:config:set app.url=\"https://$PROJECT_ID.web.app\""
    fi
else
    print_warn "App URL not configured. Run: firebase functions:config:set app.url=\"https://$PROJECT_ID.web.app\""
fi

# Summary
echo ""
echo "======================================"
echo "Test Summary"
echo "======================================"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    print_pass "All critical tests passed! ✓"
    echo ""
    echo "Next steps:"
    echo "  1. If functions not deployed, run:"
    echo "     firebase deploy --only functions:linkedInAuth,functions:linkedInCallback"
    echo ""
    echo "  2. Ensure LinkedIn app is configured:"
    echo "     - Redirect URL: https://us-central1-$PROJECT_ID.cloudfunctions.net/linkedInCallback"
    echo "     - OAuth scopes: openid, profile, email"
    echo ""
    echo "  3. Test the OAuth flow:"
    echo "     - Navigate to: https://$PROJECT_ID.web.app/profile/edit"
    echo "     - Click 'Import from LinkedIn'"
    echo "     - Authorize the app"
    echo "     - Verify profile data imports"
    echo ""
    exit 0
else
    print_fail "$FAIL_COUNT critical test(s) failed"
    echo ""
    echo "Please fix the issues above before proceeding."
    echo ""
    echo "For help, see:"
    echo "  - LINKEDIN_OAUTH_SETUP.md (detailed setup guide)"
    echo "  - LINKEDIN_OAUTH_QUICKSTART.md (quick reference)"
    echo ""
    exit 1
fi
