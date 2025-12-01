#!/usr/bin/env node
/**
 * Convert Existing Screenshots to WebP
 * 
 * This script converts all existing screenshot data in ProductivityData and ProductivitySession
 * collections from JPEG/PNG to WebP format for better compression.
 * 
 * WebP typically provides 25-35% smaller file sizes compared to JPEG at equivalent quality.
 * 
 * Usage:
 *   node scripts/convert-screenshots-to-webp.js
 *   node scripts/convert-screenshots-to-webp.js --dry-run    # Preview without making changes
 *   node scripts/convert-screenshots-to-webp.js --limit=100  # Process only 100 records
 */

const mongoose = require('mongoose');
const sharp = require('sharp');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
dotenv.config({ path: envPath });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Parse command line args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;

console.log('🔄 Screenshot to WebP Conversion Script');
console.log('========================================');
if (DRY_RUN) console.log('🔍 DRY RUN MODE - No changes will be made');
if (LIMIT) console.log(`📊 Processing limit: ${LIMIT} records`);

// Stats
const stats = {
  productivityDataProcessed: 0,
  productivityDataConverted: 0,
  productivitySessionsProcessed: 0,
  productivitySessionsConverted: 0,
  screenshotsConverted: 0,
  bytesBeforeTotal: 0,
  bytesAfterTotal: 0,
  errors: 0,
  skipped: 0
};

/**
 * Convert a single base64 image to WebP
 */
async function convertToWebP(base64Data, quality = 70) {
  if (!base64Data || typeof base64Data !== 'string') {
    return null;
  }

  // Skip if already WebP
  if (base64Data.startsWith('data:image/webp')) {
    stats.skipped++;
    return null;
  }

  try {
    // Extract raw base64 data
    let rawBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        rawBase64 = matches[2];
      }
    }

    const inputBuffer = Buffer.from(rawBase64, 'base64');
    const originalSize = inputBuffer.length;
    stats.bytesBeforeTotal += originalSize;

    // Convert to WebP
    const webpBuffer = await sharp(inputBuffer)
      .webp({
        quality,
        effort: 4,
        smartSubsample: true
      })
      .toBuffer();

    stats.bytesAfterTotal += webpBuffer.length;
    
    const webpBase64 = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    const savings = Math.round((1 - webpBuffer.length / originalSize) * 100);
    
    return {
      data: webpBase64,
      originalSize,
      newSize: webpBuffer.length,
      savings
    };
  } catch (error) {
    stats.errors++;
    console.error(`    ❌ Conversion error: ${error.message}`);
    return null;
  }
}

/**
 * Process ProductivityData collection (raw captures)
 */
async function processProductivityData(db) {
  console.log('\n📸 Processing ProductivityData collection...');
  
  const collection = db.collection('productivitydatas');
  
  // Find documents with screenshots that need conversion
  const query = {
    $or: [
      { 'screenshot.data': { $regex: '^data:image/(?!webp)' } },
      { 'screenshot.thumbnail': { $regex: '^data:image/(?!webp)' } }
    ]
  };
  
  const cursor = collection.find(query).limit(LIMIT || 0);
  let count = 0;
  
  for await (const doc of cursor) {
    count++;
    stats.productivityDataProcessed++;
    
    if (count % 50 === 0) {
      console.log(`  Processing record ${count}...`);
    }
    
    let updated = false;
    const updateFields = {};
    
    // Convert main screenshot data
    if (doc.screenshot?.data && !doc.screenshot.data.startsWith('data:image/webp')) {
      const result = await convertToWebP(doc.screenshot.data, 70);
      if (result) {
        updateFields['screenshot.data'] = result.data;
        stats.screenshotsConverted++;
        updated = true;
      }
    }
    
    // Convert thumbnail
    if (doc.screenshot?.thumbnail && !doc.screenshot.thumbnail.startsWith('data:image/webp')) {
      const result = await convertToWebP(doc.screenshot.thumbnail, 50);
      if (result) {
        updateFields['screenshot.thumbnail'] = result.data;
        updated = true;
      }
    }
    
    if (updated && !DRY_RUN) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: updateFields }
      );
      stats.productivityDataConverted++;
    } else if (updated) {
      stats.productivityDataConverted++;
    }
  }
  
  console.log(`  ✅ ProductivityData: ${stats.productivityDataConverted}/${stats.productivityDataProcessed} records converted`);
}

