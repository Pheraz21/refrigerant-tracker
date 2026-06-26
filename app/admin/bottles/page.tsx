"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { Package, Search, MapPin, Truck, Warehouse, Building2, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Filter as FilterIcon, FileText, FileSpreadsheet, Edit2, Trash2, Plus, Settings2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

const locationFilters = [
  { key: "all", label: "All Locations" },
  { key: "van", label: "In Van" },
  { key: "site", label: "On Site" },
  { key: "office", label: "HQ-Stores" },
  { key: "supplier", label: "Returned to Supplier" },
];

const categoryFilters = [
  { key: "all", label: "All Types" },
  { key: "new", label: "New Refrigerant" },
  { key: "reclaim", label: "Reclaim / Haz" },
  { key: "nitrogen", label: "Nitrogen" },
];

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "status" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate";

const COLUMN_DEFS = [
  { key: "serial",      label: "Serial",        required: true  },
  { key: "category",    label: "Category"                       },
  { key: "gasType",     label: "Gas Type"                       },
  { key: "capacity",    label: "Capacity"                       },
  { key: "gasInBottle", label: "Gas In Bottle"                  },
  { key: "balance",     label: "Balance"                        },
  { key: "location",    label: "Location"                       },
  { key: "supplier",    label: "Supplier"                       },
  { key: "poNumber",    label: "PO Number"                      },
  { key: "registered",  label: "Registered"                     },
  { key: "expiry",      label: "Expiry Date"                    },
  { key: "status",      label: "Status"                         },
  { key: "lastChanged", label: "Last Changed"                   },
  { key: "actions",     label: "Actions",       required: true  },
] as const;

