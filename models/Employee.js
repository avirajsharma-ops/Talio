import mongoose from 'mongoose';

const EmployeeSchema = new mongoose.Schema({
  employeeCode: {
    type: String,
    required: true,
    unique: true,
  },
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
  },
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  designation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
  },
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  dateOfJoining: {
    type: Date,
    required: true,
  },
  dateOfLeaving: {
    type: Date,
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'intern'],
    default: 'full-time',
  },
  workLocation: {
    type: String,
  },
  salary: {
    basic: Number,
    hra: Number,
    allowances: Number,
    deductions: Number,
    ctc: Number,
  },
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    branch: String,
  },
  documents: [{
    name: String,
    type: String,
    url: String,
    uploadedAt: Date,
  }],
  profilePicture: {
    type: String,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'terminated', 'resigned'],
    default: 'active',
  },
  skills: [String],
  qualifications: [{
    degree: String,
    institution: String,
    year: Number,
  }],
  experience: [{
    company: String,
    position: String,
    from: Date,
    to: Date,
    description: String,
  }],
  reviews: [{
    type: {
      type: String,
      enum: ['review', 'remark', 'feedback', 'warning', 'appreciation'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    category: {
      type: String,
      enum: ['performance', 'behavior', 'skills', 'general'],
      default: 'general'
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
}, {
  timestamps: true,
});

// Virtual for full name
EmployeeSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

export default mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

