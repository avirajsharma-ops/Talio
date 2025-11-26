import mongoose from 'mongoose';

const AutoScreenCaptureSchema = new mongoose.Schema({
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
  // Screenshot data
  screenshot: {
    type: String, // Base64 encoded
    required: true
  },
  screenshotSize: Number, // bytes
  // Capture context
  capturedAt: {
    type: Date,
    required: true,
    index: true
  },
  windowTitle: String,
  activeApplication: String,
  url: String,
  domain: String,
  // AI Analysis from OpenAI Vision
  analysis: {
    summary: String, // What employee was doing
    applications: [String], // Apps visible on screen
    activity: String, // Coding, browsing, email, etc.
    productivity: {
      type: String,
      enum: ['highly-productive', 'productive', 'neutral', 'low-productivity', 'distraction'],
      default: 'neutral'
    },
    contentType: [String], // code, document, email, chat, video, etc.
    detectedText: String, // OCR text from screen
    aiConfidence: Number // 0-100
  },
  // Metadata
  sessionId: String,
  deviceInfo: {
    screenResolution: String,
    userAgent: String,
    platform: String
  },
  // Privacy
  containsSensitiveInfo: {
    type: Boolean,
    default: false
  },
  blurredRegions: [String], // Regions that were blurred for privacy
  // Linking to other logs
  relatedKeystrokeLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'KeystrokeLog'
  },
  relatedWindowLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WindowActivityLog'
  }
}, {
  timestamps: true
});

// Indexes
AutoScreenCaptureSchema.index({ employee: 1, capturedAt: -1 });
AutoScreenCaptureSchema.index({ user: 1, capturedAt: -1 });
AutoScreenCaptureSchema.index({ capturedAt: -1 });
AutoScreenCaptureSchema.index({ domain: 1, capturedAt: -1 });
AutoScreenCaptureSchema.index({ 'analysis.productivity': 1, capturedAt: -1 });

export default mongoose.models.AutoScreenCapture || mongoose.model('AutoScreenCapture', AutoScreenCaptureSchema);
