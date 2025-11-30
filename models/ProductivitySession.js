import mongoose from 'mongoose';

/**
 * ProductivitySession - Pre-computed session aggregating multiple captures
 * Sessions are computed every X minutes (configurable, default 30 min)
 * Contains aggregated data from all ProductivityData captures in that window
 */
const ProductivitySessionSchema = new mongoose.Schema({
  // User reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    index: true
  },

  // Session time window
  sessionStart: { type: Date, required: true, index: true },
  sessionEnd: { type: Date, required: true },
  sessionDuration: { type: Number, default: 30 }, // Duration in minutes (configurable)

  // Session status
  status: {
    type: String,
    enum: ['active', 'completed', 'partial'],
    default: 'active'
  },

  // All screenshots captured during this session (thumbnails stored, full on-demand)
  screenshots: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    capturedAt: { type: Date, required: true },
    thumbnail: { type: String }, // Small base64 thumbnail
    fullData: { type: String }, // Full screenshot base64 (cleared after viewing or after X days)
    captureType: { 
      type: String, 
      enum: ['periodic', 'instant', 'manual'],
      default: 'periodic'
    },
    linkedDataId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProductivityData' }
  }],

  // Aggregated app usage for the session
  appUsageSummary: [{
    appName: { type: String, required: true },
    totalDuration: { type: Number, default: 0 }, // milliseconds
    category: { 
      type: String, 
      enum: ['productive', 'neutral', 'unproductive', 'unknown'],
      default: 'unknown'
    },
    percentage: { type: Number, default: 0 }
  }],

  // Aggregated website visits for the session
  websiteVisitSummary: [{
    domain: { type: String, required: true },
    totalDuration: { type: Number, default: 0 }, // milliseconds
    visitCount: { type: Number, default: 0 },
    category: { 
      type: String, 
      enum: ['productive', 'neutral', 'unproductive', 'unknown'],
      default: 'unknown'
    },
    percentage: { type: Number, default: 0 }
  }],

  // Aggregated keystroke stats
  keystrokeSummary: {
    totalCount: { type: Number, default: 0 },
    averagePerMinute: { type: Number, default: 0 },
    peakMinute: { type: Number, default: 0 }
  },

  // Aggregated mouse activity
  mouseActivitySummary: {
    totalClicks: { type: Number, default: 0 },
    totalScrollDistance: { type: Number, default: 0 },
    totalMovementDistance: { type: Number, default: 0 }
  },

  // Time aggregations
  totalActiveTime: { type: Number, default: 0 }, // milliseconds
  productiveTime: { type: Number, default: 0 },
  neutralTime: { type: Number, default: 0 },
  unproductiveTime: { type: Number, default: 0 },
  idleTime: { type: Number, default: 0 },

  // Top 5 apps and websites for quick display
  topApps: [{
    appName: { type: String },
    duration: { type: Number },
    percentage: { type: Number }
  }],
  topWebsites: [{
    domain: { type: String },
    duration: { type: Number },
    visits: { type: Number },
    percentage: { type: Number }
  }],

  // AI Analysis for the entire session
  aiAnalysis: {
    summary: { type: String }, // Comprehensive summary of 30-min session
    productivityScore: { type: Number, min: 0, max: 100 },
    focusScore: { type: Number, min: 0, max: 100 },
    efficiencyScore: { type: Number, min: 0, max: 100 },
    scoreBreakdown: {
      productivityReason: { type: String },
      focusReason: { type: String },
      efficiencyReason: { type: String }
    },
    workActivities: [{ type: String }],
    insights: [{ type: String }],
    recommendations: [{ type: String }],
    areasOfImprovement: [{ type: String }],
    topAchievements: [{ type: String }],
    screenshotAnalysis: [{
      index: { type: Number },
      time: { type: String },
      description: { type: String }
    }],
    analyzedAt: { type: Date }
  },

  // Number of raw captures included in this session
  captureCount: { type: Number, default: 0 },
  
  // IDs of ProductivityData records that were aggregated
  sourceDataIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ProductivityData' }],

  // Device info (from first capture)
  deviceInfo: {
    platform: { type: String },
    hostname: { type: String },
    osVersion: { type: String }
  },

  // For instant fetch - partial session data
  isPartialSession: { type: Boolean, default: false },
  partialSessionRequestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  partialSessionRequestedAt: { type: Date }

}, {
  timestamps: true
});

// Indexes for efficient querying
ProductivitySessionSchema.index({ userId: 1, sessionStart: -1 });
ProductivitySessionSchema.index({ userId: 1, status: 1, sessionStart: -1 });
ProductivitySessionSchema.index({ employeeId: 1, sessionStart: -1 });
ProductivitySessionSchema.index({ status: 1, sessionEnd: 1 });
ProductivitySessionSchema.index({ createdAt: -1 });

// Auto-expire after 90 days
ProductivitySessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// Virtual for productivity percentage
ProductivitySessionSchema.virtual('productivityPercentage').get(function() {
  if (this.totalActiveTime === 0) return 0;
  return Math.round((this.productiveTime / this.totalActiveTime) * 100);
});

// Virtual for session duration in human readable format
ProductivitySessionSchema.virtual('durationFormatted').get(function() {
  const mins = Math.round(this.totalActiveTime / 60000);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
});

export default mongoose.models.ProductivitySession || mongoose.model('ProductivitySession', ProductivitySessionSchema);
