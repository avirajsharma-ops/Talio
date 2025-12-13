import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, lastConnectAttempt: 0 };
}

// Minimum time between connection retry attempts (5 seconds)
const MIN_RETRY_INTERVAL = 5000;

async function connectDB() {
  // Only check for MONGODB_URI when actually connecting (not during build)
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env');
  }

  // Return existing connection if available
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  // Rate limit connection attempts to prevent overwhelming the server
  const now = Date.now();
  if (cached.promise && (now - cached.lastConnectAttempt) < MIN_RETRY_INTERVAL) {
    // Wait for existing connection attempt
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      // Connection failed, will retry below
    }
  }

  // Clear stale connection state if connection is not ready
  if (mongoose.connection.readyState !== 1) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    cached.lastConnectAttempt = now;
    
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 1,
      socketTimeoutMS: 30000,
      family: 4, // Force IPv4 to avoid querySrv ETIMEOUT errors
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected');
      return mongoose;
    }).catch((err) => {
      console.error('❌ MongoDB Connection Error:', err.message);
      cached.promise = null;
      cached.conn = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;

