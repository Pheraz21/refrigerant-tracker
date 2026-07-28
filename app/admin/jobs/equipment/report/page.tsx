"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { db, CrmJob, Bottle } from "@/lib/db";
import { Printer, ArrowLeft, Wrench, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ActionItem {
  usageLogId: string;
  date: string;
  jobRef: string | null;
  jobType: string;
  engineer: string;
  bottleSerial: string;
  equipmentWeight: number;
  weightBefore: number | null;
  weightAfter: number | null;
  siteTitle?: string | null;
}

function EquipmentReportContent() {
  const searchParams = useSearchParams();
  const targetSn = (searchParams.get("sn") || "").trim();
  const targetMfr = (searchParams.get("mfr") || "").trim();
  const targetMdl = (searchParams.get("mdl") || "").trim();
  const targetJob = (searchParams.get("job") || "").trim();

  const [loading, setLoading] = useState(true);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [bottleMap, setBottleMap] = useState<Map<string, Bottle>>(new Map());
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [crmJobMap, setCrmJobMap] = useState<Map<string, CrmJob>>(new Map());

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [logs, hwcnList] = await Promise.all([
          db.getUsageLogsWithEquipment(),
          db.getAllHWCNs(),
        ]);
        setRawLogs(logs || []);
        setHwcns(hwcnList || []);

        const bottleSerials = Array.from(
          new Set((logs || []).map((l: any) => l.serial).filter(Boolean))
        ) as string[];

        if (bottleSerials.length > 0) {
          const bottles = await db.getBottlesBySerials(bottleSerials);
          setBottleMap(new Map((bottles || []).map((b: Bottle) => [b.serial, b])));
        }

        const jobRefs = new Set<string>();
        (logs || []).forEach((l: any) => l.site_ref && jobRefs.add(l.site_ref));
        if (targetJob) jobRefs.add(targetJob);

        if (jobRefs.size > 0) {
          const jobs = await db.getCrmJobsByNumbers(Array.from(jobRefs));
          setCrmJobMap(new Map((jobs || []).map(j => [j.jobNumber, j])));
        }
      } catch (err) {
        console.error("Error loading equipment report data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [targetJob]);

  const { matchedActions, equipmentInfo, stats } = useMemo(() => {
    const actions: ActionItem[] = [];
    let representativeEq: { manufacturer: string; model: string; serial: string } | null = null;
    const engineersSet = new Set<string>();
    const jobsSet = new Set<string>();

    const targetSnLower = targetSn.toLowerCase();
    const targetMfrLower = targetMfr.toLowerCase();
    const targetMdlLower = targetMdl.toLowerCase();
    const targetJobLower = targetJob.toLowerCase();

    for (const log of rawLogs) {
      const logJobRef = log.site_ref || log.siteRef || "";
      if (targetJobLower && logJobRef.toLowerCase() !== targetJobLower) {
        continue;
      }

      const items: any[] = Array.isArray(log.equipment_details)
        ? log.equipment_details
        : Array.isArray(log.equipmentDetails)
        ? log.equipmentDetails
        : [];

      for (const eq of items) {
        const mfr = (eq.manufacturer || "").trim();
        const mdl = (eq.model || "").trim();
        const sn = (eq.serial || "").trim();

        if (!mfr && !mdl && !sn) continue;

        let isMatch = false;
        if (targetSnLower && sn.toLowerCase() === targetSnLower) {
          isMatch = true;
        } else if (!targetSnLower && targetMfrLower && targetMdlLower) {
          if (mfr.toLowerCase() === targetMfrLower && mdl.toLowerCase() === targetMdlLower) {
            isMatch = true;
          }
        } else if (!targetSnLower && !targetMfrLower && !targetMdlLower) {
          isMatch = true;
        }

        if (isMatch) {
          if (!representativeEq) {
            representativeEq = { manufacturer: mfr, model: mdl, serial: sn };
          }
          const eng = log.engineer || "—";
          if (eng !== "—") engineersSet.add(eng);
          if (logJobRef) jobsSet.add(logJobRef);

          actions.push({
            usageLogId: log.id,
            date: log.date,
            jobRef: logJobRef || null,
            jobType: log.job_type || log.jobType || "service",
            engineer: eng,
            bottleSerial: log.serial,
            equipmentWeight: parseFloat(String(eq.weight)) || parseFloat(String(log.weight_used || log.weightUsed)) || 0,
            weightBefore: log.weight_before ?? log.weightBefore ?? null,
            weightAfter: log.weight_after ?? log.weightAfter ?? null,
            siteTitle: logJobRef ? crmJobMap.get(logJobRef)?.siteTitle : null,
          });
        }
      }
    }

    actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalGasAdded = 0;
    let totalGasRecovered = 0;

    for (const act of actions) {
      const isRec = ["recovery", "retrofit", "waste", "reclaim"].includes((act.jobType || "").toLowerCase());
      if (isRec) {
        totalGasRecovered += (act.equipmentWeight || 0);
      } else {
        totalGasAdded += (act.equipmentWeight || 0);
      }
    }

    const netGas = totalGasAdded - totalGasRecovered;

    const firstDate = actions.length > 0 ? actions[actions.length - 1].date : null;
    const lastDate = actions.length > 0 ? actions[0].date : null;

    return {
      matchedActions: actions,
      equipmentInfo: representativeEq || {
        manufacturer: targetMfr || "Unknown",
        model: targetMdl || "—",
        serial: targetSn || "",
      },
      stats: {
        totalGasAdded,
        totalGasRecovered,
        netGas,
        serviceCount: actions.length,
        engineers: Array.from(engineersSet),
        jobsCount: jobsSet.size,
        firstDate,
        lastDate,
      },
    };
  }, [rawLogs, targetSn, targetMfr, targetMdl, targetJob, crmJobMap]);

  const targetCrmJob = targetJob ? crmJobMap.get(targetJob) : null;
  const primaryJob = targetCrmJob || (matchedActions.length > 0 && matchedActions[0].jobRef ? crmJobMap.get(matchedActions[0].jobRef!) : null);

  const jobTypeBadge = (jt: string) => {
    const raw = (jt || "").toLowerCase();
    const isRec = ["recovery", "retrofit", "waste", "reclaim"].includes(raw);
    const bg = isRec ? "rgba(255,170,0,0.12)" : "rgba(34,197,94,0.12)";
    const color = isRec ? "#ffaa00" : "#22c55e";
    const border = isRec ? "rgba(255,170,0,0.3)" : "rgba(34,197,94,0.3)";
    return (
      <span
        style={{
          fontSize: "0.7rem",
          fontWeight: 700,
          padding: "0.15rem 0.55rem",
          borderRadius: "4px",
          background: bg,
          color,
          border: `1px solid ${border}`,
          textTransform: "capitalize",
        }}
      >
        {jt || "Service"}
      </span>
    );
  };

  const categoryBadge = (cat?: string) => {
    if (!cat) return <span style={{ color: "rgba(255,255,255,0.25)" }}>—</span>;
    const color = cat === "new" ? "#22c55e" : cat === "reclaim" ? "#ffaa00" : cat === "nitrogen" ? "#3b82f6" : "rgba(255,255,255,0.4)";
    const bg = cat === "new" ? "rgba(34,197,94,0.1)" : cat === "reclaim" ? "rgba(255,170,0,0.1)" : cat === "nitrogen" ? "rgba(59,130,246,0.1)" : "transparent";
    return (
      <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.12rem 0.4rem", borderRadius: "3px", background: bg, color, textTransform: "capitalize" }}>
        {cat}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)", fontFamily: "sans-serif" }}>
        <Wrench size={28} style={{ margin: "0 auto 1rem auto", opacity: 0.5 }} />
        <div>Loading Equipment History...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0", fontFamily: "var(--font-geist-sans), sans-serif" }}>
      {/* ── Screen-Only Header Bar ───────────────────────────────────────────── */}
      <div className="no-print" style={{ background: "#111827", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "0.85rem 1.5rem", position: "sticky", top: 0, zIndex: 50, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/admin/jobs/equipment"
            style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}
          >
            <ArrowLeft size={16} /> Back to Equipment Register
          </Link>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          <Link
            href="/admin/jobs"
            style={{ color: "#94a3b8", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}
          >
            Jobs Overview
          </Link>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)",
            color: "#0a0e17",
            border: "none",
            borderRadius: "6px",
            padding: "0.5rem 1.25rem",
            fontWeight: 700,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 229, 255, 0.25)",
          }}
        >
          <Printer size={16} /> Print Equipment Report
        </button>
      </div>

      {/* ── Printable Report Container ───────────────────────────────────────── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Printable Official Letterhead (styled for print & screen) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid rgba(0, 229, 255, 0.4)", paddingBottom: "1.25rem", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src="/21-degrees-logo-reports.png" alt="21 Degrees" style={{ width: "95px", height: "auto" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>21 DEGREES LTD</h1>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px", lineHeight: "1.4" }}>
                Unit 10, Apollo Court, Monkton Business Park, Hebburn, NE31 2ES<br />
                Tel: 0191 5450545 &nbsp;·&nbsp; F-Gas Regulatory Audit Document
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              EQUIPMENT AUDIT REPORT
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
              Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

        {/* ── Equipment Header Summary Card ────────────────────────────────────── */}
        <div
          style={{
            background: "rgba(17, 24, 39, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.75rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Equipment Serial No.
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: equipmentInfo.serial ? "#00e5ff" : "#94a3b8", fontFamily: "var(--font-geist-mono), monospace", marginTop: "2px" }}>
              {equipmentInfo.serial || <span style={{ fontStyle: "italic", fontSize: "1rem" }}>No serial recorded</span>}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Make & Model
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {[equipmentInfo.manufacturer, equipmentInfo.model].filter(Boolean).join(" ") || "—"}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Job / Site Reference
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#f59e0b", fontFamily: "var(--font-geist-mono), monospace", marginTop: "2px" }}>
              {targetJob || (primaryJob ? primaryJob.jobNumber : "All Sites")}
            </div>
            {primaryJob?.siteTitle && (
              <div style={{ fontSize: "0.75rem", color: "#cbd5e1" }}>{primaryJob.siteTitle}</div>
            )}
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Net Refrigerant Added
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: stats.netGas > 0 ? "#22c55e" : stats.netGas < 0 ? "#ffaa00" : "#94a3b8", marginTop: "2px" }}>
              {stats.netGas > 0 ? `+${stats.netGas.toFixed(2)} kg` : `${stats.netGas.toFixed(2)} kg`}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
              Added: +{stats.totalGasAdded.toFixed(2)} kg · Recovered: -{stats.totalGasRecovered.toFixed(2)} kg
            </div>
          </div>
        </div>

        {/* ── Key Metrics & Date Range ────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "8px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>Gas Added (Charged)</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#22c55e", marginTop: "2px" }}>+{stats.totalGasAdded.toFixed(2)} kg</div>
          </div>

          <div style={{ background: "rgba(255,170,0,0.06)", border: "1px solid rgba(255,170,0,0.2)", borderRadius: "8px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#ffaa00", fontWeight: 700, textTransform: "uppercase" }}>Gas Recovered (Removed)</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#ffaa00", marginTop: "2px" }}>-{stats.totalGasRecovered.toFixed(2)} kg</div>
          </div>

          <div style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#00e5ff", fontWeight: 700, textTransform: "uppercase" }}>Net System Change</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: stats.netGas > 0 ? "#22c55e" : stats.netGas < 0 ? "#ffaa00" : "#fff", marginTop: "2px" }}>
              {stats.netGas > 0 ? `+${stats.netGas.toFixed(2)} kg` : `${stats.netGas.toFixed(2)} kg`}
            </div>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 600 }}>Service Events & Range</div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>{stats.serviceCount} event{stats.serviceCount !== 1 ? "s" : ""}</div>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
              {stats.firstDate ? new Date(stats.firstDate).toLocaleDateString("en-GB") : "—"} – {stats.lastDate ? new Date(stats.lastDate).toLocaleDateString("en-GB") : "—"}
            </div>
          </div>
        </div>

        {/* ── Bottle Actions / Service Log Table ───────────────────────────────── */}
        <div style={{ background: "rgba(17, 24, 39, 0.6)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <FileText size={18} style={{ color: "#00e5ff" }} /> Bottle Actions & Service History
            </h3>
            <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>{matchedActions.length} log entry{matchedActions.length !== 1 ? "s" : ""}</span>
          </div>

          {matchedActions.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", fontStyle: "italic" }}>
              No bottle usage or recovery logs recorded for this equipment.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textWrap: "nowrap" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Bottle Serial</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Category</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Gas Type</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Job Ref / Site</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Action Type</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Gas Qty</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Before → After</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>HWCN / Return</th>
                    <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.68rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Engineer</th>
                  </tr>
                </thead>
                <tbody>
                  {matchedActions.map((act, idx) => {
                    const bottle = bottleMap.get(act.bottleSerial);
                    const hwcnMatch = hwcns.find((h: any) => h.serial === act.bottleSerial);
                    const isRec = ["recovery", "retrofit", "waste", "reclaim"].includes((act.jobType || "").toLowerCase());

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700, color: "#00e5ff" }}>
                          <Link href={`/admin/bottles/${act.bottleSerial}`} style={{ color: "#00e5ff", textDecoration: "none" }}>
                            {act.bottleSerial}
                          </Link>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>{categoryBadge(bottle?.category)}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#cbd5e1" }}>{bottle?.gasType || "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#94a3b8" }}>
                          {act.date ? new Date(act.date).toLocaleDateString("en-GB") : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#cbd5e1" }}>
                          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontWeight: 600, color: "#f59e0b" }}>{act.jobRef || "—"}</div>
                          {act.siteTitle && <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>{act.siteTitle}</div>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>{jobTypeBadge(act.jobType)}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 700, color: isRec ? "#ffaa00" : "#22c55e" }}>
                          {isRec ? `-${act.equipmentWeight.toFixed(2)} kg` : `+${act.equipmentWeight.toFixed(2)} kg`}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "var(--font-geist-mono), monospace", color: "#94a3b8" }}>
                          {act.weightBefore !== null ? act.weightBefore.toFixed(2) : "?"} → {act.weightAfter !== null ? act.weightAfter.toFixed(2) : "?"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {hwcnMatch ? (
                            <Link href={`/admin/hwcn/${encodeURIComponent(hwcnMatch.id)}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff", padding: "0.15rem 0.45rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, textDecoration: "none" }}>
                              <ExternalLink size={10} /> {hwcnMatch.id?.slice(0, 8) || "HWCN"}
                            </Link>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#cbd5e1" }}>{act.engineer}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Report Footer */}
        <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "1rem", textAlign: "center", fontSize: "0.75rem", color: "#64748b" }}>
          21 Degrees F-Gas Cylinder & Equipment Tracking System &nbsp;·&nbsp; Confidential Regulatory Record
        </div>
      </div>
    </div>
  );
}

export default function EquipmentReportPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", color: "#94a3b8", textAlign: "center" }}>Loading Equipment Details...</div>}>
      <EquipmentReportContent />
    </Suspense>
  );
}
