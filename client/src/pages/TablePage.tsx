import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message } from "antd";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import ResultView from "../components/ResultView";
import LoadingMessages from "../components/LoadingMessages";
import { getTable, renameTable, deleteTable, SavedTableItem } from "../api";

export default function TablePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState<SavedTableItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState("");

  const load = useCallback(() => {
    if (!id) return;
    return getTable(id)
      .then(setT)
      .catch(() => message.error("Could not load this table"));
  }, [id]);
  useEffect(() => {
    setLoading(true);
    Promise.resolve(load()).finally(() => setLoading(false));
  }, [load]);

  if (loading || !t)
    return (
      <AppShell>
        <div className="card" style={{ padding: 40 }}>
          <LoadingMessages />
        </div>
      </AppShell>
    );

  const name = t.title || t.query;
  const saveName = async () => {
    const v = draft.trim();
    setRenaming(false);
    if (v && v !== name) {
      try {
        setT(await renameTable(t._id, v));
      } catch {
        message.error("Could not rename");
      }
    }
  };
  const del = async () => {
    if (!window.confirm("Delete this table?")) return;
    try {
      await deleteTable(t._id);
      nav(-1);
    } catch {
      message.error("Could not delete");
    }
  };

  return (
    <AppShell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <button className="btn btn-sm" onClick={() => nav(-1)}>
          ← Back
        </button>
        {renaming ? (
          <span style={{ display: "flex", gap: 6, flex: 1, minWidth: 220 }}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              style={{ height: 30 }}
            />
            <button className="btn btn-sm btn-primary" onClick={saveName}>Save</button>
            <button className="btn btn-sm" onClick={() => setRenaming(false)}>Cancel</button>
          </span>
        ) : (
          <>
            <h2 style={{ margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </h2>
            <button
              className="btn btn-sm btn-ghost"
              title="Rename"
              onClick={() => {
                setDraft(name);
                setRenaming(true);
              }}
            >
              ✎
            </button>
          </>
        )}
        <button className="btn btn-sm btn-danger" style={{ marginLeft: "auto" }} onClick={del}>
          Delete
        </button>
      </div>

      <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>
        Saved {dayjs(t.createdAt).format("MMM D, YYYY · h:mm A")}
        {t.fileId && (
          <>
            {" · "}
            <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => nav(`/files/${t.fileId!._id}`)}>
              open document
            </span>
          </>
        )}
        {t.folderId && (
          <>
            {" · "}
            <span style={{ cursor: "pointer", color: "var(--accent)" }} onClick={() => nav(`/folders/${t.folderId}`)}>
              open set
            </span>
          </>
        )}
      </div>
      {t.title && (
        <div className="faint" style={{ fontSize: 12, marginBottom: 6 }}>
          Question: {t.query}
        </div>
      )}
      {t.sourceFileNames && t.sourceFileNames.length > 0 && (
        <div className="faint" style={{ fontSize: 12, marginBottom: 14 }}>
          From {t.sourceFileNames.length} files: {t.sourceFileNames.join(", ")}
        </div>
      )}

      <div className="card" style={{ padding: 16, marginTop: 8 }}>
        <ResultView data={t.data} />
      </div>
    </AppShell>
  );
}
