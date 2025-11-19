import mongoose from 'mongoose';

const MayaActionLogSchema = new mongoose.Schema({
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
  actionType: {
    type: String,
    enum: [
      'database_query', 'database_create', 'database_update', 'database_delete',
      'navigation', 'ui_interaction', 'screen_monitoring', 'message_send',
      'file_upload', 'file_download', 'report_generation', 'approval',
      'check_in', 'check_out', 'leave_apply', 'expense_submit', 'task_create',
      'other'
    ],
    required: true,
    index: true,
  },
  actionCategory: {
    type: String,
    enum: ['attendance', 'leave', 'expense', 'task', 'employee', 'document', 'report', 'communication', 'system', 'other'],
    required: true,
  },
  actionDescription: {
    type: String,
    required: true,
  },
  functionCalled: {
    type: String,
  },
  functionArguments: {
    type: mongoose.Schema.Types.Mixed,
  },
  result: {
    success: {
      type: Boolean,
      required: true,
    },
    message: String,
    data: mongoose.Schema.Types.Mixed,
    error: String,
  },
  affectedCollections: [{
    collectionName: String,
    documentIds: [mongoose.Schema.Types.ObjectId],
    operation: {
      type: String,
      enum: ['read', 'create', 'update', 'delete'],
    },
  }],
  context: {
    userMessage: String,
    currentPage: String,
    sessionId: String,
    userRole: String,
    department: String,
  },
  executionTime: {
    type: Number,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaActionLogSchema.index({ userId: 1, createdAt: -1 });
MayaActionLogSchema.index({ actionType: 1, createdAt: -1 });
MayaActionLogSchema.index({ actionCategory: 1, createdAt: -1 });
MayaActionLogSchema.index({ 'result.success': 1, createdAt: -1 });
MayaActionLogSchema.index({ 'context.sessionId': 1 });

// Auto-expire old logs after 90 days
MayaActionLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

export default mongoose.models.MayaActionLog || mongoose.model('MayaActionLog', MayaActionLogSchema);

