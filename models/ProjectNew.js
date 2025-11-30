import mongoose from 'mongoose'

const ProjectSchema = new mongoose.Schema({
  // ===== BASIC INFORMATION =====
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  title: {
    type: String,
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

  // ===== PROJECT CLASSIFICATION =====
  category: {
    type: String,
    enum: ['project', 'development', 'research', 'maintenance', 'training', 'process_improvement', 'client_project', 'internal', 'meeting', 'review', 'documentation', 'testing', 'support', 'other'],
    default: 'internal'
  },
  type: {
    type: String,
    enum: ['individual', 'collaborative', 'milestone', 'recurring', 'urgent', 'software', 'hardware', 'process', 'marketing', 'sales', 'hr', 'finance', 'other'],
    default: 'collaborative'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent', 'critical'],
    default: 'medium'
  },

  // ===== PROJECT MANAGEMENT =====
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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // ===== TEAM MANAGEMENT =====
  team: [{
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    role: {
      type: String,
      enum: ['lead', 'developer', 'designer', 'tester', 'analyst', 'coordinator', 'stakeholder', 'observer', 'owner', 'collaborator', 'reviewer'],
      default: 'developer'
    },
    assignmentStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'delegated'],
      default: 'pending'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date,
    acceptedAt: Date,
    declineReason: String,
    rejectionReason: String,
    delegatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
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
    }
  }],

  // ===== TIMELINE AND DATES =====
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  dueDate: {
    type: Date
  },
  actualStartDate: Date,
  actualEndDate: Date,
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },

  // ===== MILESTONES =====
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
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    completedAt: Date
  }],

  // ===== STATUS AND PROGRESS =====
  status: {
    type: String,
    enum: ['draft', 'planning', 'assigned', 'active', 'in_progress', 'on_hold', 'review', 'completed', 'cancelled', 'archived', 'overdue'],
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

  // ===== APPROVAL WORKFLOW =====
  requiresApproval: {
    type: Boolean,
    default: false
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', null],
    default: null
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  approvedAt: Date,
  rejectionReason: String,
  completionRemarks: String,
  estimatedActualProgress: {
    type: Number,
    min: 0,
    max: 100
  },
  managerRemarks: [{
    remark: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  approvalWorkflow: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    level: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    approvedAt: Date,
    comments: String
  }],

  // ===== CHECKLIST =====
  checklist: [{
    title: {
      type: String,
      required: true,
      maxlength: 200
    },
    description: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    completedAt: Date,
    order: {
      type: Number,
      default: 0
    },
    required: {
      type: Boolean,
      default: false
    },
    dueDate: Date
  }],

  // ===== SUB-PROJECTS AND DEPENDENCIES =====
  subProjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  dependencies: [{
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    type: {
      type: String,
      enum: ['blocks', 'blocked_by', 'related', 'duplicate']
    }
  }],
  parentProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },

  // ===== TASKS WITHIN PROJECT =====
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],

  // ===== RECURRING PROJECTS =====
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurrencePattern: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    interval: Number,
    daysOfWeek: [Number],
    dayOfMonth: Number,
    endDate: Date,
    maxOccurrences: Number
  },

  // ===== BUDGET AND RESOURCES =====
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

  // ===== TIME TRACKING =====
  timeEntries: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    startTime: Date,
    endTime: Date,
    duration: Number,
    description: String,
    billable: {
      type: Boolean,
      default: false
    },
    approved: {
      type: Boolean,
      default: false
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ===== CLIENT AND STAKEHOLDERS =====
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

  // ===== RISK MANAGEMENT =====
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

  // ===== COMMENTS AND COMMUNICATION =====
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 2000
    },
    type: {
      type: String,
      enum: ['comment', 'status_update', 'question', 'blocker', 'solution', 'progress', 'milestone', 'issue', 'risk', 'change', 'general'],
      default: 'comment'
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    visibility: {
      type: String,
      enum: ['team', 'stakeholders', 'public', 'management'],
      default: 'team'
    },
    mentions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }],
    attachments: [{
      name: String,
      filePath: String,
      fileSize: Number,
      mimeType: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    },
    editedAt: Date,
    reactions: [{
      employee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee'
      },
      emoji: String,
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  }],

  // ===== UPDATES / TIMELINE =====
  updates: [{
    title: String,
    content: String,
    type: {
      type: String,
      enum: ['progress', 'milestone', 'issue', 'risk', 'change', 'general', 'status_change', 'assignment', 'approval']
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

  // ===== TIMELINE (Activity Log) =====
  timeline: [{
    type: {
      type: String,
      enum: ['created', 'status_change', 'approved', 'rejected', 'assigned', 'reassigned', 'time_logged', 'checklist_completed', 'comment', 'milestone_completed', 'progress_update', 'team_member_added', 'team_member_removed', 'deadline_changed', 'priority_changed'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    date: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed
  }],

  // ===== STATUS HISTORY =====
  statusHistory: [{
    status: String,
    previousStatus: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // ===== ASSIGNMENT HISTORY =====
  assignmentHistory: [{
    action: {
      type: String,
      enum: ['assigned', 'reassigned', 'delegated', 'accepted', 'rejected', 'removed']
    },
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    reason: String
  }],

  // ===== ATTACHMENTS AND DOCUMENTS =====
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
      enum: ['requirement', 'design', 'reference', 'output', 'other']
    }
  }],
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

  // ===== DELIVERABLES =====
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
    filePath: String,
    responsible: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    version: { type: String, default: '1.0' }
  }],

  // ===== QUALITY AND REVIEWS =====
  reviewers: [{
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    reviewType: {
      type: String,
      enum: ['quality', 'technical', 'business', 'final']
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'needs_changes'],
      default: 'pending'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    reviewedAt: Date
  }],
  qualityMetrics: {
    defectRate: Number,
    customerSatisfaction: Number,
    teamSatisfaction: Number,
    budgetVariance: Number,
    scheduleVariance: Number,
    scopeCreep: Number
  },

  // ===== LESSONS LEARNED =====
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

  // ===== NOTIFICATIONS =====
  notifications: {
    assigneeNotified: { type: Boolean, default: false },
    dueDateReminder: { type: Boolean, default: true },
    overdueNotification: { type: Boolean, default: false },
    completionNotification: { type: Boolean, default: false }
  },
  watchers: [{
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    watchType: {
      type: String,
      enum: ['all', 'status_changes', 'comments', 'assignments'],
      default: 'all'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ===== TAGS AND CLASSIFICATION =====
  tags: [String],
  labels: [{
    name: String,
    color: String
  }],
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  businessUnit: String,

  // ===== CROSS-DEPARTMENT COLLABORATION =====
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

  // ===== ASSIGNMENT TYPE =====
  assignmentType: {
    type: String,
    enum: ['self_assigned', 'manager_assigned', 'peer_assigned', 'cross_department', 'escalated'],
    default: 'self_assigned'
  },
  canReassign: {
    type: Boolean,
    default: true
  },
  canDelegate: {
    type: Boolean,
    default: true
  },

  // ===== SYSTEM FIELDS =====
  projectCode: {
    type: String,
    unique: true,
    sparse: true
  },
  projectNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateCategory: String,

  // ===== ANALYTICS AND METRICS =====
  metrics: {
    viewCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 },
    efficiency: Number,
    qualityScore: Number,
    collaborationScore: Number
  },
  analytics: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    overdueTasks: { type: Number, default: 0 },
    totalHours: { type: Number, default: 0 },
    billableHours: { type: Number, default: 0 },
    teamProductivity: Number,
    riskScore: Number
  },

  // ===== COMPLETION DETAILS =====
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  completionNotes: String,

  // ===== SOFT DELETE =====
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  deletionReason: String
}, {
  timestamps: true
})

// Generate project code
ProjectSchema.pre('save', function (next) {
  if (!this.projectCode) {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    this.projectCode = `PRJ${year}${month}${random}`
  }
  // Set projectNumber to match projectCode for backward compatibility
  if (this.projectCode && !this.projectNumber) {
    this.projectNumber = this.projectCode
  }
  // Set title from name if not provided
  if (this.name && !this.title) {
    this.title = this.name
  }
  // Set dueDate from endDate if not provided
  if (this.endDate && !this.dueDate) {
    this.dueDate = this.endDate
  }
  next()
})

// Virtual for overdue status
ProjectSchema.virtual('isOverdue').get(function () {
  const dueDate = this.dueDate || this.endDate
  return dueDate < new Date() && !['completed', 'cancelled', 'archived'].includes(this.status)
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
  const dueDate = this.dueDate || this.endDate
  if (dueDate && !['completed', 'cancelled', 'archived'].includes(this.status)) {
    const today = new Date()
    const remaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))
    return Math.max(0, remaining)
  }
  return 0
})

