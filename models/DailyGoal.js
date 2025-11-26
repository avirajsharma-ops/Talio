import mongoose from 'mongoose'

const DailyGoalSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: () => {
      const today = new Date()
      return new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
  },
  goals: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },
    category: {
      type: String,
      enum: ['task', 'meeting', 'project', 'learning', 'admin', 'other'],
      default: 'task'
    },
    estimatedHours: {
      type: Number,
      min: 0.5,
      max: 8,
      default: 1
    },
    actualHours: {
      type: Number,
      min: 0,
      default: 0
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'cancelled', 'deferred'],
      default: 'not_started'
    },
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    startTime: Date,
    endTime: Date,
    employeeRemarks: {
      type: String,
      trim: true,
      maxlength: 300
    },
    managerRemarks: {
      type: String,
      trim: true,
      maxlength: 300
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Daily summary
  summary: {
    totalGoals: { type: Number, default: 0 },
    completedGoals: { type: Number, default: 0 },
    inProgressGoals: { type: Number, default: 0 },
    deferredGoals: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    totalEstimatedHours: { type: Number, default: 0 },
    totalActualHours: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 }
  },
  // Manager review
  managerReview: {
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    reviewDate: Date,
    overallRating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: {
      type: String,
      trim: true,
      maxlength: 500
    },
    suggestions: {
      type: String,
      trim: true,
      maxlength: 500
    }
  },
  // Reminders and notifications
  reminders: {
    morningReminderSent: { type: Boolean, default: false },
    eveningReminderSent: { type: Boolean, default: false },
    cutoffReminderSent: { type: Boolean, default: false },
    managerNotificationSent: { type: Boolean, default: false }
  },
  // Submission status
  submissionStatus: {
    isSubmitted: { type: Boolean, default: false },
    submittedAt: Date,
    isLocked: { type: Boolean, default: false },
    lockedAt: Date
  }
}, {
  timestamps: true
})

// Calculate daily summary
DailyGoalSchema.methods.calculateSummary = function() {
  const goals = this.goals || []
  
  this.summary.totalGoals = goals.length
  this.summary.completedGoals = goals.filter(g => g.status === 'completed').length
  this.summary.inProgressGoals = goals.filter(g => g.status === 'in_progress').length
  this.summary.deferredGoals = goals.filter(g => g.status === 'deferred').length
  
  this.summary.completionRate = this.summary.totalGoals > 0 ? 
    (this.summary.completedGoals / this.summary.totalGoals) * 100 : 0
  
  this.summary.totalEstimatedHours = goals.reduce((sum, g) => sum + (g.estimatedHours || 0), 0)
  this.summary.totalActualHours = goals.reduce((sum, g) => sum + (g.actualHours || 0), 0)
  
  // Calculate productivity score (completion rate + time efficiency)
  const timeEfficiency = this.summary.totalEstimatedHours > 0 ? 
    Math.min(100, (this.summary.totalEstimatedHours / this.summary.totalActualHours) * 100) : 100
  
  this.summary.productivityScore = (this.summary.completionRate * 0.7) + (timeEfficiency * 0.3)
  
  return this.summary
}

// Add a new goal
DailyGoalSchema.methods.addGoal = function(goalData) {
  this.goals.push({
    ...goalData,
    createdAt: new Date(),
    updatedAt: new Date()
  })
  this.calculateSummary()
  return this.goals[this.goals.length - 1]
}

// Update goal status
DailyGoalSchema.methods.updateGoal = function(goalId, updateData) {
  const goal = this.goals.id(goalId)
  if (!goal) return null
  
  Object.assign(goal, updateData, { updatedAt: new Date() })
  
  // Auto-calculate completion percentage based on status
  if (updateData.status === 'completed') {
    goal.completionPercentage = 100
    if (!goal.endTime) goal.endTime = new Date()
  } else if (updateData.status === 'in_progress' && !goal.startTime) {
    goal.startTime = new Date()
  }
  
  this.calculateSummary()
  return goal
}

// Submit daily goals
DailyGoalSchema.methods.submitGoals = function() {
  this.submissionStatus.isSubmitted = true
  this.submissionStatus.submittedAt = new Date()
  this.calculateSummary()
}

// Lock goals (after cutoff time)
DailyGoalSchema.methods.lockGoals = function() {
  this.submissionStatus.isLocked = true
  this.submissionStatus.lockedAt = new Date()
}

// Check if goals can be edited
DailyGoalSchema.methods.canEdit = function() {
  return !this.submissionStatus.isLocked
}

// Indexes for performance
DailyGoalSchema.index({ employee: 1, date: 1 }, { unique: true })
DailyGoalSchema.index({ date: 1 })
DailyGoalSchema.index({ 'goals.status': 1 })
DailyGoalSchema.index({ 'summary.completionRate': 1 })
DailyGoalSchema.index({ 'submissionStatus.isSubmitted': 1 })

// Pre-save middleware to update summary
DailyGoalSchema.pre('save', function(next) {
  if (this.isModified('goals')) {
    this.calculateSummary()
  }
  next()
})

export default mongoose.models.DailyGoal || mongoose.model('DailyGoal', DailyGoalSchema)
