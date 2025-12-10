import mongoose from 'mongoose';

const ScreenMonitorLogSchema = new mongoose.Schema({
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedByName: String,
  requestedByRole: String,
  targetEmployee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  targetEmployeeName: String,
  targetEmployeeEmail: String,
  targetDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  targetDepartmentName: String,
  screenshot: {
    data: String, // base64 encoded screenshot
    mimeType: {
      type: String,
      default: 'image/png'
    },
    size: Number,
    capturedAt: Date
  },
  analysis: {
    summary: String,
    applications: [String],
    activity: String,
    productivityLevel: {
      type: String,
      enum: ['high', 'medium', 'low', 'unknown'],
      default: 'unknown'
    },
    detectedContent: String,
    aiResponse: String
  },
  status: {
    type: String,
    enum: ['pending', 'captured', 'analyzed', 'failed'],
    default: 'pending'
  },
  requestReason: String,
  error: String,
  metadata: {
    userAgent: String,
    screenResolution: String,
    timestamp: Date,
    timezone: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
ScreenMonitorLogSchema.index({ createdAt: -1 });
ScreenMonitorLogSchema.index({ requestedBy: 1, createdAt: -1 });
ScreenMonitorLogSchema.index({ targetEmployee: 1, createdAt: -1 });
ScreenMonitorLogSchema.index({ targetDepartment: 1, createdAt: -1 });
ScreenMonitorLogSchema.index({ status: 1 });

export default mongoose.models.ScreenMonitorLog || mongoose.model('ScreenMonitorLog', ScreenMonitorLogSchema);
