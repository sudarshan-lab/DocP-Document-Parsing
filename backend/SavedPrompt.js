const mongoose = require('mongoose');

// A reusable, named prompt a user can run on any document/set with one click.
const savedPromptSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    prompt: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SavedPrompt', savedPromptSchema);
