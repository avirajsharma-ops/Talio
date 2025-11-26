import mongoose from 'mongoose';

const MayaFormattedDataSchema = new mongoose.Schema({
  sourceCollection: {
    type: String,
    required: true,
    index: true,
  },
  sourceDocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },
  dataType: {
    type: String,
    enum: ['employee', 'department', 'leave', 'attendance', 'task', 'expense', 'document', 'announcement', 'other'],
    required: true,
  },
  formattedContent: {
    type: String,
    required: true,
  },
  structuredData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  searchableText: {
    type: String,
    index: 'text',
  },
  embedding: {
    type: [Number],
  },
  accessControl: {
    roles: [{
      type: String,
      enum: ['employee', 'manager', 'hr', 'admin', 'god_admin'],
    }],
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
    }],
    specificUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  metadata: {
    lastSynced: Date,
    syncVersion: Number,
    dataQuality: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Compound indexes for efficient querying
MayaFormattedDataSchema.index({ sourceCollection: 1, sourceDocumentId: 1 }, { unique: true });
MayaFormattedDataSchema.index({ dataType: 1, isActive: 1 });
MayaFormattedDataSchema.index({ 'accessControl.roles': 1 });
MayaFormattedDataSchema.index({ 'accessControl.departments': 1 });
MayaFormattedDataSchema.index({ 'metadata.lastSynced': -1 });

// TTL index for auto-expiring data (expiresAt field doesn't need separate index)
MayaFormattedDataSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.MayaFormattedData || mongoose.model('MayaFormattedData', MayaFormattedDataSchema);