/**
 * Process ProductivitySession collection (aggregated sessions)
 */
async function processProductivitySessions(db) {
  console.log('\n📁 Processing ProductivitySession collection...');
  
  const collection = db.collection('productivitysessions');
  
  // Find sessions with screenshots that need conversion
  const query = {
    'screenshots.fullData': { $exists: true },
    $or: [
      { 'screenshots.fullData': { $regex: '^data:image/(?!webp)' } },
      { 'screenshots.thumbnail': { $regex: '^data:image/(?!webp)' } }
    ]
  };
  
  const cursor = collection.find(query).limit(LIMIT || 0);
  let count = 0;
  
  for await (const doc of cursor) {
    count++;
    stats.productivitySessionsProcessed++;
    
    if (count % 10 === 0) {
      console.log(`  Processing session ${count}...`);
    }
    
    if (!doc.screenshots || !Array.isArray(doc.screenshots)) continue;
    
    let sessionUpdated = false;
    const updatedScreenshots = [];
    
    for (const ss of doc.screenshots) {
      const updatedSs = { ...ss };
      
      // Convert fullData
      if (ss.fullData && !ss.fullData.startsWith('data:image/webp')) {
        const result = await convertToWebP(ss.fullData, 70);
        if (result) {
          updatedSs.fullData = result.data;
          stats.screenshotsConverted++;
          sessionUpdated = true;
        }
      }
      
      // Convert thumbnail
      if (ss.thumbnail && !ss.thumbnail.startsWith('data:image/webp')) {
        const result = await convertToWebP(ss.thumbnail, 50);
        if (result) {
          updatedSs.thumbnail = result.data;
          sessionUpdated = true;
        }
      }
      
      updatedScreenshots.push(updatedSs);
    }
    
    if (sessionUpdated && !DRY_RUN) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { screenshots: updatedScreenshots } }
      );
      stats.productivitySessionsConverted++;
    } else if (sessionUpdated) {
      stats.productivitySessionsConverted++;
    }
  }
  
  console.log(`  ✅ ProductivitySession: ${stats.productivitySessionsConverted}/${stats.productivitySessionsProcessed} sessions converted`);
}

/**
 * Main execution
 */
async function main() {
  const startTime = Date.now();
  
  try {
    console.log('\n📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const db = mongoose.connection.db;
    
    // Process both collections
    await processProductivityData(db);
    await processProductivitySessions(db);
    
    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const totalSaved = stats.bytesBeforeTotal - stats.bytesAfterTotal;
    const savedMB = (totalSaved / (1024 * 1024)).toFixed(2);
    const beforeMB = (stats.bytesBeforeTotal / (1024 * 1024)).toFixed(2);
    const afterMB = (stats.bytesAfterTotal / (1024 * 1024)).toFixed(2);
    const savingsPercent = stats.bytesBeforeTotal > 0 
      ? Math.round((totalSaved / stats.bytesBeforeTotal) * 100)
      : 0;
    
    console.log('\n========================================');
    console.log('📊 CONVERSION SUMMARY');
    console.log('========================================');
    console.log(`⏱️  Duration: ${duration} seconds`);
    console.log(`📸 Screenshots converted: ${stats.screenshotsConverted}`);
    console.log(`📁 ProductivityData: ${stats.productivityDataConverted} records`);
    console.log(`📁 ProductivitySessions: ${stats.productivitySessionsConverted} sessions`);
    console.log(`⏭️  Skipped (already WebP): ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('');
    console.log(`💾 Storage:`);
    console.log(`   Before: ${beforeMB} MB`);
    console.log(`   After:  ${afterMB} MB`);
    console.log(`   Saved:  ${savedMB} MB (${savingsPercent}% reduction)`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN - No actual changes were made');
      console.log('   Run without --dry-run to apply changes');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

main();
