import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { message } from "antd";
import AuthShell from "../components/AuthShell";
import { login } from "../api";
import { setUser } from "../auth";

export default function Login() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!u || !p) {
      message.error("Enter your email/username and password");
      return;
    }
    setBusy(true);
    try {
      const user = await login(u.trim(), p);
      setUser(user);
      message.success(`Welcome back, ${user.firstName}!`);
      nav("/");
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your workspace"
      footer={
        <span style={{ color: "var(--text-dim)" }}>
          New here? <Link to="/signup">Create an account</Link>
        </span>
      }
    >
      <div>
        <label>Email or username</label>
        <input
          value={u}
          onChange={(e) => setU(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label>Password</label>
        <input
          type="password"
          value={p}
          onChange={(e) => setP(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="••••••••"
        />
      </div>
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </AuthShell>
  );
}
