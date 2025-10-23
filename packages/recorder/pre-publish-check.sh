#!/bin/bash

# Pre-publish checklist script for @web-reel/recorder
# This script verifies everything is ready before publishing to npm

set -e

echo "========================================="
echo "  NPM Pre-Publish Checklist"
echo "  Package: @web-reel/recorder"
echo "========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
    else
        echo -e "${RED}✗${NC} $2"
        exit 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if we're in the right directory
echo "1. Checking directory..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}✗${NC} Not in package directory. Please cd to packages/recorder"
    exit 1
fi

PACKAGE_NAME=$(node -p "require('./package.json').name")
if [ "$PACKAGE_NAME" != "@web-reel/recorder" ]; then
    echo -e "${RED}✗${NC} Wrong package. Expected @web-reel/recorder, got $PACKAGE_NAME"
    exit 1
fi
print_status 0 "In correct directory"

# Check package.json fields
echo ""
echo "2. Checking package.json..."

VERSION=$(node -p "require('./package.json').version")
echo "   Version: $VERSION"

AUTHOR=$(node -p "require('./package.json').author")
if [ -z "$AUTHOR" ] || [ "$AUTHOR" == "undefined" ]; then
    print_status 1 "Author field is missing"
else
    print_status 0 "Author: $AUTHOR"
fi

LICENSE=$(node -p "require('./package.json').license")
print_status 0 "License: $LICENSE"

REPO=$(node -p "require('./package.json').repository.url")
if [ -z "$REPO" ] || [ "$REPO" == "undefined" ]; then
    print_status 1 "Repository URL is missing"
else
    print_status 0 "Repository configured"
fi

# Check npm login
echo ""
echo "3. Checking npm authentication..."
if npm whoami > /dev/null 2>&1; then
    NPM_USER=$(npm whoami)
    print_status 0 "Logged in as: $NPM_USER"
else
    print_status 1 "Not logged in to npm. Run: npm login"
fi

# Check if node_modules exists
echo ""
echo "4. Checking dependencies..."
if [ -d "node_modules" ]; then
    print_status 0 "Dependencies installed"
else
    print_warning "node_modules not found. Run: npm install"
fi

# Type check
echo ""
echo "5. Running type check..."
if npm run typecheck > /dev/null 2>&1; then
    print_status 0 "Type check passed"
else
    print_status 1 "Type check failed. Run: npm run typecheck"
fi

# Build the package
echo ""
echo "6. Building package..."
if npm run build > /dev/null 2>&1; then
    print_status 0 "Build successful"
else
    print_status 1 "Build failed. Run: npm run build"
fi

# Check dist folder
echo ""
echo "7. Checking build artifacts..."
if [ -d "dist" ]; then
    if [ -f "dist/index.js" ] && [ -f "dist/index.mjs" ] && [ -f "dist/index.d.ts" ]; then
        print_status 0 "All build artifacts present"
        echo "   Files:"
        ls -lh dist/ | grep -E "\.(js|mjs|ts)$" | awk '{print "   - " $9 " (" $5 ")"}'
    else
        print_status 1 "Missing build artifacts in dist/"
    fi
else
    print_status 1 "dist/ folder not found"
fi

# Check README
echo ""
echo "8. Checking documentation..."
if [ -f "README.md" ]; then
    README_SIZE=$(wc -c < README.md)
    if [ $README_SIZE -gt 100 ]; then
        print_status 0 "README.md exists ($README_SIZE bytes)"
    else
        print_warning "README.md is very short"
    fi
else
    print_status 1 "README.md not found"
fi

# Dry run
echo ""
echo "9. Running npm publish dry-run..."
if npm publish --dry-run --access public > /tmp/npm-dry-run.log 2>&1; then
    print_status 0 "Dry run successful"
    echo ""
    echo "   Package contents:"
    cat /tmp/npm-dry-run.log | grep -A 20 "Tarball Contents" | head -20
else
    print_status 1 "Dry run failed"
    cat /tmp/npm-dry-run.log
    exit 1
fi

# Check if version already published
echo ""
echo "10. Checking if version already published..."
if npm view @web-reel/recorder@$VERSION version > /dev/null 2>&1; then
    print_status 1 "Version $VERSION already published! Update version number."
else
    print_status 0 "Version $VERSION is new"
fi

# Final summary
echo ""
echo "========================================="
echo -e "${GREEN}✓ All checks passed!${NC}"
echo "========================================="
echo ""
echo "Ready to publish @web-reel/recorder@$VERSION"
echo ""
echo "To publish, run:"
echo "  npm publish --access public"
echo ""
echo "Or use the publish script:"
echo "  ./publish.sh"
echo ""

