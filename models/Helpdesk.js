import mongoose from 'mongoose';

const HelpdeskSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    required: true,
    unique: true,
  },
  subject: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    enum: ['it-support', 'hr-query', 'payroll', 'leave', 'attendance', 'facilities', 'other'],
    required: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'resolved', 'closed', 'reopened'],
    default: 'open',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  assignedDate: {
    type: Date,
  },
  resolvedDate: {
    type: Date,
  },
  closedDate: {
    type: Date,
  },
  attachments: [{
    name: String,
    url: String,
    uploadedAt: Date,
  }],
  comments: [{
    comment: String,
    commentedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    commentedAt: { type: Date, default: Date.now },
    isInternal: { type: Boolean, default: false },
  }],
  resolution: {
    type: String,
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
  },
  feedback: {
    type: String,
  },
  sla: {
    responseTime: Number,
    resolutionTime: Number,
    breached: { type: Boolean, default: false },
  },
}, {
  timestamps: true,
});

export default mongoose.models.Helpdesk || mongoose.model('Helpdesk', HelpdeskSchema);

