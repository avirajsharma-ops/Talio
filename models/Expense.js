import mongoose from 'mongoose';

const ExpenseSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  expenseCode: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    enum: ['travel', 'food', 'accommodation', 'fuel', 'office-supplies', 'client-entertainment', 'training', 'other'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  expenseDate: {
    type: Date,
    required: true,
  },
  merchant: {
    type: String,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'online', 'company-card'],
  },
  receipts: [{
    name: String,
    url: String,
  }],
  project: {
    type: String,
  },
  billable: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'reimbursed'],
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
  reimbursementDate: {
    type: Date,
  },
  transactionId: {
    type: String,
  },
  remarks: {
    type: String,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

