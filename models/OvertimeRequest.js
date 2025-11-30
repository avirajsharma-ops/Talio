import mongoose from 'mongoose';

/**
 * OvertimeRequest Schema
 * 
 * Tracks overtime requests when employees don't check out on time
 * Used to prompt employees whether they're working overtime or forgot to clock out
 */
const OvertimeRequestSchema = new mongoose.Schema({
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
  // Scheduled checkout time (from company settings)
  scheduledCheckOut: {
    type: Date,
    required: true,
  },
  // When the prompt was sent (30 min after scheduled checkout)
  promptSentAt: {
    type: Date,
    required: true,
  },
  // Status of the request
  status: {
    type: String,
    enum: ['pending', 'overtime-confirmed', 'auto-checkout', 'manual-checkout', 'expired'],
    default: 'pending',
  },
  // Employee's response
  isWorkingOvertime: {
    type: Boolean,
    default: null,
  },
  // Overtime hours (if confirmed)
  overtimeHours: {
    type: Number,
    default: 0,
  },
  // When the response was received
  respondedAt: {
    type: Date,
  },
  // Auto-checkout time (if no response within 30 min of prompt)
  autoCheckoutAt: {
    type: Date,
  },
  // Notification tracking
  notificationId: {
    type: String,
  },
  remindersSent: {
    type: Number,
    default: 1,
  },
  lastReminderAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

// Indexes
OvertimeRequestSchema.index({ employee: 1, date: -1 });
OvertimeRequestSchema.index({ status: 1, promptSentAt: 1 });
OvertimeRequestSchema.index({ attendance: 1 }, { unique: true });

export default mongoose.models.OvertimeRequest || mongoose.model('OvertimeRequest', OvertimeRequestSchema);
