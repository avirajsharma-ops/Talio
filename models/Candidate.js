import mongoose from 'mongoose';

const CandidateSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  jobApplication: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recruitment',
    required: true,
  },
  resume: {
    name: String,
    url: String,
  },
  coverLetter: {
    type: String,
  },
  currentCompany: {
    type: String,
  },
  currentDesignation: {
    type: String,
  },
  totalExperience: {
    type: Number,
  },
  currentSalary: {
    type: Number,
  },
  expectedSalary: {
    type: Number,
  },
  noticePeriod: {
    type: Number,
  },
  skills: [String],
  education: [{
    degree: String,
    institution: String,
    year: Number,
  }],
  source: {
    type: String,
    enum: ['website', 'referral', 'linkedin', 'naukri', 'indeed', 'other'],
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  stage: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected'],
    default: 'applied',
  },
  interviews: [{
    round: Number,
    type: { type: String, enum: ['phone', 'video', 'in-person', 'technical', 'hr'] },
    scheduledDate: Date,
    interviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    feedback: String,
    rating: Number,
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'] },
  }],
  assessments: [{
    title: String,
    type: String,
    score: Number,
    maxScore: Number,
    completedDate: Date,
  }],
  offer: {
    offeredDate: Date,
    joiningDate: Date,
    salary: Number,
    status: { type: String, enum: ['pending', 'accepted', 'rejected', 'withdrawn'] },
  },
  rejectionReason: {
    type: String,
  },
  notes: [{
    note: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    addedDate: { type: Date, default: Date.now },
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Candidate || mongoose.model('Candidate', CandidateSchema);

