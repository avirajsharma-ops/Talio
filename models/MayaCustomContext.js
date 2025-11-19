import mongoose from 'mongoose';

/**
 * MAYA Custom Context Model
 * Allows GOD ADMIN to customize MAYA's behavior, personality, and knowledge
 * This is editable only by god_admin role
 */
const MayaCustomContextSchema = new mongoose.Schema({
  contextType: {
    type: String,
    enum: ['system_prompt', 'personality_trait', 'knowledge_base', 'behavior_rule', 'response_template', 'custom_function'],
    required: true,
    index: true,
  },
  category: {
    type: String,
    enum: ['general', 'employee_interaction', 'department_specific', 'role_specific', 'task_management', 'communication', 'data_access', 'custom'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  content: {
    type: String,
    required: true,
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  appliesTo: {
    roles: [{
      type: String,
      enum: ['employee', 'manager', 'department_head', 'hr', 'admin', 'god_admin', 'all'],
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
  conditions: {
    type: mongoose.Schema.Types.Mixed,
  },
  metadata: {
    version: {
      type: Number,
      default: 1,
    },
    lastTestedAt: Date,
    testResults: String,
    tags: [String],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  changeHistory: [{
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changes: String,
    previousContent: String,
  }],
}, {
  timestamps: true,
});

// Indexes for efficient querying
MayaCustomContextSchema.index({ contextType: 1, isActive: 1 });
MayaCustomContextSchema.index({ category: 1, isActive: 1 });
MayaCustomContextSchema.index({ priority: -1 });
MayaCustomContextSchema.index({ 'appliesTo.roles': 1 });

// Method to get active contexts for a specific role
MayaCustomContextSchema.statics.getActiveContextsForRole = async function(userRole) {
  return this.find({
    isActive: true,
    $or: [
      { 'appliesTo.roles': userRole },
      { 'appliesTo.roles': 'all' },
      { 'appliesTo.roles': { $exists: false } },
      { 'appliesTo.roles': { $size: 0 } },
    ],
  }).sort({ priority: -1 });
};

export default mongoose.models.MayaCustomContext || mongoose.model('MayaCustomContext', MayaCustomContextSchema);

