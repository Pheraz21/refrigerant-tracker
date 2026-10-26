"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { db, Bottle, isBottleTrace } from "@/lib/db";
import { Package, Search, MapPin, Truck, Warehouse, Building2, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Filter as FilterIcon, FileText, FileSpreadsheet, Edit2, Trash2, Plus, Settings2, Archive, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
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
  { key: "recycled", label: "Recycled Bottle" },
  { key: "reclaim", label: "Reclaim / Haz" },
  { key: "nitrogen", label: "Nitrogen" },
];

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "status" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate" | "intendedDestination" | "activeHWCN";

const COLUMN_DEFS = [
  { key: "serial",              label: "Serial",                required: true  },
  { key: "category",            label: "Category"                               },
  { key: "gasType",             label: "Gas Type"                               },
  { key: "capacity",            label: "Capacity"                               },
  { key: "gasInBottle",         label: "Gas In Bottle"                          },
  { key: "balance",             label: "Balance"                                },
  { key: "location",            label: "Location"                               },
  { key: "intendedDestination", label: "Intended Destination"                   },
  { key: "activeHWCN",          label: "Active HWCN #"                          },
  { key: "supplier",            label: "Supplier"                               },
  { key: "poNumber",            label: "PO Number"                              },
  { key: "registered",          label: "Registered"                             },
  { key: "expiry",              label: "Expiry Date"                            },
  { key: "status",              label: "Status"                                 },
  { key: "lastChanged",         label: "Last Changed"                           },
  { key: "actions",             label: "Actions",               required: true  },
] as const;

