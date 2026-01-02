#!/bin/bash

# Test CORS fix against Cloudflare Workers development environment

export FRONTEND_URL=https://jobmatch-ai-dev.pages.dev
export BACKEND_URL=https://jobmatch-ai-dev.carl-f-frank.workers.dev

echo "Testing CORS against:"
echo "  Frontend: $FRONTEND_URL"
echo "  Backend: $BACKEND_URL"
echo ""

npx playwright test tests/e2e/apply-now-button.spec.ts --grep "CORS headers allow Cloudflare Pages preview deployments"
