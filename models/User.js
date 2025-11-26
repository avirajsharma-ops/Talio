import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false,
  },
  role: {
    type: String,
    enum: ['admin', 'hr', 'manager', 'employee', 'department_head', 'god_admin'],
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
  passwordResetToken: String,
  passwordResetExpires: Date,
  // Firebase Cloud Messaging tokens for push notifications
  fcmTokens: [{
    token: {
      type: String,
      required: true
    },
    device: {
      type: String,
      enum: ['android'],
      default: 'android'
    },
    deviceInfo: {
      model: String,
      osVersion: String,
      appVersion: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    lastUsed: {
      type: Date,
      default: Date.now
    }
  }],
  // Notification preferences
  notificationPreferences: {
    chat: { type: Boolean, default: true },
    projects: { type: Boolean, default: true },
    leave: { type: Boolean, default: true },
    attendance: { type: Boolean, default: true },
    announcements: { type: Boolean, default: true }
  },
  // Maya AI Assistant preferences
  mayaPreferences: {
    onboardingCompleted: { type: Boolean, default: false },
    onboardingCompletedAt: { type: Date },
    onboardingSkipped: { type: Boolean, default: false },
    lastGreetingDate: { type: String }, // YYYY-MM-DD format to track daily greeting
    autoGreetingEnabled: { type: Boolean, default: true },
    voiceEnabled: { type: Boolean, default: true }
  }
}, {
  timestamps: true,
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for performance optimization
UserSchema.index({ employeeId: 1 }); // Reverse lookup from employee
UserSchema.index({ role: 1, isActive: 1 }); // Role-based queries

export default mongoose.models.User || mongoose.model('User', UserSchema);

