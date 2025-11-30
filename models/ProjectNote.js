import mongoose from 'mongoose';

/**
 * ProjectNote Model - Sticky notes for project collaboration
 * Allows team members to add colored sticky notes to projects
 */

const ProjectNoteSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [2000, 'Note content cannot exceed 2000 characters']
  },
  color: {
    type: String,
    enum: ['yellow', 'blue', 'green', 'pink', 'purple', 'orange'],
    default: 'yellow'
  },
  // Position for drag-and-drop positioning (optional)
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  // Pin important notes
  isPinned: {
    type: Boolean,
    default: false
  },
  // Optional: link to a task
  relatedTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  // Visibility - personal or shared
  visibility: {
    type: String,
    enum: ['personal', 'team'],
    default: 'team'
  },
  // Soft delete
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
ProjectNoteSchema.index({ project: 1, createdAt: -1 });
ProjectNoteSchema.index({ project: 1, createdBy: 1 });
ProjectNoteSchema.index({ project: 1, isPinned: -1, createdAt: -1 });
ProjectNoteSchema.index({ createdBy: 1, visibility: 1 });

export default mongoose.models.ProjectNote || mongoose.model('ProjectNote', ProjectNoteSchema);
