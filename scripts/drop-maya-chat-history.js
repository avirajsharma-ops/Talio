/**
 * Script to drop all MayaChatHistory records from the database
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function dropMayaChatHistory() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get the collection
    const db = mongoose.connection.db;
    const collection = db.collection('mayachathistories');

    // Count existing records
    const count = await collection.countDocuments();
    console.log(`📊 Found ${count} MayaChatHistory records\n`);

    if (count === 0) {
      console.log('✅ No records to delete!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Drop all records
    const result = await collection.deleteMany({});
    
    console.log(`✅ Successfully deleted ${result.deletedCount} records\n`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run the script
dropMayaChatHistory();
