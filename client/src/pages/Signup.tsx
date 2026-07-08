import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { message } from "antd";
import AuthShell from "../components/AuthShell";
import { signup } from "../api";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const nav = useNavigate();
  const [f, setF] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    const { firstName, lastName, userName, email, password, confirm } = f;
    if (!firstName || !lastName || !userName || !email || !password) {
      message.error("Please fill in all fields");
      return;
    }
    if (!emailRe.test(email)) {
      message.error("Enter a valid email");
      return;
    }
    if (password !== confirm) {
      message.error("Passwords don't match");
      return;
    }
    setBusy(true);
    try {
      await signup({ firstName, lastName, userName, email, password });
      message.success("Account created — please sign in");
      nav("/login");
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Signup failed");
    } finally {
      setBusy(false);
    }
  };

  const two = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } as const;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start chatting with your documents"
      footer={
        <span style={{ color: "var(--text-dim)" }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </span>
      }
    >
      <div style={two}>
        <div>
          <label>First name</label>
          <input value={f.firstName} onChange={(e) => set("firstName", e.target.value)} />
        </div>
        <div>
          <label>Last name</label>
          <input value={f.lastName} onChange={(e) => set("lastName", e.target.value)} />
        </div>
      </div>
      <div>
        <label>Username</label>
        <input value={f.userName} onChange={(e) => set("userName", e.target.value)} />
      </div>
      <div>
        <label>Email</label>
        <input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
      </div>
      <div style={two}>
        <div>
          <label>Password</label>
          <input type="password" value={f.password} onChange={(e) => set("password", e.target.value)} />
        </div>
        <div>
          <label>Confirm</label>
          <input
            type="password"
            value={f.confirm}
            onChange={(e) => set("confirm", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
          />
        </div>
      </div>
      <button
        className="btn btn-primary"
        onClick={submit}
        disabled={busy}
        style={{ marginTop: 6 }}
      >
        {busy ? "Creating…" : "Create account"}
      </button>
    </AuthShell>
  );
}
