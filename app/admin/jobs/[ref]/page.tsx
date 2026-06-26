"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, CrmJob, UsageLog, Bottle } from "@/lib/db";
import Link from "next/link";
import {
  ArrowLeft, Briefcase, Printer, ExternalLink,
  AlertTriangle, Thermometer, RotateCcw, Wind, Trash2, FileText
} from "lucide-react";

const RECOVERY_TYPES = new Set(["recovery", "waste", "reclaim"]);

// ── Shared PDF styles ─────────────────────────────────────────────────────────
const PDF_BASE_STYLES = `
  @page { margin: 10mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
  .logo-section { display: flex; gap: 15px; align-items: flex-end; }
  .company-info { font-size: 10px; line-height: 1.4; color: #555; }
  .report-info { text-align: right; }
  .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1a202c; }
  .report-meta { font-size: 11px; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th { background: #f8f9fa; padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; border-bottom: 2px solid #ddd; }
  td { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #f0f0f0; }
  .total-row { font-weight: 700; background: #f9f9f9; }
  .footer { margin-top: 24px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
  .job-block { margin-bottom: 24px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; page-break-inside: avoid; }
  .job-header { background: #f5f5f5; padding: 12px 16px; border-bottom: 1px solid #ddd; }
  .job-header h3 { font-size: 14px; margin-bottom: 4px; }
  .job-header p { font-size: 12px; color: #666; }
  @media print { body { padding: 15px; } }
`;

