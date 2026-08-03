import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import Chatbot from "../components/Chatbot";
import ResultView from "../components/ResultView";
import LoadingMessages from "../components/LoadingMessages";
import PdfViewer from "../components/PdfViewer";
import ImageViewer from "../components/ImageViewer";
import {
  getFile,
  getFileText,
  deleteTable,
  deleteFile,
  updateFile,
  FileItem,
  TableResultItem,
} from "../api";

type Tab = "chat" | "tables" | "document";

export default function FilePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState<{
    file: FileItem;
    viewUrl: string;
    tables: TableResultItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("chat");
  const [modal, setModal] = useState<TableResultItem | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");

  // in-document find
  const [docView, setDocView] = useState<"original" | "text">("original");
  const [findOpen, setFindOpen] = useState(false);
  const [findQ, setFindQ] = useState("");
  const [cur, setCur] = useState(0);
  const [docText, setDocText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [pdfCount, setPdfCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const matchRefs = useRef<(HTMLElement | null)[]>([]);
  const findRef = useRef<HTMLInputElement>(null);

  const file0 = state?.file;
  const isPdf =
    !!file0 && ((file0.mimeType || "").includes("pdf") || file0.fileName.toLowerCase().endsWith(".pdf"));
  const isImage =
    !!file0 &&
    ((file0.mimeType || "").startsWith("image/") || /\.(png|jpe?g|tiff?)$/i.test(file0.fileName));

  const load = useCallback(() => {
    if (!id) return;
    return getFile(id)
      .then(setState)
      .catch(() => message.error("Could not load this file"));
  }, [id]);
  useEffect(() => {
    setLoading(true);
    Promise.resolve(load()).finally(() => setLoading(false));
  }, [load]);

  const ensureText = useCallback(() => {
    if (docText !== null || textLoading || !id) return;
    setTextLoading(true);
    getFileText(id)
      .then(setDocText)
      .catch(() => setDocText(""))
      .finally(() => setTextLoading(false));
  }, [docText, textLoading, id]);

  const openFind = useCallback(() => {
    if (isPdf || isImage) setDocView("original");
    else {
      setDocView("text");
      ensureText();
    }
    setFindOpen(true);
    setTimeout(() => findRef.current?.focus(), 60);
  }, [ensureText, isPdf, isImage]);
  const closeFind = () => {
    setFindOpen(false);
    setFindQ("");
  };

  const matchCount = useMemo(() => {
    if (!docText || !findQ) return 0;
    const lower = docText.toLowerCase();
    const ql = findQ.toLowerCase();
    let n = 0;
    let i = 0;
    for (;;) {
      const idx = lower.indexOf(ql, i);
      if (idx === -1) break;
      n++;
      i = idx + ql.length;
    }
    return n;
  }, [docText, findQ]);

  const renderedText = useMemo(() => {
    matchRefs.current = [];
    if (!docText) return null;
    if (!findQ) return docText;
    const parts: any[] = [];
    const lower = docText.toLowerCase();
    const ql = findQ.toLowerCase();
    let i = 0;
    let m = 0;
    for (;;) {
      const idx = lower.indexOf(ql, i);
      if (idx === -1) {
        parts.push(docText.slice(i));
        break;
      }
      if (idx > i) parts.push(docText.slice(i, idx));
      const mi = m;
      parts.push(
        <mark
          key={mi}
          ref={(el) => {
            matchRefs.current[mi] = el;
          }}
          style={{
            background: mi === cur ? "#ff9632" : "rgba(210,153,34,0.55)",
            color: "#000",
            borderRadius: 2,
            padding: "0 1px",
            boxShadow: mi === cur ? "0 0 0 2px #ff9632" : "none",
          }}
        >
          {docText.slice(idx, idx + findQ.length)}
        </mark>
      );
      i = idx + findQ.length;
      m++;
    }
    return parts;
  }, [docText, findQ, cur]);

  const count =
    docView === "text" ? matchCount : isPdf ? pdfCount : isImage ? imageCount : matchCount;

  // reset to the first match when the query or the view changes
  useEffect(() => {
    setCur(0);
  }, [findQ, docView]);
  // scroll the current match into view (text view; the PDF view scrolls itself)
  useEffect(() => {
    if (docView === "text" && matchCount > 0)
      matchRefs.current[cur]?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [cur, matchCount, docView]);
  // Ctrl/Cmd+F opens our find (only while the Document tab is active)
  useEffect(() => {
    if (tab !== "document") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        openFind();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, openFind]);

  const next = () => count && setCur((c) => (c + 1) % count);
  const prev = () => count && setCur((c) => (c - 1 + count) % count);

  if (loading || !state)
    return (
      <AppShell>
        <div className="card" style={{ padding: 40 }}>
          <LoadingMessages />
        </div>
      </AppShell>
    );

  const { file, viewUrl, tables } = state;
  const tags = file.tags || [];

  const patch = async (p: { fileName?: string; tags?: string[] }) => {
    try {
      await updateFile(file._id, p);
      await load();
    } catch {
      message.error("Could not save changes");
    }
  };
  const saveName = async () => {
    const v = nameDraft.trim();
    setRenaming(false);
    if (v && v !== file.fileName) await patch({ fileName: v });
  };
  const addTag = async () => {
    const v = tagDraft.trim();
    setTagDraft("");
    if (v && !tags.includes(v)) await patch({ tags: [...tags, v] });
  };
  const removeTag = (t: string) => patch({ tags: tags.filter((x) => x !== t) });

  const removeTable = async (t: TableResultItem) => {
    try {
      await deleteTable(t._id);
      setModal(null);
      load();
    } catch {
      message.error("Could not delete");
    }
  };
  const removeDoc = async () => {
    if (!window.confirm(`Delete "${file.fileName}" and its saved tables?`)) return;
    try {
      await deleteFile(file._id);
      nav("/documents");
    } catch {
      message.error("Could not delete");
    }
  };

  const segStyle = (on: boolean): React.CSSProperties => ({
    border: "none",
    borderRadius: 0,
    background: on ? "var(--overlay)" : "transparent",
    fontWeight: on ? 600 : 400,
  });

  return (
    <AppShell>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={() => nav("/documents")}>
          ← Documents
        </button>
        {renaming ? (
          <span style={{ display: "flex", gap: 6, flex: 1, minWidth: 200 }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              style={{ height: 30 }}
            />
            <button className="btn btn-sm btn-primary" onClick={saveName}>Save</button>
            <button className="btn btn-sm" onClick={() => setRenaming(false)}>Cancel</button>
          </span>
        ) : (
          <>
            <h2 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {file.fileName}
            </h2>
            <button
              className="btn btn-sm btn-ghost"
              title="Rename"
              onClick={() => {
                setNameDraft(file.fileName);
                setRenaming(true);
              }}
            >
              ✎
            </button>
          </>
        )}
        <span
          className={
            "badge " + (file.status === "ready" ? "ready" : file.status === "failed" ? "failed" : "processing")
          }
        >
          <span className="dot" /> {file.status}
        </span>
        <button className="btn btn-sm btn-danger" style={{ marginLeft: "auto" }} onClick={removeDoc}>
          Delete
        </button>
      </div>
      <div className="faint" style={{ fontSize: 12, marginBottom: 18 }}>
        Uploaded {dayjs(file.createdAt).format("MMM D, YYYY · h:mm A")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 22 }} className="fp-grid">
        {/* main */}
        <div style={{ minWidth: 0 }}>
          <div className="tabs">
            <button className={"tab" + (tab === "chat" ? " active" : "")} onClick={() => setTab("chat")}>
              💬 Chat
            </button>
            <button className={"tab" + (tab === "tables" ? " active" : "")} onClick={() => setTab("tables")}>
              ▦ Saved tables <span className="label" style={{ marginLeft: 2 }}>{tables.length}</span>
            </button>
            <button className={"tab" + (tab === "document" ? " active" : "")} onClick={() => setTab("document")}>
              📄 Document
            </button>
          </div>

          {tab === "chat" && (
            <Chatbot
              fileId={file._id}
              fileName={file.fileName}
              onSaved={load}
              suggestions={file.suggestedQuestions}
              height="72vh"
            />
          )}

          {tab === "tables" &&
            (tables.length === 0 ? (
              <div className="card" style={{ padding: 26, color: "var(--muted)" }}>
                No saved tables yet. Ask a question in <strong>Chat</strong>, then hit{" "}
                <strong>Save to DB</strong> on answers worth keeping.
              </div>
            ) : (
              <div className="list">
                {tables.map((t) => (
                  <div key={t._id} className="row clickable" onClick={() => setModal(t)}>
                    <span>▦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.title || t.query}
                      </div>
                      <div className="faint" style={{ fontSize: 12 }}>
                        {dayjs(t.createdAt).format("MMM D, h:mm A")}
                      </div>
                    </div>
                    <span className="faint" style={{ fontSize: 12 }}>view →</span>
                  </div>
                ))}
              </div>
            ))}

          {tab === "document" && (
            <div className="card" style={{ height: "72vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
              {/* toolbar */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
                <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
                  <button className="btn btn-sm" style={segStyle(docView === "original")} onClick={() => setDocView("original")}>
                    Original
                  </button>
                  <button
                    className="btn btn-sm"
                    style={segStyle(docView === "text")}
                    onClick={() => {
                      setDocView("text");
                      ensureText();
                    }}
                  >
                    Text
                  </button>
                </div>
                <button className="btn btn-sm" onClick={openFind} title="Find (Ctrl+F)">
                  🔍 Find
                </button>
                {findOpen && (
                  <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      ref={findRef}
                      value={findQ}
                      onChange={(e) => setFindQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.shiftKey ? prev() : next();
                        } else if (e.key === "Escape") {
                          closeFind();
                        }
                      }}
                      placeholder="Find in document"
                      style={{ height: 28, width: 190 }}
                    />
                    <span className="faint" style={{ fontSize: 12, minWidth: 62, textAlign: "center" }}>
                      {count ? `${cur + 1} of ${count}` : findQ ? "0 results" : ""}
                    </span>
                    <button className="btn btn-sm" onClick={prev} disabled={!count} title="Previous (Shift+Enter)">
                      ↑
                    </button>
                    <button className="btn btn-sm" onClick={next} disabled={!count} title="Next (Enter)">
                      ↓
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={closeFind} title="Close (Esc)">
                      ✕
                    </button>
                  </div>
                )}
              </div>

              {/* body */}
              <div style={{ flex: 1, overflow: "auto" }}>
                {docView === "text" ? (
                  textLoading ? (
                    <div style={{ padding: 16 }}>
                      <LoadingMessages compact />
                    </div>
                  ) : !docText ? (
                    <div style={{ padding: 16, color: "var(--muted)" }}>
                      No extractable text for this document.
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: 16,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontSize: 13.5,
                        lineHeight: 1.75,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                      }}
                    >
                      {renderedText}
                    </div>
                  )
                ) : isPdf ? (
                  <PdfViewer
                    url={`/api/files/${file._id}/raw`}
                    fileId={file._id}
                    query={findQ}
                    activeIndex={cur}
                    onCount={setPdfCount}
                  />
                ) : isImage ? (
                  <ImageViewer
                    id={file._id}
                    viewUrl={viewUrl}
                    fileName={file.fileName}
                    query={findQ}
                    activeIndex={cur}
                    onCount={setImageCount}
                  />
                ) : (
                  <div style={{ height: "100%", display: "grid", placeItems: "center", textAlign: "center", padding: 24 }}>
                    <div>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
                      <div className="muted" style={{ marginBottom: 12 }}>
                        Inline preview isn't available for this file type.
                      </div>
                      <a className="btn" href={viewUrl} target="_blank" rel="noreferrer">
                        ⬇ Download original
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* about sidebar */}
        <aside style={{ minWidth: 0 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header">About</div>
            <div style={{ padding: 14 }}>
              {file.summary ? (
                <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
                  {file.summary}
                </p>
              ) : (
                <p className="faint" style={{ margin: "0 0 12px", fontSize: 13 }}>No summary available.</p>
              )}

              {file.keyFacts && file.keyFacts.length > 0 && (
                <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                  {file.keyFacts.map((f: any, i: number) => (
                    <div key={i} className="inset" style={{ padding: "8px 10px" }}>
                      <div className="faint" style={{ fontSize: 11 }}>{f?.label ?? ""}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                        {typeof f?.value === "object" ? JSON.stringify(f?.value) : String(f?.value ?? "")}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="faint" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", margin: "4px 0 6px" }}>
                Tags
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {tags.length === 0 && <span className="faint" style={{ fontSize: 12 }}>None yet</span>}
                {tags.map((t) => (
                  <span key={t} className="label" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    {t}
                    <span style={{ cursor: "pointer" }} onClick={() => removeTag(t)}>
                      ✕
                    </span>
                  </span>
                ))}
              </div>
              <input
                placeholder="Add a tag + Enter"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTag()}
                style={{ height: 28, fontSize: 13 }}
              />
            </div>
          </div>
        </aside>
      </div>

      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.7)", zIndex: 100, display: "grid", placeItems: "center", padding: 24 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", maxHeight: "85vh", overflow: "auto" }}>
            <div className="card-header">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{modal.title || modal.query}</span>
              <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button className="btn btn-sm" onClick={() => nav(`/tables/${modal._id}`)}>Open page</button>
                <button className="btn btn-sm btn-danger" onClick={() => removeTable(modal)}>Delete</button>
                <button className="btn btn-sm" onClick={() => setModal(null)}>Close</button>
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <ResultView data={modal.data} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
