import mongoose from 'mongoose';

const MouseActivityLogSchema = new mongoose.Schema({
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
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  // Mouse events
  events: [{
    type: {
      type: String,
      enum: ['click', 'dblclick', 'rightclick', 'move', 'scroll', 'drag'],
      required: true
    },
    x: Number,
    y: Number,
    timestamp: Date,
    target: String, // Element clicked/interacted with
    button: Number, // 0: left, 1: middle, 2: right
    scrollDelta: Number
  }],
  // Context
  windowTitle: String,
  url: String,
  domain: String,
  // Time tracking
  startTime: {
    type: Date,
    required: true,
    index: true
  },
  endTime: Date,
  duration: Number,
  // Analytics
  clickCount: {
    type: Number,
    default: 0
  },
  scrollCount: {
    type: Number,
    default: 0
  },
  totalMovement: Number, // Total pixel distance traveled
  // Activity level
  activityLevel: {
    type: String,
    enum: ['idle', 'low', 'medium', 'high', 'very-high'],
    default: 'medium'
  }
}, {
  timestamps: true
});

// Indexes
MouseActivityLogSchema.index({ employee: 1, startTime: -1 });
MouseActivityLogSchema.index({ user: 1, startTime: -1 });
MouseActivityLogSchema.index({ sessionId: 1, startTime: -1 });
MouseActivityLogSchema.index({ createdAt: -1 });

export default mongoose.models.MouseActivityLog || mongoose.model('MouseActivityLog', MouseActivityLogSchema);
