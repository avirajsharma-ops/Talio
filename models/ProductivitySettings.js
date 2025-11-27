import mongoose from 'mongoose';

const ProductivitySettingsSchema = new mongoose.Schema({
  // Global screenshot interval (minutes)
  screenshotInterval: {
    type: Number,
    default: 5,
    min: 1,
    max: 1440, // Max 24 hours
  },
  
  // Work hours configuration
  workHours: {
    enabled: {
      type: Boolean,
      default: true,
    },
    start: {
      type: String, // HH:MM format
      default: '09:00',
    },
    end: {
      type: String, // HH:MM format
      default: '18:00',
    },
  },

  // Break times (pause screenshot capture)
  breakTimes: [{
    name: {
      type: String,
      required: true,
    },
    start: {
      type: String, // HH:MM format
      required: true,
    },
    end: {
      type: String, // HH:MM format
      required: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  }],

  // AI Analysis settings
  aiAnalysis: {
    enabled: {
      type: Boolean,
      default: true,
    },
    realtime: {
      type: Boolean,
      default: true,
    },
  },

  // Last updated info
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Department-specific overrides
  departmentOverrides: [{
    department: {
      type: String,
      required: true,
    },
    screenshotInterval: Number,
    workHours: {
      start: String,
      end: String,
    },
  }],
}, {
  timestamps: true,
});

// Only one document should exist (singleton pattern)
ProductivitySettingsSchema.index({ _id: 1 }, { unique: true });

export default mongoose.models.ProductivitySettings || mongoose.model('ProductivitySettings', ProductivitySettingsSchema);
