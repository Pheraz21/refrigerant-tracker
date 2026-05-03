"use client";

import { Settings2, X, ChevronUp, ChevronDown } from "lucide-react";

interface ColDef {
  readonly key: string;
  readonly label: string;
  readonly required?: boolean;
}

interface Props {
  open: boolean;
  onClose: () => void;
  columns: readonly ColDef[];
  hidden: Set<string>;
  order: string[];
  onToggle: (key: string) => void;
  onMove: (key: string, dir: "up" | "down") => void;
  onReset: () => void;
}

export function ColumnCustomizer({ open, onClose, columns, hidden, order, onToggle, onMove, onReset }: Props) {
  if (!open) return null;

  const colMap = Object.fromEntries(columns.map(c => [c.key, c]));
  const sorted = order.map(k => colMap[k]).filter(Boolean) as ColDef[];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 999 }} />
      <div style={{
        position: "fixed", top: "80px", right: "24px", width: "268px", zIndex: 1000,
        background: "rgba(10,14,20,0.98)", border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px", boxShadow: "0 24px 64px rgba(0,0,0,0.7)", overflow: "hidden"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "0.875rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.08)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700, color: "#fff" }}>
            <Settings2 size={16} color="#00e5ff" />
            Customise Columns
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: "2px", display: "flex", alignItems: "center" }}
          >
            <X size={16} />
          </button>
        </div>

        <div style={{ maxHeight: "420px", overflowY: "auto", padding: "0.35rem 0" }}>
          {sorted.map((col, i) => {
            const isHidden = hidden.has(col.key);
            const isFirst = i === 0;
            const isLast = i === sorted.length - 1;
            return (
              <div
                key={col.key}
                style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.45rem 1rem", transition: "background 0.1s" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <button
                  disabled={!!col.required}
                  onClick={() => !col.required && onToggle(col.key)}
                  style={{
                    flexShrink: 0, width: "17px", height: "17px", borderRadius: "4px",
                    border: `1px solid ${isHidden ? "rgba(255,255,255,0.18)" : "#00e5ff"}`,
                    background: isHidden ? "transparent" : "rgba(0,229,255,0.14)",
                    cursor: col.required ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", padding: 0
                  }}
                >
                  {!isHidden && <div style={{ width: "7px", height: "7px", borderRadius: "2px", background: "#00e5ff" }} />}
                </button>

                <span style={{
                  flex: 1, fontSize: "0.84rem",
                  color: isHidden ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.85)",
                  textDecoration: isHidden ? "line-through" : "none",
                  userSelect: "none"
                }}>
                  {col.label}
                  {col.required && (
                    <span style={{ fontSize: "0.68rem", color: "rgba(255,255,255,0.25)", marginLeft: "0.35rem" }}>(req)</span>
                  )}
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  <button
                    onClick={() => onMove(col.key, "up")}
                    disabled={isFirst}
                    style={{
                      background: "none", border: "none",
                      cursor: isFirst ? "not-allowed" : "pointer",
                      color: isFirst ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)",
                      padding: "1px", display: "flex"
                    }}
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => onMove(col.key, "down")}
                    disabled={isLast}
                    style={{
                      background: "none", border: "none",
                      cursor: isLast ? "not-allowed" : "pointer",
                      color: isLast ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.4)",
                      padding: "1px", display: "flex"
                    }}
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={onReset}
            style={{
              width: "100%", padding: "0.45rem",
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px", color: "rgba(255,255,255,0.55)", fontSize: "0.8rem",
              cursor: "pointer", fontWeight: 500
            }}
          >
            Reset to default
          </button>
        </div>
      </div>
    </>
  );
}
