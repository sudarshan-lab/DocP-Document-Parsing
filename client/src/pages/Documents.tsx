import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import LoadingMessages from "../components/LoadingMessages";
import { getUser } from "../auth";
import { listFiles, uploadFile, deleteFile, FileItem } from "../api";

const MAX_MB = 4.5;

export default function Documents() {
  const user = getUser()!;
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [statusF, setStatusF] = useState("all");
  const [sort, setSort] = useState("new");
  const q = sp.get("q") || "";
  const setQ = (v: string) =>
    setSp(v ? { q: v } : {}, { replace: true });

  const load = useCallback(
    () => listFiles(user._id).then(setFiles).catch(() => {}),
    [user._id]
  );
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (!files.some((f) => f.status === "processing")) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [files, load]);

  const doUpload = useCallback(
    async (file: File) => {
      if (file.size > MAX_MB * 1024 * 1024) {
        message.error(`Please upload a file under ${MAX_MB} MB`);
        return;
      }
      setUploading(true);
      try {
        await uploadFile(file, user._id);
        message.success("Uploaded — parsing your document…");
        await load();
      } catch {
        message.error("Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [user._id, load]
  );
  const { getRootProps, getInputProps, open, isDragActive } = useDropzone({
    onDrop: (a) => a[0] && doUpload(a[0]),
    multiple: false,
    noClick: true,
    accept: {
      "application/pdf": [".pdf"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/tiff": [".tif", ".tiff"],
    },
  });

  const remove = async (e: React.MouseEvent, f: FileItem) => {
    e.stopPropagation();
    if (!window.confirm(`Delete "${f.fileName}" and its saved tables?`)) return;
    try {
      await deleteFile(f._id);
      setFiles((s) => s.filter((x) => x._id !== f._id));
    } catch {
      message.error("Could not delete");
    }
  };

  const visible = files
    .filter((f) => statusF === "all" || f.status === statusF)
    .filter(
      (f) =>
        f.fileName.toLowerCase().includes(q.toLowerCase()) ||
        (f.tags || []).some((t) => t.toLowerCase().includes(q.toLowerCase()))
    )
    .sort((a, b) =>
      sort === "name"
        ? a.fileName.localeCompare(b.fileName)
        : sort === "old"
        ? +new Date(a.createdAt) - +new Date(b.createdAt)
        : +new Date(b.createdAt) - +new Date(a.createdAt)
    );

  return (
    <AppShell>
      <div {...getRootProps()} style={{ outline: isDragActive ? "2px dashed var(--accent)" : "none", outlineOffset: 6, borderRadius: 6 }}>
        <input {...getInputProps()} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>Documents</h1>
          <button className="btn btn-primary" onClick={open} disabled={uploading}>
            {uploading ? "Uploading…" : "＋ Upload document"}
          </button>
        </div>

        <div className="card" style={{ display: "flex", gap: 8, padding: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <input placeholder="Search by name or tag…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320, height: 30 }} />
          <select value={statusF} onChange={(e) => setStatusF(e.target.value)} style={{ width: "auto", height: 30 }}>
            <option value="all">All statuses</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="failed">Failed</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: "auto", height: 30 }}>
            <option value="new">Newest</option>
            <option value="old">Oldest</option>
            <option value="name">Name</option>
          </select>
          <span className="faint" style={{ marginLeft: "auto", fontSize: 13 }}>
            {visible.length} of {files.length}
          </span>
        </div>

        {uploading && (
          <div className="card" style={{ padding: 14, marginBottom: 16 }}>
            <LoadingMessages compact />
          </div>
        )}

        {files.length === 0 ? (
          <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
            No documents yet. Drag a PDF or image anywhere here, or click <strong>Upload document</strong> · up to {MAX_MB} MB.
          </div>
        ) : visible.length === 0 ? (
          <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
            No documents match your filters.
          </div>
        ) : (
          <div className="list">
            {visible.map((f) => (
              <div
                key={f._id}
                className={"row" + (f.status === "ready" ? " clickable" : "")}
                onClick={() => f.status === "ready" && nav(`/files/${f._id}`)}
              >
                <span style={{ fontSize: 17 }}>▤</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.fileName}
                  </div>
                  <div className="faint" style={{ fontSize: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span>{dayjs(f.createdAt).format("MMM D, YYYY")}</span>
                    {(f.tags || []).map((t) => (
                      <span key={t} className="label">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
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
                <button className="btn btn-sm btn-danger" onClick={(e) => remove(e, f)} title="Delete">
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
