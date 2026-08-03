import { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import AppShell from "../components/AppShell";
import ResultView from "../components/ResultView";
import LoadingMessages from "../components/LoadingMessages";
import { getUser } from "../auth";
import { askAll, AskSource, Validation } from "../api";

type Turn = {
  id: string;
  question: string;
  data?: any;
  sources?: AskSource[];
  validation?: Validation | null;
  error?: string;
  loading: boolean;
};

const uid = () => Math.random().toString(36).slice(2);

function renderData(data: any) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const keys = Object.keys(data);
    if (keys.length === 1 && (keys[0] === "answer" || keys[0] === "note") && typeof data[keys[0]] === "string") {
      return (
        <div className="md">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{data[keys[0]]}</ReactMarkdown>
        </div>
      );
    }
  }
  return <ResultView data={data} />;
}

function Badge({ v }: { v: Validation }) {
  const cls = v.status === "verified" ? "ready" : v.status === "unsupported" ? "failed" : "processing";
  const label =
    v.status === "verified" ? "Verified against sources" : v.status === "unsupported" ? "Not supported — review" : "Partially supported";
  return (
    <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <span className={"badge " + cls} title={v.note}>
        <span className="dot" /> {label}
      </span>
      {v.note && <span className="faint" style={{ fontSize: 11 }}>{v.note}</span>}
    </div>
  );
}

export default function AskPage() {
  const user = getUser()!;
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const askedRef = useRef(false);

  const run = async (raw: string) => {
    const question = raw.trim();
    if (!question) return;
    const id = uid();
    setTurns((t) => [...t, { id, question, loading: true }]);
    try {
      const res = await askAll(user._id, question);
      setTurns((t) =>
        t.map((x) =>
          x.id === id ? { ...x, loading: false, data: res.data, sources: res.sources, validation: res.validation } : x
        )
      );
    } catch (e: any) {
      setTurns((t) =>
        t.map((x) => (x.id === id ? { ...x, loading: false, error: e?.response?.data?.message || "Failed to answer" } : x))
      );
    }
  };
  const submit = () => {
    if (!input.trim()) return;
    run(input);
    setInput("");
  };

  useEffect(() => {
    const q = sp.get("q");
    if (q && !askedRef.current) {
      askedRef.current = true;
      run(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 1e9, behavior: "smooth" });
  }, [turns]);

  return (
    <AppShell>
      <h1 style={{ marginTop: 0, marginBottom: 4 }}>Ask across all documents</h1>
      <p className="muted" style={{ marginTop: 0 }}>
        Ask questions over everything you've uploaded — answers cite their source documents.
      </p>

      <div ref={bodyRef} style={{ display: "grid", gap: 14, margin: "16px 0", maxHeight: "62vh", overflow: "auto" }}>
        {turns.length === 0 && (
          <div className="card" style={{ padding: 24, color: "var(--muted)" }}>
            Try: <em>"total invoice amount in 2024"</em>, <em>"list every employer across my offer letters"</em>,{" "}
            <em>"what's my YTD last year"</em>…
          </div>
        )}
        {turns.map((t) => (
          <div key={t.id}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>❓ {t.question}</div>
            {t.loading ? (
              <div className="card" style={{ padding: 14 }}>
                <LoadingMessages compact />
              </div>
            ) : t.error ? (
              <div className="card" style={{ padding: 14, color: "var(--danger)" }}>{t.error}</div>
            ) : (
              <div className="card" style={{ padding: 14 }}>
                {t.validation && <Badge v={t.validation} />}
                <div style={{ overflowX: "auto" }}>{renderData(t.data)}</div>
                {t.sources && t.sources.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    <span className="faint" style={{ fontSize: 12 }}>Sources:</span>
                    {t.sources.map((s) => (
                      <button key={s.fileId} className="chip" onClick={() => nav(`/files/${s.fileId}`)}>
                        ▤ {s.fileName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Ask anything across your documents…"
          autoFocus
        />
        <button className="btn btn-primary" onClick={submit} disabled={!input.trim()}>
          Ask
        </button>
      </div>
    </AppShell>
  );
}
