import mongoose from 'mongoose'

const activitySchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'login',
      'logout',
      'attendance',
      'leave',
      'task',
      'document',
      'profile',
      'system',
      'screenshot',
      'productivity',
      'other'
    ],
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
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  relatedModel: {
    type: String,
    enum: ['Attendance', 'Leave', 'Task', 'Document', 'Employee', 'User', 'ProductivitySession', null]
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
})

// Compound indexes for common queries
activitySchema.index({ employee: 1, createdAt: -1 })
activitySchema.index({ employee: 1, type: 1, createdAt: -1 })

const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema)

export default Activity
