#!/bin/bash

# Development script with npm link
# This script runs the recorder in watch mode for live testing

echo "🚀 Starting @web-reel/recorder in watch mode..."
echo "📝 Changes will be automatically rebuilt"
echo ""

cd "$(dirname "$0")/../packages/recorder"

echo "✅ Running in watch mode. Press Ctrl+C to stop."
echo ""

npm run dev

