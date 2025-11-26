import mongoose from 'mongoose';

const TrainingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  enrollmentDate: {
    type: Date,
    default: Date.now,
  },
  startDate: {
    type: Date,
  },
  completionDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed', 'failed', 'expired'],
    default: 'not-started',
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedModules: [{
    moduleId: String,
    completedDate: Date,
  }],
  assessments: [{
    attemptNumber: Number,
    score: Number,
    maxScore: Number,
    percentage: Number,
    attemptDate: Date,
    passed: Boolean,
  }],
  finalScore: {
    type: Number,
  },
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  certificateUrl: {
    type: String,
  },
  certificateIssuedDate: {
    type: Date,
  },
  feedback: {
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    submittedDate: Date,
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
}, {
  timestamps: true,
});

export default mongoose.models.Training || mongoose.model('Training', TrainingSchema);

