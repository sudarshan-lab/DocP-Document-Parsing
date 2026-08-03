// One-time (re-runnable) backfill: chunk + embed every ready document that
// doesn't have embeddings yet. Skips files that already have chunks, so it's
// safe to re-run. Requires the Bedrock IAM permission to be in place.
require('dotenv').config();
const AWS = require('aws-sdk');
const conn = require('./connection');
const File = require('./File');
const Chunk = require('./Chunk');

const bedrock = new AWS.BedrockRuntime({
  region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-2',
});

async function embed(text) {
  const res = await bedrock
    .invokeModel({
      modelId: 'amazon.titan-embed-text-v2:0',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputText: String(text || '').slice(0, 8000) }),
    })
    .promise();
  return JSON.parse(res.body.toString()).embedding;
}

function chunkText(text, size = 2000, overlap = 200) {
  const clean = String(text || '').trim();
  const chunks = [];
  for (let i = 0; i < clean.length; i += size - overlap) {
    const piece = clean.slice(i, i + size).trim();
    if (piece) chunks.push(piece);
    if (i + size >= clean.length) break;
    if (chunks.length >= 300) break;
  }
  return chunks;
}

(async () => {
  try {
    await conn;
    const files = await File.find({ status: 'ready' }).select('_id userId fileName folderId rawText');
    let done = 0;
    let total = 0;
    for (const f of files) {
      if (!f.rawText) continue;
      const existing = await Chunk.countDocuments({ fileId: f._id });
      if (existing > 0) continue;
      const pieces = chunkText(f.rawText);
      let idx = 0;
      for (const piece of pieces) {
        const embedding = await embed(piece);
        await Chunk.create({
          userId: f.userId,
          fileId: f._id,
          fileName: f.fileName,
          folderId: f.folderId || null,
          chunkIndex: idx++,
          text: piece,
          embedding,
        });
        total++;
      }
      done++;
      console.log(`embedded "${f.fileName}" — ${idx} chunks`);
    }
    console.log(`Backfill complete: ${done} files, ${total} chunks.`);
  } catch (e) {
    console.error('backfill error:', e && e.message);
  } finally {
    process.exit(0);
  }
})();
