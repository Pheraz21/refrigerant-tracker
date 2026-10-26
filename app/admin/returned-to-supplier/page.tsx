"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { db, Bottle, isBottleTrace } from "@/lib/db";
import { Truck, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Filter, Download, Printer, Settings2, Archive, ShieldCheck, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

const COLUMN_DEFS = [
  { key: "serial",      label: "Serial",      required: true },
  { key: "category",    label: "Category"                    },
  { key: "gasType",     label: "Gas Type"                    },
  { key: "capacity",    label: "Capacity"                    },
  { key: "gasInBottle", label: "Gas In Bottle"               },
  { key: "balance",     label: "Balance"                     },
  { key: "returnedBy",  label: "Returned By"                 },
  { key: "returnDate",  label: "Return Date"                 },
  { key: "supplier",    label: "Supplier"                    },
  { key: "poNumber",    label: "PO Number"                   },
  { key: "registered",  label: "Registered"                  },
  { key: "expiry",      label: "Expiry Date"                    },
] as const;

export default function ReturnedToSupplierPage() {
  const router = useRouter();
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [retentionScope, setRetentionScope] = useState<"active_5yr" | "historical_5yr" | "all">("active_5yr");
  const [sortField, setSortField] = useState<keyof Bottle | "">("returnedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [customizerOpen, setCustOpen] = useState(false);

  // Column header filter state
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("returned", COLUMN_DEFS.map(c => c.key));

  const fiveYearsAgo = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 5);
    return d;
  }, []);

  const active5yrCount = useMemo(() => {
    return bottles.filter(b => !b.returnedAt || new Date(b.returnedAt) >= fiveYearsAgo).length;
  }, [bottles, fiveYearsAgo]);

  const historical5yrCount = useMemo(() => {
    return bottles.filter(b => b.returnedAt && new Date(b.returnedAt) < fiveYearsAgo).length;
  }, [bottles, fiveYearsAgo]);

  useEffect(() => {
    db.getAllBottles().then(all => {
      setBottles(all.filter(b => b.status === "returned"));
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

  const distinctVals = useMemo(() => {
    const sets: Record<string, Set<string>> = {
      category: new Set(),
      gasType: new Set(),
      returnedBy: new Set(),
      supplier: new Set()
    };
    for (const b of bottles) {
      if (b.category) sets.category.add(b.category);
      if (b.gasType) sets.gasType.add(b.gasType);
      if (b.returnedBy) sets.returnedBy.add(b.returnedBy);
      if (b.supplier) sets.supplier.add(b.supplier);
    }
    const result: Record<string, string[]> = {};
    for (const k of Object.keys(sets)) result[k] = Array.from(sets[k]).sort();
    return result;
  }, [bottles]);

  const activeColFilters =
    Object.values(colFilters).filter(Boolean).length +
    Object.values(colMultiFilters).filter(v => v.length > 0).length;

  const handleSort = (field: keyof Bottle) => {
    if (sortField === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const SortIcon = ({ field }: { field: keyof Bottle }) => {
    if (sortField !== field) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem", flexShrink: 0}} />;
    return sortOrder === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />;
  };

  function matchTextFilter(key: string, b: Bottle, val: string): boolean {
    if (!val) return true;
    const v = val.toLowerCase().trim();
    switch (key) {
      case "serial":      return b.serial.toLowerCase().includes(v);
      case "capacity":    return (b.initialWeight ?? 0).toFixed(2).includes(v);
      case "gasInBottle": return (isBottleTrace(b) ? "trace" : (b.currentWeight ?? 0).toFixed(2)).includes(v);
      case "balance":     return ((b.initialWeight ?? 0) - (b.currentWeight ?? 0)).toFixed(2).includes(v);
      case "returnDate":  return b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "poNumber":    return (b.poNumber || "").toLowerCase().includes(v);
      case "registered":  return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "expiry":      return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      default:            return true;
    }
  }

  function matchMultiFilter(key: string, b: Bottle, vals: string[]): boolean {
    if (!vals || vals.length === 0) return true;
    switch (key) {
      case "category":   return vals.includes(b.category);
      case "gasType":    return vals.includes(b.gasType);
      case "returnedBy": return vals.includes(b.returnedBy || "");
      case "supplier":   return vals.includes(b.supplier || "");
      default:           return true;
    }
  }

  const filteredBottles = bottles
    .filter(b => {
      // Retention scope filter (Statutory active <= 5 years vs Historical vault > 5 years)
      if (b.returnedAt) {
        const isOver5 = new Date(b.returnedAt) < fiveYearsAgo;
        if (retentionScope === "active_5yr" && isOver5) return false;
        if (retentionScope === "historical_5yr" && !isOver5) return false;
      } else if (retentionScope === "historical_5yr") {
        return false;
      }

      if (search) {
        const s = search.toLowerCase();
        const match = b.serial.toLowerCase().includes(s) ||
          b.supplier?.toLowerCase().includes(s) ||
          b.gasType.toLowerCase().includes(s) ||
          b.category.toLowerCase().includes(s) ||
          b.returnedBy?.toLowerCase().includes(s);
        if (!match) return false;
      }
      if (dateFrom && b.returnedAt) {
        const returnDate = new Date(b.returnedAt);
        const filterDate = new Date(dateFrom);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        if (returnDate < filterDate || returnDate > today) return false;
      }
      return true;
    })
    .filter(b => Object.entries(colFilters).every(([k, v]) => matchTextFilter(k, b, v)))
    .filter(b => Object.entries(colMultiFilters).every(([k, v]) => matchMultiFilter(k, b, v)))
    .sort((a, b) => {
      if (!sortField) return 0;
      const valA = a[sortField] || "";
      const valB = b[sortField] || "";
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

  const handleExportCSV = () => {
    const headers = ["Serial", "Category", "Gas Type", "Supplier", "Returned By", "Return Date"];
    const rows = filteredBottles.map(b => [
      b.serial, b.category, b.gasType,
      b.supplier || "",
      b.returnedBy || "",
      b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : ""
    ]);
    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `returned_supplier_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCellText = (key: string, b: Bottle): string => {
    const isNitrogen = b.category === "nitrogen";
    switch (key) {
      case "serial": return b.serial || "—";
      case "category": return b.category === "reclaim" ? "Reclaim / Haz" : b.category === "recycled" ? "Recycled" : b.category === "new" ? "New" : b.category === "nitrogen" ? "Nitrogen" : (b.category || "—");
      case "gasType": return b.gasType || "—";
      case "capacity": return `${(b.initialWeight || 0).toFixed(2)} kg`;
      case "gasInBottle": return isNitrogen ? "N/A" : isBottleTrace(b) ? "Trace" : `${(b.currentWeight || 0).toFixed(2)} kg`;
      case "balance": {
        if (isNitrogen) return "N/A";
        const bal = Math.max(0, (b.initialWeight || 0) - (b.currentWeight || 0));
        return `${bal.toFixed(2)} kg`;
      }
      case "returnedBy": return b.returnedBy || "—";
      case "returnDate": return b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : "—";
      case "supplier": return b.supplier || "—";
      case "poNumber": return b.poNumber || "—";
      case "registered": return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—";
      case "expiry": return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—";
      default: return "—";
    }
  };

  const handlePrint = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = dateFrom ? `From: ${new Date(dateFrom).toLocaleDateString("en-GB")} To: Present` : "Full History";

    const colMap = new Map<string, string>(COLUMN_DEFS.map(c => [c.key, c.label]));
    const thCols = visibleCols.map(c => `<th>${colMap.get(c) || c}</th>`).join("");

    const rows = filteredBottles.map(b => `
      <tr>
        ${visibleCols.map(c => `<td>${getCellText(c, b)}</td>`).join("")}
      </tr>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Supplier Return Report - 21 Degrees</title>
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
            <div class="report-title">Supplier Return Report</div>
            <div class="report-meta">
              <div><strong>Generated:</strong> ${reportDate}</div>
              <div><strong>Coverage:</strong> ${dateRange}</div>
              <div><strong>Total Records:</strong> ${filteredBottles.length}</div>
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
            <div style={labelStyle} onClick={() => handleSort("serial")}>Serial <SortIcon field="serial" /></div>
            {textFilter("serial")}
          </th>
        );
      case "category":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("category")}>Category <SortIcon field="category" /></div>
            {multiSelect("category", distinctVals.category || [])}
          </th>
        );
      case "gasType":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("gasType")}>Gas Type <SortIcon field="gasType" /></div>
            {multiSelect("gasType", distinctVals.gasType || [])}
          </th>
        );
      case "capacity":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon field="initialWeight" /></div>
            {textFilter("capacity", "e.g. 10.00")}
          </th>
        );
      case "gasInBottle":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>Gas In Bottle</div>
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
            <div style={labelStyle} onClick={() => handleSort("returnedBy")}>Returned By <SortIcon field="returnedBy" /></div>
            {multiSelect("returnedBy", distinctVals.returnedBy || [])}
          </th>
        );
      case "returnDate":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("returnedAt")}>Return Date <SortIcon field="returnedAt" /></div>
            {textFilter("returnDate", "e.g. Jan 2026")}
          </th>
        );
      case "supplier":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("supplier")}>Supplier <SortIcon field="supplier" /></div>
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
            <div style={labelStyle} onClick={() => handleSort("registeredAt")}>Registered <SortIcon field="registeredAt" /></div>
            {textFilter("registered", "e.g. Jan 2026")}
          </th>
        );
      case "expiry":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon field="rentalExpiryDate" /></div>
            {textFilter("expiry", "e.g. Dec 2026")}
          </th>
        );
      default:
        return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const isNitrogen = b.category === "nitrogen";
    const isReclaim = b.category === "reclaim";
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
        return <td key={key} style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "var(--primary)", fontSize: "0.9rem"}}>{b.serial}</td>;
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
            <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>{isNitrogen ? "Full Weight" : "Full Charge"}</div>
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
      case "returnedBy":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.returnedBy || "—"}</td>;
      case "returnDate": {
        const isOver5 = b.returnedAt && new Date(b.returnedAt) < fiveYearsAgo;
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>
            {b.returnedAt ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.2rem" }}>
                  <span style={{ fontWeight: 600, color: "#fff" }}>{new Date(b.returnedAt).toLocaleDateString("en-GB")}</span>
                  {isOver5 ? (
                    <span style={{ fontSize: "0.68rem", color: "#10b981", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>
                      ✓ 5-Yr Fulfilled
                    </span>
                  ) : (
                    <span style={{ fontSize: "0.68rem", color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 600 }}>
                      Active Retention
                    </span>
                  )}
                </div>
                <div style={{fontSize: "0.72rem", color: "rgba(255,255,255,0.4)"}}>
                  {new Date(b.returnedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ) : "—"}
          </td>
        );
      }
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
      <div className="no-print" style={{marginBottom: "1.5rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Truck size={28} /> Returned to Supplier
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>All cylinders returned to suppliers — including refrigerant, nitrogen, and waste reclaim</p>
      </div>

      {/* Retention Lifecycle Segment Tabs */}
      <div className="no-print" style={{ display: "flex", gap: "0.6rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setRetentionScope("active_5yr")}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "8px",
            border: `1.5px solid ${retentionScope === "active_5yr" ? "#00e5ff" : "rgba(255,255,255,0.1)"}`,
            background: retentionScope === "active_5yr" ? "rgba(0,229,255,0.12)" : "rgba(255,255,255,0.03)",
            color: retentionScope === "active_5yr" ? "#00e5ff" : "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s"
          }}
        >
          <ShieldCheck size={16} />
          Active Statutory Retention (≤ 5 Years)
          <span style={{ fontSize: "0.75rem", background: "rgba(0,229,255,0.25)", color: "#fff", padding: "0.1rem 0.45rem", borderRadius: "10px", fontWeight: 700 }}>
            {active5yrCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRetentionScope("historical_5yr")}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "8px",
            border: `1.5px solid ${retentionScope === "historical_5yr" ? "#10b981" : "rgba(255,255,255,0.1)"}`,
            background: retentionScope === "historical_5yr" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
            color: retentionScope === "historical_5yr" ? "#10b981" : "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s"
          }}
        >
          <Archive size={16} />
          Historical Vault (&gt; 5 Years Retention Fulfilled)
          <span style={{ fontSize: "0.75rem", background: "rgba(16,185,129,0.25)", color: "#fff", padding: "0.1rem 0.45rem", borderRadius: "10px", fontWeight: 700 }}>
            {historical5yrCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRetentionScope("all")}
          style={{
            padding: "0.55rem 1.1rem",
            borderRadius: "8px",
            border: `1.5px solid ${retentionScope === "all" ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)"}`,
            background: retentionScope === "all" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
            color: retentionScope === "all" ? "#fff" : "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: "0.85rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "all 0.15s"
          }}
        >
          All Returns Ledger
          <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.15)", color: "#fff", padding: "0.1rem 0.45rem", borderRadius: "10px", fontWeight: 700 }}>
            {bottles.length}
          </span>
        </button>
      </div>

      <div className="no-print" style={{
        display: "flex", gap: "1rem", marginBottom: "2rem",
        background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)", alignItems: "center", flexWrap: "wrap"
      }}>
        <div style={{position: "relative", flex: "1", minWidth: "250px"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input
            type="text" placeholder="Search serial, supplier, category..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            style={{width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box"}}
          />
        </div>

        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <span style={{fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem"}}>
            <Filter size={14} /> Since:
          </span>
          <div style={{position: "relative"}}>
            <Calendar size={14} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--primary)", pointerEvents: "none"}} />
            <input
              type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{padding: "0.5rem 0.75rem 0.5rem 2.2rem", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", colorScheme: "dark", outline: "none"}}
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

        <div style={{display: "flex", gap: "0.5rem", marginLeft: activeColFilters > 0 ? "0" : "auto"}}>
          <button
            onClick={handleExportCSV}
            style={{display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", color: "#22c55e", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer"}}
          >
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={handlePrint}
            style={{display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer"}}
          >
            <Printer size={16} /> Print PDF
          </button>
          <button
            onClick={() => setCustOpen(true)}
            style={{display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "rgba(255,255,255,0.7)", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer"}}
          >
            <Settings2 size={16} /> Columns
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{color: "var(--text-muted)"}}>Loading...</p>
      ) : (
        <div className="printable-content">
          <div className="no-print" style={{display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem"}}>
            <span style={{fontSize: "0.85rem", color: "var(--text-muted)"}}>Showing {filteredBottles.length} records</span>
          </div>
          <DoubleScrollContainer wrapStyle={{ borderRadius: "12px", background: "rgba(255,255,255,0.02)" }}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.04)"}}>
                  {visibleCols.map(key => renderHeader(key))}
                </tr>
              </thead>
              <tbody>
                {filteredBottles.map(b => (
                  <tr key={b.serial}
                    style={{borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s", cursor: "pointer"}}
                    onClick={() => router.push(`/admin/bottles/${b.serial}`)}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {visibleCols.map(key => renderCell(key, b))}
                  </tr>
                ))}
                {filteredBottles.length === 0 && (
                  <tr><td colSpan={visibleCols.length} style={{padding: "3rem", textAlign: "center", color: "var(--text-muted)"}}>No records found</td></tr>
                )}
              </tbody>
            </table>
          </DoubleScrollContainer>
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
