const { MongoClient } = require('mongodb');

// Local MongoDB connection
const LOCAL_URI = 'mongodb://localhost:27017/hrms_db';

// Atlas MongoDB connection
const ATLAS_URI = 'mongodb+srv://hrms:satyam@satyam.gied0jg.mongodb.net/hrms_db?';

// Collections to migrate
const COLLECTIONS = [
  'users',
  'employees', 
  'departments',
  'designations',
  'leavetypes',
  'leavebalances',
  'leaves',
  'attendances',
  'announcements',
  'holidays',
  'payrolls',
  'expenses',
  'performances',
  'recruitments',
  'assets',
  'documents',
  'helpdesks',
  'travels',
  'onboardings',
  'offboardings',
  'policies'
];

async function migrateData() {
  let localClient, atlasClient;
  
  try {
    console.log('🔄 Starting data migration from Local MongoDB to Atlas...\n');
    
    // Connect to local MongoDB
    console.log('📡 Connecting to Local MongoDB...');
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db('hrms_db');
    console.log('✅ Connected to Local MongoDB\n');
    
    // Connect to Atlas MongoDB
    console.log('☁️  Connecting to MongoDB Atlas...');
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db('hrms_db');
    console.log('✅ Connected to MongoDB Atlas\n');
    
    // Get list of existing collections in local DB
    const localCollections = await localDb.listCollections().toArray();
    const existingCollections = localCollections.map(col => col.name);
    
    console.log('📋 Found collections in local database:');
    existingCollections.forEach(col => console.log(`   - ${col}`));
    console.log('');
    
    let totalDocuments = 0;
    let migratedCollections = 0;
    
    // Migrate each collection
    for (const collectionName of COLLECTIONS) {
      if (!existingCollections.includes(collectionName)) {
        console.log(`⏭️  Skipping ${collectionName} (not found in local DB)`);
        continue;
      }
      
      console.log(`🔄 Migrating collection: ${collectionName}`);
      
      // Get data from local collection
      const localCollection = localDb.collection(collectionName);
      const documents = await localCollection.find({}).toArray();
      
      if (documents.length === 0) {
        console.log(`   ⚠️  No documents found in ${collectionName}`);
        continue;
      }
      
      // Clear existing data in Atlas collection
      const atlasCollection = atlasDb.collection(collectionName);
      await atlasCollection.deleteMany({});
      
      // Insert data into Atlas collection
      await atlasCollection.insertMany(documents);
      
      console.log(`   ✅ Migrated ${documents.length} documents`);
      totalDocuments += documents.length;
      migratedCollections++;
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Collections migrated: ${migratedCollections}`);
    console.log(`   - Total documents: ${totalDocuments}`);
    console.log(`   - Atlas database: hrms_db`);
    
    // Verify migration by checking users
    const atlasUsers = await atlasDb.collection('users').find({}).toArray();
    console.log(`\n🔑 Verification - Users in Atlas: ${atlasUsers.length}`);
    
    if (atlasUsers.length > 0) {
      console.log('\n📝 Login credentials available:');
      atlasUsers.forEach(user => {
        console.log(`   👤 ${user.role}: ${user.email} / ${user.password}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (localClient) {
      await localClient.close();
      console.log('\n🔌 Disconnected from Local MongoDB');
    }
    if (atlasClient) {
      await atlasClient.close();
      console.log('🔌 Disconnected from MongoDB Atlas');
    }
  }
}

// Run migration
migrateData();