// Method: Add team member
ProjectSchema.methods.addTeamMember = function (employeeId, role, permissions = [], allocation = 100, assignedBy = null) {
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
    assignedBy,
    assignedAt: new Date(),
    joinedAt: new Date(),
    isActive: true,
    assignmentStatus: 'pending'
  })

  // Add to timeline
  this.timeline.push({
    type: 'team_member_added',
    description: `Team member added with role: ${role}`,
    actor: assignedBy,
    newValue: { employeeId, role },
    date: new Date()
  })

  // Add to assignment history
  this.assignmentHistory.push({
    action: 'assigned',
    to: employeeId,
    performedBy: assignedBy,
    timestamp: new Date()
  })

  return { success: true, message: 'Team member added successfully' }
}

// Method: Add timeline entry
ProjectSchema.methods.addTimelineEntry = function (type, description, actor, options = {}) {
  this.timeline.push({
    type,
    description,
    actor,
    oldValue: options.oldValue,
    newValue: options.newValue,
    reason: options.reason,
    date: new Date(),
    metadata: options.metadata
  })
}

// Method: Update progress
ProjectSchema.methods.updateProgress = function (newProgress, updatedBy, notes) {
  const oldProgress = this.progress
  this.progress = Math.max(0, Math.min(100, newProgress))

  // Auto-update status based on progress
  if (this.progress === 0 && this.status === 'in_progress') {
    this.status = 'assigned'
  } else if (this.progress > 0 && this.progress < 100 && this.status === 'assigned') {
    this.status = 'in_progress'
  }

  // Add timeline entry
  if (oldProgress !== newProgress) {
    this.timeline.push({
      type: 'progress_update',
      description: `Progress updated from ${oldProgress}% to ${newProgress}%`,
      actor: updatedBy,
      oldValue: oldProgress,
      newValue: newProgress,
      reason: notes,
      date: new Date()
    })

    // Add status history
    this.statusHistory.push({
      status: `Progress: ${newProgress}%`,
      previousStatus: `Progress: ${oldProgress}%`,
      changedBy: updatedBy,
      reason: notes
    })
  }
}

