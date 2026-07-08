import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Landing.css";

const BASE = { rx: 7, ry: -17 };

const FEATURES = [
  { ico: "💬", h: "Ask in plain English", p: "No formulas, no exports to wrangle. Ask a question and get a straight answer from your document." },
  { ico: "▦", h: "Instant tables", p: "Every answer can become a clean, structured table — consistent columns, ready to use." },
  { ico: "📊", h: "Charts & export", p: "Flip any table into a bar, line, or pie chart, then export to CSV or JSON in a click." },
  { ico: "📄", h: "Any document", p: "PDFs, Word docs, and images all live in one place — upload and start asking." },
  { ico: "🏷️", h: "Save & organize", p: "Tag, rename, and keep the tables that matter in a searchable workspace." },
  { ico: "🌓", h: "Fast & compact", p: "A dense, keyboard-friendly workspace with dark and light themes built in." },
];

const STEPS = [
  { h: "Upload", p: "Drop in a PDF, Word doc, or image. We read it in the background while you keep working." },
  { h: "Ask", p: "Type what you need. Confirm the question, and get a structured answer back." },
  { h: "Keep", p: "Save the tables you want, visualize them, and export whenever you like." },
];

export default function Landing() {
  const nav = useNavigate();
  const [t, setT] = useState(BASE);

  const onMove = (e: React.MouseEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: BASE.rx - py * 12, ry: BASE.ry + px * 14 });
  };

  return (
    <div className="lp">
      <div className="lp-bg" />
      <div className="lp-glow g1" />
      <div className="lp-glow g2" />

      <div className="lp-wrap">
        {/* nav */}
        <nav className="lp-nav">
          <span className="brand">
            <span style={{ color: "var(--accent)" }}>◆</span> DocP
          </span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <Link to="/login" className="btn">Sign in</Link>
            <Link to="/signup" className="btn btn-primary">Get started</Link>
          </div>
        </nav>

        {/* hero */}
        <header className="lp-hero">
          <div>
            <span className="lp-pill">
              <span className="d" /> Turn documents into answers
            </span>
            <h1 className="lp-title">
              Chat with your <span className="hl">documents.</span>
            </h1>
            <p className="lp-sub">
              Upload a file, ask questions in plain language, and get clean tables you can
              visualize, export, and save — all in one fast, compact workspace.
            </p>
            <div className="lp-actions">
              <button className="btn btn-primary btn-lg" onClick={() => nav("/signup")}>
                Get started — it's free
              </button>
              <button className="btn btn-lg" onClick={() => nav("/login")}>
                Sign in
              </button>
            </div>
            <div className="lp-trust">
              <span>✓ PDF, Word &amp; images</span>
              <span>✓ Tables &amp; charts</span>
              <span>✓ CSV / JSON export</span>
            </div>
          </div>

          {/* 3D app preview */}
          <div className="scene" onMouseMove={onMove} onMouseLeave={() => setT(BASE)}>
            <div className="float">
              <div
                className="mock"
                style={{ transform: `rotateX(${t.rx}deg) rotateY(${t.ry}deg)` }}
              >
                <div className="m-top">
                  <i style={{ background: "#ff5f56" }} />
                  <i style={{ background: "#febc2e" }} />
                  <i style={{ background: "#27c93f" }} />
                  <span className="m-title">DocP — workspace</span>
                </div>
                <div className="m-main">
                  <div className="m-side">
                    <div className="m-nav on" />
                    <div className="m-nav" />
                    <div className="m-nav" />
                    <div className="m-nav" />
                  </div>
                  <div className="m-content">
                    <div className="m-stats">
                      <div className="m-stat"><b>24</b><span>Documents</span></div>
                      <div className="m-stat"><b>19</b><span>Ready</span></div>
                      <div className="m-stat"><b>57</b><span>Tables</span></div>
                    </div>
                    <div className="m-rows">
                      <div className="m-row"><span>▤</span><div className="g" style={{ maxWidth: 130 }} /><span className="m-badge">ready</span></div>
                      <div className="m-row"><span>▤</span><div className="g" style={{ maxWidth: 170 }} /><span className="m-badge">ready</span></div>
                      <div className="m-row"><span>▤</span><div className="g" style={{ maxWidth: 100 }} /><span className="m-badge">ready</span></div>
                    </div>
                    <div className="m-bars">
                      {[42, 66, 30, 78, 52, 88, 60].map((h, i) => (
                        <i key={i} style={{ height: `${h}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="pop-chip">✓ Table saved</div>
                <div className="pop-cursor">🖱️</div>
              </div>
            </div>
          </div>
        </header>
      </div>

      {/* features */}
      <section className="lp-wrap lp-section">
        <h2 className="lp-h2">Everything you need to read faster</h2>
        <p className="lp-p">From a wall of text to the exact numbers you were looking for.</p>
        <div className="bento">
          {FEATURES.map((f) => (
            <div className="tile" key={f.h}>
              <div className="ico">{f.ico}</div>
              <h3>{f.h}</h3>
              <p>{f.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="lp-wrap lp-section" style={{ paddingTop: 0 }}>
        <h2 className="lp-h2">Three steps, that's it</h2>
        <p className="lp-p">No setup, no spreadsheets. Upload and start asking.</p>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.h}>
              <div className="n">{i + 1}</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16 }}>{s.h}</h3>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 14, lineHeight: 1.6 }}>{s.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* cta band */}
      <section className="lp-wrap">
        <div className="lp-band">
          <h2 className="lp-h2">Ready to talk to your documents?</h2>
          <p className="lp-p">Create a free account and turn your first file into answers in minutes.</p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button className="btn btn-primary btn-lg" onClick={() => nav("/signup")}>
              Create your account
            </button>
            <button className="btn btn-lg" onClick={() => nav("/login")}>
              I already have one
            </button>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        © {new Date().getFullYear()} DocP · Chat with your documents.
      </footer>
    </div>
  );
}
