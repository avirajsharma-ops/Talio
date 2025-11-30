import mongoose from 'mongoose';

const ProductivitySettingsSchema = new mongoose.Schema({
  // Session configuration (HARDCODED DEFAULTS)
  // Session duration: 30 minutes
  // Screenshot interval: 1 minute (30 screenshots per session)
  sessionDuration: {
    type: Number,
    default: 30, // 30 minutes per session (FIXED)
    immutable: true // Cannot be changed
  },
  screenshotInterval: {
    type: Number,
    default: 1, // 1 screenshot per minute (FIXED)
    immutable: true // Cannot be changed
  },
  expectedScreenshotsPerSession: {
    type: Number,
    default: 30, // 30 screenshots per 30-minute session
    immutable: true
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
    autoAnalyze: {
      type: Boolean,
      default: true, // Auto-analyze sessions in background
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
  
  // Department-specific overrides (only for work hours, not intervals)
  departmentOverrides: [{
    department: {
      type: String,
      required: true,
    },
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

// Static method to get settings (creates default if not exists)
ProductivitySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({
      sessionDuration: 30,
      screenshotInterval: 1,
      expectedScreenshotsPerSession: 30
    });
  }
  return settings;
};

// Constants - use these for hardcoded values
ProductivitySettingsSchema.statics.SESSION_DURATION_MINS = 30;
ProductivitySettingsSchema.statics.SCREENSHOT_INTERVAL_MINS = 1;
ProductivitySettingsSchema.statics.SCREENSHOTS_PER_SESSION = 30;

export default mongoose.models.ProductivitySettings || mongoose.model('ProductivitySettings', ProductivitySettingsSchema);
