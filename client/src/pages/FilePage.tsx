import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import Chatbot from "../components/Chatbot";
import ResultView from "../components/ResultView";
import LoadingMessages from "../components/LoadingMessages";
import {
  getFile,
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

  if (loading || !state)
    return (
      <AppShell>
        <div className="card" style={{ padding: 40 }}>
          <LoadingMessages />
        </div>
      </AppShell>
    );

  const { file, viewUrl, tables } = state;
  const isPdf =
    (file.mimeType || "").includes("pdf") || file.fileName.toLowerCase().endsWith(".pdf");
  const isImage =
    (file.mimeType || "").startsWith("image/") ||
    /\.(png|jpe?g|tiff?)$/i.test(file.fileName);
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
                        {t.query}
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
            <div className="card" style={{ padding: 10, height: "72vh", overflow: "hidden" }}>
              {isPdf ? (
                <iframe
                  title="document"
                  src={viewUrl}
                  style={{ width: "100%", height: "100%", border: "none", borderRadius: 6, background: "#fff" }}
                />
              ) : isImage ? (
                <div style={{ height: "100%", overflow: "auto", display: "grid", placeItems: "center" }}>
                  <img src={viewUrl} alt={file.fileName} style={{ maxWidth: "100%", borderRadius: 6 }} />
                </div>
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
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{modal.query}</span>
              <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
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
