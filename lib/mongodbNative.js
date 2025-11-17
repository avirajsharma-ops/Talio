/**
 * MongoDB Native Driver Connection
 * Used for vector search operations
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'hrms_db';

// Global cache for MongoDB client
let cachedClient = null;
let cachedDb = null;

/**
 * Get MongoDB database connection
 * Uses connection pooling and caching
 */
export async function getDatabase() {
  // Return cached database if available
  if (cachedDb) {
    return cachedDb;
  }

  // Validate MongoDB URI
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    // Create new client if not cached
    if (!cachedClient) {
      cachedClient = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
      });

      await cachedClient.connect();
      console.log('✅ MongoDB Native Driver connected');
    }

    // Cache the database
    cachedDb = cachedClient.db(DATABASE_NAME);
    return cachedDb;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

/**
 * Get a specific collection
 */
export async function getCollection(collectionName) {
  const db = await getDatabase();
  return db.collection(collectionName);
}

/**
 * Close MongoDB connection
 * Only use this when shutting down the application
 */
export async function closeConnection() {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('✅ MongoDB connection closed');
  }
}

// Export the client for advanced use cases
export async function getClient() {
  if (!cachedClient) {
    await getDatabase(); // This will create the client
  }
  return cachedClient;
}

export default getDatabase;

