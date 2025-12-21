#!/bin/bash

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║              FRONTEND DEPLOYMENT READINESS CHECK                             ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check Railway CLI
echo "✓ Checking Railway CLI..."
if command -v railway &> /dev/null; then
    VERSION=$(railway --version)
    echo "  ✅ Railway CLI installed: $VERSION"
else
    echo "  ❌ Railway CLI not installed"
    exit 1
fi

# Check Railway config
echo "✓ Checking Railway configuration..."
if [ -f "railway.toml" ]; then
    echo "  ✅ railway.toml exists"
else
    echo "  ❌ railway.toml missing"
    exit 1
fi

# Check package.json
echo "✓ Checking package.json..."
if [ -f "package.json" ]; then
    echo "  ✅ package.json exists"
    
    if grep -q "\"serve\"" package.json; then
        echo "  ✅ serve package installed"
    else
        echo "  ❌ serve package missing"
        exit 1
    fi
    
    if grep -q "\"@supabase/supabase-js\"" package.json; then
        echo "  ✅ Supabase SDK installed"
    else
        echo "  ❌ Supabase SDK missing"
        exit 1
    fi
else
    echo "  ❌ package.json missing"
    exit 1
fi

# Check env files
echo "✓ Checking environment files..."
if [ -f ".env.local" ]; then
    echo "  ✅ .env.local exists"
else
    echo "  ⚠️  .env.local missing (development env)"
fi

if [ -f ".env.production.template" ]; then
    echo "  ✅ .env.production.template exists"
else
    echo "  ❌ .env.production.template missing"
fi

# Check Supabase client
echo "✓ Checking Supabase integration..."
if [ -f "src/lib/supabase.ts" ]; then
    echo "  ✅ src/lib/supabase.ts exists"
else
    echo "  ❌ src/lib/supabase.ts missing"
    exit 1
fi

# Check build
echo "✓ Testing build process..."
if npm run build > /tmp/build.log 2>&1; then
    echo "  ✅ Build successful"
    if [ -d "dist" ]; then
        FILES=$(find dist -type f | wc -l)
        SIZE=$(du -sh dist | cut -f1)
        echo "  ✅ dist/ created ($FILES files, $SIZE)"
    fi
else
    echo "  ❌ Build failed - check logs at /tmp/build.log"
    tail -20 /tmp/build.log
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ FRONTEND READY FOR DEPLOYMENT                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📖 Follow the deployment guide:"
echo "   ./DEPLOY_FRONTEND_NOW.md"
echo ""
echo "🚀 Quick deploy:"
echo "   1. railway login"
echo "   2. railway init"
echo "   3. railway variables set VITE_SUPABASE_URL=https://lrzhpnsykasqrousgmdh.supabase.co"
echo "   4. railway variables set VITE_SUPABASE_ANON_KEY=<your-key>"
echo "   5. railway variables set VITE_BACKEND_URL=https://placeholder.railway.app"
echo "   6. railway up"
echo ""
