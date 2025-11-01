import mongoose from 'mongoose';

const OffboardingSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  resignationType: {
    type: String,
    enum: ['resignation', 'termination', 'retirement', 'end-of-contract'],
    required: true,
  },
  resignationDate: {
    type: Date,
    required: true,
  },
  lastWorkingDate: {
    type: Date,
    required: true,
  },
  noticePeriod: {
    type: Number,
  },
  reason: {
    type: String,
  },
  exitInterview: {
    scheduled: Boolean,
    scheduledDate: Date,
    conductedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    conductedDate: Date,
    feedback: String,
    rating: Number,
  },
  clearance: [{
    department: String,
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    status: { type: String, enum: ['pending', 'cleared', 'pending-action'], default: 'pending' },
    clearedDate: Date,
    remarks: String,
  }],
  assets: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    returned: Boolean,
    returnedDate: Date,
    condition: String,
    remarks: String,
  }],
  documents: [{
    name: String,
    type: String,
    submitted: Boolean,
    submittedDate: Date,
  }],
  finalSettlement: {
    salary: Number,
    leaveEncashment: Number,
    bonus: Number,
    deductions: Number,
    netAmount: Number,
    processed: Boolean,
    processedDate: Date,
    paymentDate: Date,
    transactionId: String,
  },
  accessRevocation: {
    email: { revoked: Boolean, revokedDate: Date },
    systems: [{ name: String, revoked: Boolean, revokedDate: Date }],
    building: { revoked: Boolean, revokedDate: Date },
  },
  experienceLetter: {
    requested: Boolean,
    issued: Boolean,
    issuedDate: Date,
    url: String,
  },
  relievingLetter: {
    issued: Boolean,
    issuedDate: Date,
    url: String,
  },
  status: {
    type: String,
    enum: ['initiated', 'in-progress', 'completed'],
    default: 'initiated',
  },
  completionPercentage: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Offboarding || mongoose.model('Offboarding', OffboardingSchema);

