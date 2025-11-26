import mongoose from 'mongoose';

const MayaChatHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'function'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    functionCall: {
      name: String,
      arguments: mongoose.Schema.Types.Mixed,
    },
    functionResult: {
      type: mongoose.Schema.Types.Mixed,
    },
  }],
  context: {
    currentPage: String,
    userRole: String,
    department: String,
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  totalMessages: {
    type: Number,
    default: 0,
  },
  lastMessageAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaChatHistorySchema.index({ userId: 1, createdAt: -1 });
MayaChatHistorySchema.index({ sessionId: 1, userId: 1 });
MayaChatHistorySchema.index({ lastMessageAt: -1 });
MayaChatHistorySchema.index({ isActive: 1, userId: 1 });

export default mongoose.models.MayaChatHistory || mongoose.model('MayaChatHistory', MayaChatHistorySchema);

