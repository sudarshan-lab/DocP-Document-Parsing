const mongoose = require('mongoose');

// An uploaded document. Textract output (raw text + detected tables) is stored
// once at upload time so every chat query reuses it without re-parsing.
const fileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, required: true },
    s3Key: { type: String, required: true },
    mimeType: { type: String, default: '' },
    // processing -> ready | failed
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    rawText: { type: String, default: '' },
    tablesCsv: { type: String, default: '' },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('File', fileSchema);
