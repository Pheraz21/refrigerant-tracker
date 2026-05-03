"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Bottle, MovementLog, UsageLog } from "@/lib/db";
import { ArrowLeft, Edit3, History, ArrowRight, User, Package, Calendar, MapPin, Truck, Building2, FileText, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import styles from "../../page.module.css";

export default function ViewBottlePage() {
  const { serial } = useParams();
  const router = useRouter();
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serial) {
      Promise.all([
        db.getBottle(serial as string),
        db.getMovementLogs(serial as string),
        db.getUsageLogs(serial as string)
      ]).then(([bottleData, moveLogs, useLogs]) => {
        setBottle(bottleData);
        setUsageLogs(useLogs);

        // 1. Combine all logs
        const combined = [
          ...moveLogs.flatMap(l => {
            const usageMatch = l.notes?.match(/([\d.]+)\s*kg\s*dispensed/i);
            if (usageMatch) {
              const amount = usageMatch[1];
              return [
                { ...l, logType: 'movement', notes: (l.notes || "").replace(/[\d.]+\s*kg\s*dispensed/i, "").trim() || "Transfer to site" },
                {
                  id: `${l.id}-usage`,
                  date: l.date,
                  action: 'Gas Usage',
                  from: '',
                  to: '',
                  engineer: l.engineer,
                  qty: amount,
                  notes: `Usage recorded at ${l.to}`,
                  logType: 'usage'
                }
              ];
            }
            return { ...l, logType: 'movement', notes: l.notes || "" };
          }),
          ...useLogs.map(l => ({
            id: l.id,
            date: l.date,
            action: 'Gas Usage',
            from: '',
            to: '',
            engineer: l.engineer,
            qty: l.weightUsed?.toString() || "",
            notes: `Site Job: ${l.siteRef}`,
            logType: 'usage'
          }))
        ];

        // 2. Sort oldest first to calculate running balance
        const chronLogs = combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let currentBalance = bottleData?.initialWeight || 0;

        const logsWithBalance = chronLogs.map(log => {
          if ((log as any).qty) {
            currentBalance = Math.max(0, currentBalance - parseFloat((log as any).qty));
          }
          return { ...log, balance: currentBalance };
        });

        // 3. Reverse back to newest first for display
        setLogs(logsWithBalance.reverse() as any);
        setLoading(false);
      });
    }
  }, [serial]);

  const printRefrigerantLog = () => {
    if (!bottle) return;
    const reportDate = new Date().toLocaleDateString("en-GB");
    const sorted = [...usageLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalUsed = sorted.reduce((sum, l) => sum + (l.weightUsed || 0), 0);

    const rows = sorted.map(log => `
      <tr>
        <td style="white-space: nowrap">${new Date(log.date).toLocaleDateString("en-GB")}</td>
        <td style="font-family: monospace; font-weight: 600">${log.siteRef || "—"}</td>
        <td>${log.siteName || "—"}</td>
        <td>${log.engineer || "—"}</td>
        <td style="text-align: right; font-weight: 600; color: #e53e3e">${log.weightUsed?.toFixed(2) || "—"} kg</td>
        <td style="text-align: right">${log.weightBefore?.toFixed(2) || "—"} kg</td>
        <td style="text-align: right">${log.weightAfter?.toFixed(2) || "—"} kg</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 10mm; size: A4 landscape; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-section { display: flex; gap: 15px; align-items: flex-end; }
            .company-info { font-size: 10px; line-height: 1.4; color: #555; }
            .report-info { text-align: right; }
            .report-title { font-size: 22px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
            .report-meta { font-size: 11px; color: #666; }
            .summary-table { width: 100%; margin-bottom: 20px; border-collapse: separate; border-spacing: 0; background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .summary-cell { padding: 12px 15px; border-right: 1px solid #e2e8f0; vertical-align: top; }
            .summary-cell:last-child { border-right: none; }
            .summary-label { font-size: 8px; color: #718096; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.1em; }
            .summary-value { font-size: 14px; font-weight: bold; color: #1a202c; white-space: nowrap; }
            table.log { width: 100%; border-collapse: collapse; margin-top: 10px; }
            table.log th, table.log td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; vertical-align: middle; font-size: 10px; }
            table.log th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #4a5568; font-size: 8px; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e0; }
            .total-row { font-weight: 700; background: #f9fafb; }
            .footer { margin-top: 20px; font-size: 8px; color: #a0aec0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 10px; }
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
              <div class="report-title">Used Refrigerant Log</div>
              <div class="report-meta">
                <div>Generated: ${reportDate}</div>
                <div>Cylinder: ${bottle.serial}</div>
              </div>
            </div>
          </div>

          <table class="summary-table">
            <tr>
              <td class="summary-cell">
                <div class="summary-label">Cylinder Serial</div>
                <div class="summary-value">${bottle.serial}</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Refrigerant</div>
                <div class="summary-value">${bottle.gasType}</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Cylinder Capacity</div>
                <div class="summary-value">${bottle.initialWeight.toFixed(2)} kg</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Current Balance</div>
                <div class="summary-value">${bottle.currentWeight.toFixed(2)} kg</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Total Used</div>
                <div class="summary-value">${totalUsed.toFixed(2)} kg</div>
              </td>
            </tr>
          </table>

          <table class="log">
            <thead>
              <tr>
                <th style="width: 80px">Date</th>
                <th style="width: 100px">Job Ref</th>
                <th>Site</th>
                <th style="width: 130px">Engineer</th>
                <th style="width: 80px; text-align: right">Qty Used</th>
                <th style="width: 90px; text-align: right">Wt. Before</th>
                <th style="width: 90px; text-align: right">Wt. After</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="4" style="text-align: right">Total Gas Used</td>
                <td style="text-align: right; color: #e53e3e">${totalUsed.toFixed(2)} kg</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Used Refrigerant Log | F-Gas Tracker Pro | &copy; 2024 21 Degrees Ltd
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  const exportCSV = () => {
    if (!bottle) return;
    const header = "Date,Action,From,To,Qty (kg),Balance (kg),Engineer\n";
    const rows = logs.map(log => {
      const qty = (log as any).qty || "";
      const balance = (log as any).balance?.toFixed(2) || "";
      return `${new Date(log.date).toLocaleDateString()},${log.action},${log.from},${log.to},${qty},${balance},${log.engineer}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bottle_audit_${serial}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    if (!bottle) return;
    const reportDate = new Date().toLocaleDateString("en-GB");

    const rows = logs.map(log => {
      const qty = (log as any).qty;
      const balance = (log as any).balance;
      const isUsage = log.action.toLowerCase().includes('usage');

      return `
        <tr style="${isUsage ? 'background-color: #f8fafc;' : ''}">
          <td style="white-space: nowrap; font-size: 9px;">${new Date(log.date).toLocaleDateString("en-GB")}</td>
          <td><strong style="text-transform: uppercase; font-size: 8px; color: ${isUsage ? '#2c5282' : '#2d3748'}">${log.action.replace(/_/g, " ")}</strong></td>
          <td style="font-size: 9px;">${log.from || '—'}</td>
          <td style="font-size: 9px;">${log.to || '—'}</td>
          <td style="text-align: center; font-weight: bold; color: ${qty ? '#e53e3e' : '#cbd5e0'}; font-size: 10px;">${qty ? `${qty} kg` : '—'}</td>
          <td style="text-align: center; font-weight: bold; color: #2d3748; font-size: 10px;">${balance ? `${balance.toFixed(2)} kg` : '—'}</td>
          <td style="font-size: 9px;">${log.engineer}</td>
        </tr>
      `;
    }).join("");

    const html = `
      <html>
        <head>
          <style>
            @page { margin: 10mm; size: A4 portrait; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
            .logo-section { display: flex; gap: 15px; align-items: flex-end; }
            .company-info { font-size: 10px; line-height: 1.4; color: #555; }
            .report-info { text-align: right; }
            .report-title { font-size: 22px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
            .report-meta { font-size: 11px; color: #666; }
            
            .summary-table { width: 100%; margin-bottom: 25px; border-collapse: separate; border-spacing: 0; background: #f9fafb; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
            .summary-cell { padding: 15px; border-right: 1px solid #e2e8f0; vertical-align: top; width: 25%; }
            .summary-cell:last-child { border-right: none; }
            .summary-label { font-size: 8px; color: #718096; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; letter-spacing: 0.1em; }
            .summary-value { font-size: 14px; font-weight: bold; color: #1a202c; white-space: nowrap; }

            table { width: 100%; border-collapse: collapse; margin-top: 10px; table-layout: auto; }
            th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; vertical-align: middle; }
            th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #4a5568; font-size: 9px; letter-spacing: 0.05em; border-bottom: 2px solid #cbd5e0; }
            .footer { margin-top: 30px; font-size: 8px; color: #a0aec0; text-align: center; border-top: 1px solid #edf2f7; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-section">
              <img src="/21-degrees-logo-reports.png" style="width: 120px; height: auto;" />
              <div class="company-info">
                <strong>21 Degrees Ltd</strong><br />
                Unit 10, Apollo Court, Monkton Business Park<br />
                Hebburn, Tyne & Wear, NE31 2ES<br />
                Tel: 0191 495 7224
              </div>
            </div>
            <div class="report-info">
              <div class="report-title">Cylinder Audit Report</div>
              <div class="report-meta">
                <div>Generated: ${reportDate}</div>
                <div>System ID: ${bottle.serial}</div>
              </div>
            </div>
          </div>

          <table class="summary-table">
            <tr>
              <td class="summary-cell">
                <div class="summary-label">Serial Number</div>
                <div class="summary-value">${bottle.serial}</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Refrigerant</div>
                <div class="summary-value">${bottle.gasType}</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Weight Balance</div>
                <div class="summary-value">${bottle.currentWeight.toFixed(2)} / ${bottle.initialWeight.toFixed(2)} kg</div>
              </td>
              <td class="summary-cell">
                <div class="summary-label">Current Location</div>
                <div class="summary-value">${bottle.locationId}</div>
              </td>
            </tr>
          </table>

          <h3 style="font-size: 14px; margin-bottom: 12px; color: #2d3748; border-left: 5px solid #a3e635; padding-left: 12px;">Full Audit History</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 85px;">Date</th>
                <th style="width: 100px;">Action</th>
                <th style="width: 200px;">From</th>
                <th style="width: 200px;">To</th>
                <th style="width: 70px; text-align: center;">Qty (kg)</th>
                <th style="width: 70px; text-align: center;">Balance</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          
          <div class="footer">
            Printed from F-Gas Tracker Pro | Official Audit Document | &copy; 2024 21 Degrees Ltd
          </div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  if (loading) return <div style={{ padding: "2rem", color: "#fff" }}>Loading bottle data...</div>;
  if (!bottle) return <div style={{ padding: "2rem", color: "#fff" }}>Bottle not found.</div>;

  const getLocationIcon = (type: string) => {
    switch (type) {
      case "van": return <Truck size={20} />;
      case "site": return <MapPin size={20} />;
      case "supplier": return <Building2 size={20} />;
      case "office": return <Package size={20} />;
      default: return <Package size={20} />;
    }
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.push("/admin/bottles")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff" }}>Bottle: {serial}</h1>
            <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0" }}>Comprehensive tracking and history</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={exportCSV} style={{
            background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)", padding: "0.6rem 1rem", borderRadius: "8px",
            cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex",
            alignItems: "center", gap: "0.4rem"
          }}>
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button onClick={exportPDF} style={{
            background: "rgba(255, 255, 255, 0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.7)", padding: "0.6rem 1rem", borderRadius: "8px",
            cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex",
            alignItems: "center", gap: "0.4rem"
          }}>
            <FileText size={18} /> Print Audit PDF
          </button>
          {bottle.category === "new" && (
            <button onClick={printRefrigerantLog} style={{
              background: "rgba(255, 170, 0, 0.08)", border: "1px solid rgba(255,170,0,0.3)",
              color: "#ffaa00", padding: "0.6rem 1rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex",
              alignItems: "center", gap: "0.4rem"
            }}>
              <FileText size={18} /> Refrigerant Log PDF
            </button>
          )}
          <Link href={`/admin/bottles/${serial}/edit`} style={{ textDecoration: "none" }}>
            <button style={{
              background: "rgba(0, 229, 255, 0.1)", border: "1px solid var(--primary)",
              color: "var(--primary)", padding: "0.6rem 1.2rem", borderRadius: "8px",
              cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex",
              alignItems: "center", gap: "0.5rem"
            }}>
              <Edit3 size={18} /> Edit
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "2rem" }}>
        {/* Quick Stats Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", textTransform: "uppercase" }}>Current Status</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Location</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)", fontWeight: 700 }}>
                  {getLocationIcon(bottle.locationType)} {bottle.locationId}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Gas Type</div>
                <div style={{ color: "#fff", fontWeight: 600 }}>{bottle.gasType}</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Inventory Level</div>
                <div style={{ color: "var(--warning)", fontWeight: 700 }}>{bottle.currentWeight.toFixed(2)} / {bottle.initialWeight.toFixed(2)} kg</div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Rental Expiry</div>
                {bottle.rentalExpiryDate ? (
                  <div style={{ color: new Date(bottle.rentalExpiryDate) < new Date() ? "#ff3366" : "#ffaa00", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Calendar size={14} /> {new Date(bottle.rentalExpiryDate).toLocaleDateString("en-GB")}
                  </div>
                ) : (
                  <Link href={`/admin/bottles/${serial}/edit`} style={{ textDecoration: "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.3rem 0.6rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)", borderRadius: "6px", cursor: "pointer" }}>
                      <Calendar size={13} color="#ff3366" />
                      <span style={{ fontSize: "0.78rem", color: "#ff3366", fontWeight: 700 }}>Not set — click to add</span>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* History Log */}
        <div>
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
            <History size={20} color="var(--primary)" /> Audit Log / Tracking History
          </h2>

          {logs.length === 0 ? (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              No history logs found for this cylinder.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {logs.map(log => (
                <div key={log.id} className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                  <div style={{ width: "80px", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                    {new Date(log.date).toLocaleDateString()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{
                        fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px",
                        background: "rgba(0, 229, 255, 0.1)", color: "var(--primary)", textTransform: "uppercase"
                      }}>
                        {log.action.replace(/_/g, " ")}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600 }}>
                        {log.from} <ArrowRight size={12} style={{ opacity: 0.3 }} /> {log.to}
                      </span>
                    </div>
                    {log.notes && <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{log.notes}</div>}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <User size={12} style={{ opacity: 0.5 }} /> {log.engineer}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
