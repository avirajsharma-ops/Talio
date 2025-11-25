const mongoose = require('mongoose');
require('dotenv').config();

async function testMongoConnection() {
  try {
    console.log('🔧 Testing MongoDB connection...');
    console.log('📍 MongoDB URI:', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
    
    // Connect with timeout
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 seconds
      socketTimeoutMS: 45000, // 45 seconds
      maxPoolSize: 10,
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✅ Successfully connected to MongoDB');
    
    // Test database operations
    console.log('🧪 Testing database operations...');
    
    // List databases
    const admin = mongoose.connection.db.admin();
    const dbs = await admin.listDatabases();
    console.log('📋 Available databases:');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    // Test current database
    const currentDb = mongoose.connection.db;
    console.log(`🎯 Current database: ${currentDb.databaseName}`);
    
    // List collections
    const collections = await currentDb.listCollections().toArray();
    console.log('📁 Collections in current database:');
    collections.forEach(collection => {
      console.log(`  - ${collection.name}`);
    });
    
    // Test a simple query
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      role: String
    }));
    
    const userCount = await User.countDocuments();
    console.log(`👥 Total users in database: ${userCount}`);
    
    console.log('🎉 MongoDB connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    
    if (error.name === 'MongoServerSelectionError') {
      console.log('💡 Possible solutions:');
      console.log('  1. Check your internet connection');
      console.log('  2. Verify MongoDB Atlas cluster is running');
      console.log('  3. Check IP whitelist in MongoDB Atlas');
      console.log('  4. Verify username/password in connection string');
    }
    
    if (error.code === 'ECONNRESET') {
      console.log('💡 Connection reset solutions:');
      console.log('  1. Check network stability');
      console.log('  2. Try increasing timeout values');
      console.log('  3. Check MongoDB Atlas status');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the test
testMongoConnection();
