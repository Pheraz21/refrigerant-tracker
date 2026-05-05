"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { Warehouse, ArrowUpDown, ArrowUp, ArrowDown, Search, Calendar, Filter as FilterIcon, FileText, FileSpreadsheet, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "returnedBy" | "locationChangedAt" | "supplier" | "registeredAt";

const COLUMN_DEFS = [
  { key: "serial",       label: "Serial",      required: true },
  { key: "category",     label: "Category"                    },
  { key: "gasType",      label: "Gas Type"                    },
  { key: "capacity",     label: "Capacity"                    },
  { key: "gasInBottle",  label: "Gas In Bottle"               },
  { key: "balance",      label: "Balance"                     },
  { key: "returnedBy",   label: "Returned By"                 },
  { key: "dateReceived", label: "Date Received"               },
  { key: "supplier",     label: "Supplier"                    },
  { key: "registered",   label: "Registered"                  },
] as const;

export default function StoresInventoryPage() {
  const router = useRouter();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("locationChangedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("stores", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    db.getBottlesByLocation("office").then(b => {
      setBottles(b);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem"}} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />;
  };

  const filtered = bottles
    .filter(b => !search || b.serial.toLowerCase().includes(search.toLowerCase()) || b.gasType.toLowerCase().includes(search.toLowerCase()) || (b.returnedBy || "").toLowerCase().includes(search.toLowerCase()))
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.locationChangedAt || b.registeredAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    })
    .sort((a, b) => {
      let av: any = a[sortKey] ?? "";
      let bv: any = b[sortKey] ?? "";
      if (sortKey === "currentWeight") { av = Number(av); bv = Number(bv); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const getCatBadge = (cat: string) => {
    switch (cat) {
      case "reclaim": return { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" };
      case "new":     return { bg: "rgba(0,229,255,0.08)", color: "#00e5ff",  label: "New"           };
      default:        return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "N₂" };
    }
  };

  const thBase: React.CSSProperties = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none", whiteSpace: "nowrap"
  };

  const exportBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.85rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
    transition: "all 0.15s"
  };

  const exportCSV = () => {
    const header = "Serial,Category,Gas Type,Capacity,Current,Supplier,Registered,Returned By,Date Received\n";
    const rows = filtered.map(b => `${b.serial},${b.category},${b.gasType},${b.initialWeight},${b.currentWeight},${b.supplier},${b.registeredAt},${b.returnedBy},${b.locationChangedAt}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stores_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = sinceDate ? `From: ${new Date(sinceDate).toLocaleDateString("en-GB")} To: Present` : "Full History";
    const rows = filtered.map(b => `
      <tr>
        <td>${b.serial}</td><td>${b.gasType}</td><td>${(b.initialWeight||0).toFixed(2)} kg</td>
        <td>${(b.currentWeight||0).toFixed(2)} kg</td><td>${b.supplier||'—'}</td>
        <td>${b.returnedBy||'—'}</td><td>${b.locationChangedAt?new Date(b.locationChangedAt).toLocaleDateString("en-GB"):'—'}</td>
      </tr>
    `).join("");
    const html = `
      <html><head><style>
        body{font-family:sans-serif;padding:20px;color:#333}
        .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
        .logo-section{display:flex;gap:15px;align-items:flex-end}
        .company-info{font-size:10px;line-height:1.4;color:#555}
        .report-info{text-align:right}
        .report-title{font-size:20px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
        .report-meta{font-size:11px;color:#666}
        table{width:100%;border-collapse:collapse;margin-top:10px}
        th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:10px}
        th{background:#f8f9fa;font-weight:bold;text-transform:uppercase;color:#555}
        .footer{margin-top:20px;font-size:9px;color:#999;text-align:center}
      </style></head><body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width:100px;height:auto"/>
            <div class="company-info"><strong>21 Degrees Ltd</strong><br/>Unit 10, Apollo Court, Monkton Business Park<br/>Hebburn, Tyne & Wear, NE31 2ES<br/>Tel: 0191 495 7224</div>
          </div>
          <div class="report-info">
            <div class="report-title">Stores Inventory Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filtered.length} Bottles</div></div>
          </div>
        </div>
        <table><thead><tr><th>Serial</th><th>Gas</th><th>Capacity</th><th>Current</th><th>Supplier</th><th>Returned By</th><th>Date Received</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">Printed from F-Gas Tracker Pro | &copy; 21 Degrees Ltd</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  function renderHeader(key: string) {
    const s: React.CSSProperties = { ...thBase, cursor: "pointer" };
    const ns: React.CSSProperties = { ...thBase, cursor: "default" };
    switch (key) {
      case "serial":       return <th key={key} style={s} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></th>;
      case "category":     return <th key={key} style={s} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>;
      case "gasType":      return <th key={key} style={s} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></th>;
      case "capacity":     return <th key={key} style={s} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></th>;
      case "gasInBottle":  return <th key={key} style={s} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></th>;
      case "balance":      return <th key={key} style={ns}>Balance</th>;
      case "returnedBy":   return <th key={key} style={s} onClick={() => handleSort("returnedBy")}>Returned By <SortIcon col="returnedBy" /></th>;
      case "dateReceived": return <th key={key} style={s} onClick={() => handleSort("locationChangedAt")}>Date Received <SortIcon col="locationChangedAt" /></th>;
      case "supplier":     return <th key={key} style={s} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></th>;
      case "registered":   return <th key={key} style={s} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></th>;
      default:             return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const badge = getCatBadge(b.category);
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const balance = b.initialWeight - b.currentWeight;
    const percent = Math.min(100, Math.max(0, (b.currentWeight / b.initialWeight) * 100));

    switch (key) {
      case "serial":
        return <td key={key} style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>{b.serial}</td>;
      case "category":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{background: badge.bg, color: badge.color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
              {badge.label}
            </span>
          </td>
        );
      case "gasType":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.gasType}</td>;
      case "capacity":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            <div style={{fontWeight: 600}}>{b.initialWeight.toFixed(2)} kg</div>
            <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>
              {isReclaim ? "Max Capacity" : isNitrogen ? "Full Weight" : "Full Charge"}
            </div>
          </td>
        );
      case "gasInBottle":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            {isNitrogen ? (
              <span style={{color: "var(--text-muted)"}}>N/A</span>
            ) : (
              <>
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{b.currentWeight.toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>{isReclaim ? "Recovered" : "Remaining"}</div>
                <div style={{width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px", overflow: "hidden"}}>
                  <div style={{width: `${percent}%`, height: "100%", background: isReclaim ? "#ffaa00" : "#22c55e", transition: "width 0.3s"}} />
                </div>
              </>
            )}
          </td>
        );
      case "balance":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            {isNitrogen ? (
              <span style={{color: "var(--text-muted)"}}>N/A</span>
            ) : (
              <>
                <div style={{fontWeight: 700, color: isReclaim ? "#22c55e" : "#ffc107"}}>{balance.toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>{isReclaim ? "Available Space" : "Total Used"}</div>
              </>
            )}
          </td>
        );
      case "returnedBy":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.returnedBy || "—"}</td>;
      case "dateReceived":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>{b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—"}</td>;
      case "supplier":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>
            {b.supplier ? (
              <span
                onClick={(e) => { e.stopPropagation(); router.push(`/admin/suppliers?supplier=${b.supplier}`); }}
                style={{cursor: "pointer", color: "#00e5ff", fontWeight: 500}}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                {b.supplier}
              </span>
            ) : "—"}
          </td>
        );
      case "registered":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}</td>;
      default: return null;
    }
  }

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Warehouse size={28} /> Stores Inventory
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>All bottles currently held in office / stores — {bottles.length} total</p>
      </div>

      <div style={{display: "flex", gap: "1.5rem", marginBottom: "1.5rem", alignItems: "center", flexWrap: "wrap"}}>
        <div style={{position: "relative", maxWidth: "350px", flex: 1}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input type="text" placeholder="Search serial, gas type, returned by..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box"}}
          />
        </div>

        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <div style={{display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 600}}>
            <FilterIcon size={16} /> Since:
          </div>
          <div style={{position: "relative"}}>
            <Calendar size={14} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#00e5ff", pointerEvents: "none"}} />
            <input type="date" value={sinceDate} onChange={e => setSinceDate(e.target.value)}
              style={{padding: "0.5rem 0.75rem 0.5rem 2.25rem", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", colorScheme: "dark"}}
            />
          </div>
        </div>

        <div style={{display: "flex", gap: "0.5rem"}}>
          <button onClick={exportPDF} style={exportBtnStyle}><FileText size={16} /> Print PDF</button>
          <button onClick={exportCSV} style={exportBtnStyle}><FileSpreadsheet size={16} /> Export Excel</button>
          <button onClick={() => setCustOpen(true)} style={exportBtnStyle}><Settings2 size={16} /> Columns</button>
        </div>

        <span style={{fontSize: "0.82rem", color: "var(--text-muted)"}}>{filtered.length} results</span>
      </div>

      {loading ? (
        <p style={{color: "var(--text-muted)"}}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign: "center", padding: "4rem", color: "var(--text-muted)"}}>
          <Warehouse size={48} style={{opacity: 0.2, marginBottom: "0.75rem"}} />
          <p style={{fontSize: "1.1rem", fontWeight: 600}}>Stores is empty</p>
          <p style={{fontSize: "0.85rem"}}>No bottles currently held in office/stores</p>
        </div>
      ) : (
        <div style={{borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"}}>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                {visibleCols.map(key => renderHeader(key))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.serial}
                  onClick={() => router.push(`/admin/bottles/${b.serial}`)}
                  style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.2s"}}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {visibleCols.map(key => renderCell(key, b))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ColumnCustomizer
        open={customizerOpen}
        onClose={() => setCustOpen(false)}
        columns={COLUMN_DEFS}
        hidden={hidden}
        order={order}
        onToggle={toggleCol}
        onMove={moveCol}
        onReset={reset}
      />
    </div>
  );
}
