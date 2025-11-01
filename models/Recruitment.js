import mongoose from 'mongoose';

const RecruitmentSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
  },
  jobCode: {
    type: String,
    required: true,
    unique: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true,
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
  },
  numberOfPositions: {
    type: Number,
    required: true,
    default: 1,
  },
  jobDescription: {
    type: String,
    required: true,
  },
  requirements: {
    type: String,
  },
  skills: [String],
  experience: {
    min: Number,
    max: Number,
  },
  salary: {
    min: Number,
    max: Number,
    currency: { type: String, default: 'INR' },
  },
  location: {
    type: String,
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern'],
    default: 'full-time',
  },
  status: {
    type: String,
    enum: ['draft', 'open', 'on-hold', 'closed', 'cancelled'],
    default: 'draft',
  },
  postedDate: {
    type: Date,
  },
  closingDate: {
    type: Date,
  },
  hiringManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  recruiters: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
  candidates: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
  }],
}, {
  timestamps: true,
});

export default mongoose.models.Recruitment || mongoose.model('Recruitment', RecruitmentSchema);

