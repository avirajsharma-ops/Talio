import mongoose from 'mongoose';

const WindowActivityLogSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  // Window/Tab information
  windowTitle: {
    type: String,
    required: true
  },
  url: String,
  domain: String,
  tabId: String,
  windowId: String,
  // Application info (for desktop apps)
  applicationName: String,
  applicationPath: String,
  processName: String,
  // Time tracking
  focusStartTime: {
    type: Date,
    required: true,
    index: true
  },
  focusEndTime: Date,
  timeSpent: Number, // milliseconds
  // Activity during focus
  keystrokeCount: {
    type: Number,
    default: 0
  },
  mouseClickCount: {
    type: Number,
    default: 0
  },
  scrollCount: {
    type: Number,
    default: 0
  },
  // Categorization
  category: {
    type: String,
    enum: ['productive', 'neutral', 'distraction', 'communication', 'research', 'entertainment', 'unknown'],
    default: 'unknown'
  },
  productivityScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  // Flags
  isActive: {
    type: Boolean,
    default: true
  },
  isIdle: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
WindowActivityLogSchema.index({ employee: 1, focusStartTime: -1 });
WindowActivityLogSchema.index({ user: 1, focusStartTime: -1 });
WindowActivityLogSchema.index({ sessionId: 1, focusStartTime: -1 });
WindowActivityLogSchema.index({ domain: 1, focusStartTime: -1 });
WindowActivityLogSchema.index({ category: 1, focusStartTime: -1 });
WindowActivityLogSchema.index({ createdAt: -1 });

// Compound index for time-based queries
WindowActivityLogSchema.index({ employee: 1, focusStartTime: -1, category: 1 });

export default mongoose.models.WindowActivityLog || mongoose.model('WindowActivityLog', WindowActivityLogSchema);
