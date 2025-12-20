#!/bin/bash

# Script to fix hardcoded credentials in all script files
# This script updates all TypeScript and JavaScript files that contain hardcoded Firebase credentials

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  Removing Hardcoded Credentials from Script Files"
echo "════════════════════════════════════════════════════════════════"
echo ""

cd /home/carl/application-tracking/jobmatch-ai

# List of files with hardcoded credentials (based on grep results)
FILES_TO_FIX=(
  "scripts/recreate-john-frank.ts"
  "scripts/analyze-john-frank-applications.js"
  "scripts/seed-chef-jobs.ts"
  "scripts/setup-alex-profile-client.ts"
  "scripts/migrate-jobs.ts"
  "scripts/migrate-test-user-data.ts"
  "scripts/cleanup-test-user-duplicates.ts"
  "scripts/delete-and-recreate-test-user.ts"
  "scripts/reset-test-user-password.ts"
  "scripts/migrate-mock-data-client.ts"
  "public/test-upload.html"
)

echo "Files to fix: ${#FILES_TO_FIX[@]}"
echo ""

for file in "${FILES_TO_FIX[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing: $file"

    # Create backup
    cp "$file" "$file.backup"

    # Remove the hardcoded API key line
    sed -i "s/AIzaSyAaC_RUJUVgJThUOe4GmAChHhd-Du9CvhU/REMOVED_HARDCODED_CREDENTIAL/g" "$file"

    echo "  ✓ Removed hardcoded credentials"
  else
    echo "  ⚠ File not found: $file"
  fi
done

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Hardcoded Credentials Removed"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  IMPORTANT: Review each modified file and update to use"
echo "    environment variables instead of hardcoded values."
echo ""
echo "Backup files created with .backup extension"
echo ""
