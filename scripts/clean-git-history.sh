#!/bin/bash

# Git History Cleaning Script
# CRITICAL: This script removes sensitive files from git history
# WARNING: This rewrites git history and requires force push

set -e

echo "════════════════════════════════════════════════════════════════"
echo "  Git History Cleaning - Removing Exposed Credentials"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  WARNING: This script will rewrite git history!"
echo "⚠️  All commits will get new SHA hashes."
echo "⚠️  Force push will be required."
echo ""
echo "Before proceeding, ensure:"
echo "  1. You have notified all team members"
echo "  2. You have a backup of the repository"
echo "  3. All credentials have been rotated"
echo "  4. CI/CD pipelines are paused"
echo ""
read -p "Continue? (type 'yes' to proceed): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Creating backup..."
BACKUP_DIR="/tmp/jobmatch-ai-backup-$(date +%Y%m%d-%H%M%S)"
cp -r /home/carl/application-tracking/jobmatch-ai "$BACKUP_DIR"
echo "✓ Backup created at: $BACKUP_DIR"

echo ""
echo "Step 2: Checking for git-filter-repo..."
if ! command -v git-filter-repo &> /dev/null; then
    if [ -f "$HOME/.local/bin/git-filter-repo" ]; then
        export PATH="$HOME/.local/bin:$PATH"
    else
        echo "❌ git-filter-repo not found. Please install it first."
        exit 1
    fi
fi
echo "✓ git-filter-repo found"

echo ""
echo "Step 3: Removing sensitive files from git history..."

cd /home/carl/application-tracking/jobmatch-ai

# Remove remote to allow git-filter-repo to run
git remote remove origin || true

# Create a file with paths to remove
cat > /tmp/paths-to-remove.txt << 'EOF'
github-secrets-reference.txt
.env.local
functions/.env.backup
EOF

# Run git-filter-repo to remove files
~/.local/bin/git-filter-repo \
    --invert-paths \
    --paths-from-file /tmp/paths-to-remove.txt \
    --force

echo "✓ Files removed from git history"

echo ""
echo "Step 4: Re-adding remote..."
git remote add origin git@github.com:cffrank/jobmatchAI.git
echo "✓ Remote added (using SSH)"

echo ""
echo "Step 5: Cleaning up sensitive files from working directory..."
rm -f github-secrets-reference.txt
rm -f .env.local
rm -f functions/.env.backup
echo "✓ Sensitive files deleted from working directory"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  Git History Cleaned Successfully"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Review changes: git log --oneline"
echo "  2. Verify sensitive files are gone: git log --all --full-history --source -- github-secrets-reference.txt"
echo "  3. When ready, force push: git push --force --all"
echo "  4. Force push tags: git push --force --tags"
echo ""
echo "⚠️  After force push, all team members must:"
echo "     git fetch origin"
echo "     git reset --hard origin/main"
echo ""
echo "Backup location: $BACKUP_DIR"
echo ""
