/**
 * Script to fix stale projectNumber_1 index on tasks collection
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixTaskIndex() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const tasksCollection = db.collection('tasks');

    // Get all indexes
    const indexes = await tasksCollection.indexes();
    console.log('\nCurrent indexes on tasks collection:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop the problematic index if it exists
    const problematicIndex = indexes.find(idx => idx.name === 'projectNumber_1');
    if (problematicIndex) {
      console.log('\nDropping stale projectNumber_1 index...');
      await tasksCollection.dropIndex('projectNumber_1');
      console.log('✅ Index dropped successfully');
    } else {
      console.log('\n✅ No projectNumber_1 index found - already clean');
    }

    // List indexes again
    const finalIndexes = await tasksCollection.indexes();
    console.log('\nFinal indexes on tasks collection:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixTaskIndex();
