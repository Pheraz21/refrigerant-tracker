"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { Truck, Search, Package, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, Calendar, Filter, Download, Printer } from "lucide-react";
import Link from "next/link";

export default function ReturnedToSupplierPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [sortField, setSortField] = useState<keyof Bottle | "">("returnedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    db.getAllBottles().then(all => {
      const returnedNonWaste = all.filter(b => 
        (b.category === "new" || b.category === "nitrogen") && 
        b.status === "returned"
      );
      setBottles(returnedNonWaste);
      setLoading(false);
    });
  }, []);

  const handleExportCSV = () => {
    const headers = ["Serial", "Category", "Gas Type", "Supplier", "Returned By", "Return Date"];
    const rows = filteredBottles.map(b => [
      b.serial,
      b.category,
      b.gasType,
      b.supplier || "",
      b.returnedBy || "",
      b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : ""
    ]);

    const csvContent = [headers, ...rows].map(e => e.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `returned_supplier_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const reportDate = new Date().toLocaleDateString("en-GB");
    const dateRange = dateFrom ? `From: ${new Date(dateFrom).toLocaleDateString("en-GB")} To: Present` : "Full History";
    
    const rows = filteredBottles.map(b => `
      <tr>
        <td>${b.serial}</td>
        <td>${b.category}</td>
        <td>${b.gasType}</td>
        <td>${b.supplier || '—'}</td>
        <td>${b.returnedBy || '—'}</td>
        <td>${b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : '—'}</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-section { display: flex; gap: 15px; align-items: flex-end; }
            .company-info { font-size: 10px; line-height: 1.4; color: #555; }
            .report-info { text-align: right; }
            .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .report-meta { font-size: 11px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
            th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #555; }
            .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="/21-degrees-logo-reports.png" style="width: 100px; height: auto;" />
              <div class="company-info">
                <strong>21 Degrees Ltd</strong><br />
                Unit 10, Apollo Court, Monkton Business Park<br />
                Hebburn, Tyne & Wear, NE31 2ES<br />
                Tel: 0191 495 7224
              </div>
            </div>
            <div class="report-info">
              <div class="report-title">Supplier Return Report (Non-Waste)</div>
              <div class="report-meta">
                <div>Generated: ${reportDate}</div>
                <div>Coverage: ${dateRange}</div>
                <div>Results: ${filteredBottles.length} Records</div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Serial</th><th>Category</th><th>Gas</th><th>Supplier</th><th>Returned By</th><th>Return Date</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <div class="footer">
            Printed from F-Gas Tracker Pro | &copy; 21 Degrees Ltd
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  const handleSort = (field: keyof Bottle) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: keyof Bottle) => {
    if (sortField !== field) return <ArrowUpDown size={14} style={{ opacity: 0.3 }} />;
    return sortOrder === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const filteredBottles = bottles
    .filter(b => {
      if (search) {
        const s = search.toLowerCase();
        const matchesSearch = b.serial.toLowerCase().includes(s) || 
                              b.supplier?.toLowerCase().includes(s) || 
                              b.gasType.toLowerCase().includes(s) ||
                              b.category.toLowerCase().includes(s) ||
                              b.returnedBy?.toLowerCase().includes(s);
        if (!matchesSearch) return false;
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

  return (
    <div>
      <div className="no-print" style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Truck size={28} /> Returned to Supplier (Non-Waste)
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Empty refrigerant and nitrogen cylinders returned to suppliers</p>
      </div>

      {/* Filters & Tools Bar */}
      <div className="no-print" style={{
        display: "flex", 
        gap: "1rem", 
        marginBottom: "2rem", 
        background: "rgba(255,255,255,0.03)", 
        padding: "1rem", 
        borderRadius: "12px", 
        border: "1px solid rgba(255,255,255,0.08)",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        {/* Search */}
        <div style={{position: "relative", flex: "1", minWidth: "250px"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input
            type="text"
            placeholder="Search serial, supplier, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", boxSizing: "border-box"
            }}
          />
        </div>

        {/* Date Filter */}
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <span style={{fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "0.4rem"}}>
            <Filter size={14} /> Since:
          </span>
          <div style={{position: "relative"}}>
            <Calendar size={14} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--primary)", pointerEvents: "none"}} />
            <input 
              type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem 0.5rem 2.2rem", background: "rgba(0, 229, 255, 0.05)", border: "1px solid rgba(0, 229, 255, 0.2)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", colorScheme: "dark", outline: "none"
              }}
            />
          </div>
        </div>

        <div style={{display: "flex", gap: "0.5rem", marginLeft: "auto"}}>
          <button 
            onClick={handleExportCSV}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "8px", color: "#22c55e", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Download size={16} /> Export Excel
          </button>
          <button 
            onClick={handlePrint}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer"
            }}
          >
            <Printer size={16} /> Print PDF
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
          <div style={{borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", background: "rgba(255,255,255,0.02)"}}>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.04)"}}>
                  {[
                    { key: "serial", label: "Serial" },
                    { key: "category", label: "Category" },
                    { key: "gasType", label: "Gas Type" },
                    { key: "supplier", label: "Supplier" },
                    { key: "returnedBy", label: "Returned By" },
                    { key: "returnedAt", label: "Return Date" }
                  ].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key as keyof Bottle)}
                      style={{
                        padding: "1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", userSelect: "none"
                      }}
                    >
                      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                        {col.label}
                        {getSortIcon(col.key as keyof Bottle)}
                      </div>
                    </th>
                  ))}
                  <th className="no-print" style={{borderBottom: "1px solid rgba(255,255,255,0.06)"}}></th>
                </tr>
              </thead>
              <tbody>
                {filteredBottles.map(b => (
                  <tr key={b.serial} style={{borderBottom: "1px solid rgba(255,255,255,0.04)", transition: "background 0.2s", cursor: "pointer"}}
                    onClick={() => window.location.href = `/admin/bottles/${b.serial}`}
                  >
                    <td style={{padding: "1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "var(--primary)", fontSize: "0.9rem"}}>{b.serial}</td>
                    <td style={{padding: "1rem"}}>
                      <span style={{
                        fontSize: "0.7rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: b.category === 'nitrogen' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(59, 130, 246, 0.1)', color: b.category === 'nitrogen' ? '#a855f7' : '#3b82f6', border: `1px solid ${b.category === 'nitrogen' ? 'rgba(168, 85, 247, 0.2)' : 'rgba(59, 130, 246, 0.2)'}`, textTransform: "capitalize"
                      }}>
                        {b.category}
                      </span>
                    </td>
                    <td style={{padding: "1rem"}}>
                      <span style={{background: "rgba(255, 255, 255, 0.05)", color: "#fff", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700}}>
                        {b.gasType}
                      </span>
                    </td>
                    <td style={{padding: "1rem", fontSize: "0.9rem", color: "var(--text-muted)"}}>{b.supplier}</td>
                    <td style={{padding: "1rem", fontSize: "0.9rem"}}>{b.returnedBy}</td>
                    <td style={{padding: "1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.returnedAt ? new Date(b.returnedAt).toLocaleDateString("en-GB") : "—"}</td>
                    <td className="no-print" style={{padding: "1rem", textAlign: "right"}}>
                      <ChevronRight size={18} style={{color: "rgba(255,255,255,0.2)"}} />
                    </td>
                  </tr>
                ))}
                {filteredBottles.length === 0 && (
                  <tr><td colSpan={7} style={{padding: "3rem", textAlign: "center", color: "var(--text-muted)"}}>No records found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
