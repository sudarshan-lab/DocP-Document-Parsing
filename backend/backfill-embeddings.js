// One-time (re-runnable) backfill: chunk + embed every ready document.
// Batches texts per Voyage request and retries on 429 (free-tier rate limits).
require('dotenv').config();
const AWS = require('aws-sdk');
const conn = require('./connection');
const File = require('./File');
const Chunk = require('./Chunk');

const bedrock = new AWS.BedrockRuntime({ region: process.env.BEDROCK_REGION || 'us-east-1' });

async function embedOne(text) {
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
async function voyageEmbed(inputs) {
  const out = [];
  for (const t of inputs) out.push(await embedOne(t));
  return out;
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
      await Chunk.deleteMany({ fileId: f._id });
      const pieces = chunkText(f.rawText);
      let idx = 0;
      const B = 20;
      for (let b = 0; b < pieces.length; b += B) {
        const batch = pieces.slice(b, b + B).map((t) => String(t).slice(0, 8000));
        const embs = await voyageEmbed(batch);
        for (let j = 0; j < batch.length; j++) {
          await Chunk.create({
            userId: f.userId,
            fileId: f._id,
            fileName: f.fileName,
            folderId: f.folderId || null,
            chunkIndex: idx++,
            text: batch[j],
            embedding: embs[j],
          });
          total++;
        }
      }
      done++;
      console.log(`[${done}] embedded "${f.fileName}" — ${idx} chunks`);
    }
    console.log(`Backfill complete: ${done} files, ${total} chunks.`);
  } catch (e) {
    console.error('backfill error:', e && (e.response ? e.response.status : e.message));
  } finally {
    process.exit(0);
  }
})();