// Method: Add time entry
ProjectSchema.methods.addTimeEntry = function (employeeId, startTime, endTime, description) {
  const duration = Math.round((endTime - startTime) / (1000 * 60))

  this.timeEntries.push({
    employee: employeeId,
    startTime,
    endTime,
    duration,
    description
  })

  // Update total actual hours
  this.actualHours = this.timeEntries.reduce((total, entry) =>
    total + (entry.duration / 60), 0)

  // Update metrics
  this.metrics.timeSpent = this.timeEntries.reduce((total, entry) =>
    total + entry.duration, 0)

  // Add timeline entry
  this.timeline.push({
    type: 'time_logged',
    description: `${duration} minutes logged`,
    actor: employeeId,
    newValue: duration,
    date: new Date()
  })
}

// Method: Calculate health
ProjectSchema.methods.calculateHealth = function () {
  let healthScore = 100

  // Check schedule variance
  if (this.daysRemaining < 0) healthScore -= 30
  else if (this.daysRemaining < 7) healthScore -= 15

  // Check budget variance
  if (this.budget?.spent > this.budget?.allocated) healthScore -= 25
  else if (this.budget?.spent > this.budget?.allocated * 0.9) healthScore -= 10

  // Check risk level
  const highRisks = this.risks?.filter(r => r.impact === 'high' && r.status !== 'closed').length || 0
  healthScore -= highRisks * 10

  // Determine health color
  if (healthScore >= 80) this.health = 'green'
  else if (healthScore >= 60) this.health = 'yellow'
  else this.health = 'red'

  return this.health
}

// Method: Add risk
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

  // Add timeline entry
  this.timeline.push({
    type: 'comment',
    description: `Risk identified: ${title}`,
    actor: owner,
    date: new Date()
  })
}

// Method: Calculate efficiency
ProjectSchema.methods.calculateEfficiency = function () {
  if (this.estimatedHours && this.actualHours) {
    this.metrics.efficiency = (this.estimatedHours / this.actualHours) * 100
  }
  return this.metrics.efficiency
}

// Indexes
ProjectSchema.index({ projectManager: 1, status: 1 })
ProjectSchema.index({ 'team.member': 1, 'team.isActive': 1 })
ProjectSchema.index({ 'team.member': 1, 'team.assignmentStatus': 1 })
ProjectSchema.index({ status: 1, priority: 1 })
ProjectSchema.index({ startDate: 1, endDate: 1 })
ProjectSchema.index({ dueDate: 1, status: 1 })
ProjectSchema.index({ tags: 1 })
ProjectSchema.index({ department: 1, businessUnit: 1 })
ProjectSchema.index({ createdAt: -1 })
ProjectSchema.index({ approvalStatus: 1 })

// Use 'ProjectNew' to avoid conflict during migration, will be renamed to 'Project' later
export default mongoose.models.ProjectNew || mongoose.model('ProjectNew', ProjectSchema, 'projects_new')
