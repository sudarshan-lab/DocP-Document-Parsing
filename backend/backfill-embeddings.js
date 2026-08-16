// One-time (re-runnable) backfill: chunk + embed every ready document.
// Batches texts per Voyage request and retries on 429 (free-tier rate limits).
require('dotenv').config();
const axios = require('axios');
const conn = require('./connection');
const File = require('./File');
const Chunk = require('./Chunk');

async function voyageEmbed(inputs) {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await axios.post(
        'https://api.voyageai.com/v1/embeddings',
        { input: inputs, model: 'voyage-4-lite', input_type: 'document', output_dimension: 1024 },
        {
          headers: {
            Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );
      return res.data.data
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (e) {
      const code = e.response && e.response.status;
      if (code === 429 && attempt < 12) {
        console.log('  rate-limited (429) — waiting 25s…');
        await new Promise((r) => setTimeout(r, 25000));
        continue;
      }
      throw e;
    }
  }
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