export default function AllBottlesPage() {
  const router = useRouter();
  const { user } = useAuth();
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

  // Column header filter state
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Close dropdown on outside click
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

  const getLocDisplay = (b: Bottle) => {
    if (b.locationType === "van") {
      const idOrName = b.locationId.replace(" - Van", "");
      const user = engineers.find(e => e.id === idOrName || e.name === idOrName);
      return `Van - ${user ? user.name : idOrName}`;
    }
    return b.locationId || b.locationType;
  };

  const distinctVals = useMemo(() => {
    const sets: Record<string, Set<string>> = {
      category: new Set(),
      gasType: new Set(),
      location: new Set(),
      supplier: new Set(),
      status: new Set()
    };
    for (const b of bottles) {
      if (b.category) sets.category.add(b.category);
      if (b.gasType) sets.gasType.add(b.gasType);
      const loc = getLocDisplay(b);
      if (loc) sets.location.add(loc);
      if (b.supplier) sets.supplier.add(b.supplier);
      if (b.status) sets.status.add(b.status);
    }
    const result: Record<string, string[]> = {};
    for (const k of Object.keys(sets)) result[k] = Array.from(sets[k]).sort();
    return result;
  }, [bottles, engineers]);

  const activeColFilters =
    Object.values(colFilters).filter(Boolean).length +
    Object.values(colMultiFilters).filter(v => v.length > 0).length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
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
      case "poNumber":     return (b.poNumber || "").toLowerCase().includes(v);
      case "intendedDestination": return (b.intendedDestination || "").toLowerCase().includes(v);
      case "activeHWCN":   return (b.activeHWCN || "").toLowerCase().includes(v);
      case "registered":   return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "expiry":       return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "lastChanged":  return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      default:             return true;
    }
  }

  function matchMultiFilter(key: string, b: Bottle, vals: string[]): boolean {
    if (!vals || vals.length === 0) return true;
    switch (key) {
      case "category": return vals.includes(b.category);
      case "gasType":  return vals.includes(b.gasType);
      case "location": return vals.includes(getLocDisplay(b));
      case "supplier": return vals.includes(b.supplier || "");
      case "status":   return vals.includes(b.status || "");
      default:         return true;
    }
  }

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
    switch (cat) {
      case "reclaim": return "#ffaa00";
      case "new": return "#00e5ff";
      case "recycled": return "#10b981";
      default: return "rgba(255,255,255,0.5)";
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
      return o === "reclaim" ? "Reclaim / Haz" : o === "new" ? "New" : o === "recycled" ? "Recycled" : "N₂ (Nitrogen)";
    }
    if (k === "status") {
      return o === "trace" ? "Trace" : o === "unused" ? "Unopened" : o === "active" ? "Opened" : o === "returned" ? "Returned" : o === "archived" ? "Archived" : o === "full" ? "Full" : o === "empty" ? "Empty" : o === "recycled" ? "Recycled" : o;
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
    const header = "Serial,Category,Gas Type,Capacity,Current,Location,Intended Destination,Active HWCN #,Status,Supplier,Registered\n";
    const rows = filtered.map(b => `${b.serial},${b.category},${b.gasType},${b.initialWeight},${b.currentWeight},${b.locationId},"${b.intendedDestination || ""}","${b.activeHWCN || ""}",${isBottleTrace(b) ? "Trace" : b.status},${b.supplier},${b.registeredAt}`).join("\n");
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

    const getCellText = (key: string, b: Bottle) => {
      const isNitrogen = b.category === "nitrogen";
      const iw = b.initialWeight ?? 0;
      const cw = b.currentWeight ?? 0;
      const bal = iw - cw;

      switch (key) {
        case "serial": return `<strong>${b.serial}</strong>`;
        case "category": return b.category === "reclaim" ? "Reclaim / Haz" : b.category === "new" ? "New" : b.category === "recycled" ? "Recycled" : "Nitrogen";
        case "gasType": return b.gasType;
        case "capacity": return `${iw.toFixed(2)} kg`;
        case "gasInBottle": return isNitrogen ? "N/A" : `${cw.toFixed(2)} kg`;
        case "balance": return isNitrogen ? "N/A" : `${bal.toFixed(2)} kg`;
        case "location": return getLocDisplay(b);
        case "intendedDestination": return b.intendedDestination || "—";
        case "activeHWCN": return b.activeHWCN || "—";
        case "supplier": return b.supplier || "—";
        case "poNumber": return b.poNumber || "—";
        case "registered": return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—";
        case "expiry": return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—";
        case "status": return isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unopened" : b.status === "active" ? "Opened" : b.status ? b.status.charAt(0).toUpperCase() + b.status.slice(1) : "—";
        case "lastChanged": return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—";
        default: return "—";
      }
    };

    const colsToPrint = visibleCols
      .filter(k => k !== "actions")
      .map(k => ({
        key: k,
        label: COLUMN_DEFS.find(c => c.key === k)?.label || k,
      }));

    const theadHtml = colsToPrint.map(c => `<th>${c.label}</th>`).join("");
    const rows = filtered.map(b => `
      <tr>
        ${colsToPrint.map(c => `<td>${getCellText(c.key, b)}</td>`).join("")}
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html><head><title>All Bottles Inventory Report</title><style>
        @page { size: A4 landscape; margin: 8mm 8mm 10mm 8mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; font-size: 8pt; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
        .logo-section { display: flex; gap: 12px; align-items: center; }
        .company-info { font-size: 8pt; line-height: 1.3; color: #475569; }
        .report-info { text-align: right; }
        .report-title { font-size: 15pt; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; }
        .report-meta { font-size: 8pt; color: #64748b; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; table-layout: auto; }
        thead { display: table-header-group; }
        tr { page-break-inside: avoid; break-inside: avoid; }
        th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; font-size: 7.5pt; word-break: break-word; }
        th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; color: #1e293b; font-size: 7pt; letter-spacing: 0.03em; }
        tr:nth-child(even) { background: #f8fafc; }
        .footer { margin-top: 15px; font-size: 7.5pt; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
      </style></head><body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width:90px;height:auto"/>
            <div class="company-info"><strong>21 Degrees Ltd</strong><br/>Unit 10, Apollo Court, Monkton Business Park<br/>Hebburn, Tyne &amp; Wear, NE31 2ES<br/>Tel: 0191 495 7224</div>
          </div>
          <div class="report-info">
            <div class="report-title">Inventory Report (All Bottles)</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filtered.length} Bottles</div></div>
          </div>
        </div>
        <table><thead><tr>${theadHtml}</tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; ${new Date().getFullYear()} 21 Degrees Ltd</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
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
      case "location":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationId")}>Location <SortIcon col="locationId" /></div>
            {multiSelect("location", distinctVals.location || [])}
          </th>
        );
      case "intendedDestination":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("intendedDestination")}>Intended Destination <SortIcon col="intendedDestination" /></div>
            {textFilter("intendedDestination", "e.g. HQ-Stores")}
          </th>
        );
      case "activeHWCN":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("activeHWCN")}>Active HWCN # <SortIcon col="activeHWCN" /></div>
            {textFilter("activeHWCN", "e.g. HWCN...")}
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
      case "status":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("status")}>Status <SortIcon col="status" /></div>
            {multiSelect("status", distinctVals.status || [])}
          </th>
        );
      case "lastChanged":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationChangedAt")}>Last Changed <SortIcon col="locationChangedAt" /></div>
            {textFilter("lastChanged", "e.g. Jan 2026")}
          </th>
        );
      case "actions":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>Actions</div>
          </th>
        );
      default:
        return null;
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
              {b.category === "new" ? "New" : b.category === "recycled" ? "Recycled" : isReclaim ? "Reclaim" : "N₂"}
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
                  {isBottleTrace(b) ? "Trace" : `${(b.currentWeight || 0).toFixed(2)} kg`}
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
      case "intendedDestination":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.intendedDestination ? "#ffaa00" : "var(--text-muted)", fontWeight: b.intendedDestination ? 600 : 400}}>
            {b.intendedDestination || "—"}
          </td>
        );
      case "activeHWCN":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono)"}}>
            {b.activeHWCN ? (
              <span style={{color: "#ffaa00", background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", padding: "0.15rem 0.45rem", borderRadius: "5px", fontWeight: 700, fontSize: "0.78rem"}}>
                {b.activeHWCN}
              </span>
            ) : (
              <span style={{color: "var(--text-muted)"}}>—</span>
            )}
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
              fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "20px", textTransform: "capitalize",
              background: isBottleTrace(b) ? "rgba(255,170,0,0.12)" : b.status === "unused" ? "rgba(0,229,255,0.12)" : b.status === "active" ? "rgba(34,197,94,0.1)" : b.status === "returned" ? "rgba(168,85,247,0.1)" : b.status === "archived" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.06)",
              color: isBottleTrace(b) ? "#ffaa00" : b.status === "unused" ? "#00e5ff" : b.status === "active" ? "#22c55e" : b.status === "returned" ? "#a855f7" : b.status === "archived" ? "#ef4444" : "rgba(255,255,255,0.5)"
            }}>{isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unopened" : b.status === "active" ? "Opened" : b.status === "archived" ? "Archived" : (b.status || "Opened")}</span>
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
              {b.status !== "archived" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/admin/bottles/${encodeURIComponent(b.serial)}/archive`);
                  }}
                  style={{background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.25)", color: "#f59e0b", padding: "0.4rem", borderRadius: "6px", cursor: "pointer"}}
                  title="Compliance Archive (5-Year Audit Vault)"
                >
                  <Archive size={14} />
                </button>
              )}
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
