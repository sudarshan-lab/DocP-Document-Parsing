import { useEffect, useState } from "react";

const MESSAGES = [
  "Combobulating the paperwork…",
  "Brewing insights…",
  "Teaching the robot to read…",
  "Untangling the tables…",
  "Consulting the document spirits…",
  "Extracting the good stuff…",
  "Reticulating splines…",
  "Putting it all together…",
  "Almost there — polishing the details…",
];

export default function LoadingMessages({ compact }: { compact?: boolean }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % MESSAGES.length), 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div
        className="spin"
        style={{
          width: compact ? 16 : 20,
          height: compact ? 16 : 20,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.18)",
          borderTopColor: "var(--accent-2)",
          flexShrink: 0,
        }}
      />
      <span style={{ color: "var(--text-dim)", fontSize: compact ? 13 : 15 }}>
        {MESSAGES[i]}
      </span>
    </div>
  );
}
