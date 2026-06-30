"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { db, Bottle } from "@/lib/db";
import { Warehouse, ArrowUpDown, ArrowUp, ArrowDown, Search, Calendar, Filter as FilterIcon, FileText, FileSpreadsheet, Settings2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "returnedBy" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate";

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
  { key: "poNumber",     label: "PO Number"                   },
  { key: "registered",   label: "Registered"                  },
  { key: "expiry",       label: "Expiry Date"                 },
] as const;

// Columns that use multi-select checkboxes vs text input
const MULTI_SELECT_COLS = new Set(["category", "gasType", "supplier", "returnedBy"]);

export default function StoresInventoryPage() {
  const router = useRouter();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [engineers, setEngineers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sinceDate, setSinceDate] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("locationChangedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [customizerOpen, setCustOpen] = useState(false);

  // Text filters (partial match)
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  // Multi-select filters: colKey -> array of selected values (empty = no filter)
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("stores", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    Promise.all([
      db.getBottlesByLocation("office"),
      db.getEngineerProfiles(),
    ]).then(([b, e]) => {
      setBottles(b);
      setEngineers(e);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Close dropdown on outside click — check the ref so clicks inside don't close it
  useEffect(() => {
    if (!openDropdown) return;
    const close = (e: MouseEvent) => {
      const el = dropdownRefs.current[openDropdown];
      if (el && el.contains(e.target as Node)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openDropdown]);

  const distinctVals = useMemo(() => {
    const sets: Record<string, Set<string>> = {
      category: new Set(), gasType: new Set(), supplier: new Set(), returnedBy: new Set()
    };
    for (const b of bottles) {
      if (b.category) sets.category.add(b.category);
      if (b.gasType) sets.gasType.add(b.gasType);
      if (b.supplier) sets.supplier.add(b.supplier);
      if (b.returnedBy) sets.returnedBy.add(b.returnedBy);
    }
    const result: Record<string, string[]> = {};
    for (const k of Object.keys(sets)) result[k] = Array.from(sets[k]).sort();
    return result;
  }, [bottles]);

  const activeColFilters =
    Object.values(colFilters).filter(Boolean).length +
    Object.values(colMultiFilters).filter(v => v.length > 0).length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem", flexShrink: 0}} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />;
  };

  function matchTextFilter(key: string, b: Bottle, val: string): boolean {
    if (!val) return true;
    const v = val.toLowerCase().trim();
    switch (key) {
      case "serial":       return b.serial.toLowerCase().includes(v);
      case "capacity":     return (b.initialWeight ?? 0).toFixed(2).includes(v);
      case "gasInBottle":  return (b.currentWeight ?? 0).toFixed(2).includes(v);
      case "balance":      return ((b.initialWeight ?? 0) - (b.currentWeight ?? 0)).toFixed(2).includes(v);
      case "dateReceived": return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "poNumber":     return (b.poNumber || "").toLowerCase().includes(v);
      case "registered":   return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "expiry":       return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      default:             return true;
    }
  }

  function matchMultiFilter(key: string, b: Bottle, vals: string[]): boolean {
    if (!vals || vals.length === 0) return true;
    switch (key) {
      case "category":   return vals.includes(b.category);
      case "gasType":    return vals.includes(b.gasType);
      case "supplier":   return vals.includes(b.supplier || "");
      case "returnedBy": return vals.includes(b.returnedBy || "");
      default:           return true;
    }
  }

  const filtered = bottles
    .filter(b => !search || b.serial.toLowerCase().includes(search.toLowerCase()) || b.gasType.toLowerCase().includes(search.toLowerCase()) || (b.returnedBy || "").toLowerCase().includes(search.toLowerCase()))
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.locationChangedAt || b.registeredAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    })
    .filter(b => Object.entries(colFilters).every(([k, v]) => matchTextFilter(k, b, v)))
    .filter(b => Object.entries(colMultiFilters).every(([k, v]) => matchMultiFilter(k, b, v)))
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
    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none", whiteSpace: "nowrap",
    verticalAlign: "top"
  };

  const filterInputStyle: React.CSSProperties = {
    width: "100%", padding: "0.22rem 0.45rem", marginTop: "0.4rem",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px", color: "#fff", fontSize: "0.7rem", outline: "none",
    boxSizing: "border-box", fontWeight: 400, textTransform: "none", letterSpacing: "normal"
  };

  const optionLabel = (k: string, o: string) => {
    if (k === "category") {
      return o === "reclaim" ? "Reclaim / Haz" : o === "new" ? "New" : "N₂ (Nitrogen)";
    }
    return o || "(none)";
  };

  const setCol = (k: string, v: string) => setColFilters(f => ({ ...f, [k]: v }));

  function textFilter(k: string, ph = "Filter…") {
    return (
      <input
        type="text"
        value={colFilters[k] || ""}
        onChange={e => setCol(k, e.target.value)}
        onClick={e => e.stopPropagation()}
        placeholder={ph}
        style={{
          ...filterInputStyle,
          borderColor: colFilters[k] ? "rgba(0,229,255,0.45)" : "rgba(255,255,255,0.1)"
        }}
      />
    );
  }

  function multiSelect(k: string, opts: string[]) {
    const selected = colMultiFilters[k] || [];
    const isOpen = openDropdown === k;
    const hasFilter = selected.length > 0;

    const toggleVal = (o: string) => {
      setColMultiFilters(f => {
        const cur = f[k] || [];
        const next = cur.includes(o) ? cur.filter(v => v !== o) : [...cur, o];
        return { ...f, [k]: next };
      });
    };

    const toggleAll = () => {
      setColMultiFilters(f => ({
        ...f,
        [k]: selected.length === opts.length ? [] : [...opts]
      }));
    };

    return (
      <div
        ref={el => { dropdownRefs.current[k] = el; }}
        style={{ position: "relative", marginTop: "0.4rem" }}
      >
        <div
          onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : k); }}
          style={{
            padding: "0.22rem 0.6rem 0.22rem 0.45rem",
            background: hasFilter ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${hasFilter ? "rgba(0,229,255,0.45)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "4px",
            color: hasFilter ? "#00e5ff" : "rgba(255,255,255,0.35)",
            fontSize: "0.7rem", cursor: "pointer", userSelect: "none",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem",
            fontWeight: hasFilter ? 700 : 400, textTransform: "none", letterSpacing: "normal",
            minWidth: "80px"
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.length === 0
              ? "All"
              : selected.length === 1
                ? optionLabel(k, selected[0])
                : `${selected.length} selected`}
          </span>
          <span style={{ opacity: 0.55, flexShrink: 0 }}>{isOpen ? "▴" : "▾"}</span>
        </div>

        {isOpen && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 3px)", left: 0, zIndex: 300,
              background: "#0d1422", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px", minWidth: "170px", maxHeight: "220px", overflowY: "auto",
              boxShadow: "0 8px 28px rgba(0,0,0,0.6)"
            }}
          >
            <div
              onClick={toggleAll}
              style={{
                padding: "0.4rem 0.75rem", fontSize: "0.7rem",
                color: "rgba(255,255,255,0.45)", cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.04em"
              }}
            >
              {selected.length === opts.length ? "Clear all" : "Select all"}
            </div>
            {opts.map(o => {
              const checked = selected.includes(o);
              return (
                <label
                  key={o}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.45rem 0.75rem", cursor: "pointer",
                    fontSize: "0.78rem",
                    color: checked ? "#fff" : "rgba(255,255,255,0.65)",
                    background: checked ? "rgba(0,229,255,0.06)" : "transparent",
                    transition: "background 0.1s"
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = "transparent"; }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVal(o)}
                    style={{ accentColor: "#00e5ff", flexShrink: 0 }}
                  />
                  {optionLabel(k, o)}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const exportBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.85rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
    transition: "all 0.15s"
  };

  const exportCSV = () => {
    const header = "Serial,Category,Gas Type,Capacity,Current,Supplier,Registered,Returned By,Date Received\n";
    const rows = filtered.map(b => `${b.serial},${b.category},${b.gasType},${b.initialWeight ?? 0},${b.currentWeight ?? 0},${b.supplier},${b.registeredAt},${b.returnedBy},${b.locationChangedAt}`).join("\n");
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
            <div class="report-title">Stores Inventory Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filtered.length} Bottles</div></div>
          </div>
        </div>
        <table><thead><tr><th>Serial</th><th>Gas</th><th>Capacity</th><th>Current</th><th>Supplier</th><th>Returned By</th><th>Date Received</th></tr></thead>
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
    const labelStyle: React.CSSProperties = {
      display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "0.1rem"
    };
    const labelStyleNoSort: React.CSSProperties = {
      display: "flex", alignItems: "center", marginBottom: "0.1rem", cursor: "default"
    };

    switch (key) {
      case "serial":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></div>
            {textFilter("serial")}
          </th>
        );
      case "category":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></div>
            {multiSelect("category", distinctVals.category || [])}
          </th>
        );
      case "gasType":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></div>
            {multiSelect("gasType", distinctVals.gasType || [])}
          </th>
        );
      case "capacity":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></div>
            {textFilter("capacity", "e.g. 10.00")}
          </th>
        );
      case "gasInBottle":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></div>
            {textFilter("gasInBottle", "e.g. 8.50")}
          </th>
        );
      case "balance":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>Balance</div>
            {textFilter("balance", "e.g. 1.50")}
          </th>
        );
      case "returnedBy":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("returnedBy")}>Returned By <SortIcon col="returnedBy" /></div>
            {multiSelect("returnedBy", distinctVals.returnedBy || [])}
          </th>
        );
      case "dateReceived":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationChangedAt")}>Date Received <SortIcon col="locationChangedAt" /></div>
            {textFilter("dateReceived", "e.g. Jun 2026")}
          </th>
        );
      case "supplier":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></div>
            {multiSelect("supplier", distinctVals.supplier || [])}
          </th>
        );
      case "poNumber":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>PO Number</div>
            {textFilter("poNumber")}
          </th>
        );
      case "registered":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></div>
            {textFilter("registered", "e.g. Jan 2026")}
          </th>
        );
      case "expiry":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></div>
            {textFilter("expiry", "e.g. Dec 2026")}
          </th>
        );
      default:
        return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const badge = getCatBadge(b.category);
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const iw = b.initialWeight ?? 0;
    const cw = b.currentWeight ?? 0;
    const balance = iw - cw;
    const percent = iw > 0 ? Math.min(100, Math.max(0, (cw / iw) * 100)) : 0;

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
            <div style={{fontWeight: 600}}>{iw.toFixed(2)} kg</div>
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
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{cw.toFixed(2)} kg</div>
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
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            {b.returnedBy ? (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  const eng = engineers.find((u: any) => u.name === b.returnedBy);
                  router.push(`/admin/vans?engineer=${eng ? eng.id : b.returnedBy}`);
                }}
                style={{cursor: "pointer", color: "#00e5ff", fontWeight: 500}}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
              >
                {b.returnedBy}
              </span>
            ) : "—"}
          </td>
        );
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
      case "poNumber":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.poNumber ? "rgba(255,255,255,0.75)" : "var(--text-muted)"}}>{b.poNumber || "—"}</td>;
      case "registered":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}</td>;
      case "expiry":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;
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

        {activeColFilters > 0 && (
          <button
            onClick={() => { setColFilters({}); setColMultiFilters({}); }}
            style={{
              display: "flex", alignItems: "center", gap: "0.35rem",
              padding: "0.45rem 0.85rem", borderRadius: "6px",
              border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)",
              color: "#00e5ff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
            }}
          >
            <X size={14} /> Clear {activeColFilters} column filter{activeColFilters !== 1 ? "s" : ""}
          </button>
        )}

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
