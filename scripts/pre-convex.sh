#!/bin/bash
# Clean up any .js files and build artifacts before Convex runs
# This prevents Convex from trying to compile both .ts and .js files

# Remove .js files from convex root (except _generated)
find convex -maxdepth 1 -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/_generated/*" -delete 2>/dev/null

# Remove build directories
rm -rf convex/.convex convex/out 2>/dev/null

# Remove any .js files in subdirectories (except _generated)
find convex -type f \( -name "*.js" -o -name "*.js.map" \) -not -path "*/_generated/*" -delete 2>/dev/null

echo "✓ Cleaned .js files and build artifacts before Convex"
