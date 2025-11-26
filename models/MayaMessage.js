/**
 * MAYA Message Model
 * For relaying messages between users through MAYA
 */

import mongoose from 'mongoose';

const mayaMessageSchema = new mongoose.Schema({
  // Sender information
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  senderRole: {
    type: String,
    required: true,
  },

  // Recipient information (can be single or multiple)
  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    userName: String,
    deliveredAt: Date,
    readAt: Date,
    spokenAt: Date, // When MAYA spoke the message to this user
    status: {
      type: String,
      enum: ['pending', 'delivered', 'read', 'spoken'],
      default: 'pending',
    },
  }],

  // Message content
  message: {
    type: String,
    required: true,
  },
  messageType: {
    type: String,
    enum: ['text', 'voice', 'urgent', 'announcement'],
    default: 'text',
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
  },

  // MAYA behavior
  shouldSpeak: {
    type: Boolean,
    default: true, // MAYA should speak the message by default
  },
  shouldActivate: {
    type: Boolean,
    default: true, // MAYA should activate on recipient's screen
  },
  voiceSettings: {
    speed: { type: Number, default: 1.0 },
    pitch: { type: Number, default: 1.0 },
    volume: { type: Number, default: 1.0 },
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  },
  isUrgent: {
    type: Boolean,
    default: false,
  },
  requiresAcknowledgment: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
mayaMessageSchema.index({ 'recipients.user': 1, 'recipients.status': 1 });
mayaMessageSchema.index({ sender: 1, createdAt: -1 });
mayaMessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // Auto-delete after 24 hours

// Methods
mayaMessageSchema.methods.markAsDelivered = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.status = 'delivered';
    recipient.deliveredAt = new Date();
  }
  return this.save();
};

mayaMessageSchema.methods.markAsSpoken = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.status = 'spoken';
    recipient.spokenAt = new Date();
  }
  return this.save();
};

mayaMessageSchema.methods.markAsRead = function(userId) {
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient) {
    recipient.status = 'read';
    recipient.readAt = new Date();
  }
  return this.save();
};

// Statics
mayaMessageSchema.statics.getPendingMessages = function(userId) {
  return this.find({
    'recipients.user': userId,
    'recipients.status': 'pending',
  }).sort({ createdAt: -1 });
};

mayaMessageSchema.statics.getUnreadMessages = function(userId) {
  return this.find({
    'recipients.user': userId,
    'recipients.status': { $in: ['pending', 'delivered', 'spoken'] },
  }).sort({ createdAt: -1 });
};

const MayaMessage = mongoose.models.MayaMessage || mongoose.model('MayaMessage', mayaMessageSchema);

export default MayaMessage;

