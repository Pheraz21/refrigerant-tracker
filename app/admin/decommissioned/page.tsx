"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { Trash2, Search, Download, FileText, Calendar, X, Printer } from "lucide-react";
import Link from "next/link";

export default function DecommissionedEquipmentPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    db.getAllDecommissions().then(data => {
      setRecords(data);
      setLoading(false);
    });
  }, []);

  // Flatten equipment arrays into individual rows for the table
  const flatRows = records.flatMap(rec => 
    (rec.equipment || []).map((eq: any, idx: number) => ({
      ...rec,
      equipmentIndex: idx,
      eqManufacturer: eq.manufacturer,
      eqModel: eq.model,
      eqSerial: eq.serial,
      eqWeight: eq.weightRecovered
    }))
  );

  // Apply filters
  const filtered = flatRows.filter(row => {
    const matchesSearch = !searchTerm || 
      row.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.jobNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.siteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.bottleSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.eqManufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.eqModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.eqSerial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.engineer?.toLowerCase().includes(searchTerm.toLowerCase());

    const rowDate = row.date ? new Date(row.date) : null;
    const matchesFrom = !dateFrom || (rowDate && rowDate >= new Date(dateFrom));
    const matchesTo = !dateTo || (rowDate && rowDate <= new Date(dateTo + "T23:59:59"));

    return matchesSearch && matchesFrom && matchesTo;
  });

  const exportCSV = () => {
    const headers = ["Record ID", "Date", "Job Number", "Site Name", "Site Address", "Postcode", "Engineer", "Bottle Serial", "Gas Type", "Manufacturer", "Model", "Equipment Serial", "Weight Recovered (kg)"];
    const csvRows = [headers.join(",")];
    
    filtered.forEach(row => {
      csvRows.push([
        row.id,
        row.date ? new Date(row.date).toLocaleDateString("en-GB") : "",
        `"${row.jobNumber || ""}"`,
        `"${row.siteName || ""}"`,
        `"${row.siteAddress || ""}"`,
        `"${row.sitePostcode || ""}"`,
        `"${row.engineer || ""}"`,
        row.bottleSerial || "",
        row.gasType || "",
        `"${row.eqManufacturer || ""}"`,
        `"${row.eqModel || ""}"`,
        `"${row.eqSerial || ""}"`,
        (row.eqWeight || 0).toFixed(2)
      ].join(","));
    });

    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decommissioned-equipment-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    // Generate a printable HTML document
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Group rows back by record ID for the PDF
    const grouped: Record<string, any[]> = {};
    filtered.forEach(row => {
      if (!grouped[row.id]) grouped[row.id] = [];
      grouped[row.id].push(row);
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decommissioned Equipment Report</title>
        <style>
          @page { margin: 10mm; size: A4 portrait; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo-section { display: flex; gap: 15px; align-items: flex-end; }
          .company-info { font-size: 10px; line-height: 1.4; color: #555; }
          .report-info { text-align: right; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
          .report-meta { font-size: 11px; color: #666; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
          .job-block { margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
          .job-header { background: #f5f5f5; padding: 12px 16px; border-bottom: 1px solid #ddd; }
          .job-header h3 { font-size: 14px; margin-bottom: 4px; }
          .job-header p { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #fafafa; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; }
          td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
          .total-row { font-weight: 700; background: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { body { padding: 15px; } .job-block { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width:100px;height:auto" />
            <div class="company-info">
              <strong>21 Degrees Ltd</strong><br />
              Unit 10, Apollo Court, Monkton Business Park<br />
              Hebburn, Tyne &amp; Wear, NE31 2ES<br />
              Tel: 0191 495 7224
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">Decommissioned Equipment Report</div>
            <div class="report-meta">
              <div>Generated: ${new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}</div>
              ${dateFrom || dateTo ? `<div>Filtered: ${dateFrom || "Start"} → ${dateTo || "Present"}</div>` : ""}
            </div>
          </div>
        </div>
        
        ${Object.entries(grouped).map(([id, rows]) => {
          const first = rows[0];
          const totalWeight = rows.reduce((sum, r) => sum + (r.eqWeight || 0), 0);
          return `
            <div class="job-block">
              <div class="job-header">
                <h3>${first.jobNumber || "Unknown Job"} — ${first.siteName || "Unknown Site"}</h3>
                <p>${first.siteAddress || ""}${first.sitePostcode ? `, ${first.sitePostcode}` : ""} | Engineer: ${first.engineer || "—"} | Date: ${first.date ? new Date(first.date).toLocaleDateString("en-GB") : "—"} | Bottle: ${first.bottleSerial || "—"} | Gas: ${first.gasType || "—"}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Serial No.</th>
                    <th style="text-align:right">Weight Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                    <tr>
                      <td>${r.eqManufacturer || "—"}</td>
                      <td>${r.eqModel || "—"}</td>
                      <td style="font-family: monospace; font-weight: 600">${r.eqSerial || "—"}</td>
                      <td style="text-align:right">${(r.eqWeight || 0).toFixed(2)} kg</td>
                    </tr>
                  `).join("")}
                  <tr class="total-row">
                    <td colspan="3">Total Recovered</td>
                    <td style="text-align:right">${totalWeight.toFixed(2)} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }).join("")}

        <div class="footer">
          21 Degrees — Refrigerant Compliance System | ${filtered.length} equipment item(s) across ${Object.keys(grouped).length} decommission record(s)
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const generateJobPDF = (jobNo: string, allRows: typeof flatRows) => {
    const jobRows = allRows.filter(row => row.jobNumber === jobNo);
    if (jobRows.length === 0) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const grouped: Record<string, any[]> = {};
    jobRows.forEach(row => {
      if (!grouped[row.id]) grouped[row.id] = [];
      grouped[row.id].push(row);
    });

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Decommission Report — ${jobNo}</title>
        <style>
          @page { margin: 10mm; size: A4 portrait; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo-section { display: flex; gap: 15px; align-items: flex-end; }
          .company-info { font-size: 10px; line-height: 1.4; color: #555; }
          .report-info { text-align: right; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
          .report-meta { font-size: 11px; color: #666; }
          .subtitle { color: #666; font-size: 13px; margin-bottom: 24px; }
          .job-block { margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
          .job-header { background: #f5f5f5; padding: 12px 16px; border-bottom: 1px solid #ddd; }
          .job-header h3 { font-size: 14px; margin-bottom: 4px; }
          .job-header p { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #fafafa; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; }
          td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
          .total-row { font-weight: 700; background: #f9f9f9; }
          .footer { margin-top: 30px; font-size: 11px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
          @media print { body { padding: 15px; } .job-block { break-inside: avoid; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width:100px;height:auto" />
            <div class="company-info">
              <strong>21 Degrees Ltd</strong><br />
              Unit 10, Apollo Court, Monkton Business Park<br />
              Hebburn, Tyne &amp; Wear, NE31 2ES<br />
              Tel: 0191 495 7224
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">Decommissioned Equipment</div>
            <div class="report-meta">
              <div>Generated: ${new Date().toLocaleDateString("en-GB", { dateStyle: "long" })}</div>
              <div>Job: ${jobNo}</div>
            </div>
          </div>
        </div>
        ${Object.entries(grouped).map(([, rows]) => {
          const first = rows[0];
          const totalWeight = rows.reduce((sum, r) => sum + (r.eqWeight || 0), 0);
          return `
            <div class="job-block">
              <div class="job-header">
                <h3>${first.jobNumber || "Unknown Job"} — ${first.siteName || "Unknown Site"}</h3>
                <p>${first.siteAddress || ""}${first.sitePostcode ? `, ${first.sitePostcode}` : ""} | Engineer: ${first.engineer || "—"} | Date: ${first.date ? new Date(first.date).toLocaleDateString("en-GB") : "—"} | Bottle: ${first.bottleSerial || "—"} | Gas: ${first.gasType || "—"}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Serial No.</th>
                    <th style="text-align:right">Weight Recovered</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map(r => `
                    <tr>
                      <td>${r.eqManufacturer || "—"}</td>
                      <td>${r.eqModel || "—"}</td>
                      <td style="font-family: monospace; font-weight: 600">${r.eqSerial || "—"}</td>
                      <td style="text-align:right">${(r.eqWeight || 0).toFixed(2)} kg</td>
                    </tr>
                  `).join("")}
                  <tr class="total-row">
                    <td colspan="3">Total Recovered</td>
                    <td style="text-align:right">${totalWeight.toFixed(2)} kg</td>
                  </tr>
                </tbody>
              </table>
            </div>
          `;
        }).join("")}
        <div class="footer">
          21 Degrees — Refrigerant Compliance System | ${jobRows.length} equipment item(s) for job ${jobNo}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo;

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Trash2 size={28} /> Decommissioned Equipment
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>
          Equipment marked as decommissioned during gas recovery operations
        </p>
      </div>

      {/* Toolbar: Search + Date Filters + Export */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "flex-end",
        padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)"
      }}>
        {/* Search */}
        <div style={{flex: "1 1 250px"}}>
          <label style={{fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem"}}>Search</label>
          <div style={{position: "relative"}}>
            <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search job, site, engineer, serial..."
              style={{
                width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.25rem", borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
                color: "#fff", fontSize: "0.85rem"
              }}
            />
          </div>
        </div>

        {/* Date From */}
        <div style={{flex: "0 1 160px"}}>
          <label style={{fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem"}}>
            <Calendar size={12} style={{marginRight: "0.25rem", verticalAlign: "middle"}} /> From
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#fff", fontSize: "0.85rem", colorScheme: "dark"
            }}
          />
        </div>

        {/* Date To */}
        <div style={{flex: "0 1 160px"}}>
          <label style={{fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem"}}>
            <Calendar size={12} style={{marginRight: "0.25rem", verticalAlign: "middle"}} /> To
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#fff", fontSize: "0.85rem", colorScheme: "dark"
            }}
          />
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            style={{
              padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", cursor: "pointer",
              fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem",
              alignSelf: "flex-end"
            }}
          >
            <X size={14} /> Clear
          </button>
        )}

        {/* Export Buttons */}
        <div style={{display: "flex", gap: "0.5rem", marginLeft: "auto", alignSelf: "flex-end"}}>
          <button
            onClick={exportCSV}
            style={{
              padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid rgba(0, 229, 255, 0.3)",
              background: "rgba(0, 229, 255, 0.06)", color: "#00e5ff", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem"
            }}
          >
            <Download size={15} /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            style={{
              padding: "0.65rem 1rem", borderRadius: "8px", border: "1px solid rgba(255, 170, 0, 0.3)",
              background: "rgba(255, 170, 0, 0.06)", color: "#ffaa00", cursor: "pointer",
              fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem"
            }}
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div style={{marginBottom: "1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>
        Showing {filtered.length} equipment item{filtered.length !== 1 ? "s" : ""} across {records.length} decommission record{records.length !== 1 ? "s" : ""}
        {hasActiveFilters && <span style={{color: "#00e5ff"}}> (filtered)</span>}
      </div>

      {/* Table */}
      <div style={{borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"}}>
        {filtered.length === 0 ? (
          <div style={{padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)"}}>
            <Trash2 size={48} style={{marginBottom: "1rem", opacity: 0.2}} />
            <p style={{fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem"}}>No Decommissioned Equipment Found</p>
            <p style={{fontSize: "0.85rem"}}>
              {hasActiveFilters ? "Try adjusting your search or date filters." : "Equipment marked as decommissioned during gas recovery will appear here."}
            </p>
          </div>
        ) : (
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                {["Date", "Job No.", "Site", "Engineer", "Bottle", "Gas", "Manufacturer", "Model", "Equipment Serial", "Weight", "PDF"].map(h => (
                  <th key={h} style={{
                    padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.72rem",
                    color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase",
                    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap"
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <tr key={`${row.id}-${row.equipmentIndex}`} style={{
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)"
                }}>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap"}}>
                    {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontWeight: 600, fontSize: "0.85rem"}}>
                    {row.jobNumber ? (
                      <Link href={`/admin/jobs/${encodeURIComponent(row.jobNumber)}`} style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)", fontWeight: 700 }}>
                        {row.jobNumber}
                      </Link>
                    ) : "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem"}}>
                    <div>{row.siteName || "—"}</div>
                    <div style={{fontSize: "0.75rem", color: "var(--text-muted)"}}>{row.siteAddress || ""}</div>
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem"}}>
                    {row.engineer || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 600, color: "#00e5ff", fontSize: "0.85rem"}}>
                    {row.bottleSerial || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem"}}>
                    {row.gasType || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem"}}>
                    {row.eqManufacturer || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontSize: "0.85rem"}}>
                    {row.eqModel || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 600, fontSize: "0.85rem"}}>
                    {row.eqSerial || "—"}
                  </td>
                  <td style={{padding: "0.75rem 1rem", fontWeight: 600, color: "#ffc107", fontSize: "0.85rem", whiteSpace: "nowrap"}}>
                    {(row.eqWeight || 0).toFixed(2)} kg
                  </td>
                  <td style={{padding: "0.6rem 1rem", textAlign: "center"}}>
                    <button
                      onClick={(e) => { e.stopPropagation(); generateJobPDF(row.jobNumber, flatRows); }}
                      title={`Print PDF for Job ${row.jobNumber}`}
                      style={{background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600}}
                    >
                      <Printer size={13} /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background: "rgba(255,255,255,0.03)", borderTop: "2px solid rgba(255,255,255,0.1)"}}>
                <td colSpan={10} style={{padding: "0.8rem 1rem", fontWeight: 700, textAlign: "right"}}>
                  Total Weight Recovered
                </td>
                <td style={{padding: "0.8rem 1rem", fontWeight: 700, color: "#ffc107"}}>
                  {filtered.reduce((sum, r) => sum + (r.eqWeight || 0), 0).toFixed(2)} kg
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
