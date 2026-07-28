"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import { db, Bottle, MovementLog, UsageLog } from "@/lib/db";
import { Printer, ArrowLeft, Package, Calendar, User, MapPin, Truck, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HistoryItem {
  id: string;
  date: string;
  type: "movement" | "usage";
  action: string;
  from: string;
  to: string;
  qty?: number;
  balance?: number;
  engineer: string;
  notes?: string;
  jobRef?: string;
  equipmentDetails?: any[];
}

export default function BottleAuditReportPage({ params }: { params: Promise<{ serial: string }> }) {
  const resolvedParams = use(params);
  const serial = (resolvedParams.serial || "").toUpperCase();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [movementLogs, setMovementLogs] = useState<MovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!serial) return;
      setLoading(true);
      try {
        const [bData, mData, uData] = await Promise.all([
          db.getBottle(serial),
          db.getMovementLogs(serial),
          db.getUsageLogs(serial),
        ]);
        setBottle(bData);
        setMovementLogs(mData || []);
        setUsageLogs(uData || []);
      } catch (err) {
        console.error("Error loading bottle report data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [serial]);

  // Combined audit history sorted chronologically (newest first for UI, oldest first for audit)
  const { combinedHistory, stats } = useMemo(() => {
    const items: HistoryItem[] = [];

    movementLogs.forEach(m => {
      items.push({
        id: m.id,
        date: m.date,
        type: "movement",
        action: m.action,
        from: m.from || "—",
        to: m.to || "—",
        engineer: m.engineer || "System",
        notes: m.notes,
      });
    });

    usageLogs.forEach(u => {
      items.push({
        id: u.id,
        date: u.date,
        type: "usage",
        action: u.jobType,
        from: u.siteName || "Cylinder",
        to: u.siteRef ? `Job ${u.siteRef}` : (u.siteAddress || "Site"),
        qty: u.weightUsed,
        balance: u.weightAfter,
        engineer: u.engineer || "Unknown",
        jobRef: u.siteRef,
        equipmentDetails: u.equipmentDetails || undefined,
      });
    });

    const sortedNewest = [...items].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const totalUsed = usageLogs.reduce((sum, u) => sum + (u.weightUsed || 0), 0);

    const daysLeft = bottle?.rentalExpiryDate
      ? Math.ceil((new Date(bottle.rentalExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      combinedHistory: sortedNewest,
      stats: {
        totalUsed,
        daysLeft,
        movementCount: movementLogs.length,
        usageCount: usageLogs.length,
      },
    };
  }, [movementLogs, usageLogs, bottle]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#00e5ff", marginBottom: "0.5rem" }}>
            Generating Cylinder Audit Report...
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Loading full movement & usage logs for {serial}</div>
        </div>
      </div>
    );
  }

  if (!bottle) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#fff", padding: "3rem 1.5rem" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
          <AlertCircle size={48} color="#ff3366" style={{ marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Cylinder Not Found</h2>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>No bottle record matches serial number <strong>{serial}</strong>.</p>
          <Link href="/admin/bottles" style={{ color: "#00e5ff", textDecoration: "none", fontWeight: 600 }}>
            ← Back to Cylinder Inventory
          </Link>
        </div>
      </div>
    );
  }

  const reportDateStr = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const isExpired = stats.daysLeft !== null && stats.daysLeft < 0;
  const isUrgent = stats.daysLeft !== null && stats.daysLeft >= 0 && stats.daysLeft <= 7;

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
            onClick={() => router.push(`/admin/bottles/${serial}`)}
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
            <ArrowLeft size={16} /> Back to Cylinder
          </button>
          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>
          <span style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", fontFamily: "var(--font-geist-mono)" }}>
            Serial: <strong style={{ color: "#00e5ff" }}>{serial}</strong>
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
          <Printer size={16} /> Print Audit Report
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
                Tel: 0191 5450545 &nbsp;·&nbsp; F-Gas Regulatory Cylinder Audit
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              CYLINDER AUDIT REPORT
            </div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "4px" }}>
              Generated: {reportDateStr}
            </div>
          </div>
        </div>

        {/* ── Cylinder Metadata Header Card ───────────────────────────────────── */}
        <div
          style={{
            background: "rgba(17, 24, 39, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "10px",
            padding: "1.25rem 1.5rem",
            marginBottom: "1.75rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Cylinder Serial No.
            </div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#00e5ff", fontFamily: "var(--font-geist-mono), monospace", marginTop: "2px" }}>
              {bottle.serial}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Refrigerant / Category
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {bottle.gasType} <span style={{ fontSize: "0.8rem", color: "#94a3b8", textTransform: "capitalize" }}>({bottle.category})</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Capacity / Current Balance
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {(bottle.currentWeight ?? 0).toFixed(2)} kg <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>/ {(bottle.initialWeight ?? 0).toFixed(2)} kg</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Current Location
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {bottle.locationId} {bottle.vehicleReg ? `(${bottle.vehicleReg})` : ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Supplier / PO No.
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff", marginTop: "2px" }}>
              {bottle.supplier || "—"} {bottle.poNumber ? `· PO: ${bottle.poNumber}` : ""}
            </div>
          </div>
        </div>

        {/* ── Summary Metric Cards ────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
          <div style={{ background: "rgba(0, 229, 255, 0.04)", border: "1px solid rgba(0, 229, 255, 0.15)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#00e5ff", fontWeight: 700, textTransform: "uppercase" }}>Total Gas Serviced</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.2rem" }}>
              {stats.totalUsed.toFixed(2)} kg
            </div>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Movement Logs</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.2rem" }}>
              {stats.movementCount}
            </div>
          </div>

          <div style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Service Actions</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#fff", marginTop: "0.2rem" }}>
              {stats.usageCount}
            </div>
          </div>

          <div style={{
            background: isExpired ? "rgba(255, 51, 102, 0.08)" : isUrgent ? "rgba(255, 170, 0, 0.08)" : "rgba(34, 197, 94, 0.08)",
            border: isExpired ? "1px solid rgba(255, 51, 102, 0.25)" : isUrgent ? "1px solid rgba(255, 170, 0, 0.25)" : "1px solid rgba(34, 197, 94, 0.25)",
            borderRadius: "8px", padding: "1rem 1.25rem"
          }}>
            <div style={{ fontSize: "0.7rem", color: isExpired ? "#ff3366" : isUrgent ? "#ffaa00" : "#22c55e", fontWeight: 700, textTransform: "uppercase" }}>
              Rental Expiry Status
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: isExpired ? "#ff3366" : isUrgent ? "#ffaa00" : "#22c55e", marginTop: "0.2rem" }}>
              {bottle.rentalExpiryDate ? (
                isExpired ? `EXPIRED (${Math.abs(stats.daysLeft!)}d ago)` : `${stats.daysLeft} Days Remaining`
              ) : "No Expiry Set"}
            </div>
          </div>
        </div>

        {/* ── Complete Audit & Movement History Table ─────────────────────────── */}
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <FileText size={18} color="#00e5ff" /> Complete Audit & Movement History ({combinedHistory.length} events)
          </h2>

          <div style={{ border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", overflow: "hidden", background: "rgba(17, 24, 39, 0.4)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.04)", borderBottom: "1px solid rgba(255, 255, 255, 0.08)" }}>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Action</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>From Location / Site</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>To Destination / Job</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Qty (kg)</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Balance</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#94a3b8", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700 }}>Engineer / User</th>
                </tr>
              </thead>
              <tbody>
                {combinedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                      No audit or movement history recorded for this cylinder.
                    </td>
                  </tr>
                ) : (
                  combinedHistory.map((item) => {
                    const isUsage = item.type === "usage";
                    const isRecovery = (item.action || "").toLowerCase().includes("recovery");
                    return (
                      <tr key={item.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap", color: "rgba(255, 255, 255, 0.7)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.78rem" }}>
                          {new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.55rem", borderRadius: "4px", textTransform: "uppercase",
                            background: isUsage ? (isRecovery ? "rgba(255, 170, 0, 0.12)" : "rgba(34, 197, 94, 0.12)") : "rgba(0, 229, 255, 0.12)",
                            color: isUsage ? (isRecovery ? "#ffaa00" : "#22c55e") : "#00e5ff"
                          }}>
                            {item.action.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#fff", fontWeight: 500 }}>{item.from}</td>
                        <td style={{ padding: "0.75rem 1rem", color: "#fff", fontWeight: 500 }}>{item.to}</td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: item.qty ? (isRecovery ? "#ffaa00" : "#22c55e") : "rgba(255,255,255,0.3)" }}>
                          {item.qty ? `${isRecovery ? '-' : '+'}${item.qty.toFixed(2)} kg` : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "#fff" }}>
                          {item.balance !== undefined && item.balance !== null ? `${item.balance.toFixed(2)} kg` : "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "rgba(255, 255, 255, 0.85)" }}>{item.engineer}</td>
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
          21 Degrees F-Gas Tracker Pro &nbsp;·&nbsp; Official Cylinder Audit Document &nbsp;·&nbsp; &copy; {new Date().getFullYear()} 21 Degrees Ltd
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
