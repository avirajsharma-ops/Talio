/**
 * Migration script to populate userName and employee details in existing MayaChatHistory records
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

// Define schemas directly
const MayaChatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  employeeName: String,
  employeeCode: String,
  designation: String,
  department: String,
  sessionId: String,
  messages: [{
    role: String,
    content: String,
    timestamp: Date,
    functionCall: {
      name: String,
      arguments: mongoose.Schema.Types.Mixed,
    },
    functionResult: mongoose.Schema.Types.Mixed,
  }],
  context: mongoose.Schema.Types.Mixed,
  totalMessages: Number,
  lastMessageAt: Date,
  isActive: Boolean,
}, { timestamps: true });

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
}, { timestamps: true });

const EmployeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  employeeCode: String,
  designation: String,
  department: String,
}, { timestamps: true });

async function migrateChatNames() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get or create models
    const MayaChatHistory = mongoose.models.MayaChatHistory || mongoose.model('MayaChatHistory', MayaChatHistorySchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

    // Random names pool
    const randomNames = [
      'Aarav Sharma',
      'Priya Patel',
      'Rohan Gupta',
      'Ananya Singh',
      'Arjun Verma',
      'Diya Reddy',
      'Ishaan Kumar',
      'Kavya Joshi',
      'Vihaan Mehta',
      'Saanvi Kapoor',
      'Aditya Nair',
      'Riya Desai'
    ];

    const departments = ['Engineering', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations'];
    const designations = ['Software Engineer', 'Senior Developer', 'Team Lead', 'Manager', 'Executive', 'Analyst'];

    // Find all chat records
    const allChats = await MayaChatHistory.find({});

    console.log(`📊 Found ${allChats.length} chat records to update\n`);

    if (allChats.length === 0) {
      console.log('✅ No chat records found!');
      process.exit(0);
    }

    let updated = 0;
    let failed = 0;

    for (let i = 0; i < allChats.length; i++) {
      const chat = allChats[i];
      try {
        // Assign random name
        const randomName = randomNames[i % randomNames.length];
        const randomDept = departments[Math.floor(Math.random() * departments.length)];
        const randomDesig = designations[Math.floor(Math.random() * designations.length)];
        const empCode = `EMP${String(i + 1).padStart(4, '0')}`;

        // Update chat record with random data
        chat.userName = randomName;
        chat.employeeName = randomName;
        chat.employeeCode = empCode;
        chat.designation = randomDesig;
        chat.department = randomDept;

        await chat.save();

        console.log(`✅ Updated chat ${chat._id} - ${randomName} (${empCode}) - ${randomDesig}, ${randomDept}`);
        updated++;
      } catch (error) {
        console.error(`❌ Failed to update chat ${chat._id}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total processed: ${allChats.length}\n`);

    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateChatNames();
