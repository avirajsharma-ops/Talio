import mongoose from 'mongoose'

const ApprovalWorkflowSchema = new mongoose.Schema({
  // Workflow Definition
  workflowName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  workflowType: {
    type: String,
    required: true,
    enum: ['leave', 'expense', 'travel', 'purchase', 'recruitment', 'promotion', 'transfer', 'resignation', 'pip', 'custom']
  },
  description: {
    type: String,
    maxlength: 500
  },
  // Workflow Configuration
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  priority: {
    type: Number,
    default: 1
  },
  // Applicability Rules
  applicabilityRules: {
    departments: [String],
    designations: [String],
    employeeTypes: [String],
    locations: [String],
    salaryRange: {
      min: Number,
      max: Number
    },
    experienceRange: {
      min: Number,
      max: Number
    },
    customConditions: [{
      field: String,
      operator: {
        type: String,
        enum: ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains']
      },
      value: String
    }]
  },
  // Approval Levels
  approvalLevels: [{
    level: {
      type: Number,
      required: true
    },
    name: {
      type: String,
      required: true,
      maxlength: 100
    },
    description: String,
    // Approver Configuration
    approverType: {
      type: String,
      enum: ['direct_manager', 'department_head', 'hr', 'finance', 'admin', 'ceo', 'specific_person', 'role_based', 'committee'],
      required: true
    },
    specificApprovers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    roleBasedApprovers: [String], // Role names
    // Approval Rules
    isRequired: {
      type: Boolean,
      default: true
    },
    isParallel: {
      type: Boolean,
      default: false // If true, all approvers at this level must approve
    },
    minimumApprovals: {
      type: Number,
      default: 1
    },
    // Conditions for this level
    conditions: [{
      field: String,
      operator: String,
      value: String,
      action: {
        type: String,
        enum: ['require', 'skip', 'auto_approve']
      }
    }],
    // Auto-approval rules
    autoApprovalRules: [{
      condition: String,
      maxAmount: Number,
      maxDays: Number,
      description: String
    }],
    // Escalation
    escalation: {
      enabled: {
        type: Boolean,
        default: false
      },
      timeoutHours: {
        type: Number,
        default: 24
      },
      escalateTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      escalationAction: {
        type: String,
        enum: ['notify', 'auto_approve', 'reassign'],
        default: 'notify'
      }
    },
    // Delegation
    delegation: {
      allowed: {
        type: Boolean,
        default: true
      },
      maxDelegationDays: {
        type: Number,
        default: 30
      }
    }
  }],
  // Workflow Settings
  settings: {
    allowWithdrawal: {
      type: Boolean,
      default: true
    },
    allowModification: {
      type: Boolean,
      default: false
    },
    requireComments: {
      type: Boolean,
      default: false
    },
    notifySubmitter: {
      type: Boolean,
      default: true
    },
    notifyApprovers: {
      type: Boolean,
      default: true
    },
    reminderFrequency: {
      type: Number,
      default: 24 // Hours
    },
    maxReminderCount: {
      type: Number,
      default: 3
    },
    autoRejectAfterDays: {
      type: Number,
      default: 0 // 0 means no auto-rejection
    }
  },
  // Email Templates
  emailTemplates: {
    submission: {
      subject: String,
      body: String
    },
    approval: {
      subject: String,
      body: String
    },
    rejection: {
      subject: String,
      body: String
    },
    reminder: {
      subject: String,
      body: String
    },
    escalation: {
      subject: String,
      body: String
    }
  },
  // Workflow Statistics
  statistics: {
    totalRequests: { type: Number, default: 0 },
    approvedRequests: { type: Number, default: 0 },
    rejectedRequests: { type: Number, default: 0 },
    pendingRequests: { type: Number, default: 0 },
    averageApprovalTime: { type: Number, default: 0 }, // In hours
    lastUsed: Date
  },
  // Administrative
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  version: {
    type: Number,
    default: 1
  },
  // Workflow History
  versionHistory: [{
    version: Number,
    changes: String,
    modifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    modifiedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
})

// Methods
ApprovalWorkflowSchema.methods.isApplicableFor = function(employee, requestData = {}) {
  const rules = this.applicabilityRules
  
  // Check departments
  if (rules.departments && rules.departments.length > 0) {
    if (!rules.departments.includes(employee.department)) return false
  }
  
  // Check designations
  if (rules.designations && rules.designations.length > 0) {
    if (!rules.designations.includes(employee.designation)) return false
  }
  
  // Check employee types
  if (rules.employeeTypes && rules.employeeTypes.length > 0) {
    if (!rules.employeeTypes.includes(employee.employeeType)) return false
  }
  
  // Check locations
  if (rules.locations && rules.locations.length > 0) {
    if (!rules.locations.includes(employee.location)) return false
  }
  
  // Check salary range
  if (rules.salaryRange && employee.salary) {
    if (rules.salaryRange.min && employee.salary < rules.salaryRange.min) return false
    if (rules.salaryRange.max && employee.salary > rules.salaryRange.max) return false
  }
  
  // Check custom conditions
  if (rules.customConditions && rules.customConditions.length > 0) {
    for (const condition of rules.customConditions) {
      const fieldValue = requestData[condition.field] || employee[condition.field]
      if (!this.evaluateCondition(fieldValue, condition.operator, condition.value)) {
        return false
      }
    }
  }
  
  return true
}

ApprovalWorkflowSchema.methods.evaluateCondition = function(fieldValue, operator, expectedValue) {
  switch (operator) {
    case 'equals':
      return fieldValue == expectedValue
    case 'not_equals':
      return fieldValue != expectedValue
    case 'greater_than':
      return Number(fieldValue) > Number(expectedValue)
    case 'less_than':
      return Number(fieldValue) < Number(expectedValue)
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase())
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(expectedValue).toLowerCase())
    default:
      return false
  }
}

ApprovalWorkflowSchema.methods.getApproversForLevel = function(level, employee) {
  const approvalLevel = this.approvalLevels.find(l => l.level === level)
  if (!approvalLevel) return []
  
  let approvers = []
  
  switch (approvalLevel.approverType) {
    case 'direct_manager':
      if (employee.reportingManager) {
        approvers.push(employee.reportingManager)
      }
      break
    case 'specific_person':
      approvers = [...approvalLevel.specificApprovers]
      break
    case 'role_based':
      // This would need to be implemented based on your role system
      break
    default:
      approvers = [...approvalLevel.specificApprovers]
  }
  
  return approvers
}

ApprovalWorkflowSchema.methods.updateStatistics = function(action) {
  switch (action) {
    case 'submitted':
      this.statistics.totalRequests += 1
      this.statistics.pendingRequests += 1
      break
    case 'approved':
      this.statistics.approvedRequests += 1
      this.statistics.pendingRequests -= 1
      break
    case 'rejected':
      this.statistics.rejectedRequests += 1
      this.statistics.pendingRequests -= 1
      break
  }
  this.statistics.lastUsed = new Date()
}

// Indexes
ApprovalWorkflowSchema.index({ workflowType: 1, isActive: 1 })
ApprovalWorkflowSchema.index({ isDefault: 1, workflowType: 1 })
ApprovalWorkflowSchema.index({ 'applicabilityRules.departments': 1 })
ApprovalWorkflowSchema.index({ createdBy: 1 })

export default mongoose.models.ApprovalWorkflow || mongoose.model('ApprovalWorkflow', ApprovalWorkflowSchema)
