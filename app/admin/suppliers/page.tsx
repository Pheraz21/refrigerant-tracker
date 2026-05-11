"use client";

import { useEffect, useState, Suspense } from "react";
import { db, Bottle } from "@/lib/db";
import { Building2, Search, MapPin, Truck, Warehouse, ArrowUpDown, ArrowUp, ArrowDown, Filter as FilterIcon, Calendar, FileText, FileSpreadsheet, Settings2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "status" | "locationChangedAt" | "supplier" | "registeredAt";

const COLUMN_DEFS = [
  { key: "serial",          label: "Serial",          required: true },
  { key: "category",        label: "Category"                        },
  { key: "gasType",         label: "Gas Type"                        },
  { key: "capacity",        label: "Capacity"                        },
  { key: "gasInBottle",     label: "Gas In Bottle"                   },
  { key: "balance",         label: "Balance"                         },
  { key: "currentLocation", label: "Current Location"                },
  { key: "supplier",        label: "Supplier"                        },
  { key: "registered",      label: "Registered"                      },
  { key: "status",          label: "Status"                          },
  { key: "lastChanged",     label: "Last Changed"                    },
] as const;

function SupplierInventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [supplierDropdownOpen, setSupplierDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("supplier");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("suppliers", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    const s = searchParams.get("supplier");
    if (s) setSupplierFilter([s]);
  }, [searchParams]);

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

  const suppliers = Array.from(new Set(bottles.map(b => b.supplier).filter((s): s is string => Boolean(s)))).sort();

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
    .filter(b => b.status !== "returned")
    .filter(b => supplierFilter.length === 0 || (b.supplier && supplierFilter.includes(b.supplier)))
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.registeredAt || b.locationChangedAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    })
    .filter(b => !search || b.serial.toLowerCase().includes(search.toLowerCase()) || b.gasType.toLowerCase().includes(search.toLowerCase()) || b.supplier?.toLowerCase().includes(search.toLowerCase()))
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
    const header = "Serial,Supplier,Category,Gas Type,Capacity,Current,Location,Status,Registered\n";
    const rows = filtered.map(b => `${b.serial},${b.supplier},${b.category},${b.gasType},${b.initialWeight},${b.currentWeight},${b.locationId},${b.status},${b.registeredAt}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = sinceDate ? `From: ${new Date(sinceDate).toLocaleDateString("en-GB")} To: Present` : "Full History";
    const rows = filtered.map(b => `
      <tr>
        <td>${b.serial}</td><td>${b.supplier||'—'}</td><td>${b.gasType}</td>
        <td>${(b.initialWeight||0).toFixed(2)} kg</td><td>${(b.currentWeight||0).toFixed(2)} kg</td>
        <td>${getLocDisplay(b)}</td><td>${b.status}</td>
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
            <div class="report-title">Bottles By Supplier Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filtered.length} Bottles</div></div>
          </div>
        </div>
        <table><thead><tr><th>Serial</th><th>Supplier</th><th>Gas</th><th>Capacity</th><th>Current</th><th>Location</th><th>Status</th></tr></thead>
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
      case "serial":          return <th key={key} style={s} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></th>;
      case "category":        return <th key={key} style={s} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>;
      case "gasType":         return <th key={key} style={s} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></th>;
      case "capacity":        return <th key={key} style={s} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></th>;
      case "gasInBottle":     return <th key={key} style={s} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></th>;
      case "balance":         return <th key={key} style={ns}>Balance</th>;
      case "currentLocation": return <th key={key} style={s} onClick={() => handleSort("locationId")}>Current Location <SortIcon col="locationId" /></th>;
      case "supplier":        return <th key={key} style={s} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></th>;
      case "registered":      return <th key={key} style={s} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></th>;
      case "status":          return <th key={key} style={s} onClick={() => handleSort("status")}>Status <SortIcon col="status" /></th>;
      case "lastChanged":     return <th key={key} style={s} onClick={() => handleSort("locationChangedAt")}>Last Changed <SortIcon col="locationChangedAt" /></th>;
      default:                return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const balance = (b.initialWeight || 0) - (b.currentWeight || 0);
    const percent = Math.min(100, Math.max(0, ((b.currentWeight || 0) / (b.initialWeight || 1)) * 100));
    const catBadge = isReclaim
      ? { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" }
      : isNitrogen
      ? { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "N₂" }
      : { bg: "rgba(0,229,255,0.08)", color: "#00e5ff", label: "New" };

    switch (key) {
      case "serial":
        return <td key={key} style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>{b.serial}</td>;
      case "category":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{background: catBadge.bg, color: catBadge.color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
              {catBadge.label}
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
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{(b.currentWeight || 0).toFixed(2)} kg</div>
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
      case "currentLocation":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem"}}>
            <div
              style={{display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer"}}
              onClick={(e) => {
                e.stopPropagation();
                if (b.locationType === "van") router.push(`/admin/vans?engineer=${b.locationId}`);
                else if (b.locationType === "office") router.push("/admin/stores");
                else if (b.locationType === "site") router.push("/admin/onsite");
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {getLocIcon(b.locationType)}
              <span style={{color: "#00e5ff", fontWeight: 500}}>{getLocDisplay(b)}</span>
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
      case "registered":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}</td>;
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
      default: return null;
    }
  }

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Building2 size={28} /> Bottles By Supplier
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>All bottles grouped and filtered by supplier</p>
      </div>

      <div style={{display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap", alignItems: "flex-end"}}>
        <div>
          <label style={{display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: "0.4rem", textTransform: "uppercase"}}>Filter by Supplier:</label>
          <div style={{position: "relative", minWidth: "220px"}}>
            <div 
              onClick={() => setSupplierDropdownOpen(!supplierDropdownOpen)}
              style={{width: "100%", padding: "0.6rem 1rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none"}}
            >
              <FilterIcon size={16} style={{position: "absolute", left: "0.75rem", color: "rgba(255,255,255,0.3)"}} />
              <span style={{overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>
                {supplierFilter.length === 0 ? "All Suppliers" : supplierFilter.length === 1 ? supplierFilter[0] : `${supplierFilter.length} Selected`}
              </span>
              <ArrowUpDown size={14} style={{opacity: 0.5}} />
            </div>
            
            {supplierDropdownOpen && (
              <div style={{position: "absolute", top: "100%", left: 0, right: 0, marginTop: "0.5rem", background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.5rem", zIndex: 50, maxHeight: "250px", overflowY: "auto", boxShadow: "0 10px 25px rgba(0,0,0,0.5)"}}>
                <label style={{display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.5rem", cursor: "pointer", borderRadius: "4px", fontSize: "0.85rem", color: "#fff"}}>
                  <input type="checkbox" checked={supplierFilter.length === 0} onChange={() => setSupplierFilter([])} />
                  All Suppliers
                </label>
                <div style={{height: "1px", background: "rgba(255,255,255,0.1)", margin: "0.3rem 0"}} />
                {suppliers.map(s => (
                  <label key={s} style={{display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.4rem 0.5rem", cursor: "pointer", borderRadius: "4px", fontSize: "0.85rem", color: "#fff"}}>
                    <input 
                      type="checkbox" 
                      checked={supplierFilter.includes(s)} 
                      onChange={(e) => {
                        if (e.target.checked) setSupplierFilter(prev => [...prev, s]);
                        else setSupplierFilter(prev => prev.filter(x => x !== s));
                      }} 
                    />
                    {s}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{position: "relative", flex: 1, maxWidth: "300px"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input type="text" placeholder="Search serial, gas or supplier..." value={search} onChange={(e) => setSearch(e.target.value)}
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

        <span style={{fontSize: "0.82rem", color: "var(--text-muted)", paddingBottom: "0.6rem"}}>{filtered.length} results</span>
      </div>

      {loading ? (
        <p style={{color: "var(--text-muted)"}}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign: "center", padding: "4rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)"}}>
          <Building2 size={48} style={{opacity: 0.2, marginBottom: "0.75rem"}} />
          <p style={{fontSize: "1.1rem", fontWeight: 600}}>No bottles found</p>
          <p style={{fontSize: "0.85rem"}}>Try adjusting your filter or search terms</p>
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

export default function SupplierInventoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SupplierInventoryContent />
    </Suspense>
  );
}
