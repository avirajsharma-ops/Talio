/**
 * Script to clear existing ProductivityData from the database
 * 
 * This script removes all raw productivity capture data from the database
 * while keeping the aggregated ProductivitySession data intact.
 * 
 * Run with: node scripts/clear-productivity-data.js
 * 
 * Options:
 *   --all           Clear all ProductivityData
 *   --older-than    Clear data older than X days (e.g., --older-than=30)
 *   --user=<userId> Clear data for specific user only
 *   --dry-run       Show what would be deleted without actually deleting
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  all: args.includes('--all'),
  dryRun: args.includes('--dry-run'),
  olderThan: null,
  userId: null
};

args.forEach(arg => {
  if (arg.startsWith('--older-than=')) {
    options.olderThan = parseInt(arg.split('=')[1]);
  }
  if (arg.startsWith('--user=')) {
    options.userId = arg.split('=')[1];
  }
});

// ProductivityData schema (minimal for deletion)
const ProductivityDataSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  createdAt: { type: Date, default: Date.now },
  periodStart: Date,
  periodEnd: Date,
  processed: Boolean
}, { timestamps: true });

async function main() {
  console.log('\n========================================');
  console.log('  Productivity Data Cleanup Script');
  console.log('========================================\n');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not found in .env');
    process.exit(1);
  }

  console.log('📡 Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const ProductivityData = mongoose.model('ProductivityData', ProductivityDataSchema);

  // Build query based on options
  const query = {};
  
  if (options.userId) {
    query.userId = new mongoose.Types.ObjectId(options.userId);
    console.log(`🔍 Filtering by user: ${options.userId}`);
  }

  if (options.olderThan) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - options.olderThan);
    query.createdAt = { $lt: cutoffDate };
    console.log(`🔍 Filtering data older than ${options.olderThan} days (before ${cutoffDate.toISOString()})`);
  }

  // Count matching documents
  const count = await ProductivityData.countDocuments(query);
  console.log(`\n📊 Found ${count} records matching criteria\n`);

  if (count === 0) {
    console.log('✨ No data to delete. Exiting.');
    await mongoose.disconnect();
    return;
  }

  // Get sample of data to show
  const samples = await ProductivityData.find(query)
    .sort({ createdAt: -1 })
    .limit(5)
    .select('userId createdAt periodStart periodEnd')
    .lean();

  console.log('📋 Sample records that will be deleted:');
  samples.forEach((sample, idx) => {
    console.log(`   ${idx + 1}. User: ${sample.userId}, Created: ${sample.createdAt?.toISOString()}`);
  });
  console.log('');

  if (options.dryRun) {
    console.log('🔍 DRY RUN - No data was deleted');
    console.log(`   Would have deleted ${count} records\n`);
  } else {
    // Confirm deletion
    if (!options.all && !options.olderThan && !options.userId) {
      console.log('⚠️  No filter specified. Use --all to delete all data, or specify --older-than or --user');
      console.log('   Run with --dry-run to preview what would be deleted\n');
      await mongoose.disconnect();
      return;
    }

    console.log('🗑️  Deleting records...');
    const result = await ProductivityData.deleteMany(query);
    console.log(`✅ Deleted ${result.deletedCount} records\n`);

    // Show remaining count
    const remaining = await ProductivityData.countDocuments({});
    console.log(`📊 Remaining records in database: ${remaining}\n`);
  }

  // Disconnect
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB\n');
}

main().catch(err => {
  console.error('❌ Error:', err);
  mongoose.disconnect();
  process.exit(1);
});
