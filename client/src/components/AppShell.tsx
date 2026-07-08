import { ReactNode } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../auth";

export default function AppShell({ children }: { children: ReactNode }) {
  const nav = useNavigate();
  const user = getUser();
  return (
    <div style={{ minHeight: "100vh" }}>
      <span className="orb a" />
      <span className="orb b" />
      <header
        className="glass"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 22px",
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
        }}
      >
        <Link to="/" className="brand" style={{ fontSize: 20 }}>
          ◆ DocP
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ color: "var(--text-dim)", fontSize: 14 }}>
            {user ? `${user.firstName} ${user.lastName}` : ""}
          </span>
          <button
            className="btn btn-sm"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 22px 80px" }}>
        {children}
      </main>
    </div>
  );
}
