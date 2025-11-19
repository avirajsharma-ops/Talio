import mongoose from 'mongoose';

const MayaReferenceSchema = new mongoose.Schema({
  referenceType: {
    type: String,
    enum: ['employee', 'department', 'policy', 'procedure', 'faq', 'documentation', 'api_endpoint', 'ui_element'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    index: true,
  },
  description: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    index: true,
  }],
  relatedCollections: [{
    collectionName: String,
    documentId: mongoose.Schema.Types.ObjectId,
  }],
  accessLevel: {
    type: String,
    enum: ['public', 'employee', 'manager', 'hr', 'admin', 'god_admin'],
    default: 'employee',
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  priority: {
    type: Number,
    default: 0,
  },
  embedding: {
    type: [Number],
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaReferenceSchema.index({ referenceType: 1, isActive: 1 });
MayaReferenceSchema.index({ tags: 1 });
MayaReferenceSchema.index({ accessLevel: 1 });
MayaReferenceSchema.index({ priority: -1 });
MayaReferenceSchema.index({ title: 'text', description: 'text', content: 'text' });

export default mongoose.models.MayaReference || mongoose.model('MayaReference', MayaReferenceSchema);

