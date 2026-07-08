import { ReactNode, useState } from "react";
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
  // cursor position, normalized to -0.5..0.5 for the 3D parallax
  const [t, setT] = useState({ x: 0, y: 0 });
  const onMove = (e: React.MouseEvent) =>
    setT({
      x: e.clientX / window.innerWidth - 0.5,
      y: e.clientY / window.innerHeight - 0.5,
    });

  return (
    <div
      className="auth-grid"
      onMouseMove={onMove}
      onMouseLeave={() => setT({ x: 0, y: 0 })}
      style={{ perspective: 1400 }}
    >
      <span className="orb a" />
      <span className="orb b" />
      <span className="orb c" />

      <div
        className="auth-hero"
        style={{
          transform: `translate3d(${t.x * -22}px, ${t.y * -16}px, 0)`,
          transition: "transform 0.18s ease-out",
        }}
      >
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

      <div
        className="glass-strong auth-card"
        style={{
          transform: `rotateY(${t.x * 7}deg) rotateX(${t.y * -7}deg)`,
          transformStyle: "preserve-3d",
          transition: "transform 0.14s ease-out",
        }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: 28 }}>{title}</h2>
        <p style={{ color: "var(--text-dim)", margin: 0 }}>{subtitle}</p>
        <div style={{ marginTop: 24, display: "grid", gap: 14 }}>{children}</div>
        <div style={{ marginTop: 20, fontSize: 14 }}>{footer}</div>
      </div>
    </div>
  );
}
