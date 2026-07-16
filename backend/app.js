const AWS = require('aws-sdk');
const Anthropic = require('@anthropic-ai/sdk');
const dotenv = require('dotenv');
const cors = require('cors');
const express = require('express');
const multer = require('multer');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const path = require('path');

require('./connection');
const File = require('./File');
const Folder = require('./Folder');
const TableResult = require('./TableResult');
const userModel = require('./userModel');
const bcrypt = require('bcryptjs');
const { sendOtpEmail, send2faEnabledEmail } = require('./mailer');

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
    client.startDocumentTextDetection(
      { DocumentLocation: { S3Object: { Bucket: bucket, Name: key } } },
      (err, data) => (err ? reject(err) : resolve(data.JobId))
    );
  });
}

function isJobComplete(client, jobId) {
  return new Promise((resolve, reject) => {
    const check = () => {
      client.getDocumentTextDetection({ JobId: jobId }, (err, data) => {
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
      client.getDocumentTextDetection({ JobId: jobId, NextToken: nextToken }, (err, data) => {
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
  for (const page of pages) {
    for (const b of page.Blocks || []) {
      if (b.BlockType === 'LINE') lines.push(b.Text);
    }
  }
  return { rawText: lines.join('\n'), tablesCsv: '' };
}

async function s3GetBuffer(key) {
  const obj = await s3.getObject({ Bucket: BUCKET, Key: key }).promise();
  return obj.Body;
}

// Pick an extractor by file type:
//   - PDF / PNG / JPG / TIFF  -> AWS Textract (text + detected tables)
//   - Word .docx              -> mammoth (raw text)
//   - .txt / .md / .csv       -> read the bytes directly
async function extractContent({ s3Key, mimeType, fileName, buffer }) {
  const name = (fileName || '').toLowerCase();
  const type = mimeType || '';
  const isDocx = name.endsWith('.docx') || type.includes('wordprocessingml');
  const isText =
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    type.startsWith('text/');

  if (isDocx) {
    const buf = buffer || (await s3GetBuffer(s3Key));
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { rawText: value || '', tablesCsv: '' };
  }
  if (isText) {
    const buf = buffer || (await s3GetBuffer(s3Key));
    return { rawText: buf.toString('utf8'), tablesCsv: '' };
  }

  // PDFs: try the free local text layer first. Only fall back to Textract OCR
  // when there's little/no extractable text (i.e. a scanned/image PDF).
  const isPdf = name.endsWith('.pdf') || type.includes('pdf');
  if (isPdf) {
    try {
      const buf = buffer || (await s3GetBuffer(s3Key));
      const parsed = await pdfParse(buf);
      const text = (parsed.text || '').trim();
      const pages = parsed.numpages || 1;
      if (text.length / pages >= 100) {
        return { rawText: text, tablesCsv: '' };
      }
    } catch (e) {
      // unreadable text layer — fall through to Textract OCR
    }
  }

  return runTextract(s3Key);
}

// Runs in the background after upload; updates the File doc when done.
async function processFile(fileId, meta) {
  try {
    const { rawText, tablesCsv } = await extractContent(meta);
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
  const prompt = `You are given the extracted contents of one or more documents. When
multiple documents are present they are separated by lines like "===== FILE: name =====".

CONTENT:
${rawText}
${tablesCsv ? `\nDETECTED TABLES (CSV):\n${tablesCsv}\n` : ''}
Answer the user's request using ONLY the information in these documents. When the request
spans multiple documents (totals, comparisons, counts), aggregate across all of them.
Represent the answer as a single JSON object. For tabular answers use an array of objects
with consistent keys. If the documents do not contain the answer, return {"note": "..."}.

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
function safeUser(u) {
  const o = u && u.toObject ? u.toObject() : { ...(u || {}) };
  delete o.password;
  delete o.otp;
  delete o.otpExpires;
  return o;
}

app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, userName, email, password } = req.body;
    const existing = await userModel.find({ $or: [{ userName }, { email }] });
    if (existing.length > 0) return res.status(400).json({ message: 'Username or email already exists' });
    const hashed = await bcrypt.hash(password, 10);
    const newUser = await userModel.create({ firstName, lastName, userName, email, password: hashed });
    res.status(201).json({ message: 'Account created', userInfo: safeUser(newUser) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const NUDGE_MS = 15 * 24 * 60 * 60 * 1000; // 15 days
const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Stored password is a bcrypt hash for new/migrated users. Any legacy plaintext
// value is compared directly and transparently upgraded to a hash on success.
async function verifyPassword(user, password) {
  if (user.password && user.password.startsWith('$2')) {
    return bcrypt.compare(password, user.password);
  }
  if (user.password === password) {
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    return true;
  }
  return false;
}

app.post('/api/login', async (req, res) => {
  const { userNameorEmail, password } = req.body;
  try {
    const user = await userModel.findOne({ $or: [{ userName: userNameorEmail }, { email: userNameorEmail }] });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!(await verifyPassword(user, password)))
      return res.status(401).json({ message: 'Incorrect password' });

    // Two-step verification: email an OTP and require it before issuing the session.
    if (user.twoFactorEnabled) {
      const otp = genOtp();
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();
      try {
        await sendOtpEmail(user.email, otp, user.firstName);
      } catch (e) {
        console.error('otp email failed:', e && e.message);
        return res.status(502).json({ message: 'Could not send the verification code. Try again later.' });
      }
      return res.status(200).json({ twoFactorRequired: true, userId: user._id, email: user.email });
    }

    // Not enrolled: nudge to enable 2FA at most once every 15 days.
    const last = user.lastTwoFactorNudge ? +new Date(user.lastTwoFactorNudge) : 0;
    const nudge2fa = Date.now() - last > NUDGE_MS;
    if (nudge2fa) {
      user.lastTwoFactorNudge = new Date();
      await user.save();
    }
    res.status(200).json({ message: 'Login successful', userInfo: safeUser(user), nudge2fa });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Step 2 of login when two-step verification is on
app.post('/api/login/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (!user.otp || !user.otpExpires || user.otpExpires < new Date())
      return res.status(400).json({ message: 'Code expired — please sign in again' });
    if (String(otp).trim() !== user.otp) return res.status(401).json({ message: 'Incorrect code' });
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.status(200).json({ message: 'Login successful', userInfo: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Enable/disable two-step verification (from Settings)
app.post('/api/2fa', async (req, res) => {
  try {
    const { userId, enabled } = req.body;
    const user = await userModel.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (enabled) {
      // Confirm email delivery works before turning it on (avoids lockout).
      try {
        await send2faEnabledEmail(user.email, user.firstName);
      } catch (e) {
        console.error('2fa enable email failed:', e && e.message);
        return res
          .status(502)
          .json({ message: 'Could not enable — we could not email your address. Try again later.' });
      }
      user.twoFactorEnabled = true;
    } else {
      user.twoFactorEnabled = false;
    }
    await user.save();
    res.status(200).json({ userInfo: safeUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===========================================================================
// Files
// ===========================================================================
// Upload -> store in S3 -> respond immediately -> parse with Textract in background
app.post('/api/files', upload.array('files', 20), async (req, res) => {
  try {
    const { userId } = req.body;
    const uploaded = req.files || [];
    if (!uploaded.length) return res.status(400).json({ message: 'No file provided' });
    if (!userId) return res.status(400).json({ message: 'userId is required' });

    // Attach to an existing folder if given; otherwise a single multi-file
    // request becomes its own new folder/set (a single file stays at root).
    let folderId = req.body.folderId || null;
    if (!folderId && uploaded.length > 1) {
      const name =
        (req.body.folderName && String(req.body.folderName).trim()) ||
        `Set · ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
      const folder = await Folder.create({ userId, name });
      folderId = folder._id;
    }

    const created = [];
    for (const f of uploaded) {
      const prefix = folderId ? `${userId}/${folderId}/` : `${userId}/`;
      const rand = Math.random().toString(36).slice(2, 7);
      const s3Key = `${prefix}${Date.now()}-${rand}-${f.originalname}`;
      await s3
        .upload({ Bucket: BUCKET, Key: s3Key, Body: f.buffer, ContentType: f.mimetype })
        .promise();
      const fileDoc = await File.create({
        userId,
        folderId,
        fileName: f.originalname,
        s3Key,
        mimeType: f.mimetype,
        status: 'processing',
      });
      created.push({ fileId: fileDoc._id, fileName: f.originalname, status: 'processing' });
      // fire-and-forget; pass the buffer so pdf/docx/text avoid a re-download
      processFile(fileDoc._id, {
        s3Key,
        mimeType: f.mimetype,
        fileName: f.originalname,
        buffer: f.buffer,
      });
    }

    res.status(201).json({ folderId, files: created });
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

// Rename a file and/or update its tags
app.patch('/api/files/:id', async (req, res) => {
  try {
    const { fileName, tags } = req.body;
    const update = {};
    if (typeof fileName === 'string' && fileName.trim()) update.fileName = fileName.trim();
    if (Array.isArray(tags)) update.tags = tags.map((t) => String(t).trim()).filter(Boolean);
    const file = await File.findByIdAndUpdate(req.params.id, update, { new: true }).select(
      '-rawText -tablesCsv'
    );
    if (!file) return res.status(404).json({ message: 'File not found' });
    res.json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// All saved tables for a user (across documents)
app.get('/api/tables', async (req, res) => {
  try {
    const { userId } = req.query;
    const tables = await TableResult.find(userId ? { userId } : {})
      .populate({ path: 'fileId', select: 'fileName' })
      .sort({ createdAt: -1 });
    res.json(tables);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Create an (empty) folder to upload a set into
app.post('/api/folders', async (req, res) => {
  try {
    const { userId, name } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const folder = await Folder.create({
      userId,
      name: (name && String(name).trim()) || `Set · ${new Date().toLocaleString()}`,
    });
    res.status(201).json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Folders (sets) for a user
app.get('/api/folders', async (req, res) => {
  try {
    const { userId } = req.query;
    const folders = await Folder.find(userId ? { userId } : {}).sort({ createdAt: -1 });
    res.json(folders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Folder detail: the folder + its files + tables saved from it
app.get('/api/folders/:id', async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    const files = await File.find({ folderId: folder._id })
      .select('-rawText -tablesCsv')
      .sort({ createdAt: -1 });
    const tables = await TableResult.find({ folderId: folder._id }).sort({ createdAt: -1 });
    res.json({ folder, files, tables });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a folder and everything under it (files + their tables + S3 objects)
app.delete('/api/folders/:id', async (req, res) => {
  try {
    const files = await File.find({ folderId: req.params.id });
    for (const file of files) {
      try {
        await s3.deleteObject({ Bucket: BUCKET, Key: file.s3Key }).promise();
      } catch (e) {
        console.error('s3 delete failed:', e && e.message);
      }
      await TableResult.deleteMany({ fileId: file._id });
      await File.findByIdAndDelete(file._id);
    }
    await Folder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Query across a selection of files (multi-file). NOT saved.
const MAX_QUERY_CHARS = 300000; // ~75k tokens budget across the selection
app.post('/api/query', async (req, res) => {
  try {
    const { fileIds, query } = req.body;
    if (!query || !String(query).trim()) return res.status(400).json({ message: 'Query is required' });
    if (!Array.isArray(fileIds) || !fileIds.length)
      return res.status(400).json({ message: 'Select at least one file' });

    const files = await File.find({ _id: { $in: fileIds }, status: 'ready' });
    if (!files.length) return res.status(400).json({ message: 'No ready files in the selection' });

    let combined = '';
    const skipped = [];
    for (const f of files) {
      const block = `\n===== FILE: ${f.fileName} =====\n${f.rawText || ''}\n`;
      if (combined.length + block.length > MAX_QUERY_CHARS) {
        skipped.push(f.fileName);
        continue;
      }
      combined += block;
    }

    const raw = await askClaude(combined, '', query);
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { answer: raw };
    }
    res.json({ query, data, filesUsed: files.length - skipped.length, skipped });
  } catch (err) {
    console.error('multi-query error:', err && err.message);
    res.status(500).json({ message: 'Failed to generate answer' });
  }
});

// Save a table from any query (single- or multi-file)
app.post('/api/tables', async (req, res) => {
  try {
    const { userId, query, data, fileIds, sourceLabel, folderId } = req.body;
    if (!userId || !query || typeof data === 'undefined')
      return res.status(400).json({ message: 'Missing fields' });
    const ids = Array.isArray(fileIds) ? fileIds : [];
    const srcFiles = ids.length
      ? (await File.find({ _id: { $in: ids } }).select('fileName')).map((f) => f.fileName)
      : [];
    const table = await TableResult.create({
      userId,
      query,
      data,
      fileIds: ids,
      folderId: folderId || null,
      sourceLabel: sourceLabel || '',
      sourceFileNames: srcFiles,
    });
    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete any saved table by id
app.delete('/api/tables/:tableId', async (req, res) => {
  try {
    await TableResult.findByIdAndDelete(req.params.tableId);
    res.json({ message: 'Table deleted' });
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
