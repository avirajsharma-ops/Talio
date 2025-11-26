import mongoose from 'mongoose'

const ActivitySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'attendance_checkin',
      'attendance_checkout',
      'leave_apply',
      'leave_approve',
      'leave_reject',
      'task_create',
      'task_update',
      'task_complete',
      'task_review',
      'task_approve',
      'task_reject',
      'milestone_create',
      'milestone_complete',
      'profile_update',
      'password_change',
      'document_upload',
      'expense_submit',
      'travel_request',
      'goal_create',
      'goal_complete',
      'performance_review',
      'training_enroll',
      'training_complete',
      'project_join',
      'team_join',
      'comment_add',
      'file_upload',
      'other'
    ],
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true
  },
  details: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  relatedModel: {
    type: String,
    enum: ['Task', 'Leave', 'Attendance', 'Expense', 'Travel', 'Goal', 'Performance', 'Training', 'Project', 'Document', 'Employee', null]
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
})

// Index for efficient querying
ActivitySchema.index({ employee: 1, createdAt: -1 })
ActivitySchema.index({ type: 1, createdAt: -1 })
ActivitySchema.index({ createdAt: -1 })

export default mongoose.models.Activity || mongoose.model('Activity', ActivitySchema)

