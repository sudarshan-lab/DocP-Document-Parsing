const mongoose = require('mongoose');

// A saved tabular answer for a file. One file can have many of these, each tied
// to the chat query that produced it. Only created when the user hits "Save".
const tableResultSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TableResult', tableResultSchema);
