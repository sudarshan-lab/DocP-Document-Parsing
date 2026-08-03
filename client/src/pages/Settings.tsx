import { useEffect, useState } from "react";
import { message } from "antd";
import AppShell from "../components/AppShell";
import { getUser, setUser } from "../auth";
import {
  set2fa,
  updateInstructions,
  listPrompts,
  createPrompt,
  deletePrompt,
  SavedPromptItem,
} from "../api";

export default function Settings() {
  const user = getUser()!;
  const [theme, setTheme] = useState(() =>
    document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"
  );
  const [twoFA, setTwoFA] = useState(!!user.twoFactorEnabled);
  const [busy, setBusy] = useState(false);

  const [instructions, setInstructions] = useState(user.customInstructions || "");
  const [savingInstr, setSavingInstr] = useState(false);

  const [prompts, setPrompts] = useState<SavedPromptItem[]>([]);
  const [pTitle, setPTitle] = useState("");
  const [pText, setPText] = useState("");

  useEffect(() => {
    listPrompts(user._id).then(setPrompts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const saveInstructions = async () => {
    setSavingInstr(true);
    try {
      const updated = await updateInstructions(user._id, instructions);
      setUser(updated);
      message.success("Custom instructions saved");
    } catch {
      message.error("Could not save");
    } finally {
      setSavingInstr(false);
    }
  };

  const addPrompt = async () => {
    if (!pTitle.trim() || !pText.trim()) {
      message.error("Give the prompt a name and text");
      return;
    }
    try {
      const p = await createPrompt(user._id, pTitle.trim(), pText.trim());
      setPrompts((s) => [p, ...s]);
      setPTitle("");
      setPText("");
    } catch {
      message.error("Could not save prompt");
    }
  };
  const removePrompt = async (id: string) => {
    try {
      await deletePrompt(id);
      setPrompts((s) => s.filter((p) => p._id !== id));
    } catch {
      message.error("Could not delete");
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
        <div className="card-header">Custom instructions</div>
        <div style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
            Standing instructions applied to <strong>every</strong> question you ask — so you don't
            repeat yourself. E.g. "Always include a total row; format money as $ with commas; give
            dates as MM/DD/YYYY."
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Add instructions the assistant should always follow…"
            rows={4}
            style={{ resize: "vertical" }}
          />
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={saveInstructions} disabled={savingInstr}>
              {savingInstr ? "Saving…" : "Save instructions"}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header">Saved prompts</div>
        <div style={{ padding: 16 }}>
          <div className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
            Reusable prompts you can run on any document or set with one click from the chat.
          </div>
          {prompts.length > 0 && (
            <div className="list" style={{ marginBottom: 14 }}>
              {prompts.map((p) => (
                <div key={p._id} className="row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.title}</div>
                    <div className="faint" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.prompt}
                    </div>
                  </div>
                  <button className="btn btn-sm btn-danger" onClick={() => removePrompt(p._id)}>
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gap: 8 }}>
            <input value={pTitle} onChange={(e) => setPTitle(e.target.value)} placeholder="Prompt name (e.g. 'Line items')" />
            <textarea
              value={pText}
              onChange={(e) => setPText(e.target.value)}
              placeholder="The prompt (e.g. 'List every line item with quantity and amount, plus a total row')"
              rows={2}
              style={{ resize: "vertical" }}
            />
            <div>
              <button className="btn" onClick={addPrompt}>＋ Add prompt</button>
            </div>
          </div>
        </div>
      </div>

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

      <div className="card">
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
    </AppShell>
  );
}
