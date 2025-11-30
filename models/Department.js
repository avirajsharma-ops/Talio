import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
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
  // Legacy single head field (for backward compatibility)
  head: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  },
  // Multiple department heads support
  heads: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
  }],
  parentDepartment: {
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

// Virtual to get all heads (combines legacy head with heads array)
DepartmentSchema.virtual('allHeads').get(function() {
  const headsSet = new Set();
  if (this.head) {
    headsSet.add(this.head.toString());
  }
  if (this.heads && this.heads.length > 0) {
    this.heads.forEach(h => headsSet.add(h.toString()));
  }
  return Array.from(headsSet);
});

// Ensure virtuals are included in JSON
DepartmentSchema.set('toJSON', { virtuals: true });
DepartmentSchema.set('toObject', { virtuals: true });

export default mongoose.models.Department || mongoose.model('Department', DepartmentSchema);

