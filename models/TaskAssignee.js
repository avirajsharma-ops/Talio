import mongoose from 'mongoose';

const TaskAssigneeSchema = new mongoose.Schema({
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignmentStatus: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  assignedAt: {
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
  // Time tracking
  hoursLogged: {
    type: Number,
    default: 0,
    min: 0
  },
  // Notes from assignee
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique assignment
TaskAssigneeSchema.index({ task: 1, user: 1 }, { unique: true });
TaskAssigneeSchema.index({ user: 1, assignmentStatus: 1 });
TaskAssigneeSchema.index({ task: 1, assignmentStatus: 1 });
TaskAssigneeSchema.index({ assignedBy: 1 });

export default mongoose.models.TaskAssignee || mongoose.model('TaskAssignee', TaskAssigneeSchema);
