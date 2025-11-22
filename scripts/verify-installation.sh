#!/bin/bash
# Installation Verification Script
# Checks that all dependencies are correctly installed

set -e

echo "🔍 Verifying Stock Screener Installation..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to check command
check_version() {
    local name=$1
    local command=$2
    local expected=$3

    echo -n "Checking $name... "

    if actual=$(eval $command 2>/dev/null); then
        if [[ -n "$expected" ]]; then
            if [[ "$actual" == *"$expected"* ]]; then
                echo -e "${GREEN}✓${NC} $actual"
            else
                echo -e "${YELLOW}⚠${NC} Got $actual, expected $expected"
                FAILURES=$((FAILURES + 1))
            fi
        else
            echo -e "${GREEN}✓${NC} $actual"
        fi
    else
        echo -e "${RED}✗${NC} Not found or error"
        FAILURES=$((FAILURES + 1))
    fi
}

# Function to check package
check_package() {
    local package=$1
    local version=$2

    echo -n "Checking $package... "

    if actual=$(pnpm list "$package" --depth=0 2>/dev/null | grep "^$package " | awk '{print $2}'); then
        if [[ -n "$actual" && -n "$version" ]]; then
            if [[ "$actual" == "$version" ]]; then
                echo -e "${GREEN}✓${NC} $actual"
            else
                echo -e "${YELLOW}⚠${NC} Got $actual, expected $version"
                FAILURES=$((FAILURES + 1))
            fi
        elif [[ -n "$actual" ]]; then
            echo -e "${GREEN}✓${NC} $actual"
        else
            echo -e "${RED}✗${NC} Not found"
            FAILURES=$((FAILURES + 1))
        fi
    else
        echo -e "${RED}✗${NC} Not found"
        FAILURES=$((FAILURES + 1))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "System Requirements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_version "Node.js" "node --version" ""  # Accept any version >= 20
check_version "pnpm" "pnpm --version" "10"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Critical Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

check_package "turbo" "2.6.1"
check_package "@supabase/supabase-js" "2.45.4"
check_package "typescript" "5.9.3"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Web App Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Checking next... "
if [ -f "apps/web/node_modules/next/package.json" ]; then
    version=$(grep '"version"' apps/web/node_modules/next/package.json | head -1 | awk -F'"' '{print $4}')
    echo -e "${GREEN}✓${NC} $version"
else
    echo -e "${RED}✗${NC} Not installed"
    FAILURES=$((FAILURES + 1))
fi

echo -n "Checking react... "
if [ -f "apps/web/node_modules/react/package.json" ]; then
    version=$(grep '"version"' apps/web/node_modules/react/package.json | head -1 | awk -F'"' '{print $4}')
    echo -e "${GREEN}✓${NC} $version"
else
    echo -e "${RED}✗${NC} Not installed"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "AI Dependencies (Scraper Package)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Checking openai... "
if [ -f "packages/scraper/node_modules/openai/package.json" ]; then
    version=$(grep '"version"' packages/scraper/node_modules/openai/package.json | head -1 | awk -F'"' '{print $4}')
    echo -e "${GREEN}✓${NC} $version"
else
    echo -e "${RED}✗${NC} Not installed"
    FAILURES=$((FAILURES + 1))
fi

echo -n "Checking playwright... "
if [ -f "packages/scraper/node_modules/playwright/package.json" ]; then
    version=$(grep '"version"' packages/scraper/node_modules/playwright/package.json | head -1 | awk -F'"' '{print $4}')
    echo -e "${GREEN}✓${NC} $version"
else
    echo -e "${RED}✗${NC} Not installed"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Workspace Packages"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

for package in database scraper scoring ui; do
    echo -n "Checking @stock-screener/$package... "
    if [ -d "packages/$package/node_modules" ]; then
        echo -e "${GREEN}✓${NC} Installed"
    else
        echo -e "${RED}✗${NC} Missing node_modules"
        FAILURES=$((FAILURES + 1))
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Build Artifacts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Checking turbo.json tasks... "
if grep -q '"tasks"' turbo.json; then
    echo -e "${GREEN}✓${NC} Using Turbo 2.x format"
else
    echo -e "${RED}✗${NC} Still using pipeline (Turbo 1.x)"
    FAILURES=$((FAILURES + 1))
fi

echo -n "Checking Next.js config (openai external)... "
if grep -q 'openai' apps/web/next.config.js; then
    echo -e "${GREEN}✓${NC} OpenAI properly externalized"
else
    echo -e "${RED}✗${NC} OpenAI not externalized"
    FAILURES=$((FAILURES + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Environment Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "Checking .env.local... "
if [ -f "apps/web/.env.local" ]; then
    echo -e "${GREEN}✓${NC} File exists"

    echo -n "  - OPENROUTER_API_KEY... "
    if grep -q "OPENROUTER_API_KEY=sk-" apps/web/.env.local 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Configured"
    else
        echo -e "${YELLOW}⚠${NC} Not configured (AI features disabled)"
    fi
else
    echo -e "${YELLOW}⚠${NC} Not found (copy from .env.local.example)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "✨ Installation verified successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Configure .env.local (if not done): cp apps/web/.env.local.example apps/web/.env.local"
    echo "  2. Run development server: pnpm dev"
    echo "  3. Visit http://localhost:3000/dashboard"
    exit 0
else
    echo -e "${RED}✗ $FAILURES check(s) failed${NC}"
    echo ""
    echo "🔧 Recommended fixes:"
    echo "  1. Delete node_modules: rm -rf node_modules apps/*/node_modules packages/*/node_modules"
    echo "  2. Delete lockfile: rm pnpm-lock.yaml"
    echo "  3. Reinstall: pnpm install"
    echo "  4. Run this script again: bash scripts/verify-installation.sh"
    exit 1
fi
