import mongoose from 'mongoose';

const OnboardingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  joiningDate: {
    type: Date,
    required: true,
  },
  buddy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  checklist: [{
    task: String,
    description: String,
    category: { type: String, enum: ['pre-joining', 'day-1', 'week-1', 'month-1', 'month-3'] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
    completedDate: Date,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    remarks: String,
  }],
  documents: [{
    name: String,
    type: String,
    required: Boolean,
    submitted: Boolean,
    url: String,
    submittedDate: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    verifiedDate: Date,
  }],
  assets: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    assignedDate: Date,
    acknowledgedDate: Date,
  }],
  trainings: [{
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    mandatory: Boolean,
    dueDate: Date,
    status: { type: String, enum: ['pending', 'in-progress', 'completed'] },
  }],
  welcomeKit: {
    sent: Boolean,
    sentDate: Date,
    items: [String],
  },
  orientation: {
    scheduled: Boolean,
    scheduledDate: Date,
    completed: Boolean,
    completedDate: Date,
    feedback: String,
  },
  status: {
    type: String,
    enum: ['not-started', 'in-progress', 'completed'],
    default: 'not-started',
  },
  completionPercentage: {
    type: Number,
    default: 0,
  },
  feedback: {
    rating: Number,
    comments: String,
    submittedDate: Date,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Onboarding || mongoose.model('Onboarding', OnboardingSchema);

