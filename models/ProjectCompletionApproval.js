import mongoose from 'mongoose';

const ProjectCompletionApprovalSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  projectHead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  requestRemark: {
    type: String,
    trim: true,
    maxlength: [2000, 'Request remark cannot exceed 2000 characters']
  },
  responseRemark: {
    type: String,
    trim: true,
    maxlength: [2000, 'Response remark cannot exceed 2000 characters']
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  respondedAt: {
    type: Date
  },
  // Snapshot of project status at request time
  completionSnapshot: {
    totalTasks: { type: Number, default: 0 },
    completedTasks: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 },
    pendingTasks: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

// Indexes for performance
ProjectCompletionApprovalSchema.index({ project: 1, status: 1 });
ProjectCompletionApprovalSchema.index({ projectHead: 1, status: 1 });
ProjectCompletionApprovalSchema.index({ requestedBy: 1 });
ProjectCompletionApprovalSchema.index({ createdAt: -1 });

export default mongoose.models.ProjectCompletionApproval || mongoose.model('ProjectCompletionApproval', ProjectCompletionApprovalSchema);
