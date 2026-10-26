"use client";

import { useEffect, useState, useRef, useMemo, Suspense } from "react";
import { db, Bottle, isBottleTrace } from "@/lib/db";
import { Building2, Search, MapPin, Truck, Warehouse, ArrowUpDown, ArrowUp, ArrowDown, Filter as FilterIcon, Calendar, FileText, FileSpreadsheet, Settings2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "status" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate";

const COLUMN_DEFS = [
  { key: "serial",          label: "Serial",          required: true },
  { key: "category",        label: "Category"                        },
  { key: "gasType",         label: "Gas Type"                        },
  { key: "capacity",        label: "Capacity"                        },
  { key: "gasInBottle",     label: "Gas In Bottle"                   },
  { key: "balance",         label: "Balance"                         },
  { key: "currentLocation", label: "Current Location"                },
  { key: "supplier",        label: "Supplier"                        },
  { key: "poNumber",        label: "PO Number"                       },
  { key: "registered",      label: "Registered"                      },
  { key: "expiry",      label: "Expiry Date"                    },
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

  // Column header filter state
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const suppliers = Array.from(new Set(bottles.map(b => b.supplier).filter((s): s is string => Boolean(s)))).sort();

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
      currentLocation: new Set(),
      supplier: new Set(),
      status: new Set()
    };
    for (const b of bottles) {
      if (b.category) sets.category.add(b.category);
      if (b.gasType) sets.gasType.add(b.gasType);
      const loc = getLocDisplay(b);
      if (loc) sets.currentLocation.add(loc);
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
      case "serial":      return b.serial.toLowerCase().includes(v);
      case "capacity":    return (b.initialWeight ?? 0).toFixed(2).includes(v);
      case "gasInBottle": return (b.currentWeight ?? 0).toFixed(2).includes(v);
      case "balance":     return ((b.initialWeight ?? 0) - (b.currentWeight ?? 0)).toFixed(2).includes(v);
      case "poNumber":    return (b.poNumber || "").toLowerCase().includes(v);
      case "registered":  return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "expiry":      return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "lastChanged": return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      default:            return true;
    }
  }

  function matchMultiFilter(key: string, b: Bottle, vals: string[]): boolean {
    if (!vals || vals.length === 0) return true;
    switch (key) {
      case "category":        return vals.includes(b.category);
      case "gasType":         return vals.includes(b.gasType);
      case "currentLocation": return vals.includes(getLocDisplay(b));
      case "supplier":        return vals.includes(b.supplier || "");
      case "status":          return vals.includes(b.status || "");
      default:                return true;
    }
  }

  const filtered = bottles
    .filter(b => b.status !== "returned")
    .filter(b => supplierFilter.length === 0 || (b.supplier && supplierFilter.includes(b.supplier)))
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.registeredAt || b.locationChangedAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    })
    .filter(b => !search || b.serial.toLowerCase().includes(search.toLowerCase()) || b.gasType.toLowerCase().includes(search.toLowerCase()) || b.supplier?.toLowerCase().includes(search.toLowerCase()))
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
      return o === "trace" ? "Trace" : o === "unused" ? "Unused" : o === "active" ? "Active" : o === "returned" ? "Returned" : o === "archived" ? "Archived" : o === "full" ? "Full" : o === "empty" ? "Empty" : o === "recycled" ? "Recycled" : o;
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
    const header = "Serial,Supplier,Category,Gas Type,Capacity,Current,Location,Status,Registered\n";
    const rows = filtered.map(b => `${b.serial},${b.supplier},${b.category},${b.gasType},${b.initialWeight},${b.currentWeight},${b.locationId},${b.status},${b.registeredAt}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getCellText = (key: string, b: Bottle): string => {
    const isNitrogen = b.category === "nitrogen";
    switch (key) {
      case "serial": return b.serial || "—";
      case "category": return b.category === "reclaim" ? "Reclaim / Haz" : b.category === "recycled" ? "Recycled" : b.category === "new" ? "New" : b.category === "nitrogen" ? "Nitrogen" : (b.category || "—");
      case "gasType": return b.gasType || "—";
      case "capacity": return `${(b.initialWeight || 0).toFixed(2)} kg`;
      case "gasInBottle": return isNitrogen ? "N/A" : `${(b.currentWeight || 0).toFixed(2)} kg`;
      case "balance": {
        if (isNitrogen) return "N/A";
        const bal = Math.max(0, (b.initialWeight || 0) - (b.currentWeight || 0));
        return `${bal.toFixed(2)} kg`;
      }
      case "currentLocation": return getLocDisplay(b) || "—";
      case "supplier": return b.supplier || "—";
      case "poNumber": return b.poNumber || "—";
      case "registered": return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—";
      case "expiry": return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—";
      case "status": return isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unused" : b.status ? (b.status.charAt(0).toUpperCase() + b.status.slice(1)) : "—";
      case "lastChanged": return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—";
      default: return "—";
    }
  };

  const exportPDF = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = sinceDate ? `From: ${new Date(sinceDate).toLocaleDateString("en-GB")} To: Present` : "Full History";

    const colMap = new Map<string, string>(COLUMN_DEFS.map(c => [c.key, c.label]));
    const thCols = visibleCols.map(c => `<th>${colMap.get(c) || c}</th>`).join("");

    const rows = filtered.map(b => `
      <tr>
        ${visibleCols.map(c => `<td>${getCellText(c, b)}</td>`).join("")}
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Bottles By Supplier Report - 21 Degrees</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm 8mm 10mm 8mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1a1a1a;
            font-size: 8pt;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 10px;
          }
          .logo-section {
            display: flex;
            gap: 12px;
            align-items: center;
          }
          .logo-section img {
            width: 110px;
            height: auto;
          }
          .company-info {
            font-size: 7.5pt;
            line-height: 1.35;
            color: #444;
          }
          .report-info {
            text-align: right;
          }
          .report-title {
            font-size: 15pt;
            font-weight: 800;
            letter-spacing: 0.5px;
            color: #000;
            text-transform: uppercase;
            margin-bottom: 3px;
          }
          .report-meta {
            font-size: 8pt;
            color: #555;
            line-height: 1.4;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 6px;
            page-break-inside: auto;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          th {
            background-color: #f1f3f5;
            color: #212529;
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            border: 1px solid #ced4da;
            padding: 5px 6px;
            text-align: left;
            white-space: nowrap;
          }
          td {
            border: 1px solid #dee2e6;
            padding: 4px 6px;
            font-size: 7.5pt;
            line-height: 1.25;
            color: #212529;
          }
          tbody tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          .footer {
            margin-top: 10px;
            font-size: 7pt;
            color: #888;
            text-align: center;
            border-top: 1px solid #ddd;
            padding-top: 6px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" alt="21 Degrees" />
            <div class="company-info">
              <strong>21 Degrees Ltd</strong><br/>
              Unit 10, Apollo Court, Monkton Business Park<br/>
              Hebburn, Tyne & Wear, NE31 2ES<br/>
              Tel: 0191 495 7224
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">Bottles By Supplier Report</div>
            <div class="report-meta">
              <div><strong>Generated:</strong> ${reportDate}</div>
              <div><strong>Coverage:</strong> ${dateRange}</div>
              <div><strong>Total Bottles:</strong> ${filtered.length}</div>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>${thCols}</tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
        <div class="footer">
          21 Degrees F-Gas Tracker Pro &bull; Official Audit Document &bull; &copy; ${new Date().getFullYear()} 21 Degrees Ltd
        </div>
      </body>
      </html>
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
      case "currentLocation":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationId")}>Current Location <SortIcon col="locationId" /></div>
            {multiSelect("currentLocation", distinctVals.currentLocation || [])}
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
      default:
        return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const balance = (b.initialWeight || 0) - (b.currentWeight || 0);
    const percent = Math.min(100, Math.max(0, ((b.currentWeight || 0) / (b.initialWeight || 1)) * 100));
    const catBadge = isReclaim
      ? { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" }
      : b.category === "recycled"
      ? { bg: "rgba(16,185,129,0.12)", color: "#10b981", label: "Recycled" }
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
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{isBottleTrace(b) ? "Trace" : `${(b.currentWeight || 0).toFixed(2)} kg`}</div>
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
              background: isBottleTrace(b) ? "rgba(255,170,0,0.12)" : b.status === "unused" ? "rgba(0,229,255,0.12)" : b.status === "active" ? "rgba(34,197,94,0.12)" : b.status === "returned" ? "rgba(168,85,247,0.12)" : b.status === "archived" ? "rgba(239,68,68,0.12)" : b.status === "full" ? "rgba(59,130,246,0.12)" : b.status === "recycled" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
              color: isBottleTrace(b) ? "#ffaa00" : b.status === "unused" ? "#00e5ff" : b.status === "active" ? "#22c55e" : b.status === "returned" ? "#a855f7" : b.status === "archived" ? "#ef4444" : b.status === "full" ? "#3b82f6" : b.status === "recycled" ? "#10b981" : "rgba(255,255,255,0.5)"
            }}>{isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unused" : (b.status || "Active")}</span>
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
            <X size={14} /> Clear {activeColFilters} filter{activeColFilters !== 1 ? "s" : ""}
          </button>
        )}

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

export default function SupplierInventoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SupplierInventoryContent />
    </Suspense>
  );
}
