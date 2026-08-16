# DocP — Document Intelligence

Upload documents, ask questions about them in plain English, and get clean structured
answers you can visualize, export, and save. DocP reads PDFs, images, and Word/text files,
lets you chat with a single document or a whole collection, validates every answer against
the source, and can **search and reason across your entire library** with citations.

- **Live app:** https://cndocp.vercel.app

> There are no seeded accounts — open the app and **create an account** to get started.

---

## What it does

**Ingest & extract**
- Upload PDFs, images, Word docs, and plain-text files (single or many at once).
- **Async extraction:** the upload returns immediately and parsing runs in the background;
  the UI polls until each file is `ready`.
- Smart extraction per type — digital PDFs are read locally for free, scanned pages and
  images go through OCR, Word/text are parsed directly (details below).
- Per-document **AI overview**: auto summary, key facts, and suggested questions.

**Ask & structure**
- **Chat** with a document. A confirm-before-generate step shows what will be asked; answers
  come back as structured data you can turn into a **table** and save.
- **Answer validation** — a fast grounding check labels every answer
  **✓ Verified / ⚠ Partially supported / ✕ Not supported** against the source text.
- **Custom instructions** (applied to every query, like standing formatting rules) and
  **saved prompts** (named, reusable, one-click).
- **Tables ⇄ charts** (bar / line / pie) with **CSV / JSON / copy** export.

**Organize**
- **Folders / sets** — upload multiple files into a named set (or keep single files at the
  root), add files to a set any time, and open a **set page** to chat across the whole set.
- **Cross-file querying** — select any documents (or a whole set) and ask one question over
  all of them; totals, comparisons, and counts are aggregated.
- Rename documents, add **tags**, and manage answers in a workspace-wide **Saved tables**
  view (each table has its own full-page view and can be renamed).

**Find & search**
- **Find in a document** with match highlighting, a result counter, and next/previous
  navigation:
  - digital PDFs highlight in the rendered page (pdf.js text layer),
  - images and scanned PDFs highlight on the page using stored OCR word boxes,
  - Word/text uses a text view.
- **Content search** across all your documents (Documents page → Names / Content toggle).
- **Ask everything** — semantic (vector) search over your entire library: your question is
  embedded, the most relevant chunks across all documents are retrieved, and the answer is
  generated **with source-document citations**.

**Accounts & security**
- Sign up / sign in with **bcrypt-hashed** passwords.
- Optional **email one-time-password 2FA** (enable in Settings); a periodic sign-in nudge
  suggests turning it on.
- Light & dark themes.

### Supported file types

| Type | Extensions | How it's extracted |
|------|------------|--------------------|
| PDF (digital) | `.pdf` | `pdf-parse` reads the embedded text layer (no OCR cost) |
| PDF (scanned) | `.pdf` | falls back to **AWS Textract** OCR; word geometry stored for highlighting |
| Images | `.png`, `.jpg`, `.jpeg`, `.tif`, `.tiff` | **AWS Textract** OCR; word geometry stored |
| Word | `.docx` | `mammoth` (raw text) |
| Plain text | `.txt`, `.md`, `.csv` | read directly |

> Uploads are capped at **~4.5 MB per file** because each upload passes through Vercel's
> proxy body limit (files are uploaded one request each, so a set can total more).
> Legacy `.doc` (binary Word) is not supported — save as `.docx` or PDF.

---

## Architecture

```
Browser ──▶ Vercel (static React SPA + /api proxy)
                     │  rewrites /api/* ──▶ http://<ec2-host>:9000/api/*
                     ▼
              EC2 (Amazon Linux, Node/Express, pm2 "docp")
                     ├── MongoDB Atlas      users · files · folders · tables · prompts · chunks
                     ├── Atlas Vector Search retrieval for "Ask everything" (index: vector_index)
                     ├── AWS S3             original file storage (private, presigned views)
                     ├── AWS Textract       OCR for scanned PDFs & images
                     ├── Voyage AI          embeddings (voyage-4-lite, 1024-dim)
                     ├── Anthropic Claude   overview, query answers, answer validation
                     └── SMTP               email OTP for two-step verification
```

- The frontend and backend are **same-origin in the browser**: Vercel rewrites `/api/*` to the
  EC2 backend, so there's no CORS or mixed-content (HTTPS page → HTTP API) issue.
- On EC2, AWS access uses the **instance IAM role** (`docp-ec2-role`) by default — no keys on
  disk. Explicit keys are only used if the matching env vars are set (handy for local dev).
- Uploaded files are stored **privately** in S3; the in-app viewer uses short-lived
  **presigned URLs**, and the PDF viewer streams bytes same-origin via `/api/files/:id/raw`
  so pdf.js isn't blocked by S3 CORS.

### How "Ask everything" (semantic search) works

1. **At ingest** (and via a one-time backfill for existing files) each document's text is
   split into overlapping chunks; every chunk is embedded with **Voyage `voyage-4-lite`**
   (output dimension **1024**) and stored in a `chunks` collection.
