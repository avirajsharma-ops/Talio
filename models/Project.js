import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['planned', 'ongoing', 'completed', 'pending', 'overdue', 'archived', 'completed_pending_approval', 'approved', 'rejected'],
    default: 'planned'
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date/deadline is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  projectHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Project head is required']
  },
  completionPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Reference to the auto-created chat group
  chatGroup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  },
  // Department for filtering
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  // Priority level
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  // Tags for categorization
  tags: [{
    type: String,
    trim: true
  }],
  // Metadata for additional info
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for members
ProjectSchema.virtual('members', {
  ref: 'ProjectMember',
  localField: '_id',
  foreignField: 'project'
});

// Virtual for tasks
ProjectSchema.virtual('tasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project'
});

// Virtual for timeline events
ProjectSchema.virtual('timelineEvents', {
  ref: 'ProjectTimelineEvent',
  localField: '_id',
  foreignField: 'project'
});

// Virtual to check if project is overdue
ProjectSchema.virtual('isOverdue').get(function() {
  if (['completed', 'approved', 'archived'].includes(this.status)) {
    return false;
  }
  return new Date() > this.endDate;
});

// Virtual for days remaining
ProjectSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diff = end - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Indexes for performance
ProjectSchema.index({ status: 1, createdAt: -1 });
ProjectSchema.index({ createdBy: 1 });
ProjectSchema.index({ projectHead: 1 });
ProjectSchema.index({ department: 1 });
ProjectSchema.index({ endDate: 1, status: 1 });
ProjectSchema.index({ name: 'text', description: 'text' });

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);
