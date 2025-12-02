import mongoose from 'mongoose'

const MilestoneSchema = new mongoose.Schema({
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
  dueDate: {
    type: Date
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  }
}, { _id: true })

const PerformanceGoalSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  description: {
    type: String,
    trim: true,
    maxlength: 2000
  },
  category: {
    type: String,
    enum: [
      'Skill Development',
      'Project Management',
      'Leadership',
      'Performance Improvement',
      'Career Growth',
      'Team Collaboration',
      'Innovation',
      'Customer Service',
      'Quality Improvement',
      'General',
      'Other'
    ],
    default: 'General'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'on-hold', 'completed', 'cancelled'],
    default: 'not-started',
    index: true
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date
  },
  milestones: [MilestoneSchema],
  // Key Results for OKR-style goals
  keyResults: [{
    title: {
      type: String,
      trim: true
    },
    target: {
      type: Number
    },
    current: {
      type: Number,
      default: 0
    },
    unit: {
      type: String,
      trim: true
    }
  }],
  // Weightage for performance calculation
  weightage: {
    type: Number,
    min: 0,
    max: 100,
    default: 10
  },
  // Alignment
  alignedTo: {
    type: String,
    enum: ['company', 'department', 'team', 'individual'],
    default: 'individual'
  },
  // Comments/Updates
  updates: [{
    message: {
      type: String,
      trim: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  // Department for filtering
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    index: true
  },
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  // Review/Approval
  isApproved: {
    type: Boolean,
    default: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: {
    type: Date
  }
}, {
  timestamps: true
})

// Indexes for common queries
PerformanceGoalSchema.index({ employee: 1, status: 1 })
PerformanceGoalSchema.index({ department: 1, status: 1 })
PerformanceGoalSchema.index({ dueDate: 1, status: 1 })
PerformanceGoalSchema.index({ createdBy: 1 })

// Virtual for checking if goal is overdue
PerformanceGoalSchema.virtual('isOverdue').get(function() {
  return this.status !== 'completed' && this.status !== 'cancelled' && new Date(this.dueDate) < new Date()
})

// Virtual for days remaining
PerformanceGoalSchema.virtual('daysRemaining').get(function() {
  const now = new Date()
  const due = new Date(this.dueDate)
  const diffTime = due - now
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
})

// Pre-save hook to update progress based on milestones
PerformanceGoalSchema.pre('save', function(next) {
  if (this.milestones && this.milestones.length > 0) {
    const completedMilestones = this.milestones.filter(m => m.completed).length
    this.progress = Math.round((completedMilestones / this.milestones.length) * 100)
  }
  
  // Auto-update status based on progress
  if (this.progress === 100 && this.status !== 'completed') {
    this.status = 'completed'
    this.completedAt = new Date()
  }
  
  next()
})

// Ensure virtuals are included when converting to JSON
PerformanceGoalSchema.set('toJSON', { virtuals: true })
PerformanceGoalSchema.set('toObject', { virtuals: true })

export default mongoose.models.PerformanceGoal || mongoose.model('PerformanceGoal', PerformanceGoalSchema)
