#!/bin/bash

# =============================================================================
# Railway Environment Variables Upload Script
# =============================================================================
# Reads environment variables from a JSON file and sets them in Railway
#
# Usage:
#   ./scripts/railway-set-vars.sh development backend vars/development.json
#   ./scripts/railway-set-vars.sh staging backend vars/staging.json
#   ./scripts/railway-set-vars.sh production backend vars/production.json
#
# Arguments:
#   $1: Railway environment name (development, staging, production)
#   $2: Service name (backend, frontend)
#   $3: Path to JSON file with variables
#
# JSON Format:
#   {
#     "SUPABASE_URL": "https://...",
#     "OPENAI_API_KEY": "sk-...",
#     "NODE_ENV": "production"
#   }
#
# Requirements:
#   - Railway CLI installed (npm install -g @railway/cli)
#   - jq installed (brew install jq or apt install jq)
#   - RAILWAY_TOKEN environment variable set
# =============================================================================

set -e  # Exit on error

# Check arguments
if [ $# -ne 3 ]; then
    echo "Usage: $0 <environment> <service> <json-file>"
    echo ""
    echo "Examples:"
    echo "  $0 development backend vars/development.json"
    echo "  $0 staging backend vars/staging.json"
    echo "  $0 production backend vars/production.json"
    exit 1
fi

ENVIRONMENT=$1
SERVICE=$2
JSON_FILE=$3

# Validate JSON file exists
if [ ! -f "$JSON_FILE" ]; then
    echo "Error: JSON file not found: $JSON_FILE"
    exit 1
fi

# Check for required tools
if ! command -v railway &> /dev/null; then
    echo "Error: Railway CLI not installed"
    echo "Install: npm install -g @railway/cli"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq not installed"
    echo "Install: brew install jq (Mac) or apt install jq (Linux)"
    exit 1
fi

# Check for Railway authentication
if [ -z "$RAILWAY_TOKEN" ]; then
    echo "Error: RAILWAY_TOKEN environment variable not set"
    echo "Get token from: https://railway.app/account/tokens"
    exit 1
fi

echo "=========================================="
echo "Railway Variables Upload"
echo "=========================================="
echo "Environment: $ENVIRONMENT"
echo "Service:     $SERVICE"
echo "JSON File:   $JSON_FILE"
echo "=========================================="
echo ""

# Count variables
VAR_COUNT=$(jq 'length' "$JSON_FILE")
echo "Found $VAR_COUNT variables to set"
echo ""

# Read JSON and set each variable
COUNT=0
SUCCESS=0
FAILED=0

while IFS="=" read -r key value; do
    COUNT=$((COUNT + 1))
    echo "[$COUNT/$VAR_COUNT] Setting: $key"

    # Set variable using Railway CLI
    if railway variables --set "$key=$value" --service "$SERVICE" --environment "$ENVIRONMENT" 2>&1; then
        SUCCESS=$((SUCCESS + 1))
        echo "  ✓ Success"
    else
        FAILED=$((FAILED + 1))
        echo "  ✗ Failed"
    fi
    echo ""
done < <(jq -r 'to_entries | .[] | "\(.key)=\(.value)"' "$JSON_FILE")

echo "=========================================="
echo "Summary"
echo "=========================================="
echo "Total:   $VAR_COUNT"
echo "Success: $SUCCESS"
echo "Failed:  $FAILED"
echo "=========================================="

if [ $FAILED -gt 0 ]; then
    echo "⚠️  Some variables failed to set. Check errors above."
    exit 1
else
    echo "✓ All variables set successfully!"
    exit 0
fi
