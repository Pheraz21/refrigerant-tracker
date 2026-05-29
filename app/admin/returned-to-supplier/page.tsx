"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { Truck, Search, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Filter, Download, Printer, Settings2 } from "lucide-react";
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
  const [sortField, setSortField] = useState<keyof Bottle | "">("returnedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("returned", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    db.getAllBottles().then(all => {
      setBottles(all.filter(b => b.status === "returned"));
      setLoading(false);
    });
  }, []);

  const handleSort = (field: keyof Bottle) => {
    if (sortField === field) setSortOrder(o => o === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortOrder("asc"); }
  };

  const SortIcon = ({ field }: { field: keyof Bottle }) => {
    if (sortField !== field) return <ArrowUpDown size={14} style={{opacity: 0.3}} />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filteredBottles = bottles
    .filter(b => {
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

  const handlePrint = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = dateFrom ? `From: ${new Date(dateFrom).toLocaleDateString("en-GB")} To: Present` : "Full History";
    const rows = filteredBottles.map(b => `
      <tr>
        <td>${b.serial}</td><td>${b.category}</td><td>${b.gasType}</td>
        <td>${b.supplier||'—'}</td><td>${b.returnedBy||'—'}</td>
        <td>${b.returnedAt?new Date(b.returnedAt).toLocaleDateString("en-GB"):'—'}</td>
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
            <div class="report-title">Supplier Return Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Coverage: ${dateRange}</div><div>Results: ${filteredBottles.length} Records</div></div>
          </div>
        </div>
        <table><thead><tr><th>Serial</th><th>Category</th><th>Gas</th><th>Supplier</th><th>Returned By</th><th>Return Date</th></tr></thead>
        <tbody>${rows}</tbody></table>
        <div class="footer">Printed from F-Gas Tracker Pro | &copy; 21 Degrees Ltd</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  const thBase: React.CSSProperties = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none", whiteSpace: "nowrap"
  };

  function renderHeader(key: string) {
    const s: React.CSSProperties = { ...thBase, cursor: "pointer" };
    const ns: React.CSSProperties = { ...thBase, cursor: "default" };
    const mkTh = (k: string, label: string, field?: keyof Bottle) => (
      <th key={k} onClick={field ? () => handleSort(field) : undefined} style={field ? s : ns}>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          {label}
          {field && <SortIcon field={field} />}
        </div>
      </th>
    );
    switch (key) {
      case "serial":      return mkTh(key, "Serial", "serial");
      case "category":    return mkTh(key, "Category", "category");
      case "gasType":     return mkTh(key, "Gas Type", "gasType");
      case "capacity":    return mkTh(key, "Capacity", "initialWeight");
      case "gasInBottle": return mkTh(key, "Gas In Bottle");
      case "balance":     return mkTh(key, "Balance");
      case "returnedBy":  return mkTh(key, "Returned By", "returnedBy");
      case "returnDate":  return mkTh(key, "Return Date", "returnedAt");
      case "supplier":    return mkTh(key, "Supplier", "supplier");
      case "poNumber":    return mkTh(key, "PO Number");
      case "registered":  return mkTh(key, "Registered", "registeredAt");
      case "expiry":      return mkTh(key, "Expiry Date", "rentalExpiryDate");
      default:            return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const isNitrogen = b.category === "nitrogen";
    const isReclaim = b.category === "reclaim";
    const balance = (b.initialWeight || 0) - (b.currentWeight || 0);
    const percent = Math.min(100, Math.max(0, ((b.currentWeight || 0) / (b.initialWeight || 1)) * 100));
    const catBadge = isReclaim
      ? { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" }
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
                <div style={{fontWeight: 700, color: "#22c55e"}}>{(b.currentWeight || 0).toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>Remaining</div>
                <div style={{width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px", overflow: "hidden"}}>
                  <div style={{width: `${percent}%`, height: "100%", background: "#22c55e", transition: "width 0.3s"}} />
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
                <div style={{fontWeight: 700, color: "#ffc107"}}>{balance.toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>Total Used</div>
              </>
            )}
          </td>
        );
      case "returnedBy":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.returnedBy || "—"}</td>;
      case "returnDate":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : "—"}</td>;
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
      <div className="no-print" style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Truck size={28} /> Returned to Supplier
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>All cylinders returned to suppliers — including refrigerant, nitrogen, and waste reclaim</p>
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

        <div style={{display: "flex", gap: "0.5rem", marginLeft: "auto"}}>
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
