import mongoose from 'mongoose'

const progressUpdateSchema = new mongoose.Schema({
  progress: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  remark: {
    type: String,
    required: true,
    trim: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true })

const taskSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  dueDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'on_hold'],
    default: 'not_started'
  },
  completionRemark: {
    type: String,
    trim: true
  },
  completedAt: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  progressHistory: [progressUpdateSchema],
  order: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
})

// Index for efficient queries
taskSchema.index({ project: 1, isDeleted: 1 })
taskSchema.index({ project: 1, order: 1 })

// Update status based on progress
taskSchema.pre('save', function(next) {
  if (this.progress === 0) {
    this.status = 'not_started'
  } else if (this.progress === 100) {
    this.status = 'completed'
  } else if (this.progress > 0 && this.progress < 100) {
    this.status = 'in_progress'
  }
  next()
})

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema)

export default Task

