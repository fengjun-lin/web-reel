#!/bin/bash
# Test script to verify db:init exits properly

echo "Testing database initialization script exit behavior..."
echo ""

# Run the script with "yes" input and timeout as safety
timeout 15 bash -c 'echo "yes" | npm run db:init'

EXIT_CODE=$?

echo ""
echo "================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ SUCCESS: Script exited properly with code 0"
elif [ $EXIT_CODE -eq 124 ]; then
    echo "❌ FAILED: Script timed out (hung, did not exit)"
    exit 1
else
    echo "⚠️  Script exited with code: $EXIT_CODE"
fi
echo "================================"

