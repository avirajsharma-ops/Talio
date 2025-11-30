import mongoose from 'mongoose';

/**
 * Approval Request types:
 * - task_deletion: Request to delete a task
 * - project_completion: Request to mark project as completed
 * - member_removal: Request to remove a member
 */

const ProjectApprovalRequestSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'task_deletion',
      'project_completion',
      'member_removal'
    ]
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  reviewedAt: {
    type: Date
  },
  reviewerComment: {
    type: String,
    trim: true
  },
  // Related entities
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  // Request details
  reason: {
    type: String,
    trim: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
ProjectApprovalRequestSchema.index({ project: 1, status: 1 });
ProjectApprovalRequestSchema.index({ project: 1, type: 1, status: 1 });
ProjectApprovalRequestSchema.index({ requestedBy: 1 });
ProjectApprovalRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.models.ProjectApprovalRequest || mongoose.model('ProjectApprovalRequest', ProjectApprovalRequestSchema);
