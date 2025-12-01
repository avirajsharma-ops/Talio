import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

async function clearChatData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Delete all chats
    console.log('🗑️  Deleting all chats...');
    const chatsResult = await db.collection('chats').deleteMany({});
    console.log(`✅ Deleted ${chatsResult.deletedCount} chats`);

    // Delete all messages
    console.log('🗑️  Deleting all messages...');
    const messagesResult = await db.collection('messages').deleteMany({});
    console.log(`✅ Deleted ${messagesResult.deletedCount} messages`);

    console.log('\n✅ All chat data cleared successfully!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing chat data:', error);
    process.exit(1);
  }
}

clearChatData();
