import mongoose from 'mongoose'

const PIPSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  pipNumber: {
    type: String,
    unique: true,
    required: true
  },
  // PIP Details
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 1000
  },
  category: {
    type: String,
    enum: ['performance', 'attendance', 'behavior', 'skills', 'compliance', 'other'],
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Timeline
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // Duration in days
    required: true
  },
  // Performance Issues
  performanceIssues: [{
    issue: {
      type: String,
      required: true,
      maxlength: 300
    },
    impact: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    evidenceProvided: {
      type: Boolean,
      default: false
    },
    evidenceDetails: String,
    dateIdentified: {
      type: Date,
      default: Date.now
    }
  }],
  // Improvement Goals
  improvementGoals: [{
    goal: {
      type: String,
      required: true,
      maxlength: 300
    },
    targetDate: {
      type: Date,
      required: true
    },
    measurableOutcome: {
      type: String,
      required: true,
      maxlength: 300
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'partially_achieved', 'not_achieved'],
      default: 'not_started'
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    completedDate: Date,
    managerNotes: String
  }],
  // Support and Resources
  supportProvided: [{
    type: {
      type: String,
      enum: ['training', 'mentoring', 'coaching', 'resources', 'tools', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true,
      maxlength: 300
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    startDate: Date,
    endDate: Date,
    status: {
      type: String,
      enum: ['planned', 'ongoing', 'completed', 'cancelled'],
      default: 'planned'
    },
    effectiveness: {
      type: Number,
      min: 1,
      max: 5
    },
    notes: String
  }],
  // Review Schedule
  reviewSchedule: [{
    reviewDate: {
      type: Date,
      required: true
    },
    reviewType: {
      type: String,
      enum: ['weekly', 'bi_weekly', 'monthly', 'milestone', 'final'],
      required: true
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'postponed', 'cancelled'],
      default: 'scheduled'
    },
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    conductedDate: Date,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    nextSteps: String,
    employeeComments: String
  }],
  // PIP Status
  status: {
    type: String,
    enum: ['active', 'successful', 'unsuccessful', 'extended', 'terminated', 'cancelled'],
    default: 'active'
  },
  // Stakeholders
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  directManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  hrPartner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  mentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  // Employee Acknowledgment
  employeeAcknowledgment: {
    acknowledged: {
      type: Boolean,
      default: false
    },
    acknowledgedDate: Date,
    employeeComments: String,
    employeeSignature: String, // Digital signature or confirmation
    disagreement: {
      type: Boolean,
      default: false
    },
    disagreementReason: String
  },
  // Final Outcome
  finalOutcome: {
    result: {
      type: String,
      enum: ['successful', 'unsuccessful', 'partially_successful', 'extended', 'terminated'],
    },
    completionDate: Date,
    finalRating: {
      type: Number,
      min: 1,
      max: 5
    },
    overallProgress: {
      type: Number,
      min: 0,
      max: 100
    },
    nextAction: {
      type: String,
      enum: ['continue_employment', 'promotion', 'role_change', 'termination', 'extended_pip', 'probation'],
    },
    finalComments: String,
    hrRecommendation: String,
    managerRecommendation: String
  },
  // Documentation
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['pip_document', 'evidence', 'training_material', 'review_notes', 'other']
    },
    filePath: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // System fields
  isActive: {
    type: Boolean,
    default: true
  },
  autoExtended: {
    type: Boolean,
    default: false
  },
  extensionReason: String,
  originalEndDate: Date,
  // Notifications
  notifications: {
    employeeNotified: { type: Boolean, default: false },
    managerNotified: { type: Boolean, default: false },
    hrNotified: { type: Boolean, default: false },
    lastReminderSent: Date,
    reminderCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true
})

// Generate PIP number
PIPSchema.pre('save', function (next) {
  if (!this.pipNumber) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    this.pipNumber = `PIP${year}${month}${random}`
  }
  next()
})

// Calculate duration before save
PIPSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const timeDiff = this.endDate.getTime() - this.startDate.getTime()
    this.duration = Math.ceil(timeDiff / (1000 * 3600 * 24))
  }
  next()
})

// Methods
PIPSchema.methods.calculateOverallProgress = function () {
  if (this.improvementGoals.length === 0) return 0

  const totalProgress = this.improvementGoals.reduce((sum, goal) => sum + goal.progress, 0)
  return Math.round(totalProgress / this.improvementGoals.length)
}

PIPSchema.methods.getDaysRemaining = function () {
  const today = new Date()
  const timeDiff = this.endDate.getTime() - today.getTime()
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

PIPSchema.methods.isOverdue = function () {
  return new Date() > this.endDate && this.status === 'active'
}

PIPSchema.methods.getNextReview = function () {
  const upcomingReviews = this.reviewSchedule.filter(review =>
    review.status === 'scheduled' && new Date(review.reviewDate) > new Date()
  )
  return upcomingReviews.sort((a, b) => new Date(a.reviewDate) - new Date(b.reviewDate))[0]
}

// Indexes
PIPSchema.index({ employee: 1, status: 1 })
PIPSchema.index({ pipNumber: 1 })
PIPSchema.index({ status: 1, endDate: 1 })
PIPSchema.index({ assignedBy: 1 })
PIPSchema.index({ directManager: 1 })

export default mongoose.models.PIP || mongoose.model('PIP', PIPSchema)
