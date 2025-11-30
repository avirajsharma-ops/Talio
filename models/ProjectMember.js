import mongoose from 'mongoose';

const ProjectMemberSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  role: {
    type: String,
    enum: ['head', 'member', 'observer', 'external'],
    default: 'member'
  },
  invitationStatus: {
    type: String,
    enum: ['invited', 'accepted', 'rejected'],
    default: 'invited'
  },
  invitedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  invitedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  // Track if user was added from external department
  isExternal: {
    type: Boolean,
    default: false
  },
  sourceDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  // Permissions override (optional)
  permissions: {
    canCreateTasks: { type: Boolean, default: true },
    canAssignTasks: { type: Boolean, default: true },
    canEditProject: { type: Boolean, default: false },
    canInviteMembers: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Compound index to ensure unique membership
ProjectMemberSchema.index({ project: 1, user: 1 }, { unique: true });
ProjectMemberSchema.index({ user: 1, invitationStatus: 1 });
ProjectMemberSchema.index({ project: 1, invitationStatus: 1 });
ProjectMemberSchema.index({ project: 1, role: 1 });

export default mongoose.models.ProjectMember || mongoose.model('ProjectMember', ProjectMemberSchema);
