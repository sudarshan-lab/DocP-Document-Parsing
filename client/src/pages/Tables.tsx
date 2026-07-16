import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import ResultView from "../components/ResultView";
import Chatbot from "../components/Chatbot";
import { getUser } from "../auth";
import { listAllTables, deleteTable, SavedTableItem } from "../api";

export default function Tables() {
  const user = getUser()!;
  const nav = useNavigate();
  const [tables, setTables] = useState<SavedTableItem[]>([]);
  const [modal, setModal] = useState<SavedTableItem | null>(null);
  const [chatFor, setChatFor] = useState<SavedTableItem | null>(null);
  const [q, setQ] = useState("");

  const load = () => listAllTables(user._id).then(setTables).catch(() => {});
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const del = async (t: SavedTableItem) => {
    try {
      await deleteTable(t._id);
      setModal(null);
      load();
    } catch {
      message.error("Could not delete");
    }
  };

  const srcOf = (t: SavedTableItem) => t.sourceLabel || t.fileId?.fileName || "—";
  const idsOf = (t: SavedTableItem) =>
    t.fileIds && t.fileIds.length ? t.fileIds : t.fileId ? [t.fileId._id] : [];
  const visible = tables.filter(
    (t) =>
      t.query.toLowerCase().includes(q.toLowerCase()) ||
      srcOf(t).toLowerCase().includes(q.toLowerCase())
  );

  return (
    <AppShell>
      <h1 style={{ marginTop: 0 }}>Saved tables</h1>
      <div className="card" style={{ display: "flex", padding: 10, marginBottom: 16, alignItems: "center", gap: 8 }}>
        <input placeholder="Search tables…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320, height: 30 }} />
        <span className="faint" style={{ marginLeft: "auto", fontSize: 13 }}>
          {visible.length} of {tables.length}
        </span>
      </div>

      {tables.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No saved tables yet. Open a document and save answers from the chat.
        </div>
      ) : (
        <div className="list">
          {visible.map((t) => (
            <div key={t._id} className="row clickable" onClick={() => setModal(t)}>
              <span>▦</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.query}
                </div>
                <div className="faint" style={{ fontSize: 12 }}>
                  {srcOf(t)} · {dayjs(t.createdAt).format("MMM D, h:mm A")}
                </div>
              </div>
              {t.fileId ? (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); nav(`/files/${t.fileId!._id}`); }}>
                  Open doc
                </button>
              ) : t.folderId ? (
                <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); nav(`/folders/${t.folderId}`); }}>
                  Open set
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div
          onClick={() => setModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.7)", zIndex: 100, display: "grid", placeItems: "center", padding: 24 }}
        >
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: "100%", maxHeight: "85vh", overflow: "auto" }}>
            <div className="card-header">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{modal.query}</span>
              <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {idsOf(modal).length > 0 && (
                  <button className="btn btn-sm" onClick={() => { setChatFor(modal); setModal(null); }}>
                    Continue chat
                  </button>
                )}
                {modal.folderId && (
                  <button className="btn btn-sm" onClick={() => nav(`/folders/${modal.folderId}`)}>Open set</button>
                )}
                <button className="btn btn-sm btn-danger" onClick={() => del(modal)}>Delete</button>
                <button className="btn btn-sm" onClick={() => setModal(null)}>Close</button>
              </span>
            </div>
            {modal.sourceFileNames && modal.sourceFileNames.length > 0 && (
              <div className="faint" style={{ fontSize: 12, padding: "10px 16px 0" }}>
                From {modal.sourceFileNames.length} files: {modal.sourceFileNames.join(", ")}
              </div>
            )}
            <div style={{ padding: 16 }}>
              <ResultView data={modal.data} />
            </div>
          </div>
        </div>
      )}

      {chatFor && (
        <div onClick={() => setChatFor(null)} style={{ position: "fixed", inset: 0, background: "rgba(1,4,9,0.7)", zIndex: 100, display: "grid", placeItems: "center", padding: 24 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 860 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, color: "#fff" }}>
              <strong>Continue · {chatFor.sourceLabel || srcOf(chatFor)}</strong>
              <button className="btn btn-sm" onClick={() => setChatFor(null)}>Close</button>
            </div>
            <Chatbot fileIds={idsOf(chatFor)} sourceLabel={chatFor.sourceLabel || srcOf(chatFor)} folderId={chatFor.folderId || undefined} onSaved={() => {}} height="72vh" />
          </div>
        </div>
      )}
    </AppShell>
  );
}
