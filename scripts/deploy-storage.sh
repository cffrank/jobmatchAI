#!/bin/bash

# Firebase Storage Deployment Script
# Deploys storage.rules to Firebase and verifies deployment

set -e  # Exit on error

echo "=================================================="
echo "Firebase Storage Deployment"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Install with: npm install -g firebase-tools"
    exit 1
fi

# Check if logged in to Firebase
echo -e "${BLUE}🔍 Checking Firebase authentication...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Firebase${NC}"
    echo "Run: firebase login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Check if storage.rules exists
if [ ! -f "storage.rules" ]; then
    echo -e "${RED}❌ storage.rules file not found${NC}"
    echo "Expected location: $(pwd)/storage.rules"
    exit 1
fi
echo -e "${GREEN}✅ storage.rules found${NC}"
echo ""

# Show current Firebase project
echo -e "${BLUE}📋 Current Firebase project:${NC}"
CURRENT_PROJECT=$(firebase use)
echo "$CURRENT_PROJECT"
echo ""

# Confirm deployment
echo -e "${YELLOW}⚠️  You are about to deploy storage rules to production${NC}"
echo ""
echo "This will:"
echo "  • Deploy storage.rules to Firebase Storage"
echo "  • Override existing security rules"
echo "  • Affect all users immediately"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🚀 Deploying storage rules...${NC}"
echo ""

# Deploy storage rules
if firebase deploy --only storage; then
    echo ""
    echo -e "${GREEN}✅ Storage rules deployed successfully!${NC}"
    echo ""
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi

# Show deployment info
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo ""
echo "  • Storage rules: deployed"
echo "  • Project: $CURRENT_PROJECT"
echo "  • Timestamp: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# Verify rules in console
echo -e "${BLUE}🔗 Verify in Firebase Console:${NC}"
PROJECT_ID=$(firebase use | grep -oP '(?<=\(currently using )[^)]+' || echo "unknown")
if [ "$PROJECT_ID" != "unknown" ]; then
    echo "  https://console.firebase.google.com/project/$PROJECT_ID/storage/rules"
else
    echo "  https://console.firebase.google.com/"
fi
echo ""

# Next steps
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "  1. Verify rules in Firebase Console (link above)"
echo "  2. Test file uploads in production app"
echo "  3. Monitor storage usage and errors"
echo ""
echo -e "${YELLOW}Testing commands:${NC}"
echo "  • npm run test:storage  # Run automated tests"
echo "  • firebase deploy:list  # View deployment history"
echo ""
echo "=================================================="
