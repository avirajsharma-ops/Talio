import mongoose from 'mongoose';

/**
 * Timeline Event types:
 * - project_created, project_updated, project_status_changed
 * - member_invited, member_accepted, member_rejected, member_removed
 * - task_created, task_updated, task_assigned, task_status_changed, task_completed
 * - task_assignment_accepted, task_assignment_rejected
 * - task_deleted, task_deletion_requested, task_reassigned
 * - comment_added
 * - project_completion_requested, project_approved, project_rejected
 */

const ProjectTimelineEventSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'project_created',
      'project_updated',
      'project_status_changed',
      'member_invited',
      'member_accepted',
      'member_rejected',
      'member_removed',
      'task_created',
      'task_updated',
      'task_assigned',
      'task_status_changed',
      'task_completed',
      'task_deleted',
      'task_deletion_requested',
      'task_reassigned',
      'task_assignment_accepted',
      'task_assignment_rejected',
      'comment_added',
      'project_completion_requested',
      'project_approved',
      'project_rejected',
      'attachment_added',
      'milestone_reached'
    ]
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  // Related entities for this event
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  relatedMember: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  // Metadata containing event-specific details
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // Examples:
    // { oldStatus: 'todo', newStatus: 'in-progress' }
    // { taskTitle: 'Design homepage', assignees: ['John', 'Jane'] }
    // { comment: 'Great progress!' }
    // { remark: 'Project completed successfully' }
  },
  // Human-readable description
  description: {
    type: String,
    trim: true
  },
  // For comment events, store the full comment content
  commentContent: {
    type: String,
    trim: true,
    maxlength: [5000, 'Comment cannot exceed 5000 characters']
  },
  // Visibility settings
  isInternal: {
    type: Boolean,
    default: false // false means visible to all members
  }
}, {
  timestamps: true
});

// Indexes for performance
ProjectTimelineEventSchema.index({ project: 1, createdAt: -1 });
ProjectTimelineEventSchema.index({ project: 1, type: 1 });
ProjectTimelineEventSchema.index({ createdBy: 1 });
ProjectTimelineEventSchema.index({ relatedTask: 1 });
ProjectTimelineEventSchema.index({ type: 1, createdAt: -1 });

export default mongoose.models.ProjectTimelineEvent || mongoose.model('ProjectTimelineEvent', ProjectTimelineEventSchema);
