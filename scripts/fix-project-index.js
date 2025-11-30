/**
 * Script to fix stale projectCode index on projects collection
 * Run this once to remove the orphaned index
 * 
 * Usage: node scripts/fix-project-index.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

async function fixProjectIndex() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }

    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('projects');

    // List current indexes
    console.log('\n📋 Current indexes on projects collection:');
    const indexes = await collection.indexes();
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Check if projectCode_1 index exists
    const hasProjectCodeIndex = indexes.some(idx => idx.name === 'projectCode_1');

    if (hasProjectCodeIndex) {
      console.log('\n🔧 Dropping stale projectCode_1 index...');
      await collection.dropIndex('projectCode_1');
      console.log('✅ Successfully dropped projectCode_1 index');
    } else {
      console.log('\n✅ No stale projectCode_1 index found');
    }

    // List updated indexes
    console.log('\n📋 Updated indexes on projects collection:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Fix complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixProjectIndex();
