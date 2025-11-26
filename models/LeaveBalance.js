import mongoose from 'mongoose';

const LeaveBalanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  leaveType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    required: true,
  },
  year: {
    type: Number,
    required: true,
  },
  totalDays: {
    type: Number,
    required: true,
  },
  usedDays: {
    type: Number,
    default: 0,
  },
  remainingDays: {
    type: Number,
    required: true,
  },
  carriedForward: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Compound index
LeaveBalanceSchema.index({ employee: 1, leaveType: 1, year: 1 }, { unique: true });

export default mongoose.models.LeaveBalance || mongoose.model('LeaveBalance', LeaveBalanceSchema);

