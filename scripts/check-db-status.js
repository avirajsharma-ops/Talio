#!/usr/bin/env node
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function check() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected!\n');
  
  const ProductivityData = mongoose.model('ProductivityData', new mongoose.Schema({}, { strict: false }));
  const ProductivitySession = mongoose.model('ProductivitySession', new mongoose.Schema({}, { strict: false }));
  
  const dataCount = await ProductivityData.countDocuments();
  const sessionCount = await ProductivitySession.countDocuments();
  
  console.log('=== Database Status ===');
  console.log('ProductivityData count:', dataCount);
  console.log('ProductivitySession count:', sessionCount);
  
  // Get distinct user IDs with data
  const userIds = await ProductivityData.distinct('userId');
  console.log('Users with ProductivityData:', userIds.length);
  
  // Check data status distribution
  const statusCounts = await ProductivityData.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]);
  console.log('\nData by status:');
  statusCounts.forEach(s => console.log(`  ${s._id}: ${s.count}`));
  
  // Get date range of data
  const oldest = await ProductivityData.findOne().sort({ createdAt: 1 }).select('createdAt');
  const newest = await ProductivityData.findOne().sort({ createdAt: -1 }).select('createdAt');
  
  if (oldest && newest) {
    console.log('\nData date range:');
    console.log('  Oldest:', oldest.createdAt);
    console.log('  Newest:', newest.createdAt);
  }
  
  await mongoose.disconnect();
  process.exit(0);
}

check().catch(e => { 
  console.error('Error:', e.message); 
  process.exit(1); 
});
