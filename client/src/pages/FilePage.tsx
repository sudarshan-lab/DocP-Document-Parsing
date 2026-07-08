import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import Chatbot from "../components/Chatbot";
import TableView from "../components/TableView";
import LoadingMessages from "../components/LoadingMessages";
import { getFile, deleteTable, FileItem, TableResultItem } from "../api";

export default function FilePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [state, setState] = useState<{
    file: FileItem;
    viewUrl: string;
    tables: TableResultItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const [modal, setModal] = useState<TableResultItem | null>(null);

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
        <div className="glass" style={{ padding: 40 }}>
          <LoadingMessages />
        </div>
      </AppShell>
    );

  const { file, viewUrl, tables } = state;
  const isPdf =
    (file.mimeType || "").includes("pdf") ||
    file.fileName.toLowerCase().endsWith(".pdf");

  const removeTable = async (t: TableResultItem) => {
    try {
      await deleteTable(file._id, t._id);
      setModal(null);
      load();
    } catch {
      message.error("Could not delete");
    }
  };

  return (
    <AppShell>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="btn btn-sm" onClick={() => nav("/")}>
            ← Back
          </button>
          <h2 style={{ margin: 0 }}>{file.fileName}</h2>
        </div>
        {!chatOpen && (
          <button className="btn btn-primary" onClick={() => setChatOpen(true)}>
            💬 Open chat
          </button>
        )}
      </div>

      <div className="file-grid">
        {/* viewer */}
        <div className="glass file-viewer" style={{ padding: 12, overflow: "hidden" }}>
          {isPdf ? (
            <iframe
              title="document"
              src={viewUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                borderRadius: 12,
                background: "#fff",
              }}
            />
          ) : (
            <div style={{ height: "100%", overflow: "auto", display: "grid", placeItems: "center" }}>
              <img src={viewUrl} alt={file.fileName} style={{ maxWidth: "100%", borderRadius: 12 }} />
            </div>
          )}
        </div>

        {/* saved tables */}
        <div>
          <h3 style={{ marginTop: 0 }}>
            Saved tables{" "}
            <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>
              ({tables.length})
            </span>
          </h3>
          {tables.length === 0 ? (
            <div className="glass" style={{ padding: 22, color: "var(--text-dim)" }}>
              No saved tables yet. Ask a question in the chat, then hit{" "}
              <strong>Save to DB</strong> on answers you want to keep.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {tables.map((t) => (
                <div
                  key={t._id}
                  className="glass"
                  style={{ padding: 14, cursor: "pointer" }}
                  onClick={() => setModal(t)}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.query}
                  </div>
                  <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
                    {dayjs(t.createdAt).format("MMM D, h:mm A")} · click to view
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {chatOpen && (
        <Chatbot
          fileId={file._id}
          fileName={file.fileName}
          onClose={() => setChatOpen(false)}
          onSaved={load}
        />
      )}

      {modal && (
        <motion.div
          onClick={() => setModal(null)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3,7,18,0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1100,
            display: "grid",
            placeItems: "center",
            padding: 24,
          }}
        >
          <motion.div
            className="glass-strong"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.18 }}
            style={{ padding: 22, maxWidth: 900, width: "100%", maxHeight: "85vh", overflow: "auto" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
                gap: 12,
                marginBottom: 14,
              }}
            >
              <div>
                <div style={{ color: "var(--text-dim)", fontSize: 13 }}>Query</div>
                <div style={{ fontWeight: 600, fontSize: 17 }}>{modal.query}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-sm btn-danger" onClick={() => removeTable(modal)}>
                  Delete
                </button>
                <button className="btn btn-sm" onClick={() => setModal(null)}>
                  Close
                </button>
              </div>
            </div>
            <TableView data={modal.data} />
          </motion.div>
        </motion.div>
      )}
    </AppShell>
  );
}
