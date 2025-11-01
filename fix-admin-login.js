const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'manager', 'employee'],
    default: 'employee',
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function fixAdminLogin() {
  try {
    console.log('🔧 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists
    console.log('🔍 Checking for admin user...');
    let adminUser = await User.findOne({ email: 'admin@hrms.com' }).select('+password');
    
    if (adminUser) {
      console.log('👤 Admin user found, updating password...');
      
      // Update admin password
      adminUser.password = 'admin123'; // This will be hashed by pre-save hook
      await adminUser.save();
      
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('👤 Admin user not found, creating new admin...');
      
      // Create new admin user
      adminUser = new User({
        email: 'admin@hrms.com',
        password: 'admin123', // This will be hashed by pre-save hook
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully');
    }

    // Test password comparison
    console.log('🧪 Testing password comparison...');
    const testUser = await User.findOne({ email: 'admin@hrms.com' }).select('+password');
    const isMatch = await testUser.comparePassword('admin123');
    console.log('🔐 Password test result:', isMatch ? '✅ PASS' : '❌ FAIL');

    // Show all users
    console.log('\n📋 All users in database:');
    const allUsers = await User.find({}).select('+password');
    allUsers.forEach(user => {
      console.log(`- Email: ${user.email}, Role: ${user.role}, Active: ${user.isActive}, Password Length: ${user.password?.length || 0}`);
    });

    console.log('\n🎉 Admin login fix completed!');
    console.log('📝 Login credentials:');
    console.log('   Email: admin@hrms.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error fixing admin login:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the fix
fixAdminLogin();
