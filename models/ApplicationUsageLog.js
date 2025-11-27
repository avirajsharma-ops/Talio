import mongoose from 'mongoose';

const ApplicationUsageLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Date tracking (for daily aggregation)
  date: {
    type: Date,
    required: true,
    index: true
  },
  // Application/Domain summary
  applications: [{
    name: String, // Application or domain name
    type: {
      type: String,
      enum: ['browser', 'desktop-app', 'web-app'],
      default: 'browser'
    },
    url: String,
    domain: String,
    // Time spent
    totalTime: Number, // milliseconds
    activeTime: Number, // Time with actual activity
    idleTime: Number, // Time with no activity
    // Activity counts
    windowSwitches: Number,
    keystrokes: Number,
    mouseClicks: Number,
    // Productivity
    category: {
      type: String,
      enum: ['productive', 'neutral', 'distraction', 'communication', 'research', 'entertainment', 'unknown'],
      default: 'unknown'
    },
    productivityScore: Number,
    // Screenshots captured for this app
    screenshotCount: Number,
    lastUsed: Date
  }],
  // Daily summary
  totalActiveTime: Number,
  totalIdleTime: Number,
  totalApplications: Number,
  mostUsedApp: String,
  productivityAverage: Number,
  // Work hours
  firstActivity: Date,
  lastActivity: Date,
  workDuration: Number
}, {
  timestamps: true
});

// Indexes
ApplicationUsageLogSchema.index({ employee: 1, date: -1 });
ApplicationUsageLogSchema.index({ user: 1, date: -1 });
ApplicationUsageLogSchema.index({ date: -1 });
ApplicationUsageLogSchema.index({ employee: 1, 'applications.domain': 1 });

export default mongoose.models.ApplicationUsageLog || mongoose.model('ApplicationUsageLog', ApplicationUsageLogSchema);
