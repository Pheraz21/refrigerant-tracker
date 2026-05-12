"use client";

import { useEffect, useState, useMemo } from "react";
import { db, UsageLog, SupplierReturnGroup } from "@/lib/db";
import {
  Briefcase, Search, ChevronDown, ChevronRight, Calendar, X,
  ExternalLink, Settings2, ArrowUpDown, ArrowUp, ArrowDown, Printer
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";

interface JobSummary {
  siteRef: string;
  siteName: string;
  siteAddress: string;
  engineer: string;
  latestDate: string;
  logs: UsageLog[];
  newGasKg: number;
  reclaimKg: number;
  bottleCount: number;
  hwcns: any[];
  returnNotes: SupplierReturnGroup[];
}

const COLUMN_DEFS = [
  { key: "jobRef",   label: "Job No.",      required: true },
  { key: "gasUsed",  label: "Gas Used"                     },
  { key: "reclaim",  label: "Reclaim"                      },
  { key: "bottles",  label: "Bottles"                      },
  { key: "decomPdf", label: "Decom PDF"                    },
  { key: "refPdf",   label: "Ref. Log PDF"                 },
  { key: "hwcn",     label: "HWCN"                         },
] as const;

const RECOVERY_TYPES = new Set(["recovery", "waste", "reclaim"]);

type SortKey = "jobRef" | "gasUsed" | "reclaim" | "bottles";

export default function RefrigerantJobsPage() {
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [decommissions, setDecommissions] = useState<any[]>([]);
  const [supplierReturnGroups, setSupplierReturnGroups] = useState<SupplierReturnGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "service" | "recovery">("all");
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey>("jobRef");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("jobs", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    Promise.all([db.getAllUsageLogs(), db.getAllHWCNs(), db.getAllDecommissions(), db.getSupplierReturnGroups()])
      .then(([logs, h, decom, returnGroups]) => {
        setUsageLogs(logs);
        setHwcns(h);
        setDecommissions(decom);
        setSupplierReturnGroups(returnGroups);
        setLoading(false);
      });
  }, []);

  const jobs = useMemo<JobSummary[]>(() => {
    const grouped = new Map<string, UsageLog[]>();

    usageLogs.forEach(log => {
      const key = log.siteRef || "No Job Ref";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    decommissions.forEach(d => {
      if (d.jobNumber && !grouped.has(d.jobNumber)) {
        grouped.set(d.jobNumber, []);
      }
    });

    return Array.from(grouped.entries()).map(([siteRef, logs]) => {
      const sortedByDate = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const first = sortedByDate[0];
      const firstDecom = decommissions.find(d => d.jobNumber === siteRef);
      const jobSerials = new Set(logs.map(l => l.serial));
      const relatedHwcns = hwcns.filter(h => jobSerials.has(h.serial));
      const relatedReturnNotes = supplierReturnGroups.filter(g =>
        g.serials.some(s => jobSerials.has(s))
      );
      const newGasKg = logs.filter(l => !RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
      const reclaimKg = logs.filter(l => RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
      return {
        siteRef,
        siteName: first?.siteName || firstDecom?.siteName || "Unknown Site",
        siteAddress: first?.siteAddress || firstDecom?.siteAddress || "",
        engineer: first?.engineer || firstDecom?.engineer || "—",
        latestDate: first?.date || firstDecom?.date || "",
        logs,
        newGasKg,
        reclaimKg,
        bottleCount: jobSerials.size,
        hwcns: relatedHwcns,
        returnNotes: relatedReturnNotes,
      };
    });
  }, [usageLogs, hwcns, decommissions, supplierReturnGroups]);

  const filtered = useMemo(() => {
    return jobs.filter(job => {
      const s = search.toLowerCase();
      const matchesSearch = !s ||
        job.siteRef.toLowerCase().includes(s) ||
        job.siteName.toLowerCase().includes(s) ||
        job.engineer.toLowerCase().includes(s);
      const jobDate = job.latestDate ? new Date(job.latestDate) : null;
      const matchesFrom = !dateFrom || (jobDate && jobDate >= new Date(dateFrom));
      const matchesTo = !dateTo || (jobDate && jobDate <= new Date(dateTo + "T23:59:59"));
      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "service" && job.reclaimKg === 0) ||
        (categoryFilter === "recovery" && job.reclaimKg > 0);
      return matchesSearch && matchesFrom && matchesTo && matchesCategory;
    });
  }, [jobs, search, dateFrom, dateTo, categoryFilter]);

  const sortedJobs = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let av: any, bv: any;
      switch (sortKey) {
        case "jobRef":  av = a.siteRef;     bv = b.siteRef;     break;
        case "gasUsed": av = a.newGasKg;    bv = b.newGasKg;    break;
        case "reclaim": av = a.reclaimKg;   bv = b.reclaimKg;   break;
        case "bottles": av = a.bottleCount; bv = b.bottleCount; break;
        default:        return 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const toggleExpand = (siteRef: string) => {
    setExpandedJobs(prev => {
      const n = new Set(prev);
      if (n.has(siteRef)) n.delete(siteRef);
      else n.add(siteRef);
      return n;
    });
  };

  const DECOM_PDF_STYLES = `
    @page { margin: 10mm; size: A4 portrait; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
    .logo-section { display: flex; gap: 15px; align-items: flex-end; }
    .company-info { font-size: 10px; line-height: 1.4; color: #555; }
    .report-info { text-align: right; }
    .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
    .report-meta { font-size: 11px; color: #666; }
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
  `;

  const COMPANY_HEADER = (title: string, meta: string) => `
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
        <div class="report-title">${title}</div>
        <div class="report-meta">${meta}</div>
      </div>
    </div>
  `;

  const generateDecomPdfForJob = (siteRef: string) => {
    const jobRecords = decommissions.filter(r => r.jobNumber === siteRef);
    if (jobRecords.length === 0) {
      alert(`No decommissioned equipment found for job ${siteRef}`);
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const flatRows = jobRecords.flatMap(rec =>
      (rec.equipment || []).map((eq: any) => ({
        ...rec,
        eqManufacturer: eq.manufacturer,
        eqModel: eq.model,
        eqSerial: eq.serial,
        eqWeight: eq.weightRecovered,
      }))
    );

    const grouped: Record<string, any[]> = {};
    flatRows.forEach(row => {
      if (!grouped[row.id]) grouped[row.id] = [];
      grouped[row.id].push(row);
    });

    const reportDate = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });

    const html = `<!DOCTYPE html><html><head><title>Decommissioned Equipment — ${siteRef}</title>
      <style>${DECOM_PDF_STYLES}</style></head><body>
      ${COMPANY_HEADER("Decommissioned Equipment", `<div>Generated: ${reportDate}</div><div>Job: ${siteRef}</div>`)}
      ${Object.entries(grouped).map(([, rows]) => {
        const first = rows[0];
        const totalWeight = rows.reduce((sum, r) => sum + (r.eqWeight || 0), 0);
        return `
          <div class="job-block">
            <div class="job-header">
              <h3>${first.jobNumber || "Unknown Job"} — ${first.siteName || "Unknown Site"}</h3>
              <p>${first.siteAddress || ""}${first.sitePostcode ? `, ${first.sitePostcode}` : ""} | Engineer: ${first.engineer || "—"} | Date: ${first.date ? new Date(first.date).toLocaleDateString("en-GB") : "—"} | Bottle: ${first.bottleSerial || "—"} | Gas: ${first.gasType || "—"}</p>
            </div>
            <table><thead><tr>
              <th>Manufacturer</th><th>Model</th><th>Serial No.</th><th style="text-align:right">Weight Recovered</th>
            </tr></thead><tbody>
              ${rows.map(r => `<tr>
                <td>${r.eqManufacturer || "—"}</td>
                <td>${r.eqModel || "—"}</td>
                <td style="font-family:monospace;font-weight:600">${r.eqSerial || "—"}</td>
                <td style="text-align:right">${(r.eqWeight || 0).toFixed(2)} kg</td>
              </tr>`).join("")}
              <tr class="total-row"><td colspan="3">Total Recovered</td><td style="text-align:right">${totalWeight.toFixed(2)} kg</td></tr>
            </tbody></table>
          </div>`;
      }).join("")}
      <div class="footer">21 Degrees — Refrigerant Compliance System | ${flatRows.length} equipment item(s) for job ${siteRef}</div>
      </body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  const printJobRefrigerantLog = (job: JobSummary) => {
    if (job.logs.length === 0) return;
    const reportDate = new Date().toLocaleDateString("en-GB");
    const sortedLogs = [...job.logs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const totalUsed = sortedLogs.reduce((s, l) => s + (l.weightUsed || 0), 0);
    const totalReclaim = sortedLogs.filter(l => RECOVERY_TYPES.has((l.jobType || "").toLowerCase())).reduce((s, l) => s + (l.weightUsed || 0), 0);
    const uniqueBottles = new Set(sortedLogs.map(l => l.serial)).size;

    const rows = sortedLogs.map(log => {
      const isRecovery = RECOVERY_TYPES.has((log.jobType || "").toLowerCase());
      return `
        <tr>
          <td style="white-space:nowrap">${new Date(log.date).toLocaleDateString("en-GB")}</td>
          <td style="font-family:monospace;font-weight:600">${log.serial}</td>
          <td>${log.engineer || "—"}</td>
          <td><span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${isRecovery ? "#fff3cd" : "#d4edda"};color:${isRecovery ? "#856404" : "#155724"}">${log.jobType || "—"}</span></td>
          <td style="text-align:right;font-weight:600;color:${isRecovery ? "#856404" : "#155724"}">${(log.weightUsed || 0).toFixed(2)} kg</td>
          <td style="text-align:right">${log.weightBefore?.toFixed(2) || "—"} kg</td>
          <td style="text-align:right">${log.weightAfter?.toFixed(2) || "—"} kg</td>
        </tr>
      `;
    }).join("");

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
                Hebburn, Tyne &amp; Wear, NE31 2ES<br />
                Tel: 0191 495 7224
              </div>
            </div>
            <div class="report-info">
              <div class="report-title">Used Refrigerant Log</div>
              <div class="report-meta"><div>Generated: ${reportDate}</div><div>Job: ${job.siteRef}</div></div>
            </div>
          </div>
          <table class="summary-table"><tr>
            <td class="summary-cell"><div class="summary-label">Job Reference</div><div class="summary-value">${job.siteRef}</div></td>
            <td class="summary-cell"><div class="summary-label">Cylinders Used</div><div class="summary-value">${uniqueBottles}</div></td>
            <td class="summary-cell"><div class="summary-label">Total Gas Dispensed</div><div class="summary-value">${(totalUsed - totalReclaim).toFixed(2)} kg</div></td>
            <td class="summary-cell"><div class="summary-label">Total Reclaimed</div><div class="summary-value">${totalReclaim.toFixed(2)} kg</div></td>
            <td class="summary-cell"><div class="summary-label">Net Usage</div><div class="summary-value">${totalUsed.toFixed(2)} kg</div></td>
          </tr></table>
          <table class="log">
            <thead><tr>
              <th style="width:80px">Date</th>
              <th style="width:110px">Bottle Serial</th>
              <th style="width:130px">Engineer</th>
              <th style="width:90px">Job Type</th>
              <th style="width:80px;text-align:right">Qty Used</th>
              <th style="width:90px;text-align:right">Wt. Before</th>
              <th style="width:90px;text-align:right">Wt. After</th>
            </tr></thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="4" style="text-align:right">Total</td>
                <td style="text-align:right;color:#155724">${totalUsed.toFixed(2)} kg</td>
                <td colspan="2"></td>
              </tr>
            </tbody>
          </table>
          <div class="footer">Used Refrigerant Log | F-Gas Tracker Pro | &copy; 2024 21 Degrees Ltd</div>
        </body>
      </html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => { win?.print(); }, 500);
  };

  const hasFilters = !!(search || dateFrom || dateTo || categoryFilter !== "all");

  const thBase: React.CSSProperties = {
    padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.72rem",
    color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.85rem" };

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.4, marginLeft: "0.3rem", verticalAlign: "middle" }} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{ color: "#00e5ff", marginLeft: "0.3rem", verticalAlign: "middle" }} />
      : <ArrowDown size={12} style={{ color: "#00e5ff", marginLeft: "0.3rem", verticalAlign: "middle" }} />;
  }

  function renderHeader(key: string) {
    const s: React.CSSProperties = { ...thBase, cursor: "pointer" };
    const n: React.CSSProperties = { ...thBase, cursor: "default" };
    switch (key) {
      case "jobRef":   return <th key={key} style={s} onClick={() => handleSort("jobRef")}>Job No. <SortIcon col="jobRef" /></th>;
      case "gasUsed":  return <th key={key} style={{ ...s, textAlign: "right" }} onClick={() => handleSort("gasUsed")}>Gas Used <SortIcon col="gasUsed" /></th>;
      case "reclaim":  return <th key={key} style={{ ...s, textAlign: "right" }} onClick={() => handleSort("reclaim")}>Reclaim <SortIcon col="reclaim" /></th>;
      case "bottles":  return <th key={key} style={{ ...s, textAlign: "center" }} onClick={() => handleSort("bottles")}>Bottles <SortIcon col="bottles" /></th>;
      case "decomPdf": return <th key={key} style={{ ...n, textAlign: "center" }}>Decom PDF</th>;
      case "refPdf":   return <th key={key} style={{ ...n, textAlign: "center" }}>Ref. Log PDF</th>;
      case "hwcn":     return <th key={key} style={n}>HWCN</th>;
      default:         return null;
    }
  }

  function renderCell(key: string, job: JobSummary) {
    switch (key) {
      case "jobRef":
        return (
          <td key={key} style={{ ...tdBase, fontFamily: "var(--font-geist-mono)", fontWeight: 600 }}>
            <Link
              href={`/admin/jobs/${encodeURIComponent(job.siteRef)}`}
              onClick={e => e.stopPropagation()}
              style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)", fontWeight: 700 }}
            >
              {job.siteRef}
            </Link>
          </td>
        );
      case "gasUsed":
        return <td key={key} style={{ ...tdBase, textAlign: "right", fontWeight: 600, color: job.newGasKg > 0 ? "#22c55e" : "var(--text-muted)" }}>{job.newGasKg > 0 ? `${job.newGasKg.toFixed(2)} kg` : "—"}</td>;
      case "reclaim":
        return <td key={key} style={{ ...tdBase, textAlign: "right", fontWeight: 600, color: job.reclaimKg > 0 ? "#ffaa00" : "var(--text-muted)" }}>{job.reclaimKg > 0 ? `${job.reclaimKg.toFixed(2)} kg` : "—"}</td>;
      case "bottles":
        return <td key={key} style={{ ...tdBase, textAlign: "center" }}><span style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600 }}>{job.bottleCount}</span></td>;
      case "decomPdf": {
        const hasDecom = decommissions.some(r => r.jobNumber === job.siteRef);
        return (
          <td key={key} style={{ ...tdBase, textAlign: "center" }}>
            {hasDecom ? (
              <button
                onClick={e => { e.stopPropagation(); generateDecomPdfForJob(job.siteRef); }}
                title={`Decommissioned Equipment PDF for ${job.siteRef}`}
                style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <Printer size={13} /> PDF
              </button>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      }
      case "refPdf":
        return (
          <td key={key} style={{ ...tdBase, textAlign: "center" }}>
            {job.logs.length > 0 ? (
              <button
                onClick={e => { e.stopPropagation(); printJobRefrigerantLog(job); }}
                title={`Used Refrigerant Log PDF for ${job.siteRef}`}
                style={{ background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", color: "#ffaa00", padding: "0.35rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem", fontWeight: 600 }}
              >
                <Printer size={13} /> PDF
              </button>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      case "hwcn": {
        const hasAny = job.hwcns.length > 0 || job.returnNotes.length > 0;
        return (
          <td key={key} style={tdBase}>
            {hasAny ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {job.hwcns.map(h => (
                  <Link
                    key={h.id}
                    href={`/admin/hwcn/${encodeURIComponent(h.id)}`}
                    onClick={e => e.stopPropagation()}
                    title={`Internal HWCN: ${h.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <ExternalLink size={11} /> {h.id?.slice(0, 8) || "HWCN"}
                  </Link>
                ))}
                {job.returnNotes.map(g => (
                  <Link
                    key={g.hwcnNumber}
                    href={`/admin/supplier-hwcn/${encodeURIComponent(g.hwcnNumber)}`}
                    onClick={e => e.stopPropagation()}
                    title={`Supplier Return Note: ${g.hwcnNumber}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                  >
                    <ExternalLink size={11} /> {g.hwcnNumber}
                  </Link>
                ))}
              </div>
            ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
          </td>
        );
      }
      default:
        return null;
    }
  }

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Briefcase size={28} /> Refrigerant Jobs
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          Refrigerant usage grouped by job reference — gas dispensed, recovered and bottles used per job
        </p>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem", alignItems: "flex-end",
        padding: "1.25rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ flex: "1 1 250px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>Search</label>
          <div style={{ position: "relative" }}>
            <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Job ref, site, engineer..."
              style={{ width: "100%", padding: "0.65rem 0.75rem 0.65rem 2.25rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem" }}
            />
          </div>
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
            <Calendar size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />From
          </label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
        </div>

        <div style={{ flex: "0 1 160px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
            <Calendar size={12} style={{ marginRight: "0.25rem", verticalAlign: "middle" }} />To
          </label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#fff", fontSize: "0.85rem", colorScheme: "dark" }} />
        </div>

        <div style={{ flex: "0 1 200px" }}>
          <label style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", fontWeight: 600, textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>Category</label>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value as "all" | "service" | "recovery")}
            style={{ width: "100%", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(15,20,30,0.9)", color: "#fff", fontSize: "0.85rem" }}>
            <option value="all">All Jobs</option>
            <option value="service">Service Only</option>
            <option value="recovery">Recovery / Waste</option>
          </select>
        </div>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setCategoryFilter("all"); }}
            style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
          >
            <X size={14} /> Clear
          </button>
        )}

        <button
          onClick={() => setCustOpen(true)}
          style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
        >
          <Settings2 size={15} /> Columns
        </button>
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {sortedJobs.length} job{sortedJobs.length !== 1 ? "s" : ""}
        {hasFilters && <span style={{ color: "#00e5ff" }}> (filtered)</span>}
      </div>

      <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
        {sortedJobs.length === 0 ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
            <Briefcase size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
            <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No Jobs Found</p>
            <p style={{ fontSize: "0.85rem" }}>
              {hasFilters ? "Try adjusting your filters." : "Usage logs with a job reference will appear here."}
            </p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ ...thBase, width: "2rem", cursor: "default" }}></th>
                {visibleCols.map(k => renderHeader(k))}
              </tr>
            </thead>
            <tbody>
              {sortedJobs.map((job, idx) => {
                const isExpanded = expandedJobs.has(job.siteRef);
                return (
                  <React.Fragment key={job.siteRef}>
                    <tr
                      onClick={() => toggleExpand(job.siteRef)}
                      style={{
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.3)", paddingLeft: "1.25rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          <Link
                            href={`/admin/jobs/${job.siteRef}`}
                            onClick={e => e.stopPropagation()}
                            title={`Open job ${job.siteRef} detail`}
                            style={{ color: "rgba(255,255,255,0.3)", display: "inline-flex", alignItems: "center" }}
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </div>
                      </td>
                      {visibleCols.map(k => renderCell(k, job))}
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: "rgba(0,229,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td colSpan={visibleCols.length + 1} style={{ padding: "0 0 0.75rem 3rem" }}>
                          {job.logs.length === 0 ? (
                            <div style={{ padding: "0.75rem 1rem", fontSize: "0.82rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
                              No gas log entries for this job — decommissioned equipment only.
                            </div>
                          ) : (
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                            <thead>
                              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Serial</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Date</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Job Type</th>
                                <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "right" }}>Qty Used</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Before → After</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>HWCNs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {job.logs.map(log => {
                                const logHwcn = hwcns.find(h => h.serial === log.serial);
                                const logReturnNote = supplierReturnGroups.find(g => g.serials.includes(log.serial));
                                const isRecovery = RECOVERY_TYPES.has((log.jobType || "").toLowerCase());
                                return (
                                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 600 }}>
                                      <Link href={`/admin/bottles/${log.serial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>
                                        {log.serial}
                                      </Link>
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                      {log.date ? new Date(log.date).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: isRecovery ? "rgba(255,170,0,0.1)" : "rgba(34,197,94,0.1)", color: isRecovery ? "#ffaa00" : "#22c55e", textTransform: "capitalize" }}>
                                        {log.jobType || "—"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", textAlign: "right", fontWeight: 600, color: isRecovery ? "#ffaa00" : "#22c55e" }}>
                                      {log.weightUsed?.toFixed(2) || "—"} kg
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-geist-mono)", fontSize: "0.78rem" }}>
                                      {log.weightBefore?.toFixed(2) ?? "?"} → {log.weightAfter?.toFixed(2) ?? "?"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                                        {logHwcn && (
                                          <Link
                                            href={`/admin/hwcn/${encodeURIComponent(logHwcn.id)}`}
                                            title="Internal HWCN (job → office)"
                                            style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                                          >
                                            <ExternalLink size={11} /> {logHwcn.id?.slice(0, 8) || "HWCN"}
                                          </Link>
                                        )}
                                        {logReturnNote && (
                                          <Link
                                            href={`/admin/supplier-hwcn/${encodeURIComponent(logReturnNote.hwcnNumber)}`}
                                            title={`Return note (office → supplier): ${logReturnNote.hwcnNumber}`}
                                            style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", color: "#a855f7", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}
                                          >
                                            <ExternalLink size={11} /> {logReturnNote.hwcnNumber}
                                          </Link>
                                        )}
                                        {!logHwcn && !logReturnNote && (
                                          <span style={{ color: "var(--text-muted)" }}>—</span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

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
