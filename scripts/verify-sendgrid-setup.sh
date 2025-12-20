#!/bin/bash

# SendGrid Setup Verification Script
# This script verifies that SendGrid email integration is properly configured

set -e

echo "============================================================"
echo "SendGrid Email Integration - Setup Verification"
echo "============================================================"
echo ""

PROJECT_ID="ai-career-os-139db"
FUNCTION_NAME="sendApplicationEmail"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check functions
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}!${NC} $1"
}

check_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Track overall status
ERRORS=0
WARNINGS=0

echo "Checking prerequisites..."
echo ""

# 1. Check Firebase CLI is installed
echo -n "1. Checking Firebase CLI installation... "
if command -v firebase &> /dev/null; then
    FIREBASE_VERSION=$(firebase --version)
    check_pass "Firebase CLI installed (v$FIREBASE_VERSION)"
else
    check_fail "Firebase CLI not found"
    echo "   Install: npm install -g firebase-tools"
    ERRORS=$((ERRORS + 1))
fi

# 2. Check if logged into Firebase
echo -n "2. Checking Firebase authentication... "
if firebase projects:list --json &> /dev/null; then
    check_pass "Authenticated to Firebase"
else
    check_fail "Not authenticated to Firebase"
    echo "   Run: firebase login"
    ERRORS=$((ERRORS + 1))
fi

# 3. Check if in correct project directory
echo -n "3. Checking project directory... "
if [ -f "firebase.json" ] && [ -d "functions" ]; then
    check_pass "In correct project directory"
else
    check_fail "Not in project root directory"
    echo "   Run this script from: /home/carl/application-tracking/jobmatch-ai"
    ERRORS=$((ERRORS + 1))
fi

# 4. Check if functions directory exists
echo -n "4. Checking functions directory... "
if [ -f "functions/index.js" ]; then
    check_pass "Functions directory exists"
else
    check_fail "functions/index.js not found"
    ERRORS=$((ERRORS + 1))
fi

# 5. Check if @sendgrid/mail is installed
echo -n "5. Checking SendGrid package... "
if grep -q "@sendgrid/mail" functions/package.json; then
    SENDGRID_VERSION=$(grep "@sendgrid/mail" functions/package.json | sed 's/.*"@sendgrid\/mail": "//;s/".*//')
    check_pass "SendGrid package configured (v$SENDGRID_VERSION)"
else
    check_fail "SendGrid package not found in package.json"
    ERRORS=$((ERRORS + 1))
fi

# 6. Check if function references SENDGRID_API_KEY secret
echo -n "6. Checking function secret configuration... "
if grep -q "secrets: \['SENDGRID_API_KEY'\]" functions/index.js; then
    check_pass "Function references SENDGRID_API_KEY secret"
else
    check_fail "Function does not reference SENDGRID_API_KEY"
    ERRORS=$((ERRORS + 1))
fi

# 7. Check if Firebase secret is set
echo -n "7. Checking Firebase secret... "
if firebase functions:secrets:access SENDGRID_API_KEY --project $PROJECT_ID &> /dev/null; then
    SECRET_VALUE=$(firebase functions:secrets:access SENDGRID_API_KEY --project $PROJECT_ID 2>/dev/null)
    if [[ $SECRET_VALUE == SG.* ]]; then
        SECRET_PREFIX="${SECRET_VALUE:0:10}"
        check_pass "SENDGRID_API_KEY secret is set ($SECRET_PREFIX...)"
    else
        check_fail "SENDGRID_API_KEY exists but doesn't look like a valid SendGrid key"
        echo "   SendGrid API keys should start with 'SG.'"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    check_fail "SENDGRID_API_KEY secret not set"
    echo "   Run: firebase functions:secrets:set SENDGRID_API_KEY --project $PROJECT_ID"
    ERRORS=$((ERRORS + 1))
fi

# 8. Check if function is exported
echo -n "8. Checking function export... "
if grep -q "exports.sendApplicationEmail" functions/index.js; then
    check_pass "sendApplicationEmail function is exported"
else
    check_fail "sendApplicationEmail function not found"
    ERRORS=$((ERRORS + 1))
fi

# 9. Check validation schema
echo -n "9. Checking email validation schema... "
if grep -q "sendApplicationEmailSchema" functions/lib/validation.js; then
    check_pass "Email validation schema exists"
else
    check_fail "Email validation schema not found"
    WARNINGS=$((WARNINGS + 1))
fi

# 10. Check rate limiter integration
echo -n "10. Checking rate limiter integration... "
if grep -q "withRateLimit('sendApplicationEmail'" functions/index.js; then
    check_pass "Rate limiting configured"
else
    check_warn "Rate limiting may not be configured"
    WARNINGS=$((WARNINGS + 1))
fi

# 11. Check if function is deployed (optional)
echo -n "11. Checking function deployment status... "
DEPLOYED_FUNCTIONS=$(firebase functions:list --project $PROJECT_ID 2>/dev/null | grep $FUNCTION_NAME || true)
if [ -n "$DEPLOYED_FUNCTIONS" ]; then
    check_pass "Function is deployed"
else
    check_warn "Function not yet deployed"
    echo "   Deploy with: firebase deploy --only functions:sendApplicationEmail --project $PROJECT_ID"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "============================================================"
echo "Verification Summary"
echo "============================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your SendGrid integration is properly configured."
    echo ""
    echo "Next steps:"
    echo "1. Ensure sender email (carl.f.frank@gmail.com) is verified in SendGrid"
    echo "2. Deploy function (if not already deployed)"
    echo "3. Test email sending from the application"
    echo ""
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}✓ Setup complete with $WARNINGS warning(s)${NC}"
    echo ""
    echo "Review warnings above and address if necessary."
    echo ""
elif [ $ERRORS -eq 1 ]; then
    echo -e "${RED}✗ Setup incomplete - $ERRORS error found${NC}"
    echo ""
    echo "Fix the error above before proceeding."
    echo ""
    exit 1
else
    echo -e "${RED}✗ Setup incomplete - $ERRORS errors found${NC}"
    echo ""
    echo "Fix the errors above before proceeding."
    echo ""
    exit 1
fi

echo "Additional verification steps (manual):"
echo "----------------------------------------"
echo "1. Verify sender email in SendGrid:"
echo "   - Go to: https://app.sendgrid.com/settings/sender_auth"
echo "   - Ensure carl.f.frank@gmail.com shows 'Verified' status"
echo ""
echo "2. Test email sending:"
echo "   - Navigate to: https://ai-career-os-139db.web.app"
echo "   - Open an application and click 'Email' button"
echo "   - Send test email to carl.f.frank@gmail.com"
echo "   - Verify email is received"
echo ""
echo "3. Check SendGrid activity:"
echo "   - Go to: https://app.sendgrid.com/activity"
echo "   - Verify delivery status of sent emails"
echo ""
echo "============================================================"
echo "For detailed setup instructions, see:"
echo "  - SENDGRID_SETUP_GUIDE.md (comprehensive guide)"
echo "  - SENDGRID_QUICK_START.md (5-minute setup)"
echo "============================================================"