const companyHeader = (title: string, meta: string) => `
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ref = decodeURIComponent(params.ref as string);

  const [loading, setLoading] = useState(true);
  const [crmJob, setCrmJob] = useState<CrmJob | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [decomRecords, setDecomRecords] = useState<any[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      // Phase 1: fetch CRM + logs + decom in parallel
      const [crm, logs, decom] = await Promise.all([
        db.getCrmJobByNumber(ref),
        db.getUsageLogsBySiteRef(ref),
        db.getDecommissionsByJobNumber(ref)
      ]);
      setCrmJob(crm);
      setUsageLogs(logs);
      setDecomRecords(decom);

      // Phase 2: fetch bottles + HWCNs using serials from logs
      const serials = [...new Set(logs.map(l => l.serial))];
      const [btls, hws] = await Promise.all([
        db.getBottlesBySerials(serials),
        db.getHWCNsBySerials(serials)
      ]);
      setBottles(btls);
      setHwcns(hws);
      setLoading(false);
    };
    load();
  }, [ref]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const bottleMap = new Map(bottles.map(b => [b.serial, b]));
  const gasType = (serial: string) => bottleMap.get(serial)?.gasType ?? "—";
  const isNitrogen = (serial: string) => bottleMap.get(serial)?.category === "nitrogen";

  const newGasLogs   = usageLogs.filter(l => !RECOVERY_TYPES.has((l.jobType || "").toLowerCase()) && !isNitrogen(l.serial));
  const recoveryLogs = usageLogs.filter(l => RECOVERY_TYPES.has((l.jobType || "").toLowerCase()));
  const nitrogenLogs = usageLogs.filter(l => !RECOVERY_TYPES.has((l.jobType || "").toLowerCase()) && isNitrogen(l.serial));

  const totalNewGas    = newGasLogs.reduce((s, l) => s + (l.weightUsed || 0), 0);
  const totalRecovered = recoveryLogs.reduce((s, l) => s + (l.weightUsed || 0), 0);
  const totalNitrogen  = nitrogenLogs.reduce((s, l) => s + (l.weightUsed || 0), 0);
  const totalDecomWt   = decomRecords.flatMap(r => r.equipment || []).reduce((s: number, e: any) => s + (e.weightRecovered || 0), 0);
  const decomItemCount = decomRecords.flatMap(r => r.equipment || []).length;

  const hasAnyData = crmJob || usageLogs.length > 0 || decomRecords.length > 0;

  // ── PDF generators ────────────────────────────────────────────────────────────
  const printRefrigerantLog = () => {
    const logs = [...newGasLogs, ...recoveryLogs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!logs.length) return;
    const reportDate = new Date().toLocaleDateString("en-GB");
    const uniqueBottles = new Set(logs.map(l => l.serial)).size;
    const rows = logs.map(log => {
      const isRec = RECOVERY_TYPES.has((log.jobType || "").toLowerCase());
      return `<tr>
        <td style="white-space:nowrap">${new Date(log.date).toLocaleDateString("en-GB")}</td>
        <td style="font-family:monospace;font-weight:600">${log.serial}</td>
        <td>${gasType(log.serial)}</td>
        <td>${log.engineer || "—"}</td>
        <td><span style="font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;background:${isRec ? "#fff3cd" : "#d4edda"};color:${isRec ? "#856404" : "#155724"}">${log.jobType || "—"}</span></td>
        <td style="text-align:right;font-weight:600;color:${isRec ? "#856404" : "#155724"}">${(log.weightUsed || 0).toFixed(2)} kg</td>
        <td style="text-align:right">${log.weightBefore?.toFixed(2) ?? "—"} kg</td>
        <td style="text-align:right">${log.weightAfter?.toFixed(2) ?? "—"} kg</td>
      </tr>`;
    }).join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><style>
      @page{margin:10mm;size:A4 landscape;}${PDF_BASE_STYLES}
      .summary-table{width:100%;margin-bottom:20px;border-collapse:separate;border-spacing:0;background:#f9fafb;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;}
      .summary-cell{padding:12px 15px;border-right:1px solid #e2e8f0;vertical-align:top;}
      .summary-cell:last-child{border-right:none;}
      .summary-label{font-size:8px;color:#718096;text-transform:uppercase;margin-bottom:4px;font-weight:700;letter-spacing:0.1em;}
      .summary-value{font-size:14px;font-weight:bold;color:#1a202c;white-space:nowrap;}
    </style></head><body>
    ${companyHeader("Used Refrigerant Log", `<div>Generated: ${reportDate}</div><div>Job: ${ref}</div>${crmJob?.siteTitle ? `<div>${crmJob.siteTitle}</div>` : ""}`)}
    <table class="summary-table"><tr>
      <td class="summary-cell"><div class="summary-label">Job Reference</div><div class="summary-value">${ref}</div></td>
      ${crmJob?.customer ? `<td class="summary-cell"><div class="summary-label">Customer</div><div class="summary-value">${crmJob.customer}</div></td>` : ""}
      ${crmJob?.siteTitle ? `<td class="summary-cell"><div class="summary-label">Site</div><div class="summary-value">${crmJob.siteTitle}</div></td>` : ""}
      ${(crmJob?.siteAddress || crmJob?.sitePostcode) ? `<td class="summary-cell"><div class="summary-label">Address</div><div class="summary-value" style="font-size:12px">${[crmJob.siteAddress, crmJob.sitePostcode].filter(Boolean).join(", ")}</div></td>` : ""}
      <td class="summary-cell"><div class="summary-label">Cylinders</div><div class="summary-value">${uniqueBottles}</div></td>
      <td class="summary-cell"><div class="summary-label">Gas Dispensed</div><div class="summary-value">${totalNewGas.toFixed(2)} kg</div></td>
      <td class="summary-cell"><div class="summary-label">Gas Recovered</div><div class="summary-value">${totalRecovered.toFixed(2)} kg</div></td>
    </tr></table>
    <table>
      <thead><tr>
        <th style="width:80px">Date</th><th style="width:110px">Bottle</th><th>Gas Type</th>
        <th>Engineer</th><th style="width:80px">Type</th>
        <th style="width:80px;text-align:right">Qty</th>
        <th style="width:90px;text-align:right">Wt Before</th>
        <th style="width:90px;text-align:right">Wt After</th>
      </tr></thead>
      <tbody>${rows}
        <tr class="total-row"><td colspan="5" style="text-align:right">Total</td>
          <td style="text-align:right">${(totalNewGas + totalRecovered).toFixed(2)} kg</td>
          <td colspan="2"></td></tr>
      </tbody>
    </table>
    <div class="footer">Used Refrigerant Log | 21 Degrees Ltd | Job: ${ref}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  const printDecomPdf = () => {
    if (!decomRecords.length) return;
    const reportDate = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
    const flatRows = decomRecords.flatMap(rec =>
      (rec.equipment || []).map((eq: any) => ({ ...rec, eq }))
    );
    const grouped: Record<string, { rec: any; eqs: any[] }> = {};
    decomRecords.forEach(rec => { grouped[rec.id] = { rec, eqs: rec.equipment || [] }; });

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><style>
      @page{margin:10mm;size:A4 portrait;}${PDF_BASE_STYLES}
    </style></head><body>
    ${companyHeader("Decommissioned Equipment", `<div>Generated: ${reportDate}</div><div>Job: ${ref}</div>${crmJob?.siteTitle ? `<div>${crmJob.siteTitle}</div>` : ""}${crmJob?.customer ? `<div>${crmJob.customer}</div>` : ""}${(crmJob?.siteAddress || crmJob?.sitePostcode) ? `<div>${[crmJob.siteAddress, crmJob.sitePostcode].filter(Boolean).join(", ")}</div>` : ""}`)}
    ${Object.values(grouped).map(({ rec, eqs }) => {
      const total = eqs.reduce((s, e) => s + (e.weightRecovered || 0), 0);
      return `<div class="job-block">
        <div class="job-header">
          <h3>${rec.jobNumber || ref} — ${rec.siteName || "Unknown Site"}</h3>
          <p>${rec.siteAddress || ""}${rec.sitePostcode ? `, ${rec.sitePostcode}` : ""} | Engineer: ${rec.engineer || "—"} | Date: ${rec.date ? new Date(rec.date).toLocaleDateString("en-GB") : "—"} | Gas: ${rec.gasType || "—"}</p>
        </div>
        <table><thead><tr>
          <th>Manufacturer</th><th>Model</th><th>Serial No.</th><th style="text-align:right">Weight Recovered</th>
        </tr></thead><tbody>
          ${eqs.map(e => `<tr>
            <td>${e.manufacturer || "—"}</td>
            <td>${e.model || "—"}</td>
            <td style="font-family:monospace;font-weight:600">${e.serial || "—"}</td>
            <td style="text-align:right">${(e.weightRecovered || 0).toFixed(2)} kg</td>
          </tr>`).join("")}
          <tr class="total-row"><td colspan="3">Total Recovered</td><td style="text-align:right">${total.toFixed(2)} kg</td></tr>
        </tbody></table>
      </div>`;
    }).join("")}
    <div class="footer">Decommissioned Equipment Report | 21 Degrees Ltd | ${flatRows.length} item(s) for job ${ref}</div>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // ── Styles ───────────────────────────────────────────────────────────────────
  const sectionCard: React.CSSProperties = {
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: "12px", overflow: "hidden", marginBottom: "1.25rem"
  };
  const sectionHeader: React.CSSProperties = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "0.85rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(255,255,255,0.02)"
  };
  const sectionTitle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    fontSize: "0.9rem", fontWeight: 700, color: "#fff"
  };
  const th: React.CSSProperties = {
    padding: "0.55rem 1rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 600,
    color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.05em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap"
  };
  const td: React.CSSProperties = {
    padding: "0.65rem 1rem", fontSize: "0.84rem", color: "rgba(255,255,255,0.8)",
    borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "middle"
  };
  const pdfBtn = (color: string): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: "0.35rem",
    background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.25)`,
    color: `rgb(${color})`, padding: "0.35rem 0.75rem", borderRadius: "6px",
    cursor: "pointer", fontSize: "0.78rem", fontWeight: 600
  });
  const detailLabel: React.CSSProperties = {
    fontSize: "0.7rem", fontWeight: 600, color: "rgba(255,255,255,0.35)",
    textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem"
  };
  const detailValue: React.CSSProperties = { fontSize: "0.9rem", color: "#fff", fontWeight: 500 };

  if (loading) return (
    <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
      Loading job {ref}…
    </div>
  );

  if (!hasAnyData) return (
    <div style={{ padding: "3rem", textAlign: "center" }}>
      <Briefcase size={48} style={{ color: "rgba(255,255,255,0.15)", marginBottom: "1rem" }} />
      <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#fff", marginBottom: "0.5rem" }}>Job not found</p>
      <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>
        No data found for job reference <strong style={{ color: "#00e5ff" }}>{ref}</strong>.
      </p>
      <button onClick={() => router.back()} style={{ ...pdfBtn("0,229,255"), fontSize: "0.85rem" }}>
        <ArrowLeft size={14} /> Go Back
      </button>
    </div>
  );

  const hasRefLog = newGasLogs.length > 0 || recoveryLogs.length > 0;

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* ── Back + action header ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <Link href="/admin/jobs" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.45)", fontSize: "0.85rem", textDecoration: "none" }}>
          <ArrowLeft size={15} /> Refrigerant Jobs
        </Link>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          {hasRefLog && (
            <button onClick={printRefrigerantLog} style={pdfBtn("255,170,0")}>
              <Printer size={14} /> Ref. Log PDF
            </button>
          )}
          {decomRecords.length > 0 && (
            <button onClick={printDecomPdf} style={pdfBtn("255,170,0")}>
              <Printer size={14} /> Decom PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Page title ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.2rem 0.7rem", borderRadius: "6px", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: 700 }}>
            {crmJob?.prefix}{ref}
          </span>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: 0 }}>
            {crmJob?.jobTitle || crmJob?.siteTitle || "Refrigerant Job"}
          </h1>
        </div>
        {crmJob?.customer && (
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", marginTop: "0.25rem" }}>{crmJob.customer}</p>
        )}
      </div>

      {/* ── Stats row ────────────────────────────────────────────────────────── */}
      {(totalNewGas > 0 || totalRecovered > 0 || totalNitrogen > 0 || decomItemCount > 0) && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          {totalNewGas > 0 && (
            <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "10px", padding: "0.75rem 1.25rem", minWidth: "130px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(34,197,94,0.7)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Gas Dispensed</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#22c55e" }}>{totalNewGas.toFixed(2)} kg</div>
            </div>
          )}
          {totalRecovered > 0 && (
            <div style={{ background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "10px", padding: "0.75rem 1.25rem", minWidth: "130px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,170,0,0.7)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Recovered</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ffaa00" }}>{totalRecovered.toFixed(2)} kg</div>
            </div>
          )}
          {totalNitrogen > 0 && (
            <div style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)", borderRadius: "10px", padding: "0.75rem 1.25rem", minWidth: "130px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(0,229,255,0.5)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Nitrogen</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#00e5ff" }}>{totalNitrogen.toFixed(2)} kg</div>
            </div>
          )}
          {decomItemCount > 0 && (
            <div style={{ background: "rgba(255,51,102,0.06)", border: "1px solid rgba(255,51,102,0.15)", borderRadius: "10px", padding: "0.75rem 1.25rem", minWidth: "130px" }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,51,102,0.6)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>Decom Items</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ff3366" }}>{decomItemCount} <span style={{ fontSize: "0.8rem" }}>({totalDecomWt.toFixed(2)} kg)</span></div>
            </div>
          )}
        </div>
      )}

      {/* ── CRM Details card ─────────────────────────────────────────────────── */}
      <div style={sectionCard}>
        <div style={sectionHeader}>
          <span style={sectionTitle}><FileText size={16} color="#00e5ff" /> Job Details</span>
          {!crmJob && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", color: "#ffaa00" }}>
              <AlertTriangle size={13} /> Not in CRM database
            </span>
          )}
        </div>
        {crmJob ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1.25rem", padding: "1.25rem" }}>
            {[
              { label: "Job No.", value: `${crmJob.prefix}${crmJob.jobNumber}` },
              { label: "Title", value: crmJob.jobTitle },
              { label: "Customer", value: crmJob.customer },
              { label: "Site", value: crmJob.siteTitle },
              { label: "Address", value: crmJob.siteAddress },
              { label: "Postcode", value: crmJob.sitePostcode },
              { label: "Start Date", value: crmJob.startDate },
              { label: "Category", value: crmJob.category },
              { label: "Fault Code", value: crmJob.faultCode },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <div style={detailLabel}>{label}</div>
                <div style={detailValue}>{value}</div>
              </div>
            ) : null)}
            <div>
              <div style={detailLabel}>UPRN</div>
              {crmJob.uprn ? (
                <div style={{ ...detailValue, fontFamily: "monospace", color: "#00e5ff" }}>{crmJob.uprn}</div>
              ) : (
                <span style={{ fontSize: "0.78rem", color: "#ffaa00", background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.2)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>Not found</span>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: "1.25rem", fontSize: "0.85rem", color: "rgba(255,255,255,0.35)" }}>
            This job reference has no CRM record. Import an Excel file on the All Jobs page to add details.
          </div>
        )}
      </div>

      {/* ── New Refrigerant ───────────────────────────────────────────────────── */}
      {newGasLogs.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}><Thermometer size={16} color="#22c55e" /> New Refrigerant</span>
            <span style={{ fontSize: "0.82rem", color: "#22c55e", fontWeight: 600 }}>{totalNewGas.toFixed(2)} kg dispensed</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Date", "Bottle", "Gas Type", "Engineer", "Job Type", "Qty Used", "Wt Before", "Wt After"].map(h => (
                    <th key={h} style={{ ...th, textAlign: h.startsWith("Qty") || h.startsWith("Wt") ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newGasLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                    <td style={{ ...td, fontFamily: "monospace", color: "#00e5ff", fontWeight: 600 }}>
                      <Link href={`/admin/bottles/${log.serial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>{log.serial}</Link>
                    </td>
                    <td style={td}>{gasType(log.serial)}</td>
                    <td style={td}>{log.engineer || "—"}</td>
                    <td style={td}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(34,197,94,0.1)", color: "#22c55e", textTransform: "capitalize" }}>{log.jobType}</span>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#22c55e" }}>{(log.weightUsed || 0).toFixed(2)} kg</td>
                    <td style={{ ...td, textAlign: "right", color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "0.8rem" }}>{log.weightBefore?.toFixed(2) ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "0.8rem" }}>{log.weightAfter?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={printRefrigerantLog} style={pdfBtn("255,170,0")}><Printer size={13} /> Ref. Log PDF</button>
          </div>
        </div>
      )}

      {/* ── Recovery / Reclaim ────────────────────────────────────────────────── */}
      {recoveryLogs.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}><RotateCcw size={16} color="#ffaa00" /> Recovery / Reclaim</span>
            <span style={{ fontSize: "0.82rem", color: "#ffaa00", fontWeight: 600 }}>{totalRecovered.toFixed(2)} kg recovered</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Date", "Bottle", "Gas Type", "Engineer", "Type", "Qty Recovered", "HWCN"].map(h => (
                    <th key={h} style={{ ...th, textAlign: h === "Qty Recovered" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recoveryLogs.map(log => {
                  const logHwcn = hwcns.find(h => h.serial === log.serial);
                  return (
                    <tr key={log.id}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                      <td style={{ ...td, fontFamily: "monospace", color: "#00e5ff", fontWeight: 600 }}>
                        <Link href={`/admin/bottles/${log.serial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>{log.serial}</Link>
                      </td>
                      <td style={td}>{gasType(log.serial)}</td>
                      <td style={td}>{log.engineer || "—"}</td>
                      <td style={td}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: "rgba(255,170,0,0.1)", color: "#ffaa00", textTransform: "capitalize" }}>{log.jobType}</span>
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#ffaa00" }}>{(log.weightUsed || 0).toFixed(2)} kg</td>
                      <td style={td}>
                        {logHwcn ? (
                          <Link href="/admin/hwcn" style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none" }}>
                            <ExternalLink size={11} /> {logHwcn.id?.slice(0, 10) || "HWCN"}
                          </Link>
                        ) : <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Nitrogen ──────────────────────────────────────────────────────────── */}
      {nitrogenLogs.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}><Wind size={16} color="#00e5ff" /> Nitrogen</span>
            <span style={{ fontSize: "0.82rem", color: "#00e5ff", fontWeight: 600 }}>{totalNitrogen.toFixed(2)} kg used</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Date", "Bottle", "Engineer", "Qty Used", "Wt Before", "Wt After"].map(h => (
                    <th key={h} style={{ ...th, textAlign: h.startsWith("Qty") || h.startsWith("Wt") ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {nitrogenLogs.map(log => (
                  <tr key={log.id}>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                    <td style={{ ...td, fontFamily: "monospace", color: "#00e5ff", fontWeight: 600 }}>
                      <Link href={`/admin/bottles/${log.serial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>{log.serial}</Link>
                    </td>
                    <td style={td}>{log.engineer || "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#00e5ff" }}>{(log.weightUsed || 0).toFixed(2)} kg</td>
                    <td style={{ ...td, textAlign: "right", color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "0.8rem" }}>{log.weightBefore?.toFixed(2) ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right", color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontSize: "0.8rem" }}>{log.weightAfter?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Decommissioned Equipment ──────────────────────────────────────────── */}
      {decomRecords.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}><Trash2 size={16} color="#ff3366" /> Decommissioned Equipment</span>
            <span style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.45)" }}>{decomItemCount} item{decomItemCount !== 1 ? "s" : ""} · {totalDecomWt.toFixed(2)} kg recovered</span>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  {["Date", "Engineer", "Bottle", "Gas Type", "Manufacturer", "Model", "Serial No.", "Wt Recovered"].map(h => (
                    <th key={h} style={{ ...th, textAlign: h === "Wt Recovered" ? "right" : "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decomRecords.flatMap(rec =>
                  (rec.equipment || []).map((eq: any, i: number) => (
                    <tr key={`${rec.id}-${i}`}>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{rec.date ? new Date(rec.date).toLocaleDateString("en-GB") : "—"}</td>
                      <td style={td}>{rec.engineer || "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", color: "#00e5ff", fontWeight: 600 }}>
                        {rec.bottleSerial ? (
                          <Link href={`/admin/bottles/${rec.bottleSerial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>{rec.bottleSerial}</Link>
                        ) : "—"}
                      </td>
                      <td style={td}>{rec.gasType || "—"}</td>
                      <td style={td}>{eq.manufacturer || "—"}</td>
                      <td style={td}>{eq.model || "—"}</td>
                      <td style={{ ...td, fontFamily: "monospace", fontWeight: 600 }}>{eq.serial || "—"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 600, color: "#ff3366" }}>{(eq.weightRecovered || 0).toFixed(2)} kg</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "flex-end" }}>
            <button onClick={printDecomPdf} style={pdfBtn("255,51,102")}><Printer size={13} /> Decom PDF</button>
          </div>
        </div>
      )}

      {/* ── HWCNs ────────────────────────────────────────────────────────────── */}
      {hwcns.length > 0 && (
        <div style={sectionCard}>
          <div style={sectionHeader}>
            <span style={sectionTitle}><FileText size={16} color="#00e5ff" /> Waste Consignment Notes</span>
          </div>
          <div style={{ padding: "1rem 1.25rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            {hwcns.map(h => (
              <Link key={h.id} href="/admin/hwcn" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "rgba(0,229,255,0.07)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.4rem 0.75rem", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none" }}>
                <ExternalLink size={13} /> {h.id}
                {h.hwcnStatus && (
                  <span style={{ fontSize: "0.68rem", background: "rgba(255,255,255,0.08)", padding: "0.05rem 0.35rem", borderRadius: "3px", color: "rgba(255,255,255,0.5)", marginLeft: "0.25rem" }}>{h.hwcnStatus}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