2. **On a question**, the question is embedded and run through **Atlas Vector Search**
   (`$vectorSearch` on the `vector_index`, filtered to the user) to retrieve the most
   relevant chunks across all their documents.
3. Those chunks are passed to **Claude**, which answers and the API returns the answer plus
   the **source documents** it drew from, plus a validation status.

### Tech stack

- **Frontend:** Create React App + TypeScript, react-router-dom, react-dropzone,
  `react-pdf` (pdf.js), recharts, react-markdown + remark-gfm, antd (toasts), dayjs.
- **Backend:** Node.js + Express, Mongoose (MongoDB), `aws-sdk` (S3 + Textract),
  `pdf-parse`, `mammoth`, `@anthropic-ai/sdk`, `axios` (Voyage), `bcryptjs`,
  `nodemailer`, `multer` (in-memory uploads).
- **Data:** MongoDB Atlas + Atlas Vector Search.
- **Hosting:** Vercel (frontend) + EC2/pm2 (backend).

### Repo structure

```
backend/
  app.js                    Express app: all routes, extraction, Claude + Voyage calls
  connection.js             Mongo connection (MONGO_URI)
  mailer.js                 nodemailer transport + OTP / notice email templates
  backfill-embeddings.js    one-time script to embed existing documents
  userModel.js              User (auth, 2FA, custom instructions)
  File.js                   uploaded document (text, OCR geometry, overview, tags, status)
  Folder.js                 a set / folder of documents
  TableResult.js            a saved answer/table (single- or multi-file)
  SavedPrompt.js            a reusable named prompt
  Chunk.js                  a text chunk + embedding (for vector search)
  public/                   built SPA (only used when the backend serves the UI directly)
client/
  src/pages/                Overview, Documents, FilePage, FolderPage, TablePage, Tables,
                            AskPage, Settings, Login, Signup, Landing
  src/components/           AppShell, Chatbot, PdfViewer, ImageViewer, ResultView,
                            TableView, AuthShell, LoadingMessages
  src/api.ts                typed API client
  vercel.json               build config + /api → EC2 rewrite
```

---

## Environment variables (`backend/.env`)

```bash
# Database — a MongoDB Atlas URI in prod; omit to use a local MongoDB for dev
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/docp

# Anthropic (overview, query answers, answer validation)
ANTHROPIC_API_KEY=sk-ant-...

# Voyage AI (embeddings for "Ask everything")
VOYAGE_API_KEY=pa-...

# AWS — S3 storage
AWS_BUCKET_NAME=docp-<account>-us-east-2-...
AWS_REGION=us-east-2

# AWS — Textract (usually the same region as the bucket)
TEXTRACT_REGION=us-east-2

# Optional explicit AWS keys for LOCAL dev only.
# On EC2 these are omitted so the instance IAM role is used instead.
AWS_ACCESS_KEY=
AWS_ACCESS_SECRETKEY=
TEXTRACT_ACCESS_KEY=
TEXTRACT_SECRET_ACCESS_KEY=

# SMTP for two-step verification email codes (Gmail needs an App Password)
SMTP_USER=you@example.com
SMTP_PASS=app-password
# optional: SMTP_HOST (default smtp.gmail.com), SMTP_PORT (465), SMTP_SECURE (true)

# Server port (defaults to 9000)
PORT=9000
```

> `connection.js` falls back to `mongodb://127.0.0.1:27017/docp` when `MONGO_URI` is unset.

---

## Semantic search setup (one-time)

"Ask everything" needs a **Vector Search index** and a **backfill** of existing documents.

1. **Create the Atlas Vector Search index** named **`vector_index`** on database `docp`,
   collection `chunks` (Atlas → Atlas Search → Create Search Index → Vector Search → JSON):
   ```json
   {
     "fields": [
       { "type": "vector", "path": "embedding", "numDimensions": 1024, "similarity": "cosine" },
       { "type": "filter", "path": "userId" }
     ]
   }
   ```
   (Vector Search runs on the free M0 tier with limits, or any M10+.)

2. **Backfill embeddings** for documents uploaded before this was enabled:
   ```bash
   cd backend
   node backfill-embeddings.js
   ```
   It's idempotent-safe to re-run. New uploads embed automatically at ingest.

> The embedding model is `voyage-4-lite` at output dimension **1024** to match the index.
> The Voyage account needs a payment method on file to lift the free-tier rate limit
> (the voyage-4 generation still includes ~200M free tokens before any charge).

---

## Running locally

**Prerequisites:** Node.js 18+, a MongoDB (local or Atlas), an Anthropic key, AWS S3 +
Textract access (for PDF/image OCR), a Voyage key (for "Ask everything"), and SMTP creds
(for 2FA). `.docx`/`.txt` and non-semantic features work without AWS/Voyage.

