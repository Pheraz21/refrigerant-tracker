"use client";

import React, { useEffect, useState, useMemo, use } from "react";
import { db, Bottle, MovementLog, UsageLog, AuditTrailEntry, CrmJob } from "@/lib/db";
import {
  Printer,
  ArrowLeft,
  Package,
  Calendar,
  User,
  MapPin,
  Truck,
  AlertCircle,
  FileText,
  CheckCircle2,
  Recycle,
  Layers,
  Activity,
  ArrowUpDown,
  ShieldCheck,
  Building2,
  Scale
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCylinderGenealogy } from "@/lib/genealogy";

interface HistoryItem {
  id: string;
  date: string;
  type: "registered" | "movement" | "usage" | "recovery" | "reclassified" | "hwcn";
  action: string;
  actionBadgeLabel: string;
  actionColor: string;
  from: string;
  to: string;
  qty?: number;
  balance: number;
  engineer: string;
  vehicleReg?: string;
  notes?: string;
  jobRef?: string;
  siteTitle?: string;
  equipmentSummary?: string;
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
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [crmJobMap, setCrmJobMap] = useState<Map<string, CrmJob>>(new Map());
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc"); // Default chronological audit order (birth to present)

  useEffect(() => {
    async function loadData() {
      if (!serial) return;
      setLoading(true);
      try {
        const [bData, mData, uData, aData] = await Promise.all([
          db.getBottle(serial),
          db.getMovementLogs(serial),
          db.getUsageLogs(serial),
          db.getAuditTrailForSerial(serial),
        ]);
        setBottle(bData);
        setMovementLogs(mData || []);
        setUsageLogs(uData || []);
        setAuditTrail(aData || []);

        // Resolve customer site codes to site names
        const jobRefs = new Set<string>();
        (uData || []).forEach(u => { if (u.siteRef) jobRefs.add(u.siteRef); });
        (mData || []).forEach(m => {
          if (m.from && !m.from.includes(" - Van") && m.from !== "HQ-Stores" && m.from !== "In Transit" && m.from !== "—") jobRefs.add(m.from);
          if (m.to && !m.to.includes(" - Van") && m.to !== "HQ-Stores" && m.to !== "In Transit" && m.to !== "—") jobRefs.add(m.to);
        });
        if (jobRefs.size > 0) {
          try {
            const jobs = await db.getCrmJobsByNumbers(Array.from(jobRefs));
            setCrmJobMap(new Map(jobs.map(j => [j.jobNumber, j])));
          } catch (e) {
            console.warn("Could not load CRM job titles:", e);
          }
        }
      } catch (err) {
        console.error("Error loading bottle report data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [serial]);

  // Combined audit history with accurate physical running balance
  const { combinedHistory, stats, isWasteInitial } = useMemo(() => {
    if (!bottle) {
      return { combinedHistory: [], stats: { totalUsed: 0, totalRecovered: 0, daysLeft: null, movementCount: 0, usageCount: 0 }, isWasteInitial: false };
    }

    const rawEvents: Array<{
      id: string;
      date: string;
      type: "registered" | "movement" | "usage" | "recovery" | "reclassified" | "hwcn";
      action: string;
      actionBadgeLabel: string;
      actionColor: string;
      from: string;
      to: string;
      qty?: number;
      engineer: string;
      vehicleReg?: string;
      notes?: string;
      jobRef?: string;
      siteTitle?: string;
      equipmentSummary?: string;
      equipmentDetails?: any[];
      weightAfter?: number;
    }> = [];

    let totUsed = 0;
    let totRec = 0;

    const wasteInitial = bottle.category === 'reclaim' ||
      (bottle.category === 'recycled' && usageLogs.some(u => ['recovery', 'retrofit', 'waste', 'reclaim'].includes((u.jobType || '').toLowerCase()))) ||
      usageLogs.some(u => ['recovery', 'retrofit', 'waste', 'reclaim'].includes((u.jobType || '').toLowerCase()));

    // 1. Initial Registration
    const regDate = bottle.registeredAt || movementLogs[movementLogs.length - 1]?.date || new Date().toISOString();
    rawEvents.push({
      id: `reg-${bottle.serial}`,
      date: regDate,
      type: "registered",
      action: "Initial Intake",
      actionBadgeLabel: "REGISTERED",
      actionColor: "#00e5ff",
      from: bottle.supplier || "Supplier",
      to: bottle.locationId || "HQ-Stores",
      engineer: bottle.registeredBy || bottle.lastEngineer || "System",
      notes: wasteInitial
        ? "Cylinder initially registered into inventory as empty recovery / waste cylinder"
        : `Initial intake at full tare capacity (${(bottle.initialWeight ?? 0).toFixed(2)} kg)`,
    });

    // 2. Usage & Recovery Logs
    usageLogs.forEach(u => {
      const isRecovery = ["recovery", "retrofit", "waste", "reclaim"].includes((u.jobType || "").toLowerCase());
      const w = Number(u.weightUsed || 0);
      if (isRecovery) totRec += w;
      else totUsed += w;

      const eqList = u.equipmentDetails || [];
      const eqSummary = eqList.length > 0
        ? eqList.map((eq: any) => [eq.manufacturer, eq.model].filter(Boolean).join(" ") + (eq.serial ? ` (SN: ${eq.serial})` : "")).join("; ")
        : undefined;

      const siteTitle = (u.siteRef && crmJobMap.get(u.siteRef)?.siteTitle) || u.siteName || undefined;

      rawEvents.push({
        id: `usage-${u.id}`,
        date: u.date,
        type: isRecovery ? "recovery" : "usage",
        action: isRecovery ? "Gas Recovered" : "Gas Dispensed",
        actionBadgeLabel: isRecovery ? "RECOVERY" : "DISPENSED",
        actionColor: isRecovery ? "#f59e0b" : "#10b981",
        from: isRecovery ? (siteTitle ? `${u.siteRef || "Site"} — ${siteTitle}` : (u.siteName || "Site Job")) : (bottle.locationId || "Cylinder"),
        to: isRecovery ? (bottle.locationId || "Recovery Cylinder") : (siteTitle ? `${u.siteRef || "Job"} — ${siteTitle}` : (u.siteName || "Equipment")),
        qty: isRecovery ? +w : -w,
        engineer: u.engineer || "Unknown",
        jobRef: u.siteRef,
        siteTitle,
        equipmentSummary: eqSummary,
        equipmentDetails: eqList,
        weightAfter: u.weightAfter !== undefined && u.weightAfter !== null ? Number(u.weightAfter) : undefined,
        notes: u.siteRef ? `Job Ref: ${u.siteRef}${siteTitle ? ` · ${siteTitle}` : ""}` : undefined,
      });
    });

    // 3. Movement Logs
    movementLogs.forEach(m => {
      if (m.action === "registered") return;

      const isHWCN = m.action === "received" || !!(m.notes && m.notes.toLowerCase().includes("consignment"));
      const isReclass = m.action === "reclassified_recycled" || !!(m.notes && (m.notes.toLowerCase().includes("reclassified from reclaim") || m.notes.toLowerCase().includes("reclassified to recycled")));

      let actionTitle = "Location Transfer";
      let badgeLabel = "MOVED";
      let badgeColor = "#6366f1";

      if (isReclass) {
        actionTitle = "Reclassified: Waste → Recycled";
        badgeLabel = "RECLASSIFIED";
        badgeColor = "#10b981";
      } else if (m.action === "received") {
        actionTitle = "Received at HQ-Stores";
        badgeLabel = "RECEIVED";
        badgeColor = "#8b5cf6";
      } else if (m.notes?.toLowerCase().includes("signed out")) {
        actionTitle = "Signed Out from Stores";
        badgeLabel = "STORES OUT";
        badgeColor = "#3b82f6";
      } else if (m.notes?.toLowerCase().includes("consignment")) {
        actionTitle = "Consignment in Transit (HWCN)";
        badgeLabel = "HWCN IN TRANSIT";
        badgeColor = "#d946ef";
      } else if (m.to?.includes(" - Van")) {
        actionTitle = "Loaded to Van Custody";
        badgeLabel = "VAN TRANSFER";
        badgeColor = "#0284c7";
      } else if (m.to === "HQ-Stores") {
        actionTitle = "Transferred to HQ-Stores";
        badgeLabel = "STORES RETURN";
        badgeColor = "#059669";
      } else if (m.to) {
        actionTitle = `Moved to Site (${m.to})`;
        badgeLabel = "SITE TRANSFER";
        badgeColor = "#6366f1";
      }

      const fromTitle = m.from && crmJobMap.get(m.from)?.siteTitle ? `${m.from} (${crmJobMap.get(m.from)!.siteTitle})` : (m.from || "—");
      const toTitle = m.to && crmJobMap.get(m.to)?.siteTitle ? `${m.to} (${crmJobMap.get(m.to)!.siteTitle})` : (m.to || "—");

      rawEvents.push({
        id: `move-${m.id}`,
        date: m.date,
        type: isReclass ? "reclassified" : (isHWCN ? "hwcn" : "movement"),
        action: actionTitle,
        actionBadgeLabel: badgeLabel,
        actionColor: badgeColor,
        from: isReclass ? (m.from || "HQ-Stores (Reclaim)") : fromTitle,
        to: isReclass ? (m.to || "HQ-Stores (Recycled)") : toTitle,
        engineer: m.engineer || "System",
        vehicleReg: m.vehicleReg,
        notes: isReclass
          ? (m.notes || "Cylinder formally reclassified from Waste (Reclaim) to Certified Recycled Refrigerant following workshop testing & filtration.")
          : m.notes,
      });
    });

    // 4. Inferred Reclassification for Recycled Cylinders with Recovery Origins
    const hasReclass = rawEvents.some(e => e.type === "reclassified");
    if (!hasReclass && (bottle.category === "recycled" || wasteInitial) && totRec > 0) {
      const storeReturnMove = movementLogs.find(m => m.notes?.toLowerCase().includes("consignment") || m.action === "received");
      const reuseLogs = usageLogs.filter(u => u.jobType === "recycled_charge" || !["recovery", "retrofit", "waste", "reclaim"].includes((u.jobType || "").toLowerCase()));
      const earliestReuse = reuseLogs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

      let reclassDate: string | null = null;
      let reclassEng = bottle.lastEngineer || "Workshop / Stores";

      if (storeReturnMove) {
        reclassDate = new Date(new Date(storeReturnMove.date).getTime() + 1000).toISOString();
        if (storeReturnMove.engineer) reclassEng = storeReturnMove.engineer;
      } else if (earliestReuse) {
        reclassDate = new Date(new Date(earliestReuse.date).getTime() - 1000).toISOString();
        if (earliestReuse.engineer) reclassEng = earliestReuse.engineer;
      }

      if (reclassDate) {
        rawEvents.push({
          id: `reclass-inferred-${bottle.serial}`,
          date: reclassDate,
          type: "reclassified",
          action: "Reclassified: Waste → Recycled",
          actionBadgeLabel: "RECLASSIFIED",
          actionColor: "#10b981",
          from: "HQ-Stores (Reclaim)",
          to: "HQ-Stores (Recycled)",
          engineer: reclassEng,
          notes: "Cylinder formally reclassified from Waste (Reclaim) to Certified Recycled Refrigerant following workshop recovery receipt, filtration & testing.",
        });
      }
    }

    // Sort chronologically (oldest first) to compute running balances accurately
    rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = wasteInitial ? 0 : (bottle.initialWeight ?? 0);
    const enrichedItems: HistoryItem[] = rawEvents.map(e => {
      if (e.type === "usage" || e.type === "recovery") {
        if (e.weightAfter !== undefined) {
          running = e.weightAfter;
        } else if (e.qty !== undefined) {
          running = e.type === "recovery" ? (running + Math.abs(e.qty)) : Math.max(0, running - Math.abs(e.qty));
        }
      }

      return {
        id: e.id,
        date: e.date,
        type: e.type,
        action: e.action,
        actionBadgeLabel: e.actionBadgeLabel,
        actionColor: e.actionColor,
        from: e.from,
        to: e.to,
        qty: e.qty,
        balance: Number(running.toFixed(2)),
        engineer: e.engineer,
        vehicleReg: e.vehicleReg,
        notes: e.notes,
        jobRef: e.jobRef,
        siteTitle: e.siteTitle,
        equipmentSummary: e.equipmentSummary,
        equipmentDetails: e.equipmentDetails,
      };
    });

    const daysLeft = bottle.rentalExpiryDate
      ? Math.ceil((new Date(bottle.rentalExpiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      combinedHistory: enrichedItems,
      stats: {
        totalUsed: totUsed,
        totalRecovered: totRec,
        daysLeft,
        movementCount: movementLogs.length,
        usageCount: usageLogs.length,
      },
      isWasteInitial: wasteInitial,
    };
  }, [bottle, movementLogs, usageLogs, crmJobMap]);

  const genealogy = useMemo(() => getCylinderGenealogy(bottle, movementLogs), [bottle, movementLogs]);

  // Display-sorted history
  const displayHistory = useMemo(() => {
    const list = [...combinedHistory];
    if (sortOrder === "desc") {
      return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [combinedHistory, sortOrder]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 600, color: "#00e5ff", marginBottom: "0.5rem" }}>
            Generating Cylinder Audit Report...
          </div>
          <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Loading regulatory movement & usage logs for {serial}</div>
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
  const reportTimeStr = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const isExpired = stats.daysLeft !== null && stats.daysLeft < 0;
  const isUrgent = stats.daysLeft !== null && stats.daysLeft >= 0 && stats.daysLeft <= 14;

  const categoryLabel = bottle.category === "recycled"
    ? "Recycled Refrigerant"
    : bottle.category === "reclaim"
    ? "Waste / Reclaim"
    : bottle.category === "new"
    ? "Virgin New"
    : "Nitrogen";

  return (
    <div className="report-page-root" style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0", fontFamily: "var(--font-geist-sans), sans-serif" }}>
      {/* ── Screen-Only Top Control Bar ─────────────────────────────────────── */}
      <div
        className="no-print"
        style={{
          background: "rgba(17, 24, 39, 0.95)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "0.85rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(8px)",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push(`/admin/bottles/${serial}`);
              }
            }}
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
            title="Go back"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <span style={{ color: "rgba(255, 255, 255, 0.2)" }}>|</span>

          <span style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.8)", fontFamily: "var(--font-geist-mono)" }}>
            Serial: <strong style={{ color: "#00e5ff" }}>{serial}</strong>
          </span>

          <span style={{
            background: bottle.category === "recycled" ? "rgba(16,185,129,0.2)" : "rgba(0,229,255,0.15)",
            color: bottle.category === "recycled" ? "#10b981" : "#00e5ff",
            padding: "0.2rem 0.55rem",
            borderRadius: "4px",
            fontSize: "0.75rem",
            fontWeight: 700,
            textTransform: "uppercase"
          }}>
            {bottle.gasType} ({categoryLabel})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Order Toggle */}
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255, 255, 255, 0.06)", borderRadius: "6px", padding: "2px" }}>
            <button
              type="button"
              onClick={() => setSortOrder("asc")}
              style={{
                background: sortOrder === "asc" ? "rgba(0, 229, 255, 0.2)" : "transparent",
                color: sortOrder === "asc" ? "#00e5ff" : "#94a3b8",
                border: "none",
                borderRadius: "4px",
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Chronological (Audit Order)
            </button>
            <button
              type="button"
              onClick={() => setSortOrder("desc")}
              style={{
                background: sortOrder === "desc" ? "rgba(0, 229, 255, 0.2)" : "transparent",
                color: sortOrder === "desc" ? "#00e5ff" : "#94a3b8",
                border: "none",
                borderRadius: "4px",
                padding: "0.35rem 0.65rem",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Newest First
            </button>
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
              fontSize: "0.85rem",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0, 229, 255, 0.25)",
            }}
          >
            <Printer size={16} /> Print Official Audit (A4)
          </button>
        </div>
      </div>

      {/* ── Printable Report Container ───────────────────────────────────────── */}
      <div className="report-container" style={{ maxWidth: "1050px", margin: "0 auto", padding: "1.75rem 1.5rem" }}>
        {/* Printable Official Letterhead */}
        <div className="report-letterhead" style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "2px solid #00e5ff",
          paddingBottom: "1.1rem",
          marginBottom: "1.4rem"
        }}>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src="/21-degrees-logo-reports.png" alt="21 Degrees" style={{ width: "85px", height: "auto" }} />
            <div>
              <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#fff", letterSpacing: "0.5px" }}>21 DEGREES LTD</h1>
              <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: "2px", lineHeight: "1.4" }}>
                Unit 10, Apollo Court, Monkton Business Park, Hebburn, NE31 2ES<br />
                Tel: 0191 5450545 &nbsp;·&nbsp; REFCOM Reg: <strong>REF1010728</strong> &nbsp;·&nbsp; EA Waste Carrier: <strong>CBDU45829</strong>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#00e5ff", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              CYLINDER AUDIT REPORT
            </div>
            <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginTop: "3px" }}>
              Generated: <strong>{reportDateStr}</strong> ({reportTimeStr})
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px", fontFamily: "var(--font-geist-mono)" }}>
              Ref: AUD-{serial}-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}
            </div>
          </div>
        </div>

        {/* ── Cylinder Specification Card ───────────────────────────────────── */}
        <div
          className="print-card"
          style={{
            background: "rgba(17, 24, 39, 0.75)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "0.9rem 1.25rem",
            marginBottom: "1rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.85rem 1.2rem",
          }}
        >
          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Cylinder Serial No.
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#00e5ff", fontFamily: "var(--font-geist-mono), monospace", marginTop: "1px" }}>
              {bottle.serial}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Refrigerant / Category
            </div>
            <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {bottle.gasType} <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>({categoryLabel})</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Current Balance / Capacity
            </div>
            <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {(bottle.currentWeight ?? 0).toFixed(2)} kg <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>/ {(bottle.initialWeight ?? 0).toFixed(2)} kg tare</span>
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Current Physical Custody
            </div>
            <div style={{ fontSize: "0.98rem", fontWeight: 700, color: "#fff", marginTop: "2px" }}>
              {bottle.locationId} {bottle.vehicleReg ? `· ${bottle.vehicleReg}` : ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Supplier / PO Number
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff", marginTop: "2px" }}>
              {bottle.supplier || "—"} {bottle.poNumber ? `· PO: ${bottle.poNumber}` : ""}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "0.68rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
              Rental &amp; Safety Expiry
            </div>
            <div style={{ fontSize: "0.88rem", fontWeight: 700, color: isExpired ? "#ff3366" : isUrgent ? "#f59e0b" : "#22c55e", marginTop: "2px" }}>
              {bottle.rentalExpiryDate ? (
                isExpired ? `EXPIRED (${Math.abs(stats.daysLeft!)} days ago)` : `${stats.daysLeft} Days Remaining (${new Date(bottle.rentalExpiryDate).toLocaleDateString("en-GB")})`
              ) : "Standard Inventory / No Expiry"}
            </div>
          </div>
        </div>

        {/* ── REFCOM Statutory Audit Genealogy Block (Recycled Cylinders) ──────── */}
        {genealogy && (
          <div
            className="print-card genealogy-card"
            style={{
              background: "rgba(16, 185, 129, 0.08)",
              border: "1.5px solid rgba(16, 185, 129, 0.4)",
              borderRadius: "8px",
              padding: "0.75rem 1rem",
              marginBottom: "1rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
              <div
                style={{
                  background: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid rgba(16, 185, 129, 0.4)",
                  borderRadius: "6px",
                  padding: "0.4rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Recycle size={18} color="#10b981" />
              </div>
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981" }}>
                  REFCOM Statutory Audit Genealogy · Parent Reclaim Cylinder Chain of Custody
                </div>
                <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", marginTop: "1px" }}>
                  {genealogy.displayText}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                  Cleaned, filtered, and certified for reuse under SOP-001/SOP-002. Environment Agency hazardous waste tracking linked.
                  {genealogy.date && ` Conversion Date: ${new Date(genealogy.date).toLocaleDateString("en-GB")}.`}
                  {genealogy.engineer && ` Certified By: ${genealogy.engineer}.`}
                </div>
              </div>
            </div>

            <Link
              href={`/admin/bottles/${encodeURIComponent(genealogy.sourceSerial)}/report`}
              className="no-print"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(16, 185, 129, 0.5)",
                color: "#a7f3d0",
                padding: "0.4rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <span>Inspect Parent Reclaim #{genealogy.sourceSerial} &rarr;</span>
            </Link>
          </div>
        )}

        {/* ── Summary Metric Strip ────────────────────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.65rem",
          marginBottom: "1.2rem"
        }}>
          <div className="print-card" style={{ background: "rgba(0, 229, 255, 0.04)", border: "1px solid rgba(0, 229, 255, 0.15)", borderRadius: "6px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#00e5ff", fontWeight: 700, textTransform: "uppercase" }}>Total Gas Dispensed</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "1px" }}>
              {stats.totalUsed.toFixed(2)} kg
            </div>
          </div>

          <div className="print-card" style={{ background: "rgba(245, 158, 11, 0.05)", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "6px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#f59e0b", fontWeight: 700, textTransform: "uppercase" }}>Total Gas Recovered</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f59e0b", marginTop: "1px" }}>
              +{stats.totalRecovered.toFixed(2)} kg
            </div>
          </div>

          <div className="print-card" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Movement Logs</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "1px" }}>
              {stats.movementCount} transfers
            </div>
          </div>

          <div className="print-card" style={{ background: "rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "6px", padding: "0.65rem 0.95rem" }}>
            <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Service Actions</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "1px" }}>
              {stats.usageCount} site jobs
            </div>
          </div>
        </div>

        {/* ── Complete Audit & Movement History Table ─────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.65rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ fontSize: "0.95rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px", margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <FileText size={16} color="#00e5ff" /> Complete Audit &amp; Movement History ({displayHistory.length} events)
            </h2>
            <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
              Order: {sortOrder === "asc" ? "Chronological (Oldest First)" : "Reverse Chronological (Newest First)"}
            </div>
          </div>

          {/* Table container: IMPORTANT: overflow visible in print for multi-page pagination */}
          <div className="audit-table-wrapper" style={{ border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "8px", background: "rgba(17, 24, 39, 0.5)" }}>
            <table className="audit-table" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", tableLayout: "fixed" }}>
              <thead>
                <tr style={{ background: "rgba(255, 255, 255, 0.06)", borderBottom: "1.5px solid rgba(255, 255, 255, 0.15)" }}>
                  <th style={{ width: "12%", padding: "0.65rem 0.75rem", textAlign: "left", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Date</th>
                  <th style={{ width: "16%", padding: "0.65rem 0.75rem", textAlign: "left", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Action</th>
                  <th style={{ width: "18%", padding: "0.65rem 0.75rem", textAlign: "left", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>From Origin</th>
                  <th style={{ width: "22%", padding: "0.65rem 0.75rem", textAlign: "left", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>To Destination / Job</th>
                  <th style={{ width: "10%", padding: "0.65rem 0.75rem", textAlign: "right", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Qty (kg)</th>
                  <th style={{ width: "10%", padding: "0.65rem 0.75rem", textAlign: "right", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Balance</th>
                  <th style={{ width: "12%", padding: "0.65rem 0.75rem", textAlign: "left", color: "#94a3b8", fontSize: "0.66rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" }}>Engineer / User</th>
                </tr>
              </thead>
              <tbody>
                {displayHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2.5rem", textAlign: "center", color: "#94a3b8" }}>
                      No audit or movement history recorded for this cylinder.
                    </td>
                  </tr>
                ) : (
                  displayHistory.map((item, idx) => {
                    const isEven = idx % 2 === 0;
                    const hasNotes = !!(item.notes || item.equipmentSummary);

                    return (
                      <React.Fragment key={item.id}>
                        <tr className="audit-row" style={{
                          background: isEven ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.04)",
                          borderBottom: hasNotes ? "none" : "1px solid rgba(255, 255, 255, 0.05)"
                        }}>
                          {/* Date */}
                          <td style={{ padding: "0.55rem 0.75rem", verticalAlign: "top", color: "rgba(255, 255, 255, 0.85)", fontFamily: "var(--font-geist-mono), monospace", fontSize: "0.76rem" }}>
                            <div>{new Date(item.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
                            <div style={{ fontSize: "0.68rem", color: "#64748b" }}>
                              {new Date(item.date).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </td>

                          {/* Action Badge */}
                          <td style={{ padding: "0.55rem 0.75rem", verticalAlign: "top" }}>
                            <span className="badge-tag" style={{
                              display: "inline-block",
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "0.18rem 0.45rem",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                              background: `${item.actionColor}20`,
                              color: item.actionColor,
                              border: `1px solid ${item.actionColor}40`,
                              letterSpacing: "0.02em",
                              wordBreak: "break-word"
                            }}>
                              {item.actionBadgeLabel}
                            </span>
                          </td>

                          {/* From Origin */}
                          <td style={{ padding: "0.55rem 0.75rem", verticalAlign: "top", color: "#fff", fontWeight: 500, wordBreak: "break-word" }}>
                            {item.from}
                          </td>

                          {/* To Destination */}
                          <td style={{ padding: "0.55rem 0.75rem", verticalAlign: "top", color: "#fff", fontWeight: 500, wordBreak: "break-word" }}>
                            {item.to}
                          </td>

                          {/* Qty Change */}
                          <td style={{
                            padding: "0.55rem 0.75rem",
                            textAlign: "right",
                            verticalAlign: "top",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontWeight: 700,
                            color: item.qty ? (item.qty > 0 ? "#f59e0b" : "#22c55e") : "#64748b"
                          }}>
                            {item.qty !== undefined && item.qty !== 0 ? (
                              item.qty > 0 ? `+${item.qty.toFixed(2)} kg` : `${item.qty.toFixed(2)} kg`
                            ) : "0.00 kg"}
                          </td>

                          {/* Balance */}
                          <td style={{
                            padding: "0.55rem 0.75rem",
                            textAlign: "right",
                            verticalAlign: "top",
                            fontFamily: "var(--font-geist-mono), monospace",
                            fontWeight: 800,
                            color: "#00e5ff"
                          }}>
                            {item.balance.toFixed(2)} kg
                          </td>

                          {/* Engineer / Vehicle */}
                          <td style={{ padding: "0.55rem 0.75rem", verticalAlign: "top", color: "rgba(255, 255, 255, 0.9)", wordBreak: "break-word" }}>
                            <div>{item.engineer}</div>
                            {item.vehicleReg && (
                              <div style={{ fontSize: "0.68rem", color: "#94a3b8", fontFamily: "var(--font-geist-mono)" }}>
                                {item.vehicleReg}
                              </div>
                            )}
                          </td>
                        </tr>

                        {/* Indented Sub-Row for Notes & Equipment details */}
                        {hasNotes && (
                          <tr className="audit-detail-row" style={{
                            background: isEven ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.04)",
                            borderBottom: "1px solid rgba(255, 255, 255, 0.08)"
                          }}>
                            <td colSpan={7} style={{ padding: "0 0.75rem 0.45rem 2rem", fontSize: "0.72rem", color: "#94a3b8" }}>
                              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.35rem" }}>
                                <span style={{ color: "#00e5ff", fontWeight: 700 }}>↳</span>
                                <div>
                                  {item.notes && <span>{item.notes}</span>}
                                  {item.notes && item.equipmentSummary && <span style={{ margin: "0 0.4rem", opacity: 0.4 }}>|</span>}
                                  {item.equipmentSummary && (
                                    <span style={{ color: "rgba(255, 255, 255, 0.75)" }}>
                                      Equipment: <strong>{item.equipmentSummary}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Official Regulatory Verification & Sign-Off Section ──────────────── */}
        <div
          className="print-card regulatory-signoff"
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            borderRadius: "8px",
            padding: "1rem 1.25rem",
            marginTop: "1.5rem",
            breakInside: "avoid",
            pageBreakInside: "avoid"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <ShieldCheck size={18} color="#00e5ff" />
            <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Regulatory Compliance &amp; Verification Declaration
            </span>
          </div>

          <p style={{ fontSize: "0.74rem", color: "#94a3b8", lineHeight: "1.5", margin: "0 0 1rem 0" }}>
            This official cylinder custody audit has been generated directly from tamper-evident digital event logs in strict conformity with
            the UK F-Gas Regulations 2015, (EU) 517/2014, and the Environmental Protection Act 1990 (Duty of Care). All movement, recovery, and dispensing
            milestones are verified against certified REFCOM accreditation and Environment Agency hazardous waste tracking requirements.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>REFCOM F-Gas Company Certificate</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", marginTop: "1px" }}>REF1010728 (Category I)</div>
            </div>

            <div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>EA Hazardous Waste Carrier</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fff", marginTop: "1px" }}>CBDU45829 (Upper Tier)</div>
            </div>

            <div>
              <div style={{ fontSize: "0.65rem", color: "#94a3b8", textTransform: "uppercase", fontWeight: 700 }}>Authorized Sign-Off</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#00e5ff", marginTop: "1px" }}>
                Pheraz Ismail · Lead Compliance Auditor
              </div>
            </div>
          </div>
        </div>

        {/* Official Audit Document Footer */}
        <div className="report-footer" style={{ textAlign: "center", marginTop: "1.75rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(255, 255, 255, 0.1)", color: "#64748b", fontSize: "0.72rem" }}>
          21 Degrees F-Gas Tracker Pro &nbsp;·&nbsp; Official Cylinder Regulatory Audit &nbsp;·&nbsp; &copy; {new Date().getFullYear()} 21 Degrees Ltd &nbsp;·&nbsp; All Rights Reserved
        </div>
      </div>

      {/* ── Print-Specific Styles (A4 Multi-Page Pagination) ────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm 12mm 10mm;
          }

          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-size: 8.5pt !important;
            line-height: 1.3 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print {
            display: none !important;
          }

          .report-page-root {
            background: #ffffff !important;
            color: #0f172a !important;
            min-height: auto !important;
          }

          /* CRITICAL: Clear overflow constraints on all containers to allow page breaking */
          *, .report-container, .audit-table-wrapper {
            overflow: visible !important;
            box-sizing: border-box !important;
          }

          .report-container {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
          }

          /* Letterhead in Print */
          .report-letterhead {
            border-bottom: 2px solid #0f172a !important;
            padding-bottom: 8mm !important;
            margin-bottom: 6mm !important;
          }
          .report-letterhead h1 {
            color: #0f172a !important;
          }
          .report-letterhead div {
            color: #475569 !important;
          }
          .report-letterhead div[style*="color: #00e5ff"] {
            color: #0284c7 !important;
          }

          /* Cards in Print */
          .print-card {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            margin-bottom: 4mm !important;
            padding: 3mm 4mm !important;
          }
          .print-card div {
            color: #1e293b !important;
          }
          .print-card div[style*="color: #94a3b8"] {
            color: #64748b !important;
          }
          .print-card div[style*="color: #00e5ff"] {
            color: #0284c7 !important;
          }

          /* Genealogy Card in Print */
          .genealogy-card {
            background: #f0fdf4 !important;
            border: 1.5px solid #86efac !important;
          }
          .genealogy-card div {
            color: #14532d !important;
          }
          .genealogy-card div[style*="color: #10b981"] {
            color: #15803d !important;
          }

          /* Audit Table in Print */
          .audit-table-wrapper {
            border: 1px solid #cbd5e1 !important;
            border-radius: 6px !important;
            background: #ffffff !important;
          }

          table.audit-table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          /* Repeat headers on every page */
          table.audit-table thead {
            display: table-header-group !important;
          }

          table.audit-table thead tr {
            background: #f1f5f9 !important;
            border-bottom: 2px solid #94a3b8 !important;
          }

          table.audit-table thead th {
            color: #1e293b !important;
            font-size: 7pt !important;
            padding: 4px 6px !important;
          }

          /* Prevent breaking inside a single row */
          tr.audit-row, tr.audit-detail-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          tr.audit-row {
            background: #ffffff !important;
          }

          tr.audit-row:nth-child(4n+1) {
            background: #f8fafc !important;
          }

          table.audit-table td {
            color: #1e293b !important;
            font-size: 7.5pt !important;
            padding: 4px 6px !important;
            border-bottom: 1px solid #e2e8f0 !important;
          }

          table.audit-table td div {
            color: #1e293b !important;
          }

          table.audit-table td div[style*="color: #64748b"],
          table.audit-table td div[style*="color: #94a3b8"] {
            color: #64748b !important;
          }

          table.audit-table td[style*="color: #00e5ff"] {
            color: #0f172a !important;
            font-weight: bold !important;
          }

          /* Badge Tags in Print */
          .badge-tag {
            border: 1px solid #94a3b8 !important;
            color: #0f172a !important;
            background: #f1f5f9 !important;
            font-size: 6.5pt !important;
            padding: 1px 4px !important;
          }

          /* Signoff Block in Print */
          .regulatory-signoff {
            background: #f8fafc !important;
            border: 1px solid #cbd5e1 !important;
            margin-top: 6mm !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .regulatory-signoff p {
            color: #475569 !important;
          }

          /* Footer in Print */
          .report-footer {
            color: #64748b !important;
            border-top: 1px solid #cbd5e1 !important;
            margin-top: 6mm !important;
            padding-top: 3mm !important;
          }
        }
      `}</style>
    </div>
  );
}
