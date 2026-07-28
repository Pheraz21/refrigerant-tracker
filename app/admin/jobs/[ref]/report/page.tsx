"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import { db, CrmJob, UsageLog, Bottle } from "@/lib/db";
import { Printer, ArrowLeft, Briefcase, Calendar, MapPin, User, FileText, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function JobAuditReportPage({ params }: { params: Promise<{ ref: string }> }) {
  const resolvedParams = use(params);
  const jobRef = decodeURIComponent(resolvedParams.ref || "").trim();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [crmJob, setCrmJob] = useState<CrmJob | null>(null);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [decomRecords, setDecomRecords] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!jobRef) return;
      setLoading(true);
      try {
        const [jobData, logsData, decomData] = await Promise.all([
          db.getCrmJobByNumber(jobRef),
          db.getUsageLogsBySiteRef(jobRef),
          db.getDecommissionsByJobNumber(jobRef),
        ]);
        setCrmJob(jobData);
        setUsageLogs(logsData || []);
        setDecomRecords(decomData || []);
      } catch (err) {
        console.error("Error loading job report data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [jobRef]);

  const stats = useMemo(() => {
    const RECOVERY_TYPES = new Set(["recovery", "waste", "reclaim", "recovered"]);
    let totalAdded = 0;
    let totalRecovered = 0;
    const engineerSet = new Set<string>();
    const bottleSet = new Set<string>();

    usageLogs.forEach(u => {
      const rawType = (u.jobType || "").toLowerCase();
      const isRec = RECOVERY_TYPES.has(rawType);
      const wt = u.weightUsed || 0;
      if (isRec) totalRecovered += wt;
      else totalAdded += wt;
      if (u.engineer) engineerSet.add(u.engineer);
      if (u.serial) bottleSet.add(u.serial);
    });

    decomRecords.forEach(d => {
      const decomWt = d.totalWeightRecovered || 0;
      totalRecovered += decomWt;
      if (d.engineer) engineerSet.add(d.engineer);
    });

    const netBalance = totalAdded - totalRecovered;

    return {
      totalAdded,
      totalRecovered,
      netBalance,
      engineerCount: engineerSet.size,
      bottleCount: bottleSet.size,
      actionCount: usageLogs.length + decomRecords.length,
    };
  }, [usageLogs, decomRecords]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#00e5ff", marginBottom: "0.5rem" }}>
            Generating Job Refrigerant Audit Report...
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Loading site history for {jobRef}</div>
        </div>
      </div>
    );
  }

  const reportDateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const siteTitle = crmJob?.siteTitle || usageLogs[0]?.siteName || jobRef;
  const siteAddress = [crmJob?.siteAddress || usageLogs[0]?.siteAddress, crmJob?.sitePostcode].filter(Boolean).join(", ");
  const customerName = crmJob?.customer || "—";

  return (
    <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0", fontFamily: "var(--font-geist-sans), sans-serif" }}>
      {/* ── Screen-Only Top Control Bar ─────────────────────────────────────── */}
      <div
        className="no-print"
        style={{
          background: "rgba(17, 24, 39, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            onClick={() => router.push(`/admin/jobs/${encodeURIComponent(jobRef)}`)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#94a3b8",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "6px",
              padding: "0.45rem 0.85rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <ArrowLeft size={16} /> Back to Job
          </button>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
          <span style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "var(--font-geist-mono)" }}>
            Job Ref: <strong style={{ color: "#00e5ff" }}>{jobRef}</strong>
          </span>
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
            fontWeight: 800,
            fontSize: "0.88rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 229, 255, 0.25)",
          }}
        >
          <Printer size={16} /> Print Job Report
        </button>
      </div>

      {/* ── Printable Report Container ───────────────────────────────────────── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* Printable Official Letterhead */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid rgba(0, 229, 255, 0.4)", paddingBottom: "1.25rem", marginBottom: "1.75rem" }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src="/21-degrees-logo-reports.png" alt="21 Degrees" style={{ width: "95px", height: "auto" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>21 DEGREES LTD</h1>
              <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "2px", lineHeight: "1.4" }}>
                Unit 10, Apollo Court, Monkton Business Park, Hebburn, NE31 2ES<br />
                Tel: 0191 5450545 &nbsp;·&nbsp; F-Gas Site Refrigerant Compliance Audit
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              JOB REFRIGERANT REPORT
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
              Generated: {reportDateStr}
            </div>
          </div>
        </div>

        {/* ── Site Metadata Header Card ────────────────────────────────────────── */}
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
              Job Reference
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#00e5ff", fontFamily: "var(--font-geist-mono), monospace", marginTop: "2px" }}>
              {jobRef}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Site / Customer
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {siteTitle} <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>({customerName})</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Site Address
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginTop: "2px" }}>
              {siteAddress || "—"}
            </div>
          </div>
        </div>

        {/* ── Summary Metric Cards ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.2)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>Gas Added (+)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#22c55e", marginTop: "0.2rem" }}>
              +{stats.totalAdded.toFixed(2)} kg
            </div>
          </div>

          <div style={{ background: "rgba(255, 170, 0, 0.06)", border: "1px solid rgba(255, 170, 0, 0.2)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#ffaa00", fontWeight: 700, textTransform: "uppercase" }}>Gas Recovered (-)</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ffaa00", marginTop: "0.2rem" }}>
              -{stats.totalRecovered.toFixed(2)} kg
            </div>
          </div>

          <div style={{
            background: stats.netBalance >= 0 ? "rgba(0, 229, 255, 0.06)" : "rgba(255, 51, 102, 0.06)",
            border: stats.netBalance >= 0 ? "1px solid rgba(0, 229, 255, 0.2)" : "1px solid rgba(255, 51, 102, 0.2)",
            borderRadius: "8px", padding: "1rem 1.25rem"
          }}>
            <div style={{ fontSize: "0.7rem", color: stats.netBalance >= 0 ? "#00e5ff" : "#ff3366", fontWeight: 700, textTransform: "uppercase" }}>Net System Change</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: stats.netBalance >= 0 ? "#00e5ff" : "#ff3366", marginTop: "0.2rem" }}>
              {stats.netBalance >= 0 ? `+${stats.netBalance.toFixed(2)}` : stats.netBalance.toFixed(2)} kg
            </div>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Cylinders & Engineers</div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem" }}>
              {stats.bottleCount} Cylinder{stats.bottleCount !== 1 ? "s" : ""} · {stats.engineerCount} Eng
            </div>
          </div>
        </div>

        {/* ── Refrigerant Action Log Table ────────────────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="#00e5ff" /> Refrigerant Service & Recovery Logs ({usageLogs.length} entries)
          </h2>

          <div style={{ border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", overflow: "hidden", background: "rgba(17, 24, 39, 0.4)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Action</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Cylinder Serial</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Equipment / Asset</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Quantity</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Engineer</th>
                </tr>
              </thead>
              <tbody>
                {usageLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                      No refrigerant usage or recovery logged for this job.
                    </td>
                  </tr>
                ) : (
                  usageLogs.map((u) => {
                    const rawType = (u.jobType || "").toLowerCase();
                    const isRec = rawType.includes("recovery") || rawType.includes("waste") || rawType.includes("reclaim");
                    const eqItems = Array.isArray(u.equipmentDetails) ? u.equipmentDetails : [];
                    const eqSummary = eqItems.map(eq => [eq.manufacturer, eq.model ? eq.model.toUpperCase() : "", eq.serial ? `(SN: ${eq.serial.toUpperCase()})` : ""].filter(Boolean).join(" ")).join(" | ");

                    return (
                      <tr key={u.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "rgba(255, 255, 255, 0.7)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.78rem" }}>
                          {new Date(u.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "4px", textTransform: "uppercase",
                            background: isRec ? "rgba(255, 170, 0, 0.12)" : "rgba(34, 197, 94, 0.12)",
                            color: isRec ? "#ffaa00" : "#22c55e"
                          }}>
                            {u.jobType}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700, color: "#00e5ff" }}>
                          {u.serial}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "rgba(255, 255, 255, 0.85)" }}>
                          {eqSummary || "General Site Action"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: isRec ? "#ffaa00" : "#22c55e" }}>
                          {isRec ? '-' : '+'}{(u.weightUsed || 0).toFixed(2)} kg
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "rgba(255, 255, 255, 0.85)" }}>{u.engineer}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Official Audit Document Footer */}
        <div style={{ textAlign: "center", marginTop: "2.5rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", fontSize: "0.75rem" }}>
          21 Degrees F-Gas Tracker Pro &nbsp;·&nbsp; Official Site Refrigerant Compliance Audit &nbsp;·&nbsp; &copy; {new Date().getFullYear()} 21 Degrees Ltd
        </div>
      </div>

      {/* ── Print-Specific Styles ────────────────────────────────────────────── */}
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          h1, h2, h3, div, span, td, th, p, strong {
            color: #000000 !important;
          }
          div[style*="background: rgba"], tr[style*="background: rgba"] {
            background: #ffffff !important;
            border-color: #cbd5e1 !important;
          }
          div[style*="border: 1px solid"] {
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>
    </div>
  );
}