**1. Backend**
```bash
cd backend
npm install
# create backend/.env with the variables above
npm start           # or: node app.js  → http://localhost:9000
```

**2. Frontend** (second terminal)
```bash
cd client
npm install
npm start           # → http://localhost:3000
```
The CRA dev server proxies `/api` to `http://localhost:9000` (see `"proxy"` in
`client/package.json`), so the running backend is reached automatically.

---

## API reference

All routes are under `/api`. Auth is minimal (no JWT): the client stores the returned user
in `localStorage` and passes `userId` where needed.

**Auth & user**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/signup` | Create an account (password hashed) |
| `POST` | `/api/login` | Log in → session, or an OTP challenge if 2FA is on |
| `POST` | `/api/login/verify-otp` | Complete login with the emailed code |
| `POST` | `/api/2fa` | Enable/disable two-step verification |
| `POST` | `/api/user/instructions` | Save custom instructions |

**Documents**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files` | Upload file(s) (multipart) → parsed in the background |
| `GET`  | `/api/files?userId=` | List a user's documents |
| `GET`  | `/api/files/:id` | Details + presigned view URL + saved tables |
| `PATCH`| `/api/files/:id` | Rename and/or update tags |
| `DELETE`| `/api/files/:id` | Delete document (+ its tables, chunks, S3 object) |
| `GET`  | `/api/files/:id/text` | Full extracted text (for the in-viewer find) |
| `GET`  | `/api/files/:id/raw` | Stream raw bytes same-origin (PDF viewer) |
| `GET`  | `/api/files/:id/geometry` | OCR word boxes (image/scanned highlighting) |
| `GET`  | `/api/files/:id/search?q=` | Search inside one document's text |
| `GET`  | `/api/search?userId=&q=` | Keyword content search across all documents |

**Ask**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files/:id/query` | Ask about one document → JSON answer + validation |
| `POST` | `/api/query` | Ask across selected files → answer + validation |
| `POST` | `/api/ask` | Semantic search across all documents → answer + sources + validation |

**Tables & prompts**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/files/:id/tables` | Save a single-document table |
| `POST` | `/api/tables` | Save a multi-document table |
| `GET`  | `/api/tables?userId=` | All saved tables |
| `GET`  | `/api/tables/:id` | One saved table (full-page view) |
| `PATCH`| `/api/tables/:id` | Rename a saved table |
| `DELETE`| `/api/tables/:id` | Delete a saved table |
| `GET`/`POST`/`DELETE` | `/api/prompts` | List / create / delete saved prompts |

**Folders**
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/folders` | Create a set |
| `GET`  | `/api/folders?userId=` | List sets |
| `GET`  | `/api/folders/:id` | Set details (files + its saved tables) |
| `DELETE`| `/api/folders/:id` | Delete a set (+ its files, tables, chunks, S3 objects) |

---

## Deployment

### Backend — EC2 (Amazon Linux) with pm2

The instance runs Node/Express under **pm2** as process **`docp`**, using the
**`docp-ec2-role`** IAM instance role for S3/Textract. The app lives at
`/home/ec2-user/DocP-Document-Parsing/backend`.

```bash
# copy changed backend files up (the EC2 checkout is NOT a git repo — copy, don't pull)
scp -i "<key>.pem" backend/app.js backend/package.json backend/package-lock.json \
    ec2-user@<ec2-host>:/home/ec2-user/DocP-Document-Parsing/backend/

# on the box: install any new deps, restart, verify
ssh -i "<key>.pem" ec2-user@<ec2-host>
cd /home/ec2-user/DocP-Document-Parsing/backend
npm install --omit=dev
pm2 restart docp --update-env
pm2 logs docp --lines 20
```

> Make sure the EC2 **security group** allows inbound TCP **9000**.

### Frontend — Vercel

`client/vercel.json` builds the CRA app and rewrites `/api/*` to the EC2 backend, so the
browser only ever talks to the HTTPS Vercel origin:

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "http://<ec2-host>:9000/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

```bash
cd client
npx vercel --prod
```

> **cndocp.vercel.app** is the canonical URL. If you move the backend to a new EC2 host,
> update the `destination` in `vercel.json`. The pdf.js worker is bundled at
> `client/public/pdf.worker.min.js` and served same-origin.

### Alternative: single-origin

`npm run build` in `client/` copies the built app into `backend/public/`, and the backend has
an SPA fallback route, so you can serve everything from the EC2 backend on port 9000 without
Vercel.

---

## Security notes

- Passwords are **bcrypt-hashed**; login responses never include password/OTP fields.
- **Two-step verification** (email OTP) is opt-in per user; enabling requires a working SMTP
  delivery so nobody can lock themselves out.
- Uploaded files are private in S3 and only exposed via short-lived presigned URLs.
- Every generated answer is checked for grounding against the source before it's trusted.
- Never commit `backend/.env`. Rotate any credential that has been shared or exposed.
