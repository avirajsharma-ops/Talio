#!/bin/bash

echo "🧹 Clearing Next.js cache and build files..."

# Kill any running Next.js processes
echo "🛑 Stopping Next.js server..."
lsof -ti:3000 -ti:3001 | xargs kill -9 2>/dev/null || true

# Remove .next directory
echo "🗑️  Removing .next directory..."
rm -rf .next

# Remove node_modules/.cache
echo "🗑️  Removing node_modules cache..."
rm -rf node_modules/.cache

# Clear npm cache (optional)
echo "🗑️  Clearing npm cache..."
npm cache clean --force 2>/dev/null || true

echo ""
echo "✅ Cache cleared successfully!"
echo ""
echo "🚀 Starting development server..."
npm run dev

