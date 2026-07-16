const mongoose = require('mongoose');

// A saved tabular answer. It can come from a single file (fileId) or from a
// multi-file query (fileIds + a human label). Only created when the user hits
// "Save".
const tableResultSchema = new mongoose.Schema(
  {
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', default: null, index: true },
    fileIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null, index: true },
    sourceLabel: { type: String, default: '' },
    sourceFileNames: [{ type: String }],
    title: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    query: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TableResult', tableResultSchema);
