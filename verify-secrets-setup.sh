#!/bin/bash

# Script to verify GitHub Secrets are set up correctly
# This doesn't actually access GitHub secrets, but helps you verify locally

echo "========================================"
echo "GitHub Secrets Setup Verification"
echo "========================================"
echo ""

echo "✓ Step 1: Download Service Account Key"
echo "  - Go to: https://console.firebase.google.com/project/ai-career-os-139db/settings/serviceaccounts/adminsdk"
echo "  - Click 'Generate new private key'"
echo "  - Save the JSON file"
echo ""
read -p "Have you downloaded the service account key? (y/n): " SERVICE_ACCOUNT

echo ""
echo "✓ Step 2: Add Secrets to GitHub"
echo "  - Go to: https://github.com/cffrank/jobmatchAI/settings/secrets/actions"
echo "  - Add each of the 7 secrets listed in github-secrets-reference.txt"
echo ""
read -p "Have you added all 7 secrets to GitHub? (y/n): " GITHUB_SECRETS

echo ""
echo "========================================"
echo "Local Configuration Status"
echo "========================================"
echo ""

# Check if .env.local exists and has all required variables
if [ -f ".env.local" ]; then
    echo "✓ .env.local file exists"

    # Check each environment variable
    MISSING=0

    if grep -q "VITE_FIREBASE_API_KEY=AIzaSyAaC" .env.local; then
        echo "✓ VITE_FIREBASE_API_KEY is set"
    else
        echo "✗ VITE_FIREBASE_API_KEY is missing or incorrect"
        MISSING=1
    fi

    if grep -q "VITE_FIREBASE_AUTH_DOMAIN=ai-career-os-139db.firebaseapp.com" .env.local; then
        echo "✓ VITE_FIREBASE_AUTH_DOMAIN is set"
    else
        echo "✗ VITE_FIREBASE_AUTH_DOMAIN is missing or incorrect"
        MISSING=1
    fi

    if grep -q "VITE_FIREBASE_PROJECT_ID=ai-career-os-139db" .env.local; then
        echo "✓ VITE_FIREBASE_PROJECT_ID is set"
    else
        echo "✗ VITE_FIREBASE_PROJECT_ID is missing or incorrect"
        MISSING=1
    fi

    if grep -q "VITE_FIREBASE_STORAGE_BUCKET=ai-career-os-139db.firebasestorage.app" .env.local; then
        echo "✓ VITE_FIREBASE_STORAGE_BUCKET is set"
    else
        echo "✗ VITE_FIREBASE_STORAGE_BUCKET is missing or incorrect"
        MISSING=1
    fi

    if grep -q "VITE_FIREBASE_MESSAGING_SENDER_ID=529057497050" .env.local; then
        echo "✓ VITE_FIREBASE_MESSAGING_SENDER_ID is set"
    else
        echo "✗ VITE_FIREBASE_MESSAGING_SENDER_ID is missing or incorrect"
        MISSING=1
    fi

    if grep -q "VITE_FIREBASE_APP_ID=1:529057497050:web:69933ebef1c282bacecae3" .env.local; then
        echo "✓ VITE_FIREBASE_APP_ID is set"
    else
        echo "✗ VITE_FIREBASE_APP_ID is missing or incorrect"
        MISSING=1
    fi

    echo ""
    if [ $MISSING -eq 0 ]; then
        echo "✓ All local environment variables are configured correctly"
    else
        echo "✗ Some environment variables need to be fixed"
    fi
else
    echo "✗ .env.local file not found"
fi

echo ""
echo "========================================"
echo "Next Steps"
echo "========================================"
echo ""

if [ "$SERVICE_ACCOUNT" = "y" ] && [ "$GITHUB_SECRETS" = "y" ]; then
    echo "🎉 Great! You're ready to deploy!"
    echo ""
    echo "To deploy to production:"
    echo "  1. git add ."
    echo "  2. git commit -m 'Add Firebase integration'"
    echo "  3. git push origin main"
    echo ""
    echo "GitHub Actions will automatically:"
    echo "  - Build your app with Firebase config"
    echo "  - Deploy to Firebase Hosting"
    echo "  - Comment on your commit with the deploy URL"
    echo ""
    echo "Production URL: https://ai-career-os-139db.web.app"
else
    echo "Complete the steps above, then run this script again to verify."
    echo ""
    echo "Reference file: github-secrets-reference.txt"
    echo "Detailed guide: GITHUB_SECRETS_SETUP.md"
fi

echo ""
