import { ReactNode, useState } from "react";
import { NavLink, useNavigate, Link } from "react-router-dom";
import { getUser, logout } from "../auth";

const NAV = [
  { to: "/", label: "Overview", icon: "▚", end: true },
  { to: "/documents", label: "Documents", icon: "▤" },
  { to: "/tables", label: "Saved tables", icon: "▦" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

export default function AppShell({
  children,
  sidebarExtra,
}: {
  children: ReactNode;
  sidebarExtra?: ReactNode;
}) {
  const navigate = useNavigate();
  const user = getUser();
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
  const [q, setQ] = useState("");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("docp_theme", next);
    if (next === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  };

  const search = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && q.trim())
      navigate(`/documents?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div>
      <header className="topbar">
        <Link
          to="/"
          className="brand"
          style={{ fontSize: 16, display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ color: "var(--accent)" }}>◆</span> DocP
        </Link>
        <input
          placeholder="Search documents…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={search}
          style={{ maxWidth: 340, height: 30, padding: "3px 12px" }}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn btn-sm btn-ghost" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <div
            title={user?.email}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "var(--accent)",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {(user?.firstName?.[0] || "U").toUpperCase()}
          </div>
          <button
            className="btn btn-sm"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div className="body-grid">
        <aside className="sidebar">
          <div className="nav-section">Workspace</div>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
            >
              <span style={{ width: 16, textAlign: "center", opacity: 0.8 }}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
          {sidebarExtra}
        </aside>

        <main className="main">
          <div className="container">{children}</div>
        </main>
      </div>
    </div>
  );
}
