require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');

async function clearUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get all collections
    const db = mongoose.connection.db;
    
    // Clear users collection
    const usersResult = await db.collection('users').deleteMany({});
    console.log(`🗑️  Deleted ${usersResult.deletedCount} users`);

    // Clear employees collection (linked to users)
    const employeesResult = await db.collection('employees').deleteMany({});
    console.log(`🗑️  Deleted ${employeesResult.deletedCount} employees`);

    // Clear any email-related collections
    const emailCollections = [
      'emails',
      'emailtemplates',
      'emailqueues',
      'sentemails'
    ];

    for (const collectionName of emailCollections) {
      try {
        const collections = await db.listCollections({ name: collectionName }).toArray();
        if (collections.length > 0) {
          const result = await db.collection(collectionName).deleteMany({});
          console.log(`🗑️  Deleted ${result.deletedCount} records from ${collectionName}`);
        }
      } catch (err) {
        // Collection doesn't exist, skip
      }
    }

    console.log('\n✅ Database cleared successfully!');
    console.log('\nSummary:');
    console.log(`- Users: ${usersResult.deletedCount} deleted`);
    console.log(`- Employees: ${employeesResult.deletedCount} deleted`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearUsers();
