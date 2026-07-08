import { ReactNode } from "react";
import "./AuthShell.css";

const FEATURES = [
  "Upload a document — we parse it with AWS Textract",
  "Ask questions in plain English",
  "Get clean tables back, save the ones you like",
];

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="auth-grid">
      <span className="orb a" />
      <span className="orb b" />
      <span className="orb c" />

      <div className="auth-hero">
        <div className="kicker brand">◆ DocP</div>
        <h1>
          Chat with your <span className="brand">documents.</span>
        </h1>
        <p>
          Turn any PDF into answers. Upload, ask, and get structured tables you
          can keep — powered by Textract&nbsp;+&nbsp;Claude.
        </p>
        <ul className="auth-feats">
          {FEATURES.map((f) => (
            <li key={f}>
              <span className="tick">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="glass-strong auth-card">
        <h2 style={{ margin: "0 0 4px", fontSize: 28 }}>{title}</h2>
        <p style={{ color: "var(--text-dim)", margin: 0 }}>{subtitle}</p>
        <div style={{ marginTop: 24, display: "grid", gap: 14 }}>{children}</div>
        <div style={{ marginTop: 20, fontSize: 14 }}>{footer}</div>
      </div>
    </div>
  );
}
