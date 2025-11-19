import mongoose from 'mongoose';

const MayaScreenSummarySchema = new mongoose.Schema({
  monitoredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  monitoredEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  requestedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  requestedByEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  captureType: {
    type: String,
    enum: ['screenshot', 'screen_share', 'dom_analysis', 'pip_capture'],
    required: true,
  },
  summary: {
    type: String,
    required: true,
  },
  detailedAnalysis: {
    type: String,
  },
  currentPage: {
    url: String,
    title: String,
    path: String,
  },
  activities: [{
    type: String,
  }],
  applications: [{
    name: String,
    status: String,
  }],
  screenshotUrl: {
    type: String,
  },
  domSnapshot: {
    type: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    browserInfo: String,
    deviceInfo: String,
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
    },
    timestamp: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'captured', 'analyzed', 'delivered', 'failed'],
    default: 'pending',
  },
  consentGiven: {
    type: Boolean,
    default: false,
  },
  consentTimestamp: {
    type: Date,
  },
  deliveredAt: {
    type: Date,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaScreenSummarySchema.index({ monitoredUserId: 1, createdAt: -1 });
MayaScreenSummarySchema.index({ requestedByUserId: 1, createdAt: -1 });
MayaScreenSummarySchema.index({ status: 1, createdAt: -1 });
MayaScreenSummarySchema.index({ expiresAt: 1 });

// Auto-expire old summaries after 30 days
MayaScreenSummarySchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.models.MayaScreenSummary || mongoose.model('MayaScreenSummary', MayaScreenSummarySchema);

