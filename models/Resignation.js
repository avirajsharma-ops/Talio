import mongoose from 'mongoose'

const ResignationSchema = new mongoose.Schema({
  // Basic Information
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  resignationNumber: {
    type: String,
    unique: true,
    required: true
  },
  // Resignation Details
  resignationType: {
    type: String,
    enum: ['voluntary', 'involuntary', 'retirement', 'termination', 'mutual_separation', 'end_of_contract'],
    required: true
  },
  reason: {
    type: String,
    required: true,
    maxlength: 1000
  },
  reasonCategory: {
    type: String,
    enum: ['better_opportunity', 'salary', 'work_life_balance', 'career_growth', 'relocation', 'personal_reasons', 'health', 'education', 'retirement', 'dissatisfaction', 'other'],
    required: true
  },
  // Dates
  submissionDate: {
    type: Date,
    default: Date.now
  },
  lastWorkingDate: {
    type: Date,
    required: true
  },
  noticePeriod: {
    required: Number, // Days
    served: Number,
    waived: { type: Boolean, default: false },
    waiverReason: String,
    buyoutAmount: Number
  },
  // Status and Workflow
  status: {
    type: String,
    enum: ['submitted', 'under_review', 'approved', 'rejected', 'withdrawn', 'completed'],
    default: 'submitted'
  },
  // Approval Workflow
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    level: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: Date,
    comments: String,
    conditions: String
  }],
  currentApprovalLevel: {
    type: Number,
    default: 1
  },
  finalApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  finalApprovedAt: Date,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  rejectedAt: Date,
  rejectionReason: String,
  // Exit Interview
  exitInterview: {
    scheduled: { type: Boolean, default: false },
    scheduledDate: Date,
    conductedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    conductedDate: Date,
    feedback: {
      overallExperience: {
        type: Number,
        min: 1,
        max: 5
      },
      workEnvironment: {
        type: Number,
        min: 1,
        max: 5
      },
      management: {
        type: Number,
        min: 1,
        max: 5
      },
      careerGrowth: {
        type: Number,
        min: 1,
        max: 5
      },
      compensation: {
        type: Number,
        min: 1,
        max: 5
      },
      workLifeBalance: {
        type: Number,
        min: 1,
        max: 5
      }
    },
    improvements: String,
    wouldRecommend: {
      type: Boolean
    },
    wouldRejoin: {
      type: Boolean
    },
    additionalComments: String,
    confidentialFeedback: String
  },
  // Knowledge Transfer
  knowledgeTransfer: {
    required: { type: Boolean, default: true },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    documents: [{
      title: String,
      description: String,
      filePath: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    sessions: [{
      date: Date,
      duration: Number, // Minutes
      attendees: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }],
      topics: [String],
      notes: String,
      completed: { type: Boolean, default: false }
    }],
    completionStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'not_required'],
      default: 'not_started'
    },
    completedAt: Date,
    signOffBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  },
  // Asset Return
  assetReturn: {
    assets: [{
      assetId: String,
      assetName: String,
      assetType: {
        type: String,
        enum: ['laptop', 'mobile', 'id_card', 'access_card', 'keys', 'documents', 'other']
      },
      serialNumber: String,
      condition: {
        type: String,
        enum: ['good', 'fair', 'damaged', 'lost']
      },
      returnedDate: Date,
      receivedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      notes: String
    }],
    allAssetsReturned: { type: Boolean, default: false },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    verifiedAt: Date
  },
  // Access Revocation
  accessRevocation: {
    systemAccess: [{
      system: String,
      accessRevoked: { type: Boolean, default: false },
      revokedDate: Date,
      revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    }],
    physicalAccess: {
      revoked: { type: Boolean, default: false },
      revokedDate: Date,
      revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      }
    },
    allAccessRevoked: { type: Boolean, default: false }
  },
  // Final Settlement
  finalSettlement: {
    calculated: { type: Boolean, default: false },
    calculatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    calculatedAt: Date,
    components: {
      basicSalary: Number,
      allowances: Number,
      bonus: Number,
      leaveEncashment: Number,
      gratuity: Number,
      providentFund: Number,
      otherEarnings: Number,
      totalEarnings: Number,
      // Deductions
      noticePeriodRecovery: Number,
      loanRecovery: Number,
      advanceRecovery: Number,
      damageRecovery: Number,
      otherDeductions: Number,
      totalDeductions: Number,
      // Net amount
      netPayable: Number
    },
    approved: { type: Boolean, default: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approvedAt: Date,
    paid: { type: Boolean, default: false },
    paidDate: Date,
    paymentMode: {
      type: String,
      enum: ['bank_transfer', 'cheque', 'cash']
    },
    transactionId: String
  },
  // Documentation
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['resignation_letter', 'acceptance_letter', 'noc', 'experience_certificate', 'relieving_letter', 'settlement_letter', 'other']
    },
    filePath: String,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    issued: { type: Boolean, default: false },
    issuedDate: Date
  }],
  // Rehire Eligibility
  rehireEligibility: {
    eligible: {
      type: Boolean,
      default: true
    },
    reason: String,
    reviewDate: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    notes: String
  },
  // Communication
  communications: [{
    type: {
      type: String,
      enum: ['email', 'meeting', 'call', 'message']
    },
    subject: String,
    content: String,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    sentTo: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    sentAt: {
      type: Date,
      default: Date.now
    },
    response: String,
    responseDate: Date
  }],
  // System Fields
  isUrgent: {
    type: Boolean,
    default: false
  },
  urgencyReason: String,
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  // Analytics
  processingTime: Number, // Days from submission to completion
  exitScore: Number, // Overall exit experience score
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
    details: String
  }]
}, {
  timestamps: true
})

// Generate resignation number
ResignationSchema.pre('save', function (next) {
  if (!this.resignationNumber) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    this.resignationNumber = `RES${year}${month}${random}`
  }
  next()
})

// Methods
ResignationSchema.methods.calculateNoticePeriod = function () {
  const submissionDate = new Date(this.submissionDate)
  const lastWorkingDate = new Date(this.lastWorkingDate)
  const timeDiff = lastWorkingDate.getTime() - submissionDate.getTime()
  this.noticePeriod.served = Math.ceil(timeDiff / (1000 * 3600 * 24))
  return this.noticePeriod.served
}

ResignationSchema.methods.calculateProcessingTime = function () {
  if (this.completedAt) {
    const submissionDate = new Date(this.submissionDate)
    const completionDate = new Date(this.completedAt)
    const timeDiff = completionDate.getTime() - submissionDate.getTime()
    this.processingTime = Math.ceil(timeDiff / (1000 * 3600 * 24))
  }
  return this.processingTime
}

ResignationSchema.methods.isReadyForCompletion = function () {
  return this.status === 'approved' &&
    this.knowledgeTransfer.completionStatus === 'completed' &&
    this.assetReturn.allAssetsReturned &&
    this.accessRevocation.allAccessRevoked &&
    this.finalSettlement.paid
}

ResignationSchema.methods.addAuditEntry = function (action, performedBy, details) {
  this.auditTrail.push({
    action,
    performedBy,
    details,
    timestamp: new Date()
  })
}

// Indexes
ResignationSchema.index({ resignationNumber: 1 })
ResignationSchema.index({ employee: 1, status: 1 })
ResignationSchema.index({ status: 1, submissionDate: 1 })
ResignationSchema.index({ lastWorkingDate: 1 })
ResignationSchema.index({ reasonCategory: 1 })

export default mongoose.models.Resignation || mongoose.model('Resignation', ResignationSchema)
