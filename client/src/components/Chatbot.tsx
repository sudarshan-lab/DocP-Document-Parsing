import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { motion } from "framer-motion";
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

// Text answers come back as { answer|note: "..." }; everything else is tabular.
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
  onClose,
  onSaved,
  suggestions,
}: {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onSaved: () => void;
  suggestions?: string[];
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: uid(),
      role: "hint",
      text: `Ask me anything about “${fileName}”. I'll turn the answer into a table you can save. I'll confirm each question before running it.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(false);
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

  const cancel = (confirmId: string) =>
    setMsgs((m) => m.filter((x) => x.id !== confirmId));

  const generate = async (confirmId: string, query: string) => {
    setMsgs((m) =>
      m
        .filter((x) => x.id !== confirmId)
        .concat({ id: uid(), role: "user", text: query })
    );
    setBusy(true);
    try {
      const { data } = await queryFile(fileId, query);
      setMsgs((m) => [
        ...m,
        { id: uid(), role: "assistant", query, data, saved: false },
      ]);
    } catch (e: any) {
      setMsgs((m) => [
        ...m,
        {
          id: uid(),
          role: "error",
          text: e?.response?.data?.message || "Something went wrong generating that.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const save = async (msgId: string, query: string, data: any) => {
    try {
      await saveTable(fileId, query, data);
      setMsgs((m) =>
        m.map((x) => (x.id === msgId ? ({ ...x, saved: true } as Msg) : x))
      );
      message.success("Saved to your tables");
      onSaved();
    } catch {
      message.error("Could not save");
    }
  };

  const bubbleBase: React.CSSProperties = {
    maxWidth: "88%",
    padding: "10px 13px",
    borderRadius: 14,
    fontSize: 14,
    lineHeight: 1.5,
    border: "1px solid var(--glass-border)",
  };

  return (
    <Rnd
      default={{
        x: Math.max(20, window.innerWidth - 460),
        y: 96,
        width: 420,
        height: 560,
      }}
      minWidth={320}
      minHeight={380}
      bounds="window"
      dragHandleClassName="chat-drag"
      size={
        expanded
          ? { width: window.innerWidth - 40, height: window.innerHeight - 40 }
          : undefined
      }
      position={expanded ? { x: 20, y: 20 } : undefined}
      enableResizing={!expanded}
      disableDragging={expanded}
      style={{ zIndex: 1000 }}
    >
      <motion.div
        className="glass-strong"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* header / drag handle */}
        <div
          className="chat-drag"
          style={{
            cursor: "move",
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--glass-border)",
            background: "rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--accent-2)",
                boxShadow: "0 0 8px var(--accent-2)",
              }}
            />
            <strong>Doc assistant</strong>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-sm btn-ghost"
              title={expanded ? "Restore" : "Expand"}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? "🗗" : "⛶"}
            </button>
            <button className="btn btn-sm btn-ghost" title="Close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        {/* messages */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 14,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {msgs.map((m) => {
            if (m.role === "hint")
              return (
                <div
                  key={m.id}
                  style={{
                    ...bubbleBase,
                    alignSelf: "stretch",
                    maxWidth: "100%",
                    color: "var(--text-dim)",
                    background: "rgba(124,108,255,0.08)",
                    borderColor: "rgba(124,108,255,0.25)",
                  }}
                >
                  {m.text}
                </div>
              );
            if (m.role === "user")
              return (
                <div
                  key={m.id}
                  style={{
                    ...bubbleBase,
                    alignSelf: "flex-end",
                    background: "var(--accent-grad)",
                    color: "#0b1020",
                    border: "none",
                    fontWeight: 500,
                  }}
                >
                  {m.text}
                </div>
              );
            if (m.role === "error")
              return (
                <div
                  key={m.id}
                  style={{
                    ...bubbleBase,
                    alignSelf: "flex-start",
                    color: "var(--danger)",
                    background: "rgba(251,113,133,0.08)",
                    borderColor: "rgba(251,113,133,0.3)",
                  }}
                >
                  {m.text}
                </div>
              );
            if (m.role === "confirm")
              return (
                <div
                  key={m.id}
                  className="glass"
                  style={{ padding: 13, alignSelf: "stretch" }}
                >
                  <div style={{ color: "var(--text-dim)", fontSize: 13 }}>
                    Generate a table for:
                  </div>
                  <div style={{ fontWeight: 600, margin: "6px 0 12px" }}>
                    “{m.query}”
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => generate(m.id, m.query)}
                    >
                      Generate
                    </button>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => cancel(m.id)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            // assistant
            return (
              <div
                key={m.id}
                className="glass"
                style={{ padding: 12, alignSelf: "stretch" }}
              >
                <div style={{ overflowX: "auto" }}>{renderData(m.data)}</div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: 10,
                  }}
                >
                  {m.saved ? (
                    <span className="badge ready">
                      <span className="dot" /> Saved
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm"
                      onClick={() => save(m.id, m.query, m.data)}
                    >
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
                <div
                  style={{
                    color: "var(--text-faint)",
                    fontSize: 12,
                    margin: "2px 0 8px",
                  }}
                >
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
            <div style={{ ...bubbleBase, alignSelf: "flex-start" }}>
              <LoadingMessages compact />
            </div>
          )}
        </div>

        {/* input */}
        <div
          style={{
            padding: 12,
            borderTop: "1px solid var(--glass-border)",
            display: "flex",
            gap: 8,
            background: "rgba(255,255,255,0.03)",
          }}
        >
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
          <button
            className="btn btn-primary"
            onClick={ask}
            disabled={busy || !input.trim()}
          >
            Ask
          </button>
        </div>
      </motion.div>
    </Rnd>
  );
}
