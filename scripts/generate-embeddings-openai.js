/**
 * Generate OpenAI Embeddings for HRMS Data
 * This script generates vector embeddings for your MongoDB collections
 * Run: node scripts/generate-embeddings-openai.js
 */

// Load environment variables from .env
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { MongoClient } = require('mongodb');
const OpenAI = require('openai');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'hrms_db';

// Validate environment variables
if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in .env');
  console.error('Please add your MongoDB connection string to .env');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY or NEXT_PUBLIC_OPENAI_API_KEY not found in .env');
  console.error('Please add your OpenAI API key to .env');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('   MongoDB URI:', MONGODB_URI.substring(0, 30) + '...');
console.log('   Database:', DATABASE_NAME);
console.log('   OpenAI API Key:', OPENAI_API_KEY.substring(0, 20) + '...\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// Collections to process
const COLLECTIONS_CONFIG = {
  employees: {
    textFields: ['name', 'email', 'designation', 'department', 'skills', 'bio'],
    metadataFields: ['department', 'designation', 'employeeId'],
  },
  announcements: {
    textFields: ['title', 'description', 'content'],
    metadataFields: ['type', 'department', 'createdAt'],
  },
  assets: {
    textFields: ['name', 'description', 'category', 'specifications'],
    metadataFields: ['category', 'status', 'assignedTo'],
  },
  departments: {
    textFields: ['name', 'description', 'responsibilities'],
    metadataFields: ['departmentId', 'headOfDepartment'],
  },
  companymeetings: {
    textFields: ['title', 'agenda', 'notes', 'summary'],
    metadataFields: ['type', 'department', 'date'],
  },
  dailygoals: {
    textFields: ['title', 'description', 'objectives'],
    metadataFields: ['assignedTo', 'department', 'status', 'dueDate'],
  },
};

/**
 * Generate embedding for a single document
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // or 'text-embedding-3-large' for better quality
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Create text representation of a document
 */
function createTextRepresentation(doc, textFields) {
  const parts = [];
  
  for (const field of textFields) {
    const value = getNestedValue(doc, field);
    if (value) {
      if (Array.isArray(value)) {
        parts.push(value.join(', '));
      } else {
        parts.push(String(value));
      }
    }
  }
  
  return parts.join(' | ');
}

/**
 * Get nested value from object (e.g., 'user.name')
 */
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Extract metadata from document
 */
function extractMetadata(doc, metadataFields) {
  const metadata = {};
  
  for (const field of metadataFields) {
    const value = getNestedValue(doc, field);
    if (value !== undefined && value !== null) {
      metadata[field] = value;
    }
  }
  
  return metadata;
}

/**
 * Process a single collection
 */
async function processCollection(db, collectionName, config) {
  console.log(`\n📊 Processing collection: ${collectionName}`);
  
  const collection = db.collection(collectionName);
  const documents = await collection.find({}).toArray();
  
  console.log(`Found ${documents.length} documents`);
  
  let processed = 0;
  let errors = 0;
  
  for (const doc of documents) {
    try {
      // Skip if already has embedding
      if (doc.embedding) {
        console.log(`⏭️  Skipping ${doc._id} (already has embedding)`);
        continue;
      }
      
      // Create text representation
      const text = createTextRepresentation(doc, config.textFields);
      
      if (!text || text.trim().length === 0) {
        console.log(`⚠️  Skipping ${doc._id} (no text content)`);
        continue;
      }
      
      // Generate embedding
      const embedding = await generateEmbedding(text);
      
      // Extract metadata
      const metadata = extractMetadata(doc, config.metadataFields);
      
      // Update document with embedding and metadata
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            embedding: embedding,
            embeddingText: text, // Store the text used for embedding
            metadata: metadata,
            embeddingGeneratedAt: new Date(),
          },
        }
      );
      
      processed++;
      console.log(`✅ Processed ${processed}/${documents.length}: ${doc._id}`);
      
      // Rate limiting: OpenAI allows 3000 requests/min
      await new Promise(resolve => setTimeout(resolve, 20)); // 50 requests/sec
      
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${doc._id}:`, error.message);
    }
  }
  
  console.log(`\n✅ Collection ${collectionName} complete:`);
  console.log(`   - Processed: ${processed}`);
  console.log(`   - Errors: ${errors}`);
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting embedding generation...\n');
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');
    
    const db = client.db(DATABASE_NAME);
    
    // Process each collection
    for (const [collectionName, config] of Object.entries(COLLECTIONS_CONFIG)) {
      await processCollection(db, collectionName, config);
    }
    
    console.log('\n🎉 All collections processed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n✅ MongoDB connection closed');
  }
}

// Run the script
main();

