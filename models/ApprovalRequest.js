import mongoose from 'mongoose'

const ApprovalRequestSchema = new mongoose.Schema({
  // Request Identification
  requestNumber: {
    type: String,
    unique: true,
    required: true
  },
  requestType: {
    type: String,
    required: true,
    enum: ['leave', 'expense', 'travel', 'purchase', 'recruitment', 'promotion', 'transfer', 'resignation', 'pip', 'custom']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    maxlength: 1000
  },
  // Requester Information
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  requestedFor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee' // Can be different from requestedBy (e.g., manager requesting for team member)
  },
  // Workflow Reference
  workflow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ApprovalWorkflow',
    required: true
  },
  // Request Data
  requestData: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  // Related Document Reference
  relatedDocument: {
    documentType: String, // 'Leave', 'Expense', etc.
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'relatedDocument.documentType'
    }
  },
  // Current Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'withdrawn'],
    default: 'pending'
  },
  currentLevel: {
    type: Number,
    default: 1
  },
  // Approval Chain
  approvalChain: [{
    level: {
      type: Number,
      required: true
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    approverName: String, // Cached for history
    approverRole: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'delegated', 'escalated'],
      default: 'pending'
    },
    actionDate: Date,
    comments: String,
    attachments: [{
      name: String,
      filePath: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    // Delegation info
    delegatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    delegatedAt: Date,
    delegationReason: String,
    // Escalation info
    escalatedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    escalatedAt: Date,
    escalationReason: String,
    // Timing
    assignedAt: {
      type: Date,
      default: Date.now
    },
    remindersSent: {
      type: Number,
      default: 0
    },
    lastReminderSent: Date
  }],
  // Final Decision
  finalDecision: {
    decision: {
      type: String,
      enum: ['approved', 'rejected', 'cancelled']
    },
    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    decidedAt: Date,
    finalComments: String,
    overrideReason: String // If decision was overridden
  },
  // Priority and Urgency
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  urgencyReason: String,
  // Timing Information
  submittedAt: {
    type: Date,
    default: Date.now
  },
  expectedCompletionDate: Date,
  actualCompletionDate: Date,
  // SLA Tracking
  sla: {
    expectedResponseTime: Number, // Hours
    actualResponseTime: Number,
    isBreached: {
      type: Boolean,
      default: false
    },
    breachReason: String
  },
  // Notifications
  notifications: {
    submitterNotified: {
      type: Boolean,
      default: false
    },
    approversNotified: {
      type: Boolean,
      default: false
    },
    completionNotified: {
      type: Boolean,
      default: false
    },
    escalationNotified: {
      type: Boolean,
      default: false
    }
  },
  // Request Modifications
  modifications: [{
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    },
    changes: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },
    reason: String,
    approvalRequired: {
      type: Boolean,
      default: true
    }
  }],
  // Attachments
  attachments: [{
    name: String,
    originalName: String,
    filePath: String,
    fileSize: Number,
    mimeType: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    category: {
      type: String,
      enum: ['supporting_document', 'evidence', 'approval_document', 'other'],
      default: 'supporting_document'
    }
  }],
  // Comments and Communication
  comments: [{
    commentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    comment: {
      type: String,
      required: true,
      maxlength: 1000
    },
    commentType: {
      type: String,
      enum: ['general', 'question', 'clarification', 'objection', 'support'],
      default: 'general'
    },
    isPrivate: {
      type: Boolean,
      default: false
    },
    visibleTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // System Fields
  autoApproved: {
    type: Boolean,
    default: false
  },
  autoApprovalReason: String,
  systemNotes: String,
  // Audit Trail
  auditTrail: [{
    action: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    ipAddress: String,
    userAgent: String
  }]
}, {
  timestamps: true
})

// Generate request number
ApprovalRequestSchema.pre('save', function(next) {
  if (!this.requestNumber) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    const prefix = this.requestType.toUpperCase().substring(0, 3)
    this.requestNumber = `${prefix}${year}${month}${random}`
  }
  next()
})

// Methods
ApprovalRequestSchema.methods.getCurrentApprovers = function() {
  return this.approvalChain.filter(chain => 
    chain.level === this.currentLevel && chain.status === 'pending'
  )
}

ApprovalRequestSchema.methods.moveToNextLevel = function() {
  const currentLevelApprovers = this.approvalChain.filter(chain => chain.level === this.currentLevel)
  const allApproved = currentLevelApprovers.every(chain => chain.status === 'approved')
  
  if (allApproved) {
    const nextLevel = this.currentLevel + 1
    const hasNextLevel = this.approvalChain.some(chain => chain.level === nextLevel)
    
    if (hasNextLevel) {
      this.currentLevel = nextLevel
      return false // Not completed yet
    } else {
      this.status = 'approved'
      this.finalDecision.decision = 'approved'
      this.finalDecision.decidedAt = new Date()
      this.actualCompletionDate = new Date()
      return true // Completed
    }
  }
  return false
}

ApprovalRequestSchema.methods.reject = function(rejectedBy, comments) {
  this.status = 'rejected'
  this.finalDecision.decision = 'rejected'
  this.finalDecision.decidedBy = rejectedBy
  this.finalDecision.decidedAt = new Date()
  this.finalDecision.finalComments = comments
  this.actualCompletionDate = new Date()
}

ApprovalRequestSchema.methods.addComment = function(commentBy, comment, commentType = 'general', isPrivate = false) {
  this.comments.push({
    commentBy,
    comment,
    commentType,
    isPrivate,
    createdAt: new Date()
  })
}

ApprovalRequestSchema.methods.addAuditEntry = function(action, performedBy, details, ipAddress, userAgent) {
  this.auditTrail.push({
    action,
    performedBy,
    details,
    ipAddress,
    userAgent,
    timestamp: new Date()
  })
}

// Indexes
ApprovalRequestSchema.index({ requestNumber: 1 })
ApprovalRequestSchema.index({ requestedBy: 1, status: 1 })
ApprovalRequestSchema.index({ requestType: 1, status: 1 })
ApprovalRequestSchema.index({ 'approvalChain.approver': 1, 'approvalChain.status': 1 })
ApprovalRequestSchema.index({ status: 1, currentLevel: 1 })
ApprovalRequestSchema.index({ submittedAt: 1 })

export default mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', ApprovalRequestSchema)
