#!/bin/bash

# Automated release script for @web-reel/recorder
# Usage: ./release.sh [patch|minor|major]

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version type (default: patch)
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Version type must be patch, minor, or major${NC}"
    echo "Usage: ./release.sh [patch|minor|major]"
    exit 1
fi

echo ""
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}  Release @web-reel/recorder${NC}"
echo -e "${BLUE}  Version bump: ${VERSION_TYPE}${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "Current version: ${YELLOW}v${CURRENT_VERSION}${NC}"

# Check if git working directory is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Release cancelled"
        exit 0
    fi
fi

# Run pre-release checks
echo ""
echo "Running pre-release checks..."

# Type check
echo "  → Type checking..."
npm run typecheck || { echo -e "${RED}Type check failed${NC}"; exit 1; }

# Build
echo "  → Building..."
npm run clean
npm run build || { echo -e "${RED}Build failed${NC}"; exit 1; }

echo -e "${GREEN}✓ Pre-release checks passed${NC}"

# Bump version (automatically commits and creates tag)
echo ""
echo "Bumping version..."
npm version $VERSION_TYPE -m "chore(release): v%s"

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ Version bumped to v${NEW_VERSION}${NC}"

# Publish to npm
echo ""
echo "Publishing to npm..."
npm publish --access public || {
    echo -e "${RED}Publish failed. Rolling back...${NC}"
    git tag -d "v${NEW_VERSION}"
    git reset --hard HEAD~1
    exit 1
}

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✓ Release successful!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo -e "Package: ${BLUE}@web-reel/recorder@${NEW_VERSION}${NC}"
echo -e "View at: ${BLUE}https://www.npmjs.com/package/@web-reel/recorder${NC}"
echo ""
echo "Next steps:"
echo "  1. Push to GitHub:"
echo -e "     ${YELLOW}git push && git push --tags${NC}"
echo "  2. Create GitHub release at:"
echo -e "     ${BLUE}https://github.com/fengjun-lin/web-reel/releases/new${NC}"
echo ""

