#!/bin/bash
echo "🔒 Security Implementation Verification"
echo "========================================"
echo ""

# Check security modules exist
echo "📋 Checking security modules..."
for module in lib/rateLimiter.js lib/securityLogger.js lib/redirectValidator.js; do
  if [ -f "$module" ]; then
    echo "✅ $module exists"
  else
    echo "❌ $module NOT FOUND"
    exit 1
  fi
done

# Check syntax
echo ""
echo "📋 Checking JavaScript syntax..."
if node -c index.js 2>/dev/null; then
  echo "✅ index.js syntax valid"
else
  echo "❌ index.js has syntax errors"
  exit 1
fi

# Check imports
echo ""
echo "📋 Checking security imports..."
if grep -q "require('./lib/rateLimiter')" index.js; then
  echo "✅ rateLimiter imported"
else
  echo "❌ rateLimiter NOT imported"
  exit 1
fi

if grep -q "require('./lib/securityLogger')" index.js; then
  echo "✅ securityLogger imported"
else
  echo "❌ securityLogger NOT imported"
  exit 1
fi

if grep -q "require('./lib/redirectValidator')" index.js; then
  echo "✅ redirectValidator imported"
else
  echo "❌ redirectValidator NOT imported"
  exit 1
fi

# Check functions use security features
echo ""
echo "📋 Checking function integration..."
if grep -q "withRateLimit('generateApplication'" index.js; then
  echo "✅ generateApplication uses rate limiting"
else
  echo "⚠️  generateApplication may not use rate limiting"
fi

if grep -q "withRateLimit('linkedInAuth'" index.js; then
  echo "✅ linkedInAuth uses rate limiting"
else
  echo "⚠️  linkedInAuth may not use rate limiting"
fi

if grep -q "getSafeRedirectUrl" index.js; then
  echo "✅ Redirect validation implemented"
else
  echo "⚠️  Redirect validation may not be implemented"
fi

echo ""
echo "========================================"
echo "✅ ALL CRITICAL CHECKS PASSED"
echo ""
echo "Next steps:"
echo "1. Test locally: firebase emulators:start --only functions"
echo "2. Deploy: firebase deploy --only functions"
echo "3. Monitor logs: gcloud logging read 'jsonPayload.eventType=\"SECURITY\"'"
