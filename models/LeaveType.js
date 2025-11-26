import mongoose from 'mongoose';

const LeaveTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
  },
  maxDaysPerYear: {
    type: Number,
    required: true,
  },
  carryForward: {
    type: Boolean,
    default: false,
  },
  maxCarryForwardDays: {
    type: Number,
    default: 0,
  },
  isPaid: {
    type: Boolean,
    default: true,
  },
  requiresApproval: {
    type: Boolean,
    default: true,
  },
  requiresDocument: {
    type: Boolean,
    default: false,
  },
  minDaysNotice: {
    type: Number,
    default: 0,
  },
  applicableGender: {
    type: String,
    enum: ['all', 'male', 'female'],
    default: 'all',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.LeaveType || mongoose.model('LeaveType', LeaveTypeSchema);

