/**
 * Check Vector Database Setup
 * This script verifies that everything is set up correctly
 * Run: node scripts/check-vector-setup.js
 */

// Load environment variables
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'hrms_db';

async function main() {
  console.log('\n🔍 Checking Vector Database Setup\n');

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(DATABASE_NAME);

    // Collections to check
    const collections = ['employees', 'departments', 'announcements', 'assets', 'companymeetings', 'dailygoals'];

    console.log('📊 Checking Collections:\n');

    for (const collectionName of collections) {
      const collection = db.collection(collectionName);
      
      // Count total documents
      const totalCount = await collection.countDocuments();
      
      // Count documents with embeddings
      const embeddingCount = await collection.countDocuments({
        embedding: { $exists: true, $ne: null }
      });

      // Get sample document with embedding
      const sampleDoc = await collection.findOne({
        embedding: { $exists: true, $ne: null }
      });

      const embeddingLength = sampleDoc?.embedding?.length || 0;

      console.log(`📁 ${collectionName}:`);
      console.log(`   Total documents: ${totalCount}`);
      console.log(`   With embeddings: ${embeddingCount}`);
      
      if (embeddingCount > 0) {
        console.log(`   Embedding dimensions: ${embeddingLength}`);
        console.log(`   ✅ Ready for vector search`);
      } else if (totalCount > 0) {
        console.log(`   ⚠️  Has documents but NO embeddings`);
        console.log(`   → Run: node scripts/generate-embeddings-openai.js`);
      } else {
        console.log(`   ℹ️  Empty collection (no documents yet)`);
      }
      console.log('');
    }

    console.log('\n📋 Next Steps:\n');
    console.log('1. Create vector indexes in MongoDB Atlas:');
    console.log('   - Go to Atlas → Search → Create Search Index');
    console.log('   - Index Name: vector_index');
    console.log('   - Use the JSON definition from MONGODB_ATLAS_VECTOR_SETUP.md\n');
    console.log('2. Once indexes are "Active", test vector search:');
    console.log('   - Run: node scripts/test-vector-search.js\n');
    console.log('3. Start using MAYA with vector context:');
    console.log('   - Run: npm run dev');
    console.log('   - Test: POST /api/maya/chat-with-context\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await client.close();
    console.log('✅ MongoDB connection closed\n');
  }
}

main();

