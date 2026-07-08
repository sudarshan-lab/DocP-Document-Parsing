import { useState } from "react";
import AppShell from "../components/AppShell";
import { getUser } from "../auth";

export default function Settings() {
  const user = getUser()!;
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
  const setT = (v: string) => {
    setTheme(v);
    localStorage.setItem("docp_theme", v);
    if (v === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  };

  const fields: [string, string][] = [
    ["First name", user.firstName],
    ["Last name", user.lastName],
    ["Username", user.userName],
    ["Email", user.email],
  ];

  return (
    <AppShell>
      <h1 style={{ marginTop: 0 }}>Settings</h1>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">Profile</div>
        <div style={{ padding: 16, display: "grid", gap: 14, maxWidth: 460 }}>
          {fields.map(([l, v]) => (
            <div key={l}>
              <label>{l}</label>
              <input value={v} readOnly style={{ marginTop: 4 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">Appearance</div>
        <div style={{ padding: 16, display: "flex", gap: 10 }}>
          <button className={"btn" + (theme === "dark" ? " btn-primary" : "")} onClick={() => setT("dark")}>
            ☾ Dark
          </button>
          <button className={"btn" + (theme === "light" ? " btn-primary" : "")} onClick={() => setT("light")}>
            ☀ Light
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">About</div>
        <div style={{ padding: 16 }} className="muted">
          DocP turns your documents into answers. Upload a PDF or image, ask questions in plain
          language, and save the tables you care about. Supported: PDF, PNG, JPG, TIFF · up to 4.5 MB.
        </div>
      </div>
    </AppShell>
  );
}
