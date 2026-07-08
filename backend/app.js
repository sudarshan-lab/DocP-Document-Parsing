const AWS = require('aws-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const path = require('path');

require('./connection');
const File = require('./File');
const TableResult = require('./TableResult');
const userModel = require('./userModel');

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------------------
// AWS + Anthropic clients (explicit keys only if set; otherwise the SDK's
// default chain — e.g. an EC2 instance role).
// ---------------------------------------------------------------------------
const BUCKET = process.env.AWS_BUCKET_NAME;

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  ...(process.env.AWS_ACCESS_KEY && {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_ACCESS_SECRETKEY,
  }),
});

const textract = new AWS.Textract({
  region: process.env.TEXTRACT_REGION,
  ...(process.env.TEXTRACT_ACCESS_KEY && {
    accessKeyId: process.env.TEXTRACT_ACCESS_KEY,
    secretAccessKey: process.env.TEXTRACT_SECRET_ACCESS_KEY,
  }),
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------------------------------------------------------------------------
// Textract: async document analysis -> raw text + CSV of detected tables
// ---------------------------------------------------------------------------
function startJob(client, bucket, key) {
  return new Promise((resolve, reject) => {
    client.startDocumentAnalysis(
      { DocumentLocation: { S3Object: { Bucket: bucket, Name: key } }, FeatureTypes: ['TABLES'] },
      (err, data) => (err ? reject(err) : resolve(data.JobId))
    );
  });
}

function isJobComplete(client, jobId) {
  return new Promise((resolve, reject) => {
    const check = () => {
      client.getDocumentAnalysis({ JobId: jobId }, (err, data) => {
        if (err) return reject(err);
        if (data.JobStatus === 'IN_PROGRESS') return setTimeout(check, 1500);
        if (data.JobStatus === 'SUCCEEDED') return resolve(data);
        reject(new Error('Textract job ' + data.JobStatus + (data.StatusMessage ? ': ' + data.StatusMessage : '')));
      });
    };
    check();
  });
}

function getJobResults(client, jobId) {
  return new Promise((resolve, reject) => {
    const pages = [];
    const get = (nextToken) => {
      client.getDocumentAnalysis({ JobId: jobId, NextToken: nextToken }, (err, data) => {
        if (err) return reject(err);
        pages.push(data);
        if (data.NextToken) return setTimeout(() => get(data.NextToken), 500);
        resolve(pages);
      });
    };
    get();
  });
}

function cellText(result, blocksMap) {
  let text = '';
  for (const rel of result.Relationships || []) {
    if (rel.Type !== 'CHILD') continue;
    for (const childId of rel.Ids) {
      const w = blocksMap[childId];
      if (!w) continue;
      if (w.BlockType === 'WORD') text += w.Text + ' ';
      if (w.BlockType === 'SELECTION_ELEMENT' && w.SelectionStatus === 'SELECTED') text += 'X ';
    }
  }
  return text.trim();
}

function tableToCsv(tableBlock, blocksMap, index) {
  const rows = {};
  for (const rel of tableBlock.Relationships || []) {
    if (rel.Type !== 'CHILD') continue;
    for (const childId of rel.Ids) {
      const cell = blocksMap[childId];
      if (cell && cell.BlockType === 'CELL') {
        rows[cell.RowIndex] = rows[cell.RowIndex] || {};
        rows[cell.RowIndex][cell.ColumnIndex] = cellText(cell, blocksMap);
      }
    }
  }
  let csv = `Table ${index}\n`;
  for (const cols of Object.values(rows)) {
    csv += Object.values(cols).map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',') + '\n';
  }
  return csv + '\n';
}

function blocksToTablesCsv(blocks) {
  const blocksMap = {};
  const tableBlocks = [];
  for (const b of blocks) {
    blocksMap[b.Id] = b;
    if (b.BlockType === 'TABLE') tableBlocks.push(b);
  }
  return tableBlocks.map((t, i) => tableToCsv(t, blocksMap, i + 1)).join('');
}

async function runTextract(s3Key) {
  const jobId = await startJob(textract, BUCKET, s3Key);
  await isJobComplete(textract, jobId);
  const pages = await getJobResults(textract, jobId);
  const lines = [];
  let tablesCsv = '';
  for (const page of pages) {
    for (const b of page.Blocks || []) {
      if (b.BlockType === 'LINE') lines.push(b.Text);
    }
    tablesCsv += blocksToTablesCsv(page.Blocks || []);
  }
  return { rawText: lines.join('\n'), tablesCsv };
}

// Runs in the background after upload; updates the File doc when done.
async function processFile(fileId, s3Key) {
  try {
    const { rawText, tablesCsv } = await runTextract(s3Key);
    const overview = await generateOverview(rawText, tablesCsv).catch(() => ({}));
    await File.findByIdAndUpdate(fileId, {
      rawText,
      tablesCsv,
      status: 'ready',
      error: '',
      summary: overview.summary || '',
      keyFacts: Array.isArray(overview.keyFacts) ? overview.keyFacts : [],
      suggestedQuestions: Array.isArray(overview.suggestedQuestions)
        ? overview.suggestedQuestions
        : [],
    });
  } catch (err) {
    console.error('processFile error:', err && err.message);
    await File.findByIdAndUpdate(fileId, { status: 'failed', error: (err && err.message) || 'Processing failed' });
  }
}

// ---------------------------------------------------------------------------
// Claude: document text + a user question -> a single JSON object
// ---------------------------------------------------------------------------
async function askClaude(rawText, tablesCsv, query) {
  const prompt = `You are given the extracted contents of a single document.

RAW TEXT:
${rawText}

DETECTED TABLES (CSV):
${tablesCsv || '(none)'}

Answer the user's request using ONLY the information in this document. Represent the
answer as a single JSON object. For tabular answers use an array of objects with
consistent keys. If the document does not contain the answer, return {"note": "..."}.

User request: ${query}`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 16000,
    system:
      'You extract structured data from documents and always respond with a single valid JSON object only — no markdown, no code fences, no text before or after the JSON.',
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content.find((b) => b.type === 'text');
  let text = block ? block.text.trim() : '';
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

// After Textract, ask Claude for a summary, key facts, and suggested questions.
async function generateOverview(rawText, tablesCsv) {
  const prompt = `You are given a document's extracted contents. Return a single JSON object with exactly these keys:
- "summary": a 2-3 sentence plain-language description of what this document is.
- "keyFacts": an array of up to 6 objects {"label","value"} capturing the most important facts.
- "suggestedQuestions": an array of 4-6 short, useful questions a user could ask to pull structured tables out of this document.
JSON only.

TEXT:
${(rawText || '').slice(0, 60000)}

TABLES (CSV):
${(tablesCsv || '').slice(0, 20000)}`;
  const response = await anthropic.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    system:
      'Respond with a single valid JSON object only — no markdown, no code fences, no text before or after.',
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content.find((b) => b.type === 'text');
  let text = block ? block.text.trim() : '';
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

// In-memory upload; the buffer goes straight to S3 (no local disk needed).
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// ===========================================================================
// Auth
// ===========================================================================
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, userName, email, password } = req.body;
    const existing = await userModel.find({ $or: [{ userName }, { email }] });
    if (existing.length > 0) return res.status(400).json({ message: 'Username or email already exists' });
    const newUser = await userModel.create({ firstName, lastName, userName, email, password });
    res.status(201).json({ message: 'Account created', userInfo: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { userNameorEmail, password } = req.body;
  try {
    const user = await userModel.findOne({ $or: [{ userName: userNameorEmail }, { email: userNameorEmail }] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== password) return res.status(401).json({ message: 'Incorrect password' });
    res.status(200).json({ message: 'Login successful', userInfo: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===========================================================================
// Files
// ===========================================================================
// Upload -> store in S3 -> respond immediately -> parse with Textract in background
app.post('/api/files', upload.single('file'), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    const s3Key = `${userId}/${Date.now()}-${req.file.originalname}`;
    await s3
      .upload({ Bucket: BUCKET, Key: s3Key, Body: req.file.buffer, ContentType: req.file.mimetype })
      .promise();

    const fileDoc = await File.create({
      userId,
      fileName: req.file.originalname,
      s3Key,
      mimeType: req.file.mimetype,
      status: 'processing',
    });

    res.status(201).json({ fileId: fileDoc._id, status: 'processing' });
    processFile(fileDoc._id, s3Key); // fire-and-forget
  } catch (err) {
    console.error('upload error:', err && err.message);
    res.status(500).json({ message: 'Upload failed' });
  }
});

// List a user's files (light — no raw text / tables blob)
app.get('/api/files', async (req, res) => {
  try {
    const { userId } = req.query;
    const files = await File.find(userId ? { userId } : {})
      .select('-rawText -tablesCsv')
      .sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// File details + presigned view URL + its saved tables
app.get('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id).select('-rawText -tablesCsv');
    if (!file) return res.status(404).json({ message: 'File not found' });
    const viewUrl = s3.getSignedUrl('getObject', { Bucket: BUCKET, Key: file.s3Key, Expires: 3600 });
    const tables = await TableResult.find({ fileId: file._id }).sort({ createdAt: -1 });
    res.json({ file, viewUrl, tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Generate a table for a query — NOT saved (returned for the user to confirm/keep)
app.post('/api/files/:id/query', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !String(query).trim()) return res.status(400).json({ message: 'Query is required' });
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    if (file.status !== 'ready') return res.status(400).json({ message: 'File is still being processed' });

    const raw = await askClaude(file.rawText, file.tablesCsv, query);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { answer: raw };
    }
    res.json({ query, data });
  } catch (err) {
    console.error('query error:', err && err.message);
    res.status(500).json({ message: 'Failed to generate answer' });
  }
});

// Save a generated table
app.post('/api/files/:id/tables', async (req, res) => {
  try {
    const { query, data } = req.body;
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: 'File not found' });
    const table = await TableResult.create({ fileId: file._id, userId: file.userId, query, data });
    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// List saved tables for a file
app.get('/api/files/:id/tables', async (req, res) => {
  try {
    const tables = await TableResult.find({ fileId: req.params.id }).sort({ createdAt: -1 });
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a saved table
app.delete('/api/files/:id/tables/:tableId', async (req, res) => {
  try {
    await TableResult.findByIdAndDelete(req.params.tableId);
    res.json({ message: 'Table deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a file (+ its tables + S3 object)
app.delete('/api/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (file) {
      try {
        await s3.deleteObject({ Bucket: BUCKET, Key: file.s3Key }).promise();
      } catch (e) {
        console.error('s3 delete failed:', e && e.message);
      }
      await TableResult.deleteMany({ fileId: file._id });
      await File.findByIdAndDelete(file._id);
    }
    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// SPA fallback — serve the built UI for any non-/api route
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
