import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { message, Modal } from "antd";
import AuthShell from "../components/AuthShell";
import { login, verifyOtp } from "../api";
import { setUser } from "../auth";

export default function Login() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"password" | "otp">("password");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState<{ userId: string; email?: string } | null>(null);

  const submit = async () => {
    if (!u || !p) {
      message.error("Enter your email/username and password");
      return;
    }
    setBusy(true);
    try {
      const res = await login(u.trim(), p);
      if (res.twoFactorRequired && res.userId) {
        setPending({ userId: res.userId, email: res.email });
        setStep("otp");
        message.info("We emailed you a verification code");
      } else if (res.userInfo) {
        setUser(res.userInfo);
        if (res.nudge2fa) {
          Modal.confirm({
            title: "Add an extra layer of security?",
            content:
              "Turn on two-step verification to protect your account with a one-time email code at sign-in.",
            okText: "Enable in settings",
            cancelText: "Maybe later",
            onOk: () => nav("/settings"),
            onCancel: () => nav("/"),
          });
        } else {
          message.success(`Welcome back, ${res.userInfo.firstName}!`);
          nav("/");
        }
      }
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async () => {
    if (!otp.trim() || !pending) return;
    setBusy(true);
    try {
      const user = await verifyOtp(pending.userId, otp.trim());
      setUser(user);
      message.success(`Welcome back, ${user.firstName}!`);
      nav("/");
    } catch (e: any) {
      message.error(e?.response?.data?.message || "Invalid code");
    } finally {
      setBusy(false);
    }
  };

  if (step === "otp") {
    return (
      <AuthShell
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${pending?.email || "your email"}`}
        footer={
          <span style={{ color: "var(--text-dim)" }}>
            Didn't get it?{" "}
            <Link to="/login" onClick={() => setStep("password")}>
              Back to sign in
            </Link>
          </span>
        }
      >
        <div>
          <label>Verification code</label>
          <input
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitOtp()}
            placeholder="123456"
            inputMode="numeric"
            maxLength={6}
            autoFocus
          />
        </div>
        <button className="btn btn-primary" onClick={submitOtp} disabled={busy} style={{ marginTop: 6 }}>
          {busy ? "Verifying…" : "Verify & sign in"}
        </button>
      </AuthShell>
    );
  }

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
      <button className="btn btn-primary" onClick={submit} disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </AuthShell>
  );
}
