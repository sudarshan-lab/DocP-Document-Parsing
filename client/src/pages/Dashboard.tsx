import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import LoadingMessages from "../components/LoadingMessages";
import { getUser } from "../auth";
import { listFiles, uploadFile, deleteFile, FileItem } from "../api";

const MAX_MB = 4.5; // Vercel proxy body limit

export default function Dashboard() {
  const user = getUser()!;
  const nav = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(
    () => listFiles(user._id).then(setFiles).catch(() => {}),
    [user._id]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Poll while any file is still processing
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

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted[0]) doUpload(accepted[0]);
    },
    [doUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
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

  return (
    <AppShell>
      <div style={{ marginBottom: 8 }}>
        <h1 style={{ fontSize: 34, margin: "6px 0" }}>
          Your <span className="brand">documents</span>
        </h1>
        <p style={{ color: "var(--text-dim)", marginTop: 0 }}>
          Upload a PDF or image, then chat with it to pull out tables.
        </p>
      </div>

      {/* Upload dropzone */}
      <div
        {...getRootProps()}
        className="glass"
        style={{
          padding: "34px",
          textAlign: "center",
          cursor: "pointer",
          border: isDragActive
            ? "1.5px dashed var(--accent)"
            : "1.5px dashed var(--glass-border)",
          transition: "border 0.2s ease, background 0.2s ease",
          marginBottom: 30,
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <LoadingMessages compact />
          </div>
        ) : (
          <>
            <div style={{ fontSize: 34, marginBottom: 8 }}>⬆️</div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>
              {isDragActive ? "Drop it here…" : "Drag a file here, or click to browse"}
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 13, marginTop: 6 }}>
              PDF, PNG, JPG or TIFF · up to {MAX_MB} MB
            </div>
          </>
        )}
      </div>

      {/* Files grid */}
      {files.length === 0 ? (
        <div
          className="glass"
          style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}
        >
          No documents yet — upload your first one above.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
            gap: 16,
          }}
        >
          {files.map((f, i) => (
            <motion.div
              key={f._id}
              className="glass"
              onClick={() => f.status === "ready" && nav(`/files/${f._id}`)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              whileHover={f.status === "ready" ? { y: -4 } : undefined}
              style={{
                padding: 18,
                cursor: f.status === "ready" ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minHeight: 130,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 26 }}>📄</div>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={(e) => remove(e, f)}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={f.fileName}
              >
                {f.fileName}
              </div>
              <div style={{ marginTop: "auto" }}>
                {f.status === "processing" ? (
                  <LoadingMessages compact />
                ) : f.status === "failed" ? (
                  <span className="badge failed" title={f.error}>
                    <span className="dot" /> Failed
                  </span>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span className="badge ready">
                      <span className="dot" /> Ready
                    </span>
                    <span style={{ color: "var(--text-faint)", fontSize: 12 }}>
                      {dayjs(f.createdAt).format("MMM D, h:mm A")}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