export default function AllBottlesPage() {
  const router = useRouter();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [locFilter, setLocFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("all-bottles", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    Promise.all([
      db.getAllBottles(),
      db.getEngineerProfiles()
    ]).then(([b, e]) => {
      setBottles(b);
      setEngineers(e);
      setLoading(false);
    });
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem"}} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />;
  };

  const filtered = bottles
    .filter(b => b.status !== "returned")
    .filter(b => locFilter === "all" || b.locationType === locFilter)
    .filter(b => catFilter === "all" || b.category === catFilter)
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.registeredAt || b.locationChangedAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    })
    .filter(b => !search || b.serial.toLowerCase().includes(search.toLowerCase()) || b.gasType.toLowerCase().includes(search.toLowerCase()) || b.locationId.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let av: any = a[sortKey] ?? "";
      let bv: any = b[sortKey] ?? "";
      if (sortKey === "currentWeight") { av = Number(av); bv = Number(bv); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const getLocIcon = (loc: string) => {
    switch (loc) {
      case "van": return <Truck size={14} color="#ff8800" />;
      case "site": return <MapPin size={14} color="#00e5ff" />;
      case "office": return <Warehouse size={14} color="#22c55e" />;
      case "supplier": return <Building2 size={14} color="#a855f7" />;
      default: return null;
    }
  };

  const getLocColor = (loc: string) => {
    switch (loc) { case "van": return "#ff8800"; case "site": return "#00e5ff"; case "office": return "#22c55e"; case "supplier": return "#a855f7"; default: return "#fff"; }
  };

  const getCatColor = (cat: string) => {
    switch (cat) { case "reclaim": return "#ffaa00"; case "new": return "#00e5ff"; default: return "rgba(255,255,255,0.5)"; }
  };

  const getLocDisplay = (b: Bottle) => {
    if (b.locationType === "van") {
      const idOrName = b.locationId.replace(" - Van", "");
      const user = engineers.find(e => e.id === idOrName || e.name === idOrName);
      return `Van - ${user ? user.name : idOrName}`;
    }
    return b.locationId || b.locationType;
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
    const header = "Serial,Category,Gas Type,Capacity,Current,Location,Status,Supplier,Registered\n";
    const rows = filtered.map(b => `${b.serial},${b.category},${b.gasType},${b.initialWeight},${b.currentWeight},${b.locationId},${b.status},${b.supplier},${b.registeredAt}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = sinceDate ? `From: ${new Date(sinceDate).toLocaleDateString("en-GB")} To: Present` : "Full History";
    const rows = filtered.map(b => `
      <tr>
        <td>${b.serial}</td><td>${b.category}</td><td>${b.gasType}</td>
        <td>${(b.initialWeight || 0).toFixed(2)} kg</td><td>${(b.currentWeight || 0).toFixed(2)} kg</td>
        <td>${getLocDisplay(b)}</td><td>${b.status}</td>
      </tr>
    `).join("");
    const html = `
      <html><head><style>
        @page{margin:0;size:A4;}
        body{font-family:sans-serif;margin:0;padding:10mm;color:#333}
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
            <div class="report-title">Inventory Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filtered.length} Bottles</div></div>
          </div>
        </div>
        <table><thead><tr><th>Serial</th><th>Type</th><th>Gas</th><th>Capacity</th><th>Current</th><th>Location</th><th>Status</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd</div>
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
      case "serial":      return <th key={key} style={s} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></th>;
      case "category":    return <th key={key} style={s} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>;
      case "gasType":     return <th key={key} style={s} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></th>;
      case "capacity":    return <th key={key} style={s} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></th>;
      case "gasInBottle": return <th key={key} style={s} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></th>;
      case "balance":     return <th key={key} style={ns}>Balance</th>;
      case "location":    return <th key={key} style={s} onClick={() => handleSort("locationId")}>Location <SortIcon col="locationId" /></th>;
      case "supplier":    return <th key={key} style={s} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></th>;
      case "poNumber":    return <th key={key} style={ns}>PO Number</th>;
      case "registered":  return <th key={key} style={s} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></th>;
      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;
      case "status":      return <th key={key} style={s} onClick={() => handleSort("status")}>Status <SortIcon col="status" /></th>;
      case "lastChanged": return <th key={key} style={s} onClick={() => handleSort("locationChangedAt")}>Last Changed <SortIcon col="locationChangedAt" /></th>;
      case "actions":     return <th key={key} style={ns}>Actions</th>;
      default:            return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const balance = (b.initialWeight || 0) - (b.currentWeight || 0);
    const percent = Math.min(100, Math.max(0, ((b.currentWeight || 0) / (b.initialWeight || 1)) * 100));

    switch (key) {
      case "serial":
        return <td key={key} style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>{b.serial}</td>;
      case "category":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{color: getCatColor(b.category), fontSize: "0.85rem", fontWeight: 600}}>
              {b.category === "new" ? "New" : isReclaim ? "Reclaim" : "N₂"}
            </span>
          </td>
        );
      case "gasType":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.gasType}</td>;
      case "capacity":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            <div style={{fontWeight: 600}}>{(b.initialWeight || 0).toFixed(2)} kg</div>
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
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>
                  {(b.currentWeight || 0).toFixed(2)} kg
                </div>
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
      case "location":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem"}}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (b.locationType === "van") {
                  const idOrName = b.locationId.replace(" - Van", "");
                  const user = engineers.find(u => u.id === idOrName || u.name === idOrName);
                  router.push(`/admin/vans?engineer=${user ? user.id : idOrName}`);
                } else if (b.locationType === "supplier") {
                  router.push(`/admin/suppliers?supplier=${b.locationId}`);
                } else if (b.locationType === "office") {
                  router.push("/admin/stores");
                } else if (b.locationType === "site") {
                  router.push("/admin/onsite");
                }
              }}
              style={{display: "inline-flex", alignItems: "center", gap: "0.4rem", cursor: (b.locationType === "van" || b.locationType === "supplier" || b.locationType === "office" || b.locationType === "site") ? "pointer" : "default"}}
              onMouseEnter={(e) => { if (b.locationType === "van" || b.locationType === "supplier" || b.locationType === "office" || b.locationType === "site") e.currentTarget.style.textDecoration = "underline"; }}
              onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
            >
              {getLocIcon(b.locationType)}
              <span style={{color: getLocColor(b.locationType)}}>{getLocDisplay(b)}</span>
            </div>
          </td>
        );
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
      case "poNumber":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.poNumber ? "rgba(255,255,255,0.75)" : "var(--text-muted)"}}>{b.poNumber || "—"}</td>;
      case "registered":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}</td>;
      case "expiry":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;
      case "status":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "20px",
              background: b.status === "active" ? "rgba(34,197,94,0.1)" : b.status === "returned" ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.06)",
              color: b.status === "active" ? "#22c55e" : b.status === "returned" ? "#a855f7" : "rgba(255,255,255,0.5)"
            }}>{b.status}</span>
          </td>
        );
      case "lastChanged":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>{b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—"}</td>;
      case "actions":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <div style={{display: "flex", gap: "0.5rem"}}>
              <button
                onClick={(e) => { e.stopPropagation(); router.push(`/admin/bottles/${b.serial}/edit`); }}
                style={{background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#00e5ff", padding: "0.4rem", borderRadius: "6px", cursor: "pointer"}}
                title="Edit Bottle Data"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Are you sure you want to PERMANENTLY REMOVE bottle ${b.serial} from the system?`)) {
                    await db.removeBottle(b.serial);
                    setBottles(prev => prev.filter(p => p.serial !== b.serial));
                  }
                }}
                style={{background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.2)", color: "#ff3366", padding: "0.4rem", borderRadius: "6px", cursor: "pointer"}}
                title="Remove Bottle"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </td>
        );
      default: return null;
    }
  }

  return (
    <div>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <Package size={28} /> All Bottles
          </h1>
          <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>{bottles.length} bottles in the system</p>
        </div>
        <button
          onClick={() => router.push("/engineer")}
          style={{background: "var(--primary)", border: "none", color: "#000", padding: "0.75rem 1.25rem", borderRadius: "8px", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"}}
        >
          <Plus size={18} /> Register New Bottle
        </button>
      </div>

      <div style={{display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "center"}}>
        <select value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{padding: "0.6rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none"}}>
          {locationFilters.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{padding: "0.6rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none"}}>
          {categoryFilters.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <div style={{position: "relative", flex: 1, maxWidth: "300px"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input type="text" placeholder="Search serial, gas type, location..." value={search} onChange={(e) => setSearch(e.target.value)}
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
      ) : (
        <DoubleScrollContainer>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                {visibleCols.map(key => renderHeader(key))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.serial}
                  style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer", transition: "background 0.15s"}}
                  onClick={() => router.push(`/admin/bottles/${b.serial}`)}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                >
                  {visibleCols.map(key => renderCell(key, b))}
                </tr>
              ))}
            </tbody>
          </table>
        </DoubleScrollContainer>
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
