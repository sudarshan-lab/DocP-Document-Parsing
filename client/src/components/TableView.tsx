import React from "react";

function isPlainObject(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function Cell({ value }: { value: any }) {
  if (value === null || value === undefined)
    return <span style={{ color: "var(--text-faint)" }}>—</span>;
  if (isPlainObject(value) || Array.isArray(value))
    return <TableView data={value} />;
  return <>{String(value)}</>;
}

// Renders arbitrary JSON as a neat table:
//  - array of objects  -> table with the union of keys as columns
//  - array of scalars  -> single column
//  - object            -> key / value rows
//  - scalar            -> text
export default function TableView({ data }: { data: any }) {
  if (Array.isArray(data)) {
    if (data.length === 0)
      return <span style={{ color: "var(--text-faint)" }}>No rows</span>;
    if (data.every((r) => isPlainObject(r))) {
      const cols = Array.from(
        new Set(data.flatMap((r: any) => Object.keys(r)))
      );
      return (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row: any, i: number) => (
                <tr key={i}>
                  {cols.map((c) => (
                    <td key={c}>
                      <Cell value={row[c]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    return (
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            {data.map((v, i) => (
              <tr key={i}>
                <td>
                  <Cell value={v} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (isPlainObject(data)) {
    return (
      <div className="table-wrap">
        <table className="data-table">
          <tbody>
            {Object.keys(data).map((k) => (
              <tr key={k}>
                <th style={{ width: "34%" }}>{k}</th>
                <td>
                  <Cell value={data[k]} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <span>{String(data)}</span>;
}
