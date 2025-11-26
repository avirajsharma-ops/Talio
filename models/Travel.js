import mongoose from 'mongoose';

const TravelSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  travelCode: {
    type: String,
    required: true,
    unique: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  travelType: {
    type: String,
    enum: ['domestic', 'international'],
    required: true,
  },
  from: {
    city: String,
    country: String,
  },
  to: {
    city: String,
    country: String,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  numberOfDays: {
    type: Number,
  },
  transportation: {
    mode: { type: String, enum: ['flight', 'train', 'bus', 'car', 'taxi'] },
    bookingRequired: Boolean,
    bookingDetails: String,
  },
  accommodation: {
    required: Boolean,
    hotelName: String,
    checkIn: Date,
    checkOut: Date,
    bookingDetails: String,
  },
  estimatedCost: {
    type: Number,
  },
  advanceRequired: {
    type: Boolean,
    default: false,
  },
  advanceAmount: {
    type: Number,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'completed', 'cancelled'],
    default: 'draft',
  },
  submittedDate: {
    type: Date,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  approvedDate: {
    type: Date,
  },
  rejectionReason: {
    type: String,
  },
  actualExpenses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Expense',
  }],
  remarks: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Travel || mongoose.model('Travel', TravelSchema);

