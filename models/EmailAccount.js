import mongoose from 'mongoose';

// Schema for individual email messages (cached)
const EmailMessageSchema = new mongoose.Schema({
  messageId: {
    type: String,
    required: true,
    index: true
  },
  threadId: {
    type: String,
    index: true
  },
  from: {
    name: String,
    email: String
  },
  to: [{
    name: String,
    email: String
  }],
  cc: [{
    name: String,
    email: String
  }],
  subject: {
    type: String,
    default: '(No Subject)'
  },
  snippet: String,
  body: String,
  bodyHtml: String,
  date: {
    type: Date,
    index: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isStarred: {
    type: Boolean,
    default: false
  },
  labels: [String],
  attachments: [{
    filename: String,
    mimeType: String,
    size: Number,
    attachmentId: String
  }],
  folder: {
    type: String,
    enum: ['inbox', 'sent', 'drafts', 'trash', 'spam', 'starred', 'important', 'archive'],
    default: 'inbox'
  }
}, { _id: false });

// Main Email Account Schema - stores user's email configuration
const EmailAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  provider: {
    type: String,
    enum: ['gmail', 'outlook', 'other'],
    default: 'gmail'
  },
  // OAuth tokens (encrypted in production)
  accessToken: {
    type: String,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  tokenExpiry: Date,
  // Connection status
  isConnected: {
    type: Boolean,
    default: false
  },
  lastSynced: Date,
  syncError: String,
  // Cached emails for quick access
  cachedEmails: [EmailMessageSchema],
  // Stats
  unreadCount: {
    type: Number,
    default: 0
  },
  // Settings
  settings: {
    syncEnabled: { type: Boolean, default: true },
    notificationsEnabled: { type: Boolean, default: true },
    signature: { type: String, default: '' },
    autoSyncInterval: { type: Number, default: 5 } // minutes
  }
}, {
  timestamps: true
});

// Indexes (user index not needed here as unique: true in schema already creates it)
EmailAccountSchema.index({ email: 1 });
EmailAccountSchema.index({ 'cachedEmails.date': -1 });
EmailAccountSchema.index({ 'cachedEmails.isRead': 1 });

export default mongoose.models.EmailAccount || mongoose.model('EmailAccount', EmailAccountSchema);
