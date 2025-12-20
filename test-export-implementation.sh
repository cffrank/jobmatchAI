#!/bin/bash

# Test Export Implementation
# Validates that all required files and dependencies are in place

set -e

echo "========================================="
echo "Testing Export Implementation"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check if file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} File exists: $1"
  else
    echo -e "${RED}✗${NC} File missing: $1"
    ERRORS=$((ERRORS + 1))
  fi
}

# Function to check if package is installed
check_package() {
  if grep -q "\"$1\":" "$2"; then
    echo -e "${GREEN}✓${NC} Package listed in $2: $1"
  else
    echo -e "${RED}✗${NC} Package missing from $2: $1"
    ERRORS=$((ERRORS + 1))
  fi
}

# Function to check if function is exported
check_export() {
  if grep -q "exports\.$1" "$2"; then
    echo -e "${GREEN}✓${NC} Function exported in $2: $1"
  else
    echo -e "${RED}✗${NC} Function not exported in $2: $1"
    ERRORS=$((ERRORS + 1))
  fi
}

# Function to check if import exists
check_import() {
  if grep -q "$1" "$2"; then
    echo -e "${GREEN}✓${NC} Import found in $2: $1"
  else
    echo -e "${RED}✗${NC} Import missing from $2: $1"
    ERRORS=$((ERRORS + 1))
  fi
}

echo "1. Checking Backend Files..."
echo "-----------------------------------"
check_file "functions/index.js"
check_file "functions/lib/pdfGenerator.js"
check_file "functions/lib/docxGenerator.js"
check_file "functions/package.json"
echo ""

echo "2. Checking Frontend Files..."
echo "-----------------------------------"
check_file "src/lib/exportApplication.ts"
check_file "src/sections/application-generator/ApplicationEditorPage.tsx"
echo ""

echo "3. Checking Backend Dependencies..."
echo "-----------------------------------"
check_package "pdfkit" "functions/package.json"
check_package "docx" "functions/package.json"
check_package "uuid" "functions/package.json"
check_package "firebase-admin" "functions/package.json"
check_package "firebase-functions" "functions/package.json"
echo ""

echo "4. Checking Cloud Function Exports..."
echo "-----------------------------------"
check_export "exportApplication" "functions/index.js"
check_export "generateApplication" "functions/index.js"
echo ""

echo "5. Checking Frontend Integration..."
echo "-----------------------------------"
check_import "exportApplication" "src/sections/application-generator/ApplicationEditorPage.tsx"
check_import "ExportError" "src/sections/application-generator/ApplicationEditorPage.tsx"
echo ""

echo "6. Checking Node Modules..."
echo "-----------------------------------"
if [ -d "functions/node_modules/pdfkit" ]; then
  echo -e "${GREEN}✓${NC} pdfkit installed in node_modules"
else
  echo -e "${YELLOW}!${NC} pdfkit not in node_modules (run: cd functions && npm install)"
fi

if [ -d "functions/node_modules/docx" ]; then
  echo -e "${GREEN}✓${NC} docx installed in node_modules"
else
  echo -e "${YELLOW}!${NC} docx not in node_modules (run: cd functions && npm install)"
fi

if [ -d "functions/node_modules/uuid" ]; then
  echo -e "${GREEN}✓${NC} uuid installed in node_modules"
else
  echo -e "${YELLOW}!${NC} uuid not in node_modules (run: cd functions && npm install)"
fi
echo ""

echo "7. Checking Code Quality..."
echo "-----------------------------------"

# Check for proper error handling in exportApplication
if grep -q "HttpsError" "functions/index.js" | grep -q "exportApplication"; then
  echo -e "${GREEN}✓${NC} Error handling implemented"
else
  echo -e "${YELLOW}!${NC} Verify error handling in exportApplication"
fi

# Check for authentication validation
if grep -q "request.auth?.uid" "functions/index.js"; then
  echo -e "${GREEN}✓${NC} Authentication validation present"
else
  echo -e "${RED}✗${NC} Missing authentication validation"
  ERRORS=$((ERRORS + 1))
fi

# Check for input validation
if grep -q "invalid-argument" "functions/index.js"; then
  echo -e "${GREEN}✓${NC} Input validation present"
else
  echo -e "${RED}✗${NC} Missing input validation"
  ERRORS=$((ERRORS + 1))
fi
echo ""

echo "8. Summary"
echo "========================================="
if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}All checks passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Deploy Cloud Functions:"
  echo "     firebase deploy --only functions:exportApplication"
  echo ""
  echo "  2. Test PDF export in the application"
  echo "  3. Test DOCX export in the application"
  echo ""
  echo "See EXPORT_IMPLEMENTATION.md for detailed documentation."
  exit 0
else
  echo -e "${RED}Found $ERRORS error(s)${NC}"
  echo ""
  echo "Please fix the errors above before deploying."
  exit 1
fi
