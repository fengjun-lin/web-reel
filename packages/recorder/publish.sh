#!/bin/bash

# Quick publish script for @web-reel/recorder
# This script runs all checks and publishes to npm

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Publishing @web-reel/recorder to npm${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Run pre-publish checks
if [ -f "./pre-publish-check.sh" ]; then
    ./pre-publish-check.sh
else
    echo -e "${RED}Error: pre-publish-check.sh not found${NC}"
    exit 1
fi

# Get version
VERSION=$(node -p "require('./package.json').version")

# Confirm publication
echo ""
echo -e "${YELLOW}=========================================${NC}"
echo -e "${YELLOW}  Ready to publish v${VERSION}${NC}"
echo -e "${YELLOW}=========================================${NC}"
echo ""
echo "This will:"
echo "  1. Publish @web-reel/recorder@${VERSION} to npm"
echo "  2. Make it publicly available"
echo "  3. Cannot be undone (you can only deprecate)"
echo ""
read -p "Continue with publication? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Publication cancelled${NC}"
    exit 0
fi

# Publish
echo ""
echo "Publishing to npm..."
echo ""

if npm publish --access public; then
    echo ""
    echo -e "${GREEN}=========================================${NC}"
    echo -e "${GREEN}✓ Successfully published!${NC}"
    echo -e "${GREEN}=========================================${NC}"
    echo ""
    echo "Package: @web-reel/recorder@${VERSION}"
    echo "View at: https://www.npmjs.com/package/@web-reel/recorder"
    echo ""
    echo "Install with:"
    echo "  npm install @web-reel/recorder"
    echo ""
    echo "Next steps:"
    echo "  1. Create a Git tag: git tag v${VERSION}"
    echo "  2. Push the tag: git push --tags"
    echo "  3. Create a GitHub release"
    echo "  4. Update documentation"
    echo ""
else
    echo ""
    echo -e "${RED}=========================================${NC}"
    echo -e "${RED}✗ Publication failed${NC}"
    echo -e "${RED}=========================================${NC}"
    echo ""
    echo "Please check the error message above."
    echo ""
    exit 1
fi

