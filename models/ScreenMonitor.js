/**
 * Screen Monitor Model
 * For tracking screen monitoring requests and logs
 */

import mongoose from 'mongoose';

const screenMonitorSchema = new mongoose.Schema({
  // Who requested the monitoring
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestedByName: {
    type: String,
    required: true,
  },
  requestedByRole: {
    type: String,
    required: true,
  },

  // Who is being monitored
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  targetUserName: {
    type: String,
    required: true,
  },
  targetUserRole: {
    type: String,
    required: true,
  },

  // Screenshot data
  screenshot: {
    type: String, // Base64 encoded image or URL
    required: false,
  },
  screenshotUrl: {
    type: String, // If stored in cloud storage
    required: false,
  },

  // Analysis
  summary: {
    type: String, // AI-generated summary of what the user is doing
    required: false,
  },
  detectedActivities: [{
    activity: String,
    confidence: Number,
    timestamp: Date,
  }],
  currentPage: {
    url: String,
    title: String,
    path: String,
  },
  activeApplications: [String],

  // Metadata
  capturedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String, // Why was this monitoring requested
    required: false,
  },
  isAuthorized: {
    type: Boolean,
    default: false, // Whether the request was authorized based on hierarchy
  },
  authorizationReason: {
    type: String,
  },

  // Privacy and compliance
  notifiedUser: {
    type: Boolean,
    default: false, // Whether the monitored user was notified
  },
  userConsent: {
    type: Boolean,
    default: false,
  },
  complianceFlags: [{
    flag: String,
    severity: String,
    description: String,
  }],

  // Status
  status: {
    type: String,
    enum: ['pending', 'captured', 'analyzed', 'delivered', 'failed'],
    default: 'pending',
  },
  error: {
    type: String,
  },

  // Auto-delete after 7 days for privacy
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
}, {
  timestamps: true,
});

// Indexes
screenMonitorSchema.index({ requestedBy: 1, createdAt: -1 });
screenMonitorSchema.index({ targetUser: 1, createdAt: -1 });
screenMonitorSchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 }); // Auto-delete after 7 days

// Methods
screenMonitorSchema.methods.addSummary = function(summary) {
  this.summary = summary;
  this.status = 'analyzed';
  return this.save();
};

screenMonitorSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  return this.save();
};

// Statics
screenMonitorSchema.statics.getRecentMonitoring = function(userId, limit = 10) {
  return this.find({
    $or: [
      { requestedBy: userId },
      { targetUser: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

screenMonitorSchema.statics.getMonitoringByTarget = function(targetUserId, limit = 10) {
  return this.find({ targetUser: targetUserId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

const ScreenMonitor = mongoose.models.ScreenMonitor || mongoose.model('ScreenMonitor', screenMonitorSchema);

export default ScreenMonitor;

