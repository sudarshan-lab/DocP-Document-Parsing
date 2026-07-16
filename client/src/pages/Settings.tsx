import { useState } from "react";
import { message } from "antd";
import AppShell from "../components/AppShell";
import { getUser, setUser } from "../auth";
import { set2fa } from "../api";

export default function Settings() {
  const user = getUser()!;
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
  const [twoFA, setTwoFA] = useState(!!user.twoFactorEnabled);
  const [busy, setBusy] = useState(false);

  const setT = (v: string) => {
    setTheme(v);
    localStorage.setItem("docp_theme", v);
    if (v === "light") document.documentElement.setAttribute("data-theme", "light");
    else document.documentElement.removeAttribute("data-theme");
  };

  const toggle2fa = async () => {
    setBusy(true);
    try {
      const updated = await set2fa(user._id, !twoFA);
      setTwoFA(!!updated.twoFactorEnabled);
      setUser(updated);
      message.success(
        updated.twoFactorEnabled ? "Two-step verification enabled" : "Two-step verification disabled"
      );
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Could not update");
    } finally {
      setBusy(false);
    }
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
        <div className="card-header">Security</div>
        <div style={{ padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              Two-step verification
              {twoFA ? (
                <span className="badge ready"><span className="dot" /> On</span>
              ) : (
                <span className="badge">Off</span>
              )}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4, maxWidth: 520 }}>
              When on, we email a one-time code each time you sign in. Codes go to <strong>{user.email}</strong>.
            </div>
          </div>
          <button className={"btn" + (twoFA ? "" : " btn-primary")} onClick={toggle2fa} disabled={busy}>
            {busy ? "Saving…" : twoFA ? "Disable" : "Enable"}
          </button>
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
          DocP turns your documents into answers. Upload PDFs, Word docs, or images, ask questions in
          plain language, and save the tables you care about.
        </div>
      </div>
    </AppShell>
  );
}
