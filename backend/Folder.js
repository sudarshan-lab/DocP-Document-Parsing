const mongoose = require('mongoose');

// A folder / "set" — created when a user uploads multiple files at once.
// Files under it live at s3://<bucket>/<userId>/<folderId>/... so the bucket
// layout mirrors what the user sees.
const folderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Folder', folderSchema);
