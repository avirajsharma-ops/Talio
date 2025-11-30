import mongoose from 'mongoose';

const AttendanceCorrectionSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  attendance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attendance',
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  // Current values
  currentCheckIn: {
    type: Date,
  },
  currentCheckOut: {
    type: Date,
  },
  currentStatus: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday', 'weekend', 'in-progress'],
  },
  currentWorkHours: {
    type: Number,
  },
  // Requested corrections
  requestedCheckIn: {
    type: Date,
  },
  requestedCheckOut: {
    type: Date,
  },
  requestedStatus: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'on-leave', 'holiday', 'weekend', 'in-progress'],
  },
  // Correction type
  correctionType: {
    type: String,
    enum: ['check-in', 'check-out', 'both', 'status', 'missing-entry'],
    required: true,
  },
  // Reason for correction
  reason: {
    type: String,
    required: true,
    trim: true,
  },
  // Supporting evidence (optional)
  attachments: [{
    type: String, // URLs to uploaded files
  }],
  // Request status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  // Reviewed by
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  reviewedAt: {
    type: Date,
  },
  reviewerComments: {
    type: String,
  },
  // Applied corrections (after approval)
  appliedCheckIn: {
    type: Date,
  },
  appliedCheckOut: {
    type: Date,
  },
  appliedStatus: {
    type: String,
  },
  appliedWorkHours: {
    type: Number,
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
AttendanceCorrectionSchema.index({ employee: 1, date: -1 });
AttendanceCorrectionSchema.index({ status: 1, createdAt: -1 });
AttendanceCorrectionSchema.index({ attendance: 1 });

export default mongoose.models.AttendanceCorrection || mongoose.model('AttendanceCorrection', AttendanceCorrectionSchema);
