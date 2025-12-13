import mongoose from 'mongoose';

const AIContextSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  feature: { type: String, required: true, index: true }, // e.g., 'mail', 'whiteboard', 'chat'
  originalInput: { type: String },
  refinedPrompt: { type: String },
  response: { type: String },
  metadata: { type: mongoose.Schema.Types.Mixed }, // Extra info like whiteboard ID, project ID
  createdAt: { type: Date, default: Date.now, expires: '30d' } // Auto-delete after 30 days
});

// Index for retrieving history efficiently
AIContextSchema.index({ userId: 1, feature: 1, createdAt: -1 });

export default mongoose.models.AIContext || mongoose.model('AIContext', AIContextSchema);
