import mongoose from 'mongoose';

const DesignationSchema = new mongoose.Schema({
  title: {
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
  level: {
    type: Number,
    default: 1,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Designation || mongoose.model('Designation', DesignationSchema);

