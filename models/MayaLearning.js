import mongoose from 'mongoose';

const MayaLearningSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_preference', 'conversation_pattern', 'action_feedback', 'system_knowledge', 'custom_rule'],
    required: true,
  },
  category: {
    type: String,
    enum: ['employee_data', 'department_info', 'workflow', 'ui_interaction', 'data_access', 'general'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  key: {
    type: String,
    required: true,
    index: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  context: {
    type: String,
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaLearningSchema.index({ type: 1, category: 1 });
MayaLearningSchema.index({ userId: 1, type: 1 });
MayaLearningSchema.index({ key: 1, isActive: 1 });
MayaLearningSchema.index({ lastUsed: -1 });

export default mongoose.models.MayaLearning || mongoose.model('MayaLearning', MayaLearningSchema);

