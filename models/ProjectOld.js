import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
  // Basic Information
  name: {
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
    maxlength: 500
  },
  // Project Classification
  category: {
    type: String,
    enum: ['development', 'research', 'maintenance', 'training', 'process_improvement', 'client_project', 'internal', 'other'],
    default: 'internal'
  },
  type: {
    type: String,
    enum: ['software', 'hardware', 'process', 'research', 'training', 'marketing', 'sales', 'hr', 'finance', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium'
  },
  // Project Management
  projectManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  projectOwner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  sponsor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  // Team Management
  team: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      enum: ['lead', 'developer', 'designer', 'tester', 'analyst', 'coordinator', 'stakeholder', 'observer'],
      default: 'developer'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: Date,
    isActive: {
      type: Boolean,
      default: true
    },
    permissions: [{
      type: String,
      enum: ['view', 'edit', 'assign_tasks', 'manage_team', 'manage_budget', 'approve_deliverables']
    }],
    allocation: {
      type: Number,
      min: 0,
      max: 100,
      default: 100
    } // Percentage allocation
  }],
  // Timeline and Milestones
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  actualStartDate: Date,
  actualEndDate: Date,
  milestones: [{
    name: String,
    description: String,
    targetDate: Date,
    actualDate: Date,
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'delayed', 'cancelled'],
      default: 'pending'
    },
    deliverables: [String],
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }],
  // Status and Progress
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled', 'archived'],
    default: 'planning'
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  health: {
    type: String,
    enum: ['green', 'yellow', 'red'],
    default: 'green'
  },
  // Budget and Resources
  budget: {
    allocated: Number,
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    breakdown: [{
      category: {
        type: String,
        enum: ['personnel', 'equipment', 'software', 'travel', 'training', 'other']
      },
      allocated: Number,
      spent: { type: Number, default: 0 }
    }]
  },
  resources: [{
    type: {
      type: String,
      enum: ['human', 'equipment', 'software', 'facility', 'other']
    },
    name: String,
    description: String,
    quantity: Number,
    cost: Number,
    allocatedFrom: Date,
    allocatedTo: Date,
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }],
  // Client and Stakeholder Information
  client: {
    name: String,
    contactPerson: String,
    email: String,
    phone: String,
    organization: String
  },
  stakeholders: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    role: {
      type: String,
      enum: ['primary', 'secondary', 'reviewer', 'approver', 'informed']
    },
    influence: {
      type: String,
      enum: ['high', 'medium', 'low']
    },
    interest: {
      type: String,
      enum: ['high', 'medium', 'low']
    }
  }],
  // Risk Management
  risks: [{
    title: String,
    description: String,
    category: {
      type: String,
      enum: ['technical', 'resource', 'schedule', 'budget', 'quality', 'external', 'other']
    },
    probability: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    impact: {
      type: String,
      enum: ['low', 'medium', 'high']
    },
    status: {
      type: String,
      enum: ['identified', 'analyzing', 'mitigating', 'monitoring', 'closed'],
      default: 'identified'
    },
    mitigation: String,
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    identifiedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Communication and Updates
  updates: [{
    title: String,
    content: String,
    type: {
      type: String,
      enum: ['progress', 'milestone', 'issue', 'risk', 'change', 'general']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    visibility: {
      type: String,
      enum: ['team', 'stakeholders', 'public', 'management'],
      default: 'team'
    },
    attachments: [{
      name: String,
      filePath: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Deliverables and Outputs
  deliverables: [{
    name: String,
    description: String,
    type: {
      type: String,
      enum: ['document', 'software', 'report', 'presentation', 'training', 'process', 'other']
    },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'review', 'approved', 'delivered'],
      default: 'planned'
    },
    dueDate: Date,
    deliveredDate: Date,
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    filePath: String,
    version: { type: String, default: '1.0' }
  }],
  // Quality and Metrics
  qualityMetrics: {
    defectRate: Number,
    customerSatisfaction: Number,
    teamSatisfaction: Number,
    budgetVariance: Number,
    scheduleVariance: Number,
    scopeCreep: Number
  },
  // Documentation and Knowledge
  documents: [{
    name: String,
    type: {
      type: String,
      enum: ['charter', 'plan', 'requirement', 'design', 'test_plan', 'user_manual', 'technical_doc', 'other']
    },
    filePath: String,
    version: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    lastModified: {
      type: Date,
      default: Date.now
    }
  }],
  // Lessons Learned
  lessonsLearned: [{
    category: {
      type: String,
      enum: ['what_went_well', 'what_could_improve', 'what_to_avoid', 'recommendations']
    },
    description: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Tags and Classification
  tags: [String],
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  businessUnit: String,
  // Cross-Department Collaboration
  crossDepartmentCollaboration: {
    enabled: {
      type: Boolean,
      default: false
    },
    departments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    }],
    collaborators: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      department: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department'
      },
      role: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  // System Fields
  projectCode: {
    type: String,
    unique: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateCategory: String,
  parentProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  subProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  // Analytics
  analytics: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    billableHours: { type: Number, default: 0 },
    teamProductivity: Number,
    riskScore: Number
  }
}, {
  timestamps: true
})

// Generate project code
ProjectSchema.pre('save', function (next) {
  if (!this.projectCode) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    this.projectCode = `PRJ${year}${month}${random}`
  }
  next()
})

// Virtual for project duration
ProjectSchema.virtual('duration').get(function () {
  if (this.startDate && this.endDate) {
    return Math.ceil((this.endDate - this.startDate) / (1000 * 60 * 60 * 24))
  }
  return 0
})

// Virtual for days remaining
ProjectSchema.virtual('daysRemaining').get(function () {
  if (this.endDate && this.status !== 'completed') {
    const today = new Date()
    const remaining = Math.ceil((this.endDate - today) / (1000 * 60 * 60 * 24))
    return Math.max(0, remaining)
  }
  return 0
})

// Methods
ProjectSchema.methods.addTeamMember = function (employeeId, role, permissions = [], allocation = 100) {
  const existingMember = this.team.find(member =>
    member.member.toString() === employeeId.toString() && member.isActive)

  if (existingMember) {
    return { success: false, message: 'Employee is already a team member' }
  }

  this.team.push({
    member: employeeId,
    role,
    permissions,
    allocation,
    joinedAt: new Date(),
    isActive: true
  })

  return { success: true, message: 'Team member added successfully' }
}

ProjectSchema.methods.updateProgress = function () {
  // This would calculate progress based on completed tasks/milestones
  // Implementation depends on your task completion logic
  return this.progress
}

ProjectSchema.methods.calculateHealth = function () {
  let healthScore = 100

  // Check schedule variance
  if (this.daysRemaining < 0) healthScore -= 30
  else if (this.daysRemaining < 7) healthScore -= 15

  // Check budget variance
  if (this.budget.spent > this.budget.allocated) healthScore -= 25
  else if (this.budget.spent > this.budget.allocated * 0.9) healthScore -= 10

  // Check risk level
  const highRisks = this.risks.filter(r => r.impact === 'high' && r.status !== 'closed').length
  healthScore -= highRisks * 10

  // Determine health color
  if (healthScore >= 80) this.health = 'green'
  else if (healthScore >= 60) this.health = 'yellow'
  else this.health = 'red'

  return this.health
}

ProjectSchema.methods.addRisk = function (title, description, category, probability, impact, owner) {
  this.risks.push({
    title,
    description,
    category,
    probability,
    impact,
    owner,
    identifiedAt: new Date()
  })
}

ProjectSchema.methods.addUpdate = function (title, content, type, author, visibility = 'team') {
  this.updates.push({
    title,
    content,
    type,
    author,
    visibility,
    createdAt: new Date()
  })
}

// Indexes
// projectCode already indexed via unique: true
ProjectSchema.index({ projectManager: 1, status: 1 })
ProjectSchema.index({ 'team.member': 1, 'team.isActive': 1 })
ProjectSchema.index({ status: 1, priority: 1 })
ProjectSchema.index({ startDate: 1, endDate: 1 })
ProjectSchema.index({ tags: 1 })
ProjectSchema.index({ department: 1, businessUnit: 1 })

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema)
