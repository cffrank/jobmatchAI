#!/bin/bash

# Install pre-commit hooks to prevent secret leaks
# This script sets up Husky for Git hooks

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  Installing Pre-Commit Hooks for Secret Detection"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /home/carl/application-tracking/jobmatch-ai

# Check if Husky is already in package.json
if ! grep -q "husky" package.json; then
  echo "📦 Installing Husky..."
  npm install --save-dev husky
else
  echo "✓ Husky already in package.json"
fi

# Initialize Husky
echo "🔧 Initializing Husky..."
npx husky install

# Create .husky directory if it doesn't exist
mkdir -p .husky

# Make sure the pre-commit hook is executable
if [ -f .husky/pre-commit ]; then
  chmod +x .husky/pre-commit
  echo "✓ Pre-commit hook installed"
else
  echo "❌ Pre-commit hook file not found at .husky/pre-commit"
  echo "   Make sure the file exists before running this script"
  exit 1
fi

# Add husky install to package.json prepare script
echo "📝 Adding Husky to prepare script..."
npm pkg set scripts.prepare="husky install"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Pre-Commit Hooks Installed Successfully"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "The following checks will run before each commit:"
echo "  ✓ Forbidden file detection (.env.local, service accounts, etc.)"
echo "  ✓ Secret pattern scanning (API keys, tokens, passwords)"
echo "  ✓ Large file detection (> 10MB)"
echo ""
echo "To test the hook:"
echo "  1. Stage a file with a fake API key"
echo "  2. Try to commit - it should be blocked"
echo "  3. Remove the secret and commit successfully"
echo ""
echo "To bypass (NOT RECOMMENDED):"
echo "  git commit --no-verify"
echo ""
