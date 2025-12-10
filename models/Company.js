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
  logo: {
    type: String,
    default: ''
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    country: { type: String, default: '' },
    zipCode: { type: String, default: '' }
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

// Indexes - Note: name and code already have unique:true which creates indexes
CompanySchema.index({ isActive: 1 });

export default mongoose.models.Company || mongoose.model('Company', CompanySchema);
