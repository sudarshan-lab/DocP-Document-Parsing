import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import dayjs from "dayjs";
import AppShell from "../components/AppShell";
import { getUser } from "../auth";
import { listFiles, listAllTables, FileItem, SavedTableItem } from "../api";

export default function Overview() {
  const user = getUser()!;
  const nav = useNavigate();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [tables, setTables] = useState<SavedTableItem[]>([]);
  useEffect(() => {
    listFiles(user._id).then(setFiles).catch(() => {});
    listAllTables(user._id).then(setTables).catch(() => {});
  }, [user._id]);

  const stats = [
    ["Documents", files.length],
    ["Ready", files.filter((f) => f.status === "ready").length],
    ["Processing", files.filter((f) => f.status === "processing").length],
    ["Saved tables", tables.length],
  ] as [string, number][];

  return (
    <AppShell>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Welcome back, {user.firstName} 👋</h1>
      <p className="muted" style={{ marginTop: 0 }}>Here's what's in your workspace.</p>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "18px 0 26px" }}>
        {stats.map(([l, v]) => (
          <div key={l} className="stat">
            <div className="num">{v}</div>
            <div className="lbl">{l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Recent documents</h3>
            <Link to="/documents">View all →</Link>
          </div>
          {files.length === 0 ? (
            <div className="card" style={{ padding: 20, color: "var(--muted)" }}>
              No documents yet. <Link to="/documents">Upload one</Link>.
            </div>
          ) : (
            <div className="list">
              {files.slice(0, 6).map((f) => (
                <div
                  key={f._id}
                  className={"row" + (f.status === "ready" ? " clickable" : "")}
                  onClick={() => f.status === "ready" && nav(`/files/${f._id}`)}
                >
                  <span>▤</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.fileName}
                    </div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {dayjs(f.createdAt).format("MMM D, h:mm A")}
                    </div>
                  </div>
                  <span className={"badge " + f.status}>
                    <span className="dot" /> {f.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ margin: 0 }}>Recent tables</h3>
            <Link to="/tables">View all →</Link>
          </div>
          {tables.length === 0 ? (
            <div className="card" style={{ padding: 20, color: "var(--muted)" }}>No saved tables yet.</div>
          ) : (
            <div className="list">
              {tables.slice(0, 6).map((t) => (
                <div
                  key={t._id}
                  className="row clickable"
                  onClick={() => t.fileId && nav(`/files/${t.fileId._id}`)}
                >
                  <span>▦</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.query}
                    </div>
                    <div className="faint" style={{ fontSize: 12 }}>
                      {t.sourceLabel || t.fileId?.fileName || "—"} · {dayjs(t.createdAt).format("MMM D")}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
