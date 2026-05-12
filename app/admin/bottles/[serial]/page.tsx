"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Bottle, MovementLog, UsageLog } from "@/lib/db";
import { ArrowLeft, Edit3, History, ArrowRight, User, Package, Calendar, MapPin, Truck, Building2, FileText, FileSpreadsheet, ClipboardList, Wrench, Tag, CheckCircle, RotateCcw, RefreshCw } from "lucide-react";
import Link from "next/link";

type Lifecycle = { index: number; start: string; end: string | null };

function deriveLifecycles(moveLogs: MovementLog[]): Lifecycle[] {
  const sorted = [...moveLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const lifecycleEvents = sorted.filter(
    l => l.action === "registered" || l.action === "re_registered" || l.action === "returned_to_supplier"
  );
  if (lifecycleEvents.length === 0) return [];

  // Earliest known event date for this serial — used as a fallback "start" when explicit
  // registration logs are missing from historical data.
  const earliestDate = sorted[0]?.date ?? lifecycleEvents[0].date;

  const out: Lifecycle[] = [];
  let start: string | null = null;

  for (const e of lifecycleEvents) {
    if (e.action === "registered") {
      if (start) out.push({ index: out.length + 1, start, end: e.date });
      start = e.date;
    } else if (e.action === "re_registered") {
      // A re_registered event always implies a previous lifecycle existed
      const priorStart = start ?? earliestDate;
      out.push({ index: out.length + 1, start: priorStart, end: e.date });
      start = e.date;
    } else if (e.action === "returned_to_supplier") {
      const lcStart = start ?? earliestDate;
      out.push({ index: out.length + 1, start: lcStart, end: e.date });
      start = null;
    }
  }
  if (start) out.push({ index: out.length + 1, start, end: null });
  return out.reverse();
}

const RECOVERY_JOB_TYPES = new Set(["recovery", "retrofit", "waste"]);
function usageActionLabel(jobType: string | undefined | null): "Gas Recovered" | "Gas Used" {
  return jobType && RECOVERY_JOB_TYPES.has(jobType) ? "Gas Recovered" : "Gas Used";
}

function formatLifecycleLabel(l: Lifecycle, totalCount: number): string {
  const startDate = new Date(l.start).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const endDate = l.end
    ? new Date(l.end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "present";
  const isCurrent = l.index === totalCount;
  const prefix = isCurrent ? "Current" : `Lifecycle ${l.index}`;
  return `${prefix} (${startDate} – ${endDate})`;
}

export default function ViewBottlePage() {
  const { serial } = useParams();
  const router = useRouter();
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [moveLogs, setMoveLogs] = useState<MovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [decommissions, setDecommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audit");
  const [selectedLifecycleIndex, setSelectedLifecycleIndex] = useState<number | null>(null);

  const serialStr = decodeURIComponent(serial as string);

  useEffect(() => {
    if (serial) {
      Promise.all([
        db.getBottle(serialStr),
        db.getMovementLogs(serialStr),
        db.getUsageLogs(serialStr),
        db.getHWCNsForBottle(serialStr),
        db.getDecommissionsByBottleSerial(serialStr),
      ]).then(([bottleData, moveData, useData, hwcnData, decommData]) => {
        setBottle(bottleData);
        setMoveLogs(moveData);
        setUsageLogs(useData);
        setHwcns(hwcnData);
        setDecommissions(decommData);
        setLoading(false);
      });
    }
  }, [serial]);

  const lifecycles = useMemo(() => deriveLifecycles(moveLogs), [moveLogs]);

  // Default to the most recent (current) lifecycle whenever lifecycles change
  useEffect(() => {
    if (lifecycles.length === 0) {
      setSelectedLifecycleIndex(null);
    } else if (selectedLifecycleIndex == null || !lifecycles.some(l => l.index === selectedLifecycleIndex)) {
      setSelectedLifecycleIndex(lifecycles[0].index);
    }
  }, [lifecycles]);

  const selectedLifecycle = useMemo(
    () => lifecycles.find(l => l.index === selectedLifecycleIndex) ?? null,
    [lifecycles, selectedLifecycleIndex]
  );

  const inLifecycle = (dateStr: string | undefined | null): boolean => {
    if (!selectedLifecycle) return true; // no lifecycles derived → show everything
    if (!dateStr) return true;
    const t = new Date(dateStr).getTime();
    const startT = new Date(selectedLifecycle.start).getTime();
    const endT = selectedLifecycle.end ? new Date(selectedLifecycle.end).getTime() : Infinity;
    return t >= startT && t <= endT;
  };

  const filteredMoveLogs = useMemo(() => moveLogs.filter(l => inLifecycle(l.date)), [moveLogs, selectedLifecycle]);
  const filteredUsageLogs = useMemo(() => usageLogs.filter(l => inLifecycle(l.date)), [usageLogs, selectedLifecycle]);
  const filteredHwcns = useMemo(() => hwcns.filter(h => inLifecycle(h.date || h.created_at || h.createdAt)), [hwcns, selectedLifecycle]);
  const filteredDecommissions = useMemo(() => decommissions.filter(d => inLifecycle(d.date)), [decommissions, selectedLifecycle]);

  // Build the combined Audit Trail rows from the filtered raw data (balance resets per lifecycle)
  const logs = useMemo(() => {
    const combined: any[] = [
      ...filteredMoveLogs.flatMap(l => {
        const usageMatch = l.notes?.match(/([\d.]+)\s*kg\s*dispensed/i);
        if (usageMatch) {
          const amount = usageMatch[1];
          return [
            { ...l, logType: 'movement', notes: (l.notes || "").replace(/[\d.]+\s*kg\s*dispensed/i, "").trim() || "Transfer to site" },
            {
              id: `${l.id}-usage`,
              date: l.date,
              action: 'Gas Used',
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
      ...filteredUsageLogs.map(l => ({
        id: l.id,
        date: l.date,
        action: usageActionLabel(l.jobType),
        from: '',
        to: '',
        engineer: l.engineer,
        qty: l.weightUsed?.toString() || "",
        notes: `Site Job: ${l.siteRef}`,
        logType: 'usage'
      }))
    ];

    const chronLogs = combined.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentBalance = bottle?.initialWeight || 0;

    const logsWithBalance = chronLogs.map(log => {
      if (log.qty) {
        currentBalance = Math.max(0, currentBalance - parseFloat(log.qty));
      }
      return { ...log, balance: currentBalance };
    });

    return logsWithBalance.reverse();
  }, [filteredMoveLogs, filteredUsageLogs, bottle]);

  const printRefrigerantLog = () => {
    if (!bottle) return;
    const reportDate = new Date().toLocaleDateString("en-GB");
    const sorted = [...filteredUsageLogs].filter(l => l.jobType !== "recovery").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
      <html><head><style>
        @page { margin: 10mm; size: A4 landscape; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; }
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
      </style></head><body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width: 100px; height: auto;" />
            <div class="company-info"><strong>21 Degrees Ltd</strong><br />Unit 10, Apollo Court, Monkton Business Park<br />Hebburn, Tyne &amp; Wear, NE31 2ES<br />Tel: 0191 495 7224</div>
          </div>
          <div class="report-info">
            <div class="report-title">Used Refrigerant Log</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Cylinder: ${bottle.serial}</div></div>
          </div>
        </div>
        <table class="summary-table"><tr>
          <td class="summary-cell"><div class="summary-label">Cylinder Serial</div><div class="summary-value">${bottle.serial}</div></td>
          <td class="summary-cell"><div class="summary-label">Refrigerant</div><div class="summary-value">${bottle.gasType}</div></td>
          <td class="summary-cell"><div class="summary-label">Cylinder Capacity</div><div class="summary-value">${(bottle.initialWeight ?? 0).toFixed(2)} kg</div></td>
          <td class="summary-cell"><div class="summary-label">Current Balance</div><div class="summary-value">${(bottle.currentWeight ?? 0).toFixed(2)} kg</div></td>
          <td class="summary-cell"><div class="summary-label">Total Used</div><div class="summary-value">${totalUsed.toFixed(2)} kg</div></td>
        </tr></table>
        <table class="log"><thead><tr>
          <th style="width: 80px">Date</th><th style="width: 100px">Job Ref</th><th>Site</th>
          <th style="width: 130px">Engineer</th><th style="width: 80px; text-align: right">Qty Used</th>
          <th style="width: 90px; text-align: right">Wt. Before</th><th style="width: 90px; text-align: right">Wt. After</th>
        </tr></thead><tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="4" style="text-align: right">Total Gas Used</td>
            <td style="text-align: right; color: #e53e3e">${totalUsed.toFixed(2)} kg</td>
            <td colspan="2"></td>
          </tr>
        </tbody></table>
        <div class="footer">Used Refrigerant Log | F-Gas Tracker Pro | &copy; 2024 21 Degrees Ltd</div>
      </body></html>
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
      const isUsage = log.action === "Gas Used" || log.action === "Gas Recovered";
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
      <html><head><style>
        @page { margin: 10mm; size: A4 portrait; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #333; line-height: 1.4; }
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
      </style></head><body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width: 120px; height: auto;" />
            <div class="company-info"><strong>21 Degrees Ltd</strong><br />Unit 10, Apollo Court, Monkton Business Park<br />Hebburn, Tyne &amp; Wear, NE31 2ES<br />Tel: 0191 495 7224</div>
          </div>
          <div class="report-info">
            <div class="report-title">Cylinder Audit Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>System ID: ${bottle.serial}</div></div>
          </div>
        </div>
        <table class="summary-table"><tr>
          <td class="summary-cell"><div class="summary-label">Serial Number</div><div class="summary-value">${bottle.serial}</div></td>
          <td class="summary-cell"><div class="summary-label">Refrigerant</div><div class="summary-value">${bottle.gasType}</div></td>
          <td class="summary-cell"><div class="summary-label">Weight Balance</div><div class="summary-value">${(bottle.currentWeight ?? 0).toFixed(2)} / ${(bottle.initialWeight ?? 0).toFixed(2)} kg</div></td>
          <td class="summary-cell"><div class="summary-label">Current Location</div><div class="summary-value">${bottle.locationId}</div></td>
        </tr></table>
        <h3 style="font-size: 14px; margin-bottom: 12px; color: #2d3748; border-left: 5px solid #a3e635; padding-left: 12px;">Full Audit History</h3>
        <table><thead><tr>
          <th style="width: 85px;">Date</th><th style="width: 100px;">Action</th>
          <th style="width: 200px;">From</th><th style="width: 200px;">To</th>
          <th style="width: 70px; text-align: center;">Qty (kg)</th>
          <th style="width: 70px; text-align: center;">Balance</th><th>User</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">Printed from F-Gas Tracker Pro | Official Audit Document | &copy; 2024 21 Degrees Ltd</div>
      </body></html>
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
      case "van":      return <Truck size={20} />;
      case "site":     return <MapPin size={20} />;
      case "supplier": return <Building2 size={20} />;
      default:         return <Package size={20} />;
    }
  };

  const getCatBadge = () => {
    switch (bottle.category) {
      case "new":     return { bg: "rgba(0,229,255,0.1)",   color: "#00e5ff", label: "New Refrigerant" };
      case "reclaim": return { bg: "rgba(255,170,0,0.12)",  color: "#ffaa00", label: "Reclaim / Haz" };
      default:        return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "Nitrogen" };
    }
  };

  const getStatusBadge = () => {
    switch (bottle.status) {
      case "active":   return { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Active" };
      case "returned": return { bg: "rgba(168,85,247,0.12)", color: "#a855f7", label: "Returned" };
      default:         return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", label: "Empty" };
    }
  };

  const getHwcnStatusBadge = (status: string) => {
    switch (status) {
      case "complete":           return { bg: "rgba(34,197,94,0.12)",   color: "#22c55e", label: "Complete" };
      case "awaiting_consignee": return { bg: "rgba(255,193,7,0.15)",   color: "#ffc107", label: "Awaiting Part E" };
      default:                   return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", label: "Draft" };
    }
  };

  const getHwcnType = (destination: string) =>
    destination === "HQ-Stores" || destination === "HQ-Stores" ? "Office Return" : "Supplier Transfer";

  const catBadge = getCatBadge();
  const statusBadge = getStatusBadge();

  const tabStyle = (key: string): React.CSSProperties => ({
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: activeTab === key ? 600 : 400,
    color: activeTab === key ? "#000" : "rgba(255,255,255,0.6)",
    background: activeTab === key ? "#00e5ff" : "transparent",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
  });

  const emptyState = (icon: React.ReactNode, msg: string) => (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
      {icon}
      <p style={{ marginTop: "0.5rem" }}>{msg}</p>
    </div>
  );

  const tableTh: React.CSSProperties = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap",
  };
  const tableTd: React.CSSProperties = {
    padding: "0.75rem 1rem", fontSize: "0.85rem", borderBottom: "1px solid rgba(255,255,255,0.04)",
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button onClick={() => router.push("/admin/bottles")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff" }}>Bottle: {serialStr}</h1>
            <p style={{ color: "var(--text-muted)", margin: "0.25rem 0 0" }}>Comprehensive tracking and history</p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button onClick={exportCSV} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.6rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FileSpreadsheet size={18} /> Export Excel
          </button>
          <button onClick={exportPDF} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)", padding: "0.6rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FileText size={18} /> Print Audit PDF
          </button>
          {bottle.category === "new" && (
            <button onClick={printRefrigerantLog} style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.3)", color: "#ffaa00", padding: "0.6rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <FileText size={18} /> Refrigerant Log PDF
            </button>
          )}
          <Link href={`/admin/bottles/${serial}/edit`} style={{ textDecoration: "none" }}>
            <button style={{ background: "rgba(0,229,255,0.1)", border: "1px solid var(--primary)", color: "var(--primary)", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Edit3 size={18} /> Edit
            </button>
          </Link>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "2rem" }}>
        {/* Sidebar */}
        <div>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)", marginBottom: "1rem", textTransform: "uppercase" }}>Bottle Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem" }}>Category</div>
                <span style={{ background: catBadge.bg, color: catBadge.color, padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {catBadge.label}
                </span>
              </div>

              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem" }}>Status</div>
                <span style={{ background: statusBadge.bg, color: statusBadge.color, padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600 }}>
                  {statusBadge.label}
                </span>
              </div>

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
                <div style={{ color: "var(--warning)", fontWeight: 700 }}>
                  {(bottle.currentWeight ?? 0).toFixed(2)} / {(bottle.initialWeight ?? 0).toFixed(2)} kg
                </div>
              </div>

              {bottle.supplier && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Supplier</div>
                  <span
                    onClick={() => router.push(`/admin/suppliers?supplier=${bottle.supplier}`)}
                    style={{ color: "#00e5ff", fontWeight: 500, cursor: "pointer", fontSize: "0.9rem" }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
                  >
                    {bottle.supplier}
                  </span>
                </div>
              )}

              {bottle.poNumber && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>PO Number</div>
                  <div style={{ color: "#fff", fontSize: "0.9rem" }}>{bottle.poNumber}</div>
                </div>
              )}

              <div>
                <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Registered</div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>
                  {bottle.registeredAt ? new Date(bottle.registeredAt).toLocaleDateString("en-GB") : "—"}
                </div>
              </div>

              {bottle.registeredBy && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>Registered By</div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{bottle.registeredBy}</div>
                </div>
              )}

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

        {/* Main tabbed content */}
        <div>
          {/* Lifecycle picker — only shown when this serial has been through more than one lifecycle */}
          {lifecycles.length > 1 && (
            <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: "8px", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <RefreshCw size={16} style={{ color: "#a855f7", flexShrink: 0 }} />
              <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                This serial has had <strong style={{ color: "#fff" }}>{lifecycles.length}</strong> separate lifecycles. Viewing:
              </div>
              <select
                value={selectedLifecycleIndex ?? ""}
                onChange={e => setSelectedLifecycleIndex(Number(e.target.value))}
                style={{
                  padding: "0.4rem 0.75rem",
                  borderRadius: "6px",
                  border: "1px solid rgba(168,85,247,0.4)",
                  background: "var(--surface)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  flex: 1,
                  minWidth: "240px",
                }}
              >
                {lifecycles.map(l => (
                  <option key={l.index} value={l.index}>
                    {formatLifecycleLabel(l, lifecycles.length)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tab bar */}
          <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.25rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <button style={tabStyle("audit")} onClick={() => setActiveTab("audit")}>
              <History size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Audit Trail ({logs.length})
            </button>
            <button style={tabStyle("hwcns")} onClick={() => setActiveTab("hwcns")}>
              <ClipboardList size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              HWCNs {filteredHwcns.length > 0 ? `(${filteredHwcns.length})` : ""}
            </button>
            <button style={tabStyle("usage")} onClick={() => setActiveTab("usage")}>
              <Tag size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Refrigerant Usage {filteredUsageLogs.filter(l => l.jobType !== "recovery").length > 0 ? `(${filteredUsageLogs.filter(l => l.jobType !== "recovery").length})` : ""}
            </button>
            <button style={tabStyle("decommission")} onClick={() => setActiveTab("decommission")}>
              <Wrench size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Decommission Records {filteredDecommissions.length > 0 ? `(${filteredDecommissions.length})` : ""}
            </button>
          </div>

          {/* Audit Trail */}
          {activeTab === "audit" && (
            <div>
              {logs.length === 0 ? (
                emptyState(<History size={40} style={{ opacity: 0.2 }} />, "No history logs found for this cylinder.")
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {logs.map(log => (
                    <div key={log.id} className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                      <div style={{ width: "80px", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                        {new Date(log.date).toLocaleDateString()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", background: "rgba(0,229,255,0.1)", color: "var(--primary)", textTransform: "uppercase" }}>
                            {log.action.replace(/_/g, " ")}
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600 }}>
                            {log.from} <ArrowRight size={12} style={{ opacity: 0.3 }} /> {log.to}
                          </span>
                        </div>
                        {log.notes && <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>{log.notes}</div>}
                      </div>
                      {(log as any).qty && (
                        <div style={{
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: log.action === "Gas Recovered" ? "#ffaa00" : "#00e5ff",
                          whiteSpace: "nowrap",
                        }}>
                          {parseFloat((log as any).qty).toFixed(2)} kg
                        </div>
                      )}
                      <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <User size={12} style={{ opacity: 0.5 }} /> {log.engineer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HWCNs */}
          {activeTab === "hwcns" && (
            <div>
              {filteredHwcns.length === 0 ? (
                emptyState(<ClipboardList size={40} style={{ opacity: 0.2 }} />, "No HWCNs recorded for this cylinder.")
              ) : (
                <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        <th style={tableTh}>HWCN ID</th>
                        <th style={tableTh}>Status</th>
                        <th style={tableTh}>Type</th>
                        <th style={tableTh}>Date</th>
                        <th style={tableTh}>Engineer</th>
                        <th style={tableTh}>Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHwcns.map(h => {
                        const badge = getHwcnStatusBadge(h.hwcnStatus);
                        const type = getHwcnType(h.destination || "");
                        return (
                          <tr key={h.id} style={{ cursor: "pointer" }}
                            onClick={() => router.push(`/admin/hwcn/${encodeURIComponent(h.id)}`)}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ ...tableTd, fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 700 }}>{h.id}</td>
                            <td style={tableTd}>
                              <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                                {badge.label}
                              </span>
                            </td>
                            <td style={{ ...tableTd, fontSize: "0.8rem", color: type === "Office Return" ? "#00e5ff" : "#ffaa00" }}>{type}</td>
                            <td style={{ ...tableTd, color: "var(--text-muted)" }}>{h.date ? new Date(h.date).toLocaleDateString("en-GB") : "—"}</td>
                            <td style={tableTd}>{h.engineer || "—"}</td>
                            <td style={{ ...tableTd, color: "var(--text-muted)" }}>{h.destination || "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Refrigerant Usage */}
          {activeTab === "usage" && (
            <div>
              {filteredUsageLogs.filter(l => l.jobType !== "recovery").length === 0 ? (
                emptyState(<Tag size={40} style={{ opacity: 0.2 }} />, "No refrigerant usage recorded for this cylinder.")
              ) : (
                <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        <th style={tableTh}>Date</th>
                        <th style={tableTh}>Job Ref</th>
                        <th style={tableTh}>Engineer</th>
                        <th style={{ ...tableTh, textAlign: "right" }}>Qty Used</th>
                        <th style={{ ...tableTh, textAlign: "right" }}>Wt. Before</th>
                        <th style={{ ...tableTh, textAlign: "right" }}>Wt. After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...filteredUsageLogs].filter(l => l.jobType !== "recovery").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(l => (
                        <tr key={l.id}
                          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ ...tableTd, color: "var(--text-muted)" }}>{new Date(l.date).toLocaleDateString("en-GB")}</td>
                          <td style={{ ...tableTd, fontFamily: "var(--font-geist-mono)", color: "#00e5ff" }}>{l.siteRef || "—"}</td>
                          <td style={tableTd}>{l.engineer || "—"}</td>
                          <td style={{ ...tableTd, textAlign: "right", color: "#ff3366", fontWeight: 700 }}>{l.weightUsed != null ? `${l.weightUsed.toFixed(2)} kg` : "—"}</td>
                          <td style={{ ...tableTd, textAlign: "right", color: "var(--text-muted)" }}>{l.weightBefore != null ? `${l.weightBefore.toFixed(2)} kg` : "—"}</td>
                          <td style={{ ...tableTd, textAlign: "right", color: "var(--text-muted)" }}>{l.weightAfter != null ? `${l.weightAfter.toFixed(2)} kg` : "—"}</td>
                        </tr>
                      ))}
                      <tr style={{ background: "rgba(255,255,255,0.03)", fontWeight: 700 }}>
                        <td colSpan={3} style={{ ...tableTd, textAlign: "right", color: "rgba(255,255,255,0.5)", fontSize: "0.8rem" }}>Total used</td>
                        <td style={{ ...tableTd, textAlign: "right", color: "#ff3366" }}>
                          {filteredUsageLogs.filter(l => l.jobType !== "recovery").reduce((s, l) => s + (l.weightUsed || 0), 0).toFixed(2)} kg
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Decommission Records */}
          {activeTab === "decommission" && (
            <div>
              {filteredDecommissions.length === 0 ? (
                emptyState(<Wrench size={40} style={{ opacity: 0.2 }} />, "No decommissioning records linked to this cylinder.")
              ) : (
                <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        <th style={tableTh}>Date</th>
                        <th style={tableTh}>Job No.</th>
                        <th style={tableTh}>Site</th>
                        <th style={tableTh}>Engineer</th>
                        <th style={tableTh}>Equipment</th>
                        <th style={{ ...tableTh, textAlign: "right" }}>Weight Rec.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDecommissions.map((d: any) => {
                        const equipList: any[] = Array.isArray(d.equipment) ? d.equipment : [];
                        return (
                          <tr key={d.id}
                            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ ...tableTd, color: "var(--text-muted)" }}>{d.date ? new Date(d.date).toLocaleDateString("en-GB") : "—"}</td>
                            <td style={{ ...tableTd, fontFamily: "var(--font-geist-mono)", color: "#00e5ff" }}>{d.jobNumber || "—"}</td>
                            <td style={tableTd}>{d.siteName || "—"}</td>
                            <td style={tableTd}>{d.engineer || "—"}</td>
                            <td style={{ ...tableTd, fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              {equipList.length > 0
                                ? equipList.map((e: any, i: number) => (
                                    <div key={i}>{[e.manufacturer, e.model, e.serial].filter(Boolean).join(" / ")}</div>
                                  ))
                                : "—"}
                            </td>
                            <td style={{ ...tableTd, textAlign: "right", color: "#ffaa00", fontWeight: 700 }}>
                              {d.totalWeightRecovered != null ? `${Number(d.totalWeightRecovered).toFixed(2)} kg` : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
