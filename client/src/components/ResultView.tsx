import { useMemo, useState } from "react";
import { message } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import TableView from "./TableView";

const COLORS = [
  "#7c6cff",
  "#22d3ee",
  "#34d399",
  "#fcd34d",
  "#fb7185",
  "#a78bfa",
  "#f472b6",
  "#60a5fa",
];

const tooltipStyle: any = {
  background: "var(--bg)",
  border: "none",
  borderRadius: 12,
  boxShadow: "var(--neu-out)",
  color: "var(--text)",
};

type View = "table" | "bar" | "line" | "pie";

function asRows(data: any): any[] | null {
  return Array.isArray(data) &&
    data.length > 0 &&
    data.every((r) => r && typeof r === "object" && !Array.isArray(r))
    ? data
    : null;
}
const isNum = (v: any) =>
  typeof v === "number" ||
  (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)));

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Seg({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: any;
}) {
  return (
    <button
      onClick={onClick}
      className="btn btn-sm"
      style={{
        boxShadow: active ? "var(--neu-in-sm)" : "none",
        color: active ? "var(--accent-2)" : "var(--text-dim)",
        background: "transparent",
      }}
    >
      {children}
    </button>
  );
}

export default function ResultView({ data }: { data: any }) {
  const rows = useMemo(() => asRows(data), [data]);
  const cols = useMemo(
    () => (rows ? Array.from(new Set(rows.flatMap((r) => Object.keys(r)))) : []),
    [rows]
  );
  const numeric = useMemo(
    () => cols.filter((c) => rows!.some((r) => isNum(r[c]))),
    [cols, rows]
  );
  const label = useMemo(
    () => cols.find((c) => !numeric.includes(c)) || cols[0] || null,
    [cols, numeric]
  );
  const canChart = !!rows && numeric.length > 0 && !!label;
  const [view, setView] = useState<View>("table");

  const chartData = useMemo(() => {
    if (!rows || !label) return [];
    return rows.map((r) => {
      const o: any = { [label]: String(r[label] ?? "") };
      numeric.forEach((c) => (o[c] = Number(r[c])));
      return o;
    });
  }, [rows, label, numeric]);

  const exportCsv = () => {
    if (!rows) return message.info("This result isn't tabular — try JSON export");
    const esc = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const out = [
      cols.join(","),
      ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
    ].join("\n");
    download("data.csv", out, "text/csv");
  };
  const exportJson = () =>
    download("data.json", JSON.stringify(data, null, 2), "application/json");
  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    message.success("Copied JSON to clipboard");
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <div
          className="neu-inset"
          style={{ display: "flex", padding: 4, borderRadius: 12, gap: 4 }}
        >
          <Seg active={view === "table"} onClick={() => setView("table")}>
            ▦ Table
          </Seg>
          {canChart && (
            <>
              <Seg active={view === "bar"} onClick={() => setView("bar")}>
                ▮ Bar
              </Seg>
              <Seg active={view === "line"} onClick={() => setView("line")}>
                ∿ Line
              </Seg>
              <Seg active={view === "pie"} onClick={() => setView("pie")}>
                ◔ Pie
              </Seg>
            </>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-sm" onClick={exportCsv}>
            ⬇ CSV
          </button>
          <button className="btn btn-sm" onClick={exportJson}>
            ⬇ JSON
          </button>
          <button className="btn btn-sm" onClick={copy}>
            ⧉ Copy
          </button>
        </div>
      </div>

      {view === "table" ? (
        <TableView data={data} />
      ) : (
        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            {view === "bar" ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={label!} tick={{ fill: "var(--text-dim)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--text-dim)", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend />
                {numeric.map((c, i) => (
                  <Bar key={c} dataKey={c} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            ) : view === "line" ? (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey={label!} tick={{ fill: "var(--text-dim)", fontSize: 12 }} />
                <YAxis tick={{ fill: "var(--text-dim)", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                {numeric.map((c, i) => (
                  <Line key={c} type="monotone" dataKey={c} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            ) : (
              <PieChart>
                <Tooltip contentStyle={tooltipStyle} />
                <Pie data={chartData} dataKey={numeric[0]} nameKey={label!} outerRadius={115} label>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
