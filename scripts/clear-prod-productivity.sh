#!/bin/bash
# Production Cleanup Script for Productivity Data
# Run this on the production server to clear all productivity data
# Usage: bash scripts/clear-prod-productivity.sh

echo "========================================"
echo "  Productivity Data Cleanup Script"
echo "========================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Run this script from the project root directory"
  exit 1
fi

echo "⚠️  WARNING: This will delete ALL productivity data!"
echo "   - All ProductivityData records"
echo "   - All AutoScreenCapture records"
echo "   - All MayaScreenSummary records"
echo "   - All ProductivitySession records"
echo "   - All screenshot files in public/uploads/captures/"
echo ""
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "🧹 Clearing database collections..."

node -e "
const mongoose = require('mongoose');
require('dotenv').config();

async function clearAll() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Clear ProductivityData
    try {
      const result1 = await db.collection('productivitydatas').deleteMany({});
      console.log('ProductivityData deleted:', result1.deletedCount);
    } catch (e) { console.log('productivitydatas:', e.message); }
    
    // Clear AutoScreenCapture
    try {
      const result2 = await db.collection('autoscreencaptures').deleteMany({});
      console.log('AutoScreenCapture deleted:', result2.deletedCount);
    } catch (e) { console.log('autoscreencaptures:', e.message); }
    
    // Clear MayaScreenSummary
    try {
      const result3 = await db.collection('mayascreensummaries').deleteMany({});
      console.log('MayaScreenSummary deleted:', result3.deletedCount);
    } catch (e) { console.log('mayascreensummaries:', e.message); }
    
    // Clear ProductivitySession
    try {
      const result4 = await db.collection('productivitysessions').deleteMany({});
      console.log('ProductivitySession deleted:', result4.deletedCount);
    } catch (e) { console.log('productivitysessions:', e.message); }
    
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

clearAll();
"

echo ""
echo "📁 Clearing captures folder..."

# Clear the captures folder but keep .gitkeep
if [ -d "public/uploads/captures" ]; then
  find public/uploads/captures -mindepth 1 -not -name '.gitkeep' -delete 2>/dev/null
  # Recreate empty folder structure
  mkdir -p public/uploads/captures
  touch public/uploads/captures/.gitkeep
  echo "Captures folder cleared"
else
  mkdir -p public/uploads/captures
  touch public/uploads/captures/.gitkeep
  echo "Captures folder created"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Note: Restart the application for changes to take effect."
