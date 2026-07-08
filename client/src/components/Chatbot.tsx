import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { message } from "antd";
import ResultView from "./ResultView";
import LoadingMessages from "./LoadingMessages";
import { queryFile, saveTable } from "../api";

type Msg =
  | { id: string; role: "hint"; text: string }
  | { id: string; role: "user"; text: string }
  | { id: string; role: "confirm"; query: string }
  | { id: string; role: "assistant"; query: string; data: any; saved: boolean }
  | { id: string; role: "error"; text: string };

const uid = () => Math.random().toString(36).slice(2);

function renderData(data: any) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (
      keys.length === 1 &&
      (keys[0] === "answer" || keys[0] === "note") &&
      typeof data[keys[0]] === "string"
    ) {
      return (
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data[keys[0]]}</ReactMarkdown>
        </div>
      );
    }
  }
  return <ResultView data={data} />;
}

export default function Chatbot({
  fileId,
  fileName,
  onSaved,
  suggestions,
  height,
}: {
  fileId: string;
  fileName: string;
  onSaved: () => void;
  suggestions?: string[];
  height?: number | string;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: uid(),
      role: "hint",
      text: `Ask anything about “${fileName}”. I'll turn the answer into a table you can save — and confirm each question before running it.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [msgs, busy]);

  const askQuery = (raw: string) => {
    const q = raw.trim();
    if (!q || busy) return;
    setMsgs((m) => [...m, { id: uid(), role: "confirm", query: q }]);
  };
  const ask = () => {
    if (!input.trim() || busy) return;
    askQuery(input);
    setInput("");
  };
  const cancel = (id: string) => setMsgs((m) => m.filter((x) => x.id !== id));

  const generate = async (confirmId: string, query: string) => {
    setMsgs((m) =>
      m.filter((x) => x.id !== confirmId).concat({ id: uid(), role: "user", text: query })
    );
    setBusy(true);
    try {
      const { data } = await queryFile(fileId, query);
      setMsgs((m) => [...m, { id: uid(), role: "assistant", query, data, saved: false }]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        { id: uid(), role: "error", text: e?.response?.data?.message || "Something went wrong." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const save = async (msgId: string, query: string, data: any) => {
    try {
      await saveTable(fileId, query, data);
      setMsgs((m) => m.map((x) => (x.id === msgId ? ({ ...x, saved: true } as Msg) : x)));
      message.success("Saved");
      onSaved();
    } catch {
      message.error("Could not save");
    }
  };

  const bubble: React.CSSProperties = {
    maxWidth: "92%",
    padding: "9px 13px",
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.5,
  };

  return (
    <div
      className="card"
      style={{ display: "flex", flexDirection: "column", height: height || 620, overflow: "hidden" }}
    >
      <div className="card-header">
        <span>💬 Assistant</span>
        <span className="faint" style={{ fontWeight: 400, fontSize: 12 }}>
          confirms before each query
        </span>
      </div>

      <div
        ref={bodyRef}
        style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
      >
        {msgs.map((m) => {
          if (m.role === "hint")
            return (
              <div key={m.id} className="inset" style={{ padding: 12, color: "var(--muted)", fontSize: 13 }}>
                {m.text}
              </div>
            );
          if (m.role === "user")
            return (
              <div
                key={m.id}
                style={{ ...bubble, alignSelf: "flex-end", background: "var(--accent)", color: "#fff" }}
              >
                {m.text}
              </div>
            );
          if (m.role === "error")
            return (
              <div
                key={m.id}
                style={{
                  ...bubble,
                  alignSelf: "flex-start",
                  color: "var(--danger)",
                  border: "1px solid rgba(248,81,73,0.4)",
                }}
              >
                {m.text}
              </div>
            );
          if (m.role === "confirm")
            return (
              <div key={m.id} className="inset" style={{ padding: 13 }}>
                <div className="muted" style={{ fontSize: 13 }}>
                  Generate a table for:
                </div>
                <div style={{ fontWeight: 600, margin: "6px 0 12px" }}>“{m.query}”</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={() => generate(m.id, m.query)}>
                    Generate
                  </button>
                  <button className="btn btn-sm" onClick={() => cancel(m.id)}>
                    Cancel
                  </button>
                </div>
              </div>
            );
          return (
            <div key={m.id} className="inset" style={{ padding: 12 }}>
              <div style={{ overflowX: "auto" }}>{renderData(m.data)}</div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                {m.saved ? (
                  <span className="badge ready">
                    <span className="dot" /> Saved
                  </span>
                ) : (
                  <button className="btn btn-sm" onClick={() => save(m.id, m.query, m.data)}>
                    💾 Save to DB
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {suggestions &&
          suggestions.length > 0 &&
          !msgs.some((m) => m.role === "user" || m.role === "confirm") && (
            <div>
              <div className="faint" style={{ fontSize: 12, margin: "2px 0 8px" }}>
                Suggested questions
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {suggestions.map((q, i) => (
                  <button key={i} className="chip" onClick={() => askQuery(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

        {busy && (
          <div className="inset" style={{ padding: 12, alignSelf: "flex-start" }}>
            <LoadingMessages compact />
          </div>
        )}
      </div>

      <div style={{ padding: 12, borderTop: "1px solid var(--border)", display: "flex", gap: 8 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          placeholder="Ask about this document…"
          rows={1}
          style={{ resize: "none", maxHeight: 120 }}
        />
        <button className="btn btn-primary" onClick={ask} disabled={busy || !input.trim()}>
          Ask
        </button>
      </div>
    </div>
  );
}
