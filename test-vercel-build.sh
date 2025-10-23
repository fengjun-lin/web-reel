#!/bin/bash

# Test Vercel build locally before deploying
# This script simulates what Vercel will do during deployment

set -e

echo "========================================="
echo "Testing Vercel Build Locally"
echo "========================================="
echo ""

# Step 1: Install root dependencies
echo "Step 1: Installing root dependencies..."
npm install
echo "✓ Root dependencies installed"
echo ""

# Step 2: Install recorder package dependencies
echo "Step 2: Installing recorder package dependencies..."
cd packages/recorder
npm install
cd ../..
echo "✓ Recorder dependencies installed"
echo ""

# Step 3: Build all
echo "Step 3: Building all packages..."
npm run build:all
echo "✓ Build completed"
echo ""

# Step 4: Preview
echo "========================================="
echo "Build successful! 🎉"
echo "========================================="
echo ""
echo "To preview the build, run:"
echo "  npm run preview"
echo ""
echo "Then visit: http://localhost:4173"
echo ""

