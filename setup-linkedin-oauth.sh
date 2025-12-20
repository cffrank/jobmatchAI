#!/bin/bash

# LinkedIn OAuth Setup Script
# This script helps configure LinkedIn OAuth integration for JobMatch AI

set -e  # Exit on error

echo "======================================"
echo "LinkedIn OAuth Setup for JobMatch AI"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    print_error "Firebase CLI is not installed. Please install it first:"
    echo "  npm install -g firebase-tools"
    exit 1
fi

print_success "Firebase CLI is installed"

# Check if logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    print_error "Not logged in to Firebase. Please login first:"
    echo "  firebase login"
    exit 1
fi

print_success "Firebase authentication verified"

# Get Firebase project
PROJECT_ID=$(firebase projects:list | grep ai-career-os-139db | awk '{print $1}' || echo "")

if [ -z "$PROJECT_ID" ]; then
    print_error "Firebase project 'ai-career-os-139db' not found"
    echo "Available projects:"
    firebase projects:list
    exit 1
fi

print_success "Firebase project found: $PROJECT_ID"

echo ""
echo "======================================"
echo "Step 1: LinkedIn App Setup"
echo "======================================"
echo ""

print_info "Before continuing, ensure you have:"
echo "  1. Created a LinkedIn app at: https://www.linkedin.com/developers/apps"
echo "  2. Verified your app with your LinkedIn company page"
echo "  3. Added this redirect URL to your LinkedIn app:"
echo "     https://us-central1-${PROJECT_ID}.cloudfunctions.net/linkedInCallback"
echo "  4. Requested these OAuth scopes: openid, profile, email"
echo ""

read -p "Have you completed the LinkedIn app setup? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Please complete LinkedIn app setup first."
    echo "See LINKEDIN_OAUTH_SETUP.md for detailed instructions."
    exit 0
fi

echo ""
echo "======================================"
echo "Step 2: Configure Secrets"
echo "======================================"
echo ""

print_info "You'll need your LinkedIn app credentials from:"
echo "  https://www.linkedin.com/developers/apps > Your App > Auth tab"
echo ""

# Set LINKEDIN_CLIENT_ID
print_info "Setting LINKEDIN_CLIENT_ID..."
if firebase functions:secrets:access LINKEDIN_CLIENT_ID &> /dev/null; then
    print_warning "LINKEDIN_CLIENT_ID already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        firebase functions:secrets:set LINKEDIN_CLIENT_ID
    fi
else
    firebase functions:secrets:set LINKEDIN_CLIENT_ID
fi

print_success "LINKEDIN_CLIENT_ID configured"

# Set LINKEDIN_CLIENT_SECRET
print_info "Setting LINKEDIN_CLIENT_SECRET..."
if firebase functions:secrets:access LINKEDIN_CLIENT_SECRET &> /dev/null; then
    print_warning "LINKEDIN_CLIENT_SECRET already exists"
    read -p "Do you want to update it? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
    fi
else
    firebase functions:secrets:set LINKEDIN_CLIENT_SECRET
fi

print_success "LINKEDIN_CLIENT_SECRET configured"

echo ""
echo "======================================"
echo "Step 3: Configure App URL"
echo "======================================"
echo ""

print_info "Setting app URL for OAuth redirects..."
read -p "Enter your production app URL (or press Enter for default): " APP_URL

if [ -z "$APP_URL" ]; then
    APP_URL="https://${PROJECT_ID}.web.app"
fi

firebase functions:config:set app.url="$APP_URL"
print_success "App URL set to: $APP_URL"

echo ""
echo "======================================"
echo "Step 4: Deploy Cloud Functions"
echo "======================================"
echo ""

print_info "Installing function dependencies..."
cd functions
npm install
cd ..
print_success "Dependencies installed"

print_info "Deploying LinkedIn OAuth functions..."
firebase deploy --only functions:linkedInAuth,functions:linkedInCallback

print_success "Functions deployed successfully!"

echo ""
echo "======================================"
echo "Step 5: Verify Deployment"
echo "======================================"
echo ""

print_info "Checking deployed functions..."
firebase functions:list | grep -E "(linkedInAuth|linkedInCallback)" || print_error "Functions not found in deployment"

echo ""
echo "======================================"
echo "Setup Complete!"
echo "======================================"
echo ""

print_success "LinkedIn OAuth integration is configured!"
echo ""
echo "Next steps:"
echo "  1. Test the integration:"
echo "     - Navigate to: ${APP_URL}/profile/edit"
echo "     - Click 'Import from LinkedIn' button"
echo "     - Authorize the app on LinkedIn"
echo "     - Verify your profile data is imported"
echo ""
echo "  2. Monitor function logs:"
echo "     firebase functions:log --only linkedInCallback"
echo ""
echo "  3. View detailed setup documentation:"
echo "     cat LINKEDIN_OAUTH_SETUP.md"
echo ""

print_warning "Important: LinkedIn Partner API is required for work experience, education, and skills."
print_info "Standard OAuth only imports: name, email, profile photo, headline"
echo ""

print_success "Setup completed successfully!"
