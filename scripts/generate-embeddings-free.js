/**
 * Generate FREE Embeddings using Hugging Face Transformers
 * This script uses the free 'all-MiniLM-L6-v2' model (384 dimensions)
 * Run: node scripts/generate-embeddings-free.js
 */

// Load environment variables from .env.local
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { MongoClient } = require('mongodb');
const { pipeline } = require('@xenova/transformers');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'hrms_db';

// Validate environment variables
if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI not found in .env.local');
  console.error('Please add your MongoDB connection string to .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log('   MongoDB URI:', MONGODB_URI.substring(0, 30) + '...');
console.log('   Database:', DATABASE_NAME);
console.log('   Using FREE embeddings (Hugging Face)\n');

// Collections to process (same as OpenAI version)
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

let embeddingPipeline = null;

/**
 * Initialize the embedding model
 */
async function initializeModel() {
  console.log('🔄 Loading embedding model (this may take a minute on first run)...');
  
  // Using 'Xenova/all-MiniLM-L6-v2' - 384 dimensions, fast and free
  embeddingPipeline = await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2'
  );
  
  console.log('✅ Model loaded successfully\n');
}

/**
 * Generate embedding for a single document
 */
async function generateEmbedding(text) {
  try {
    const output = await embeddingPipeline(text, {
      pooling: 'mean',
      normalize: true,
    });
    
    // Convert to array
    return Array.from(output.data);
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
 * Get nested value from object
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
            embeddingText: text,
            metadata: metadata,
            embeddingGeneratedAt: new Date(),
            embeddingModel: 'all-MiniLM-L6-v2',
            embeddingDimensions: 384,
          },
        }
      );
      
      processed++;
      console.log(`✅ Processed ${processed}/${documents.length}: ${doc._id}`);
      
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
  console.log('🚀 Starting FREE embedding generation...\n');
  
  // Initialize model first
  await initializeModel();
  
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

