import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: [true, 'Company code is required'],
    trim: true,
    unique: true,
    uppercase: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
CompanySchema.index({ name: 1 });
CompanySchema.index({ code: 1 });
CompanySchema.index({ isActive: 1 });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
