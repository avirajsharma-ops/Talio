import mongoose from 'mongoose'

const SuggestionSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  summary: {
    type: String,
    maxlength: 300
  },
  // Categorization
  category: {
    type: String,
    required: true,
    enum: ['process_improvement', 'cost_reduction', 'technology', 'workplace', 'customer_service', 'product', 'safety', 'environment', 'training', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['suggestion', 'innovation', 'complaint', 'feedback', 'idea']
  },
  // Submitter Information
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  submitterName: String, // For anonymous submissions
  // Impact Assessment
  expectedImpact: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'medium'
  },
  impactAreas: [{
    type: String,
    enum: ['productivity', 'cost_savings', 'quality', 'safety', 'employee_satisfaction', 'customer_satisfaction', 'revenue', 'efficiency']
  }],
  estimatedSavings: {
    amount: Number,
    currency: { type: String, default: 'INR' },
    timeframe: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly', 'one_time']
    }
  },
  // Implementation Details
  implementationComplexity: {
    type: String,
    enum: ['low', 'medium', 'high', 'very_high'],
    default: 'medium'
  },
  estimatedCost: {
    amount: Number,
    currency: { type: String, default: 'INR' },
    breakdown: String
  },
  estimatedTimeframe: {
    value: Number,
    unit: {
      type: String,
      enum: ['days', 'weeks', 'months', 'years']
    }
  },
  requiredResources: [{
    type: String,
    enum: ['human_resources', 'technology', 'budget', 'training', 'infrastructure', 'external_vendor']
  }],
  // Status and Workflow
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'implemented', 'on_hold', 'cancelled'],
    default: 'submitted'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  // Review Process
  reviewers: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      enum: ['primary', 'secondary', 'technical', 'financial', 'implementation']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_clarification'],
      default: 'pending'
    },
    reviewDate: Date,
    comments: String,
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    recommendation: {
      type: String,
      enum: ['strongly_recommend', 'recommend', 'neutral', 'not_recommend', 'strongly_not_recommend']
    }
  }],
  // Evaluation Criteria
  evaluation: {
    feasibility: { type: Number, min: 1, max: 5 },
    impact: { type: Number, min: 1, max: 5 },
    innovation: { type: Number, min: 1, max: 5 },
    costBenefit: { type: Number, min: 1, max: 5 },
    alignment: { type: Number, min: 1, max: 5 }, // Alignment with company goals
    overallScore: { type: Number, min: 1, max: 5 },
    evaluatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    evaluatedAt: Date,
    evaluationNotes: String
  },
  // Implementation Tracking
  implementation: {
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    team: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    startDate: Date,
    targetCompletionDate: Date,
    actualCompletionDate: Date,
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    milestones: [{
      title: String,
      description: String,
      targetDate: Date,
      completedDate: Date,
      status: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'delayed'],
        default: 'pending'
      }
    }],
    actualCost: Number,
    actualSavings: Number,
    implementationNotes: String
  },
  // Feedback and Communication
  feedback: [{
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    message: String,
    type: {
      type: String,
      enum: ['question', 'clarification', 'suggestion', 'concern', 'support']
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    responses: [{
      from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      message: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],
  // Voting and Support
  votes: {
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    voters: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      vote: {
        type: String,
        enum: ['up', 'down']
      },
      votedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // Recognition and Rewards
  recognition: {
    isRecognized: {
      type: Boolean,
      default: false
    },
    recognitionType: {
      type: String,
      enum: ['certificate', 'monetary', 'promotion', 'public_recognition', 'innovation_award']
    },
    rewardAmount: Number,
    recognizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    recognizedAt: Date,
    recognitionNotes: String
  },
  // Attachments and Documentation
  attachments: [{
    name: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['supporting_document', 'diagram', 'presentation', 'calculation', 'research', 'other']
    }
  }],
  // Tags and Search
  tags: [String],
  keywords: [String],
  // System Fields
  suggestionNumber: {
    type: String,
    unique: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  // Audit Trail
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
})

// Generate suggestion number
SuggestionSchema.pre('save', function(next) {
  if (!this.suggestionNumber) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    this.suggestionNumber = `SUG${year}${month}${random}`
  }
  next()
})

// Methods
SuggestionSchema.methods.addVote = function(employeeId, voteType) {
  // Remove existing vote from same employee
  this.votes.voters = this.votes.voters.filter(voter => voter.employee.toString() !== employeeId.toString())
  
  // Add new vote
  this.votes.voters.push({
    employee: employeeId,
    vote: voteType,
    votedAt: new Date()
  })
  
  // Recalculate vote counts
  this.votes.upvotes = this.votes.voters.filter(v => v.vote === 'up').length
  this.votes.downvotes = this.votes.voters.filter(v => v.vote === 'down').length
}

SuggestionSchema.methods.updateStatus = function(newStatus, changedBy, reason = '') {
  this.statusHistory.push({
    status: this.status,
    changedBy,
    changedAt: new Date(),
    reason
  })
  this.status = newStatus
}

SuggestionSchema.methods.calculateOverallScore = function() {
  const { feasibility, impact, innovation, costBenefit, alignment } = this.evaluation
  if (feasibility && impact && innovation && costBenefit && alignment) {
    this.evaluation.overallScore = (feasibility + impact + innovation + costBenefit + alignment) / 5
  }
  return this.evaluation.overallScore
}

SuggestionSchema.methods.getNetVotes = function() {
  return this.votes.upvotes - this.votes.downvotes
}

// Indexes
SuggestionSchema.index({ suggestionNumber: 1 })
SuggestionSchema.index({ submittedBy: 1, status: 1 })
SuggestionSchema.index({ category: 1, type: 1 })
SuggestionSchema.index({ status: 1, priority: 1 })
SuggestionSchema.index({ tags: 1 })
SuggestionSchema.index({ 'votes.upvotes': -1 })

export default mongoose.models.Suggestion || mongoose.model('Suggestion', SuggestionSchema)
