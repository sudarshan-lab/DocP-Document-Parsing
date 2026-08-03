import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import Chatbot from "../components/Chatbot";
import LoadingMessages from "../components/LoadingMessages";
import { getUser } from "../auth";
import {
  listFiles,
  listFolders,
  uploadOne,
  createFolder,
  deleteFile,
  deleteFolder,
  searchContent,
  FileItem,
  FolderItem,
  ContentHit,
} from "../api";

const MAX_MB = 4.5;

export default function Documents() {
  const user = getUser()!;
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [uploading, setUploading] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [ask, setAsk] = useState<{ ids: string[]; label: string; folderId?: string } | null>(null);
  const [pending, setPending] = useState<File[] | null>(null);
  const [setName, setSetName] = useState("");
  const [mode, setMode] = useState<"names" | "content">("names");
  const [hits, setHits] = useState<ContentHit[] | null>(null);
  const [searching, setSearching] = useState(false);
  const q = sp.get("q") || "";
  const setQ = (v: string) => setSp(v ? { q: v } : {}, { replace: true });

  const load = useCallback(() => {
    Promise.all([listFiles(user._id), listFolders(user._id)])
      .then(([f, fo]) => {
        setFiles(f);
        setFolders(fo);
        setExpanded((e) => (e.size ? e : new Set(fo.map((x) => x._id))));
      })
      .catch(() => {});
  }, [user._id]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!files.some((f) => f.status === "processing")) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [files, load]);
  useEffect(() => {
    if (mode !== "content" || !q.trim()) {
      setHits(null);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      searchContent(user._id, q.trim())
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [mode, q, user._id]);

  const sizeOk = (f: File) => {
    if (f.size > MAX_MB * 1024 * 1024) {
      message.error(`"${f.name}" is over ${MAX_MB} MB — skipped`);
      return false;
    }
    return true;
  };

  // Upload a batch straight into folderId (or the user's root when omitted).
  const pushFiles = useCallback(
    async (list: File[], folderId?: string) => {
      if (!list.length) return;
      try {
        for (let i = 0; i < list.length; i++) {
          setUploading(`Uploading ${i + 1} of ${list.length}…`);
          await uploadOne(list[i], user._id, folderId);
        }
        message.success("Uploaded — parsing your documents…");
        load();
      } catch {
        message.error("Upload failed");
      } finally {
        setUploading("");
      }
    },
    [user._id, load]
  );

  // Main dropzone / Upload button: one file → root; several → ask whether to
  // make a set or drop them all at root.
  const beginUpload = (list: File[]) => {
    const valid = list.filter(sizeOk);
    if (!valid.length) return;
    if (valid.length > 1) setPending(valid);
    else pushFiles(valid);
  };
  const createSet = async () => {
    const files = pending || [];
    const name = setName.trim();
    setPending(null);
    setSetName("");
    try {
      const folder = await createFolder(user._id, name);
      pushFiles(files, folder._id);
    } catch {
      message.error("Could not create the set");
    }
  };
  const uploadToRoot = () => {
    const files = pending || [];
    setPending(null);
    setSetName("");
    pushFiles(files);
  };

  // Hidden picker used by a folder's "Add" button to upload into that set.
  const addRef = useRef<HTMLInputElement>(null);
  const pendingFolder = useRef<string | null>(null);
  const addToFolder = (folderId: string) => {
    pendingFolder.current = folderId;
    addRef.current?.click();
  };
  const onAddPicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(sizeOk);
    e.target.value = "";
    if (files.length && pendingFolder.current) pushFiles(files, pendingFolder.current);
  };

  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop: (a) => a.length > 0 && beginUpload(a),
    noClick: true,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/tiff": [".tif", ".tiff"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt", ".md"],
      "text/csv": [".csv"],
    },
  });

  // group + filter
  const match = (f: FileItem) => f.fileName.toLowerCase().includes(q.toLowerCase());
  const byFolder = useMemo(() => {
    const m = new Map<string, FileItem[]>();
    files.filter(match).forEach((f) => {
      const k = f.folderId || "__root__";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(f);
    });
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, q]);
  const rootFiles = byFolder.get("__root__") || [];

  const readyIds = (fs: FileItem[]) => fs.filter((f) => f.status === "ready").map((f) => f._id);
  const allVisibleReady = useMemo(
    () => readyIds(files.filter(match)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, q]
  );

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleMany = (ids: string[]) =>
    setSelected((s) => {
      const n = new Set(s);
      const allOn = ids.length > 0 && ids.every((i) => n.has(i));
      ids.forEach((i) => (allOn ? n.delete(i) : n.add(i)));
      return n;
    });
  const toggleExpand = (id: string) =>
    setExpanded((e) => {
      const n = new Set(e);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const removeFile = async (e: React.MouseEvent, f: FileItem) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${f.fileName}"?`)) return;
    try {
      await deleteFile(f._id);
      setFiles((s) => s.filter((x) => x._id !== f._id));
    } catch {
      message.error("Could not delete");
    }
  };
  const removeFolder = async (e: React.MouseEvent, folder: FolderItem) => {
    e.stopPropagation();
    if (!window.confirm(`Delete the set "${folder.name}" and all its files?`)) return;
    try {
      await deleteFolder(folder._id);
      load();
    } catch {
      message.error("Could not delete");
    }
  };

  const FileRow = (f: FileItem, indent: boolean) => (
    <div key={f._id} className="row" style={indent ? { paddingLeft: 34 } : undefined}>
      <input
        type="checkbox"
        style={{ width: "auto" }}
        checked={selected.has(f._id)}
        disabled={f.status !== "ready"}
        onChange={() => toggle(f._id)}
        onClick={(e) => e.stopPropagation()}
      />
      <span
        style={{ flex: 1, minWidth: 0, cursor: f.status === "ready" ? "pointer" : "default" }}
        onClick={() => f.status === "ready" && nav(`/files/${f._id}`)}
      >
        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
          📄 {f.fileName}
        </span>
        <span className="faint" style={{ fontSize: 12 }}>
          {dayjs(f.createdAt).format("MMM D, YYYY")}
        </span>
      </span>
      {f.status === "processing" ? (
        <LoadingMessages compact />
      ) : f.status === "failed" ? (
        <span className="badge failed" title={f.error}>
          <span className="dot" /> Failed
        </span>
      ) : (
        <span className="badge ready">
          <span className="dot" /> Ready
        </span>
      )}
      <button className="btn btn-sm btn-danger" onClick={(e) => removeFile(e, f)} title="Delete">
        ✕
      </button>
    </div>
  );

  return (
    <AppShell>
      <input
        ref={addRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.docx,.txt,.md,.csv"
        onChange={onAddPicked}
      />
      <div {...getRootProps()} style={{ outline: isDragActive ? "2px dashed var(--accent)" : "none", outlineOffset: 6, borderRadius: 6 }}>
        <input {...getInputProps()} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0 }}>Documents</h1>
            <span className="faint" style={{ fontSize: 13 }}>
              Drop files anywhere · one file → root · multiple → a new set · up to {MAX_MB} MB each
            </span>
          </div>
          <button className="btn btn-primary" onClick={open} disabled={!!uploading}>
            {uploading || "＋ Upload files"}
          </button>
        </div>

        <div className="card" style={{ display: "flex", gap: 8, padding: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder={mode === "content" ? "Search inside all documents…" : "Search files…"} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 260, height: 30 }} />
          <div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 6, overflow: "hidden" }}>
            <button className="btn btn-sm" style={{ border: "none", borderRadius: 0, background: mode === "names" ? "var(--overlay)" : "transparent" }} onClick={() => setMode("names")}>
              Names
            </button>
            <button className="btn btn-sm" style={{ border: "none", borderRadius: 0, background: mode === "content" ? "var(--overlay)" : "transparent" }} onClick={() => setMode("content")}>
              Content
            </button>
          </div>
          <button className="btn btn-sm" onClick={() => toggleMany(allVisibleReady)}>
            {allVisibleReady.length > 0 && allVisibleReady.every((i) => selected.has(i)) ? "Clear all" : "Select all"}
          </button>
          {selected.size > 0 && (
            <button className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>
              Deselect ({selected.size})
            </button>
          )}
          <button
            className="btn btn-sm btn-primary"
            style={{ marginLeft: "auto" }}
            disabled={selected.size === 0}
            onClick={() => setAsk({ ids: Array.from(selected), label: `${selected.size} file${selected.size > 1 ? "s" : ""}` })}
          >
            💬 Ask {selected.size || ""} selected
          </button>
        </div>

        {mode === "content" && q.trim() ? (
          searching ? (
            <div className="card" style={{ padding: 20 }}>
              <LoadingMessages compact />
            </div>
          ) : !hits || hits.length === 0 ? (
            <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              No documents contain “{q}”.
            </div>
          ) : (
            <div className="list">
              {hits.map((h) => (
                <div key={h.fileId} className="row clickable" onClick={() => nav(`/files/${h.fileId}`)}>
                  <span>▤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.fileName}
                    </div>
                    {h.snippet && (
                      <div className="faint" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.snippet}
                      </div>
                    )}
                  </div>
                  {h.count > 0 && <span className="label">{h.count} hits</span>}
                </div>
              ))}
            </div>
          )
        ) : files.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No documents yet. Drop files anywhere here or click <strong>Upload files</strong>.
          </div>
        ) : (
          <div className="list">
            {folders.map((folder) => {
              const fs = byFolder.get(folder._id) || [];
              if (q && fs.length === 0) return null;
              const ids = readyIds(fs);
              const isOpen = expanded.has(folder._id);
              return (
                <div key={folder._id}>
                  <div className="row" style={{ background: "var(--canvas)" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={ids.length > 0 && ids.every((i) => selected.has(i))}
                      disabled={ids.length === 0}
                      onChange={() => toggleMany(ids)}
                    />
                    <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="faint" style={{ cursor: "pointer" }} onClick={() => toggleExpand(folder._id)}>
                        {isOpen ? "▾" : "▸"}
                      </span>
                      <span
                        style={{ fontWeight: 600, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        onClick={() => nav(`/folders/${folder._id}`)}
                        title="Open set"
                      >
                        📁 {folder.name}
                      </span>
                      <span className="label">{fs.length}</span>
                    </span>
                    <button
                      className="btn btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToFolder(folder._id);
                      }}
                      title="Add files to this set"
                    >
                      ＋ Add
                    </button>
                    <button
                      className="btn btn-sm"
                      disabled={ids.length === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsk({ ids, label: folder.name, folderId: folder._id });
                      }}
                    >
                      💬 Ask set
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={(e) => removeFolder(e, folder)} title="Delete set">
                      ✕
                    </button>
                  </div>
                  {isOpen && fs.map((f) => FileRow(f, true))}
                </div>
              );
            })}
            {rootFiles.map((f) => FileRow(f, false))}
            {q && rootFiles.length === 0 && folders.every((fo) => (byFolder.get(fo._id) || []).length === 0) && (
              <div className="row" style={{ color: "var(--muted)" }}>
                No files match "{q}".
              </div>
            )}
          </div>
        )}
      </div>

      {pending && (
        <div
          onClick={() => {
            setPending(null);
            setSetName("");
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.7)", zIndex: 100, display: "grid", placeItems: "center", padding: 24 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, width: "100%" }}>
            <div className="card-header">Upload {pending.length} files</div>
            <div style={{ padding: 16 }}>
              <label>Set name (optional)</label>
              <input
                autoFocus
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createSet()}
                placeholder="e.g. 2024 Invoices"
                style={{ marginTop: 4, marginBottom: 6 }}
              />
              <div className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
                Group them into a set, or skip and add them all to the root.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn-primary" onClick={createSet}>
                  Create set
                </button>
                <button className="btn" onClick={uploadToRoot}>
                  Upload to root
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ marginLeft: "auto" }}
                  onClick={() => {
                    setPending(null);
                    setSetName("");
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ask && (
        <div
          onClick={() => setAsk(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.7)", zIndex: 100, display: "grid", placeItems: "center", padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 860 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, color: "#fff" }}>
              <strong>Ask · {ask.label}</strong>
              <button className="btn btn-sm" onClick={() => setAsk(null)}>Close</button>
            </div>
            <Chatbot fileIds={ask.ids} sourceLabel={ask.label} folderId={ask.folderId} onSaved={() => {}} height="72vh" />
          </div>
        </div>
      )}
    </AppShell>
  );
}
