import { ReactNode } from "react";

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
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 340 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div className="brand" style={{ fontSize: 22 }}>
            <span style={{ color: "var(--accent)" }}>◆</span> DocP
          </div>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 20, textAlign: "center" }}>{title}</h2>
          <p className="muted" style={{ margin: "0 0 20px", textAlign: "center", fontSize: 13 }}>
            {subtitle}
          </p>
          <div style={{ display: "grid", gap: 14 }}>{children}</div>
        </div>
        <div className="card" style={{ padding: 14, marginTop: 16, textAlign: "center", fontSize: 14 }}>
          {footer}
        </div>
      </div>
    </div>
  );
}
