const mongoose = require('mongoose');

// A chunk of a document's text plus its Titan embedding, for cross-document
// semantic (vector) search. An Atlas Vector Search index named "vector_index"
// on { embedding (1024-dim, cosine), userId (filter) } powers retrieval.
const chunkSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true, index: true },
    fileName: { type: String, default: '' },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    chunkIndex: { type: Number, default: 0 },
    text: { type: String, default: '' },
    embedding: { type: [Number], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Chunk', chunkSchema);
