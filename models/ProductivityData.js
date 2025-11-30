import mongoose from 'mongoose';

// Schema for tracking app usage
const AppUsageSchema = new mongoose.Schema({
  appName: { type: String, required: true },
  windowTitle: { type: String },
  duration: { type: Number, default: 0 }, // in milliseconds
  category: { 
    type: String, 
    enum: ['productive', 'neutral', 'unproductive', 'unknown'],
    default: 'unknown'
  },
  startTime: { type: Date },
  endTime: { type: Date }
}, { _id: false });

// Schema for tracking website visits
const WebsiteVisitSchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: { type: String },
  domain: { type: String },
  duration: { type: Number, default: 0 }, // in milliseconds
  category: { 
    type: String, 
    enum: ['productive', 'neutral', 'unproductive', 'unknown'],
    default: 'unknown'
  },
  visitTime: { type: Date, default: Date.now }
}, { _id: false });

// Schema for keystroke statistics (count only, not content)
const KeystrokeStatsSchema = new mongoose.Schema({
  totalCount: { type: Number, default: 0 },
  hourlyBreakdown: [{
    hour: { type: Number }, // 0-23
    count: { type: Number, default: 0 }
  }],
  averagePerMinute: { type: Number, default: 0 }
}, { _id: false });

// Main productivity data schema
const ProductivityDataSchema = new mongoose.Schema({
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
  
  // Time period for this data
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  
  // Screenshot data
  screenshot: {
    url: { type: String },
    data: { type: String }, // Base64 data (compressed, stored in DB)
    thumbnail: { type: String }, // Small thumbnail for quick preview
    capturedAt: { type: Date },
    captureType: { 
      type: String, 
      enum: ['periodic', 'instant', 'manual'],
      default: 'periodic'
    }
  },
  
  // App usage tracking
  appUsage: [AppUsageSchema],
  totalActiveTime: { type: Number, default: 0 }, // milliseconds
  topApps: [{
    appName: { type: String },
    duration: { type: Number },
    percentage: { type: Number }
  }],
  
  // Website tracking
  websiteVisits: [WebsiteVisitSchema],
  topWebsites: [{
    domain: { type: String },
    duration: { type: Number },
    visits: { type: Number },
    percentage: { type: Number }
  }],
  
  // Keystroke tracking (count only, never content)
  keystrokes: KeystrokeStatsSchema,
  
  // Mouse activity
  mouseActivity: {
    clicks: { type: Number, default: 0 },
    scrollDistance: { type: Number, default: 0 },
    movementDistance: { type: Number, default: 0 }
  },
  
  // AI Analysis results
  aiAnalysis: {
    summary: { type: String },
    productivityScore: { type: Number, min: 0, max: 100 },
    focusScore: { type: Number, min: 0, max: 100 },
    efficiencyScore: { type: Number, min: 0, max: 100 },
    insights: [{ type: String }],
    recommendations: [{ type: String }],
    areasOfImprovement: [{ type: String }],
    topAchievements: [{ type: String }],
    analyzedAt: { type: Date }
  },
  
  // Categorization
  productiveTime: { type: Number, default: 0 }, // milliseconds
  neutralTime: { type: Number, default: 0 },
  unproductiveTime: { type: Number, default: 0 },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'synced', 'analyzed', 'delivered'],
    default: 'pending'
  },
  
  // Metadata
  deviceInfo: {
    platform: { type: String },
    hostname: { type: String },
    osVersion: { type: String }
  },
  
  // For instant fetch tracking
  instantFetchRequest: {
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: { type: Date },
    deliveredAt: { type: Date }
  },
  
  // Flags
  isInstantCapture: { type: Boolean, default: false },
  isBackfill: { type: Boolean, default: false } // Data synced after being stored locally
  
}, {
  timestamps: true
});

// Indexes
ProductivityDataSchema.index({ userId: 1, periodStart: -1 });
ProductivityDataSchema.index({ userId: 1, createdAt: -1 });
ProductivityDataSchema.index({ employeeId: 1, periodStart: -1 });
ProductivityDataSchema.index({ status: 1, createdAt: -1 });
ProductivityDataSchema.index({ 'instantFetchRequest.requestedBy': 1, createdAt: -1 });

// Auto-expire after 90 days
ProductivityDataSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.ProductivityData || mongoose.model('ProductivityData', ProductivityDataSchema);
