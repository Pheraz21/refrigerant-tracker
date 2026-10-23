"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  db,
  Bottle,
  MovementLog,
  UsageLog,
  CrmJob,
  AuditTrailEntry,
  AppUser,
  isBottleTrace
} from "@/lib/db";
import { getGwp, calculateCO2e } from "@/lib/gwp";
import { useAuth } from "@/lib/AuthContext";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Clock,
  User,
  Truck,
  MapPin,
  Package,
  Wrench,
  ClipboardList,
  ShieldCheck,
  Printer,
  Edit3,
  Camera,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Activity,
  Scale,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
  ExternalLink
} from "lucide-react";

function usageActionLabel(jobType?: string): string {
  switch ((jobType || "").toLowerCase()) {
    case "recovery":
    case "retrofit":
    case "waste":
      return "Gas Recovered";
    case "recycled_charge":
      return "Recycled Gas Charged";
    case "leak_test":
      return "Statutory Leak Test";
    case "install":
      return "Commissioning Charge";
    case "service":
    case "maintenance":
    default:
      return "Gas Used";
  }
}

function formatJobTypeFull(jobType?: string): string {
  switch ((jobType || "").toLowerCase()) {
    case "recovery":
      return "Refrigerant Recovery into Waste Cylinder";
    case "retrofit":
      return "System Retrofit / Refrigerant Recovery";
    case "waste":
      return "Hazardous Waste Consignment";
    case "recycled_charge":
      return "On-Site Recycled Gas Re-Charge";
    case "leak_test":
      return "Statutory F-Gas Leak Check (Reg EU 517/2014 Art. 4)";
    case "install":
      return "New System Installation / Commissioning Charge";
    case "maintenance":
      return "Planned Preventative Maintenance Charge";
    case "service":
      return "Service / Refrigerant Top-Up Addition";
    default:
      return jobType || "Refrigerant Activity";
  }
}

function formatMoveActionFull(action?: string): string {
  switch ((action || "").toLowerCase()) {
    case "registered":
      return "Initial Cylinder Registration into System";
    case "re_registered":
      return "Recirculated Cylinder Re-Registration";
    case "transferred":
    case "move":
    case "moved":
      return "Physical Custody Transfer";
    case "returned_to_supplier":
      return "Returned to Refrigerant Supplier";
    case "signed_out_from_stores":
      return "Signed Out from HQ-Stores to Engineer Van";
    case "evacuated":
      return "Cylinder Charged Back & Evacuated to Vacuum (Empty / Evacuated)";
    case "emptied":
      return "Cylinder Emptied of Bulk Liquid (Trace Refrigerant Retained)";
    case "workshop_decant_out":
      return "Workshop Decant — Donor Reclaim Cylinder";
    case "workshop_decant_in":
      return "Workshop Decant — Recipient Recycled Cylinder";
    default:
      return (action || "Movement Event").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  }
}

export default function BottleAuditEventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const serialStr = decodeURIComponent((params?.serial as string) || "");
  const logIdStr = decodeURIComponent((params?.logId as string) || "");
  const typeHint = searchParams.get("type"); // "usage" | "movement" | null

  const [loading, setLoading] = useState(true);
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [moveLogs, setMoveLogs] = useState<MovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [decommissions, setDecommissions] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [crmJobs, setCrmJobs] = useState<CrmJob[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");
  const [editSiteRef, setEditSiteRef] = useState("");
  const [editWeight, setEditWeight] = useState<string>("");
  const [editEngineer, setEditEngineer] = useState("");
  const [editReason, setEditReason] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const [b, mLogs, uLogs, hList, dList, aList, jobs, users] = await Promise.all([
          db.getBottle(serialStr),
          db.getMovementLogs(serialStr),
          db.getUsageLogs(serialStr),
          db.getHWCNsForBottle(serialStr),
          db.getDecommissionsByBottleSerial(serialStr),
          db.getAuditTrailForSerial(serialStr),
          db.getAllCrmJobs(),
          db.getAllUsers()
        ]);
        if (!mounted) return;
        setBottle(b);
        setMoveLogs(mLogs || []);
        setUsageLogs(uLogs || []);
        setHwcns(hList || []);
        setDecommissions(dList || []);
        setAuditTrail(aList || []);
        setCrmJobs(jobs || []);
        setAllUsers(users || []);
      } catch (err) {
        console.error("Failed loading audit event detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    if (serialStr) load();
    return () => {
      mounted = false;
    };
  }, [serialStr]);

  const crmJobMap = useMemo(() => {
    const map = new Map<string, CrmJob>();
    for (const j of crmJobs) {
      if (j.jobNumber) map.set(j.jobNumber.trim().toUpperCase(), j);
    }
    return map;
  }, [crmJobs]);

  // Build unified chronological timeline with calculated before/after weights for every event
  const timeline = useMemo(() => {
    if (!bottle) return [];
    const items: Array<{
      id: string;
      rawId: string;
      logType: "usage" | "movement";
      date: string;
      action: string;
      jobType?: string;
      from?: string;
      to?: string;
      siteRef?: string;
      siteName?: string;
      siteAddress?: string;
      engineer: string;
      supervisingEngineer?: string;
      supervisingCertificate?: string;
      vehicleReg?: string;
      qty?: number;
      weightBefore?: number;
      weightAfter?: number;
      gasType?: string;
      notes?: string;
      equipmentDetails?: any[];
      rawRecord: any;
    }> = [];

    for (const m of moveLogs) {
      const usageMatch = m.notes?.match(/([\d.]+)\s*kg\s*dispensed/i);
      if (usageMatch) {
        const amount = parseFloat(usageMatch[1]) || 0;
        items.push({
          id: String(m.id),
          rawId: String(m.id),
          logType: "movement",
          date: m.date,
          action: m.action,
          from: m.from,
          to: m.to,
          engineer: m.engineer,
          vehicleReg: m.vehicleReg,
          notes: (m.notes || "").replace(/[\d.]+\s*kg\s*dispensed/i, "").trim() || "Transfer to site",
          rawRecord: m
        });
        items.push({
          id: `${m.id}-usage`,
          rawId: String(m.id),
          logType: "usage",
          date: m.date,
          action: "Gas Used",
          jobType: "service",
          from: m.from,
          to: m.to,
          siteRef: m.to,
          engineer: m.engineer,
          vehicleReg: m.vehicleReg,
          qty: amount,
          notes: `Usage recorded at ${m.to}`,
          rawRecord: m
        });
      } else {
        items.push({
          id: String(m.id),
          rawId: String(m.id),
          logType: "movement",
          date: m.date,
          action: m.action,
          from: m.from,
          to: m.to,
          engineer: m.engineer,
          vehicleReg: m.vehicleReg,
          notes: m.notes || "",
          rawRecord: m
        });
      }
    }

    for (const u of usageLogs) {
      items.push({
        id: String(u.id),
        rawId: String(u.id),
        logType: "usage",
        date: u.date,
        action: usageActionLabel(u.jobType),
        jobType: u.jobType,
        siteRef: u.siteRef,
        siteName: u.siteName,
        siteAddress: u.siteAddress,
        engineer: u.engineer,
        supervisingEngineer: u.supervisingEngineer,
        supervisingCertificate: u.supervisingCertificate,
        qty: u.weightUsed !== undefined && u.weightUsed !== null ? Number(u.weightUsed) : undefined,
        weightBefore: u.weightBefore !== undefined && u.weightBefore !== null ? Number(u.weightBefore) : undefined,
        weightAfter: u.weightAfter !== undefined && u.weightAfter !== null ? Number(u.weightAfter) : undefined,
        gasType: u.gasType,
        notes: u.siteRef ? `Site Job: ${u.siteRef}` : "",
        equipmentDetails: Array.isArray(u.equipmentDetails) ? u.equipmentDetails : undefined,
        rawRecord: u
      });
    }

    // Sort oldest -> newest
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const isReclaim = bottle.category === "reclaim";
    let runningBalance = isReclaim ? 0 : (bottle.initialWeight || 0);

    return items.map(item => {
      if (item.action === "registered" || item.action === "re_registered") {
        runningBalance = isReclaim ? 0 : (bottle.initialWeight || 0);
      }
      const computedBefore = item.weightBefore !== undefined ? item.weightBefore : runningBalance;
      let computedAfter = computedBefore;

      if (item.weightAfter !== undefined) {
        computedAfter = item.weightAfter;
      } else if (item.qty !== undefined && item.qty > 0) {
        if (item.action === "Gas Recovered") {
          computedAfter = Number((computedBefore + item.qty).toFixed(3));
        } else {
          computedAfter = Math.max(0, Number((computedBefore - item.qty).toFixed(3)));
        }
      } else if (item.action === "workshop_decant_out") {
        const m = item.notes?.match(/Transferred\s+([\d.]+)\s*kg/i);
        if (m) {
          const decanted = parseFloat(m[1]) || 0;
          computedAfter = Math.max(0, Number((computedBefore - decanted).toFixed(3)));
        }
      } else if (item.action === "workshop_decant_in") {
        const m = item.notes?.match(/Received\s+([\d.]+)\s*kg/i);
        if (m) {
          const received = parseFloat(m[1]) || 0;
          computedAfter = Number((computedBefore + received).toFixed(3));
        }
      }

      runningBalance = computedAfter;
      return {
        ...item,
        computedBefore,
        computedAfter
      };
    });
  }, [bottle, moveLogs, usageLogs]);

  // Locate the selected event in the timeline
  const currentIndex = useMemo(() => {
    if (timeline.length === 0) return -1;
    // Exact ID + type match first
    if (typeHint) {
      const idx = timeline.findIndex(t => String(t.id) === String(logIdStr) && t.logType === typeHint);
      if (idx !== -1) return idx;
    }
    const idx = timeline.findIndex(t => String(t.id) === String(logIdStr) || String(t.rawId) === String(logIdStr));
    return idx;
  }, [timeline, logIdStr, typeHint]);

  const event = currentIndex >= 0 ? timeline[currentIndex] : null;
  const prevEvent = currentIndex > 0 ? timeline[currentIndex - 1] : null;
  const nextEvent = currentIndex >= 0 && currentIndex < timeline.length - 1 ? timeline[currentIndex + 1] : null;

  // Match engineer profile
  const engineerProfile = useMemo(() => {
    if (!event?.engineer) return null;
    const baseName = event.engineer.split("(Supervised by")[0].trim().toLowerCase();
    return allUsers.find(u => (u.name || "").trim().toLowerCase() === baseName) || null;
  }, [event, allUsers]);

  // Parse supervision info if embedded in engineer string or fields
  const supervisionInfo = useMemo(() => {
    if (!event) return null;
    if (event.supervisingEngineer) {
      return {
        leadName: event.supervisingEngineer,
        cert: event.supervisingCertificate || "REF1010728 (Cat I)"
      };
    }
    const match = (event.engineer || "").match(/\(Supervised by\s+([^-)]+)(?:-\s*Cert:\s*([^)]+))?\)/i);
    if (match) {
      return {
        leadName: match[1].trim(),
        cert: (match[2] || "REF1010728 (Cat I)").trim()
      };
    }
    return null;
  }, [event]);

  // Match CRM job for this event
  const matchedCrmJob = useMemo(() => {
    if (!event) return null;
    const candidates = [event.siteRef, event.to, event.from].filter(Boolean) as string[];
    for (const c of candidates) {
      const clean = c.trim().toUpperCase();
      if (crmJobMap.has(clean)) return crmJobMap.get(clean)!;
    }
    return null;
  }, [event, crmJobMap]);

  // Match simultaneous or companion movement/usage event (within 2 minutes on the same bottle)
  const companionEvents = useMemo(() => {
    if (!event) return [];
    const t0 = new Date(event.date).getTime();
    return timeline.filter(
      other =>
        other.id !== event.id &&
        Math.abs(new Date(other.date).getTime() - t0) <= 120000
    );
  }, [event, timeline]);

  // Match linked HWCNs created around this event or active for this cylinder
  const relatedHwcns = useMemo(() => {
    if (!event || hwcns.length === 0) return [];
    const t0 = new Date(event.date).getTime();
    const closeByTime = hwcns.filter(h => {
      const ht = new Date(h.date || h.createdAt || h.created_at || 0).getTime();
      return Math.abs(ht - t0) <= 24 * 3600 * 1000; // within 24h of the event
    });
    if (closeByTime.length > 0) return closeByTime;
    return hwcns.slice(0, 2);
  }, [event, hwcns]);

  // Match linked Decommissioning records
  const relatedDecommissions = useMemo(() => {
    if (!event || decommissions.length === 0) return [];
    const siteKey = (event.siteRef || event.to || "").trim().toUpperCase();
    return decommissions.filter((d: any) => {
      if (siteKey && (d.jobNumber || "").trim().toUpperCase() === siteKey) return true;
      const dt = new Date(d.date || 0).getTime();
      const et = new Date(event.date).getTime();
      return Math.abs(dt - et) <= 12 * 3600 * 1000;
    });
  }, [event, decommissions]);

  // Extract photo URL if embedded in movement notes or supplier return
  const eventPhotoUrl = useMemo(() => {
    if (!event) return null;
    const match = (event.notes || "").match(/\[Photo:\s*([^\]]+)\]/);
    if (match) return match[1].trim();
    if (
      event.logType === "movement" &&
      (event.action === "returned_to_supplier" || (event.to || "").toLowerCase().includes("supplier") || bottle?.status === "returned") &&
      bottle?.supplierHwcnPhotoUrl
    ) {
      return bottle.supplierHwcnPhotoUrl;
    }
    return null;
  }, [event, bottle]);

  // Filter immutable audit trail changes specifically for this record
  const recordAuditChanges = useMemo(() => {
    if (!event) return [];
    return auditTrail.filter(
      a => String(a.recordId) === String(event.rawId) || String(a.recordId) === String(event.id)
    );
  }, [auditTrail, event]);

  const canEdit =
    user?.availableRoles?.includes("admin") ||
    user?.availableRoles?.includes("office") ||
    user?.role === "admin" ||
    user?.role === "office";

  const openEditModal = () => {
    if (!event) return;
    setEditFrom(event.from || "");
    setEditTo(event.to || "");
    setEditSiteRef(event.siteRef || event.to || "");
    setEditWeight(event.qty !== undefined ? String(event.qty) : "");
    setEditEngineer(event.engineer || "");
    setEditReason("");
    setShowEditModal(true);
  };

  const printEventReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ padding: "2.5rem", color: "var(--text-muted)" }}>
        Loading bottle event details...
      </div>
    );
  }

  if (!bottle || !event) {
    return (
      <div style={{ padding: "2.5rem", maxWidth: "800px", margin: "0 auto" }}>
        <Link
          href={`/admin/bottles/${encodeURIComponent(serialStr)}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#00e5ff", textDecoration: "none", marginBottom: "1.5rem", fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Back to Cylinder {serialStr}
        </Link>
        <div className="glass-panel" style={{ padding: "2.5rem", textAlign: "center" }}>
          <AlertTriangle size={42} color="#ffaa00" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ margin: "0 0 0.5rem", color: "#fff" }}>Audit Event Not Found</h2>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Could not locate audit record <code>{logIdStr}</code> for cylinder <strong>{serialStr}</strong>.
          </p>
        </div>
      </div>
    );
  }

  const isUsage = event.logType === "usage";
  const isRecovery = event.action === "Gas Recovered";
  const effectiveGas = event.gasType || bottle.gasType || "Unknown";
  const gwp = getGwp(effectiveGas);
  const qtyNum = event.qty !== undefined ? Number(event.qty) : Math.abs(event.computedAfter - event.computedBefore);
  const co2eTonnes = calculateCO2e(effectiveGas, qtyNum);
  const capacity = bottle.initialWeight || 20;
  const beforePct = capacity > 0 ? Math.min(100, Math.max(0, (event.computedBefore / capacity) * 100)) : 0;
  const afterPct = capacity > 0 ? Math.min(100, Math.max(0, (event.computedAfter / capacity) * 100)) : 0;

  const themeColor = isUsage
    ? isRecovery
      ? "#ffaa00"
      : event.jobType === "recycled_charge"
      ? "#10b981"
      : event.jobType === "leak_test"
      ? "#c084fc"
      : "#00e5ff"
    : "#38bdf8";

  const eventDateObj = new Date(event.date);

  return (
    <div style={{ padding: "1.75rem 2rem 4rem", maxWidth: "1180px", margin: "0 auto" }}>
      {/* Top navigation & prev/next bar */}
      <div className="no-print" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <Link
          href={`/admin/bottles/${encodeURIComponent(serialStr)}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#00e5ff",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: "0.9rem",
            background: "rgba(0,229,255,0.08)",
            border: "1px solid rgba(0,229,255,0.25)",
            padding: "0.5rem 0.9rem",
            borderRadius: "8px"
          }}
        >
          <ArrowLeft size={16} /> Back to Cylinder {serialStr} Audit Trail
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          {prevEvent && (
            <button
              onClick={() =>
                router.push(
                  `/admin/bottles/${encodeURIComponent(serialStr)}/audit/${encodeURIComponent(prevEvent.id)}?type=${prevEvent.logType}`
                )
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                padding: "0.45rem 0.75rem",
                borderRadius: "7px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600
              }}
              title={`Older Event: ${prevEvent.action} (${new Date(prevEvent.date).toLocaleDateString("en-GB")})`}
            >
              <ChevronLeft size={15} /> Previous Event
            </button>
          )}
          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", padding: "0 0.35rem" }}>
            Event {currentIndex + 1} of {timeline.length}
          </span>
          {nextEvent && (
            <button
              onClick={() =>
                router.push(
                  `/admin/bottles/${encodeURIComponent(serialStr)}/audit/${encodeURIComponent(nextEvent.id)}?type=${nextEvent.logType}`
                )
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.8)",
                padding: "0.45rem 0.75rem",
                borderRadius: "7px",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 600
              }}
              title={`Newer Event: ${nextEvent.action} (${new Date(nextEvent.date).toLocaleDateString("en-GB")})`}
            >
              Next Event <ChevronRight size={15} />
            </button>
          )}

          {canEdit && (
            <button
              onClick={openEditModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "rgba(255,170,0,0.12)",
                border: "1px solid rgba(255,170,0,0.35)",
                color: "#ffaa00",
                padding: "0.45rem 0.85rem",
                borderRadius: "7px",
                cursor: "pointer",
                fontSize: "0.82rem",
                fontWeight: 600,
                marginLeft: "0.25rem"
              }}
            >
              <Edit3 size={14} /> Correct Record
            </button>
          )}

          <button
            onClick={printEventReport}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "0.45rem 0.85rem",
              borderRadius: "7px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600
            }}
          >
            <Printer size={14} /> Print Event Record
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: "1.6rem 2rem",
          borderLeft: `4px solid ${themeColor}`,
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "1.25rem"
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 800,
                padding: "0.25rem 0.65rem",
                borderRadius: "20px",
                background: `${themeColor}20`,
                color: themeColor,
                border: `1px solid ${themeColor}55`,
                textTransform: "uppercase",
                letterSpacing: "0.06em"
              }}
            >
              {isUsage ? "Refrigerant Usage / F-Gas Log" : "Physical Custody & Movement Log"}
            </span>
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                padding: "0.2rem 0.55rem",
                borderRadius: "6px",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.7)",
                fontFamily: "var(--font-geist-mono)"
              }}
            >
              Record ID: #{event.rawId}
            </span>
            {recordAuditChanges.length > 0 && (
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "0.2rem 0.55rem",
                  borderRadius: "6px",
                  background: "rgba(168,85,247,0.15)",
                  color: "#c084fc",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem"
                }}
              >
                <ShieldCheck size={13} /> Administratively Corrected ({recordAuditChanges.length})
              </span>
            )}
          </div>

          <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.55rem", fontWeight: 800, color: "#fff" }}>
            {isUsage ? formatJobTypeFull(event.jobType) : formatMoveActionFull(event.action)}
          </h1>

          <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap", fontSize: "0.88rem", color: "rgba(255,255,255,0.7)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Calendar size={14} color={themeColor} />
              <strong>{eventDateObj.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}</strong>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={14} color={themeColor} />
              <strong>{eventDateObj.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</strong>
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Package size={14} color={themeColor} />
              Cylinder:{" "}
              <Link href={`/admin/bottles/${encodeURIComponent(serialStr)}`} style={{ color: "#00e5ff", fontWeight: 700, fontFamily: "var(--font-geist-mono)" }}>
                {serialStr}
              </Link>
            </span>
          </div>
        </div>

        {/* Right KPI Badge */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            padding: "0.9rem 1.35rem",
            textAlign: "right",
            minWidth: "200px"
          }}
        >
          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
            {isUsage
              ? isRecovery
                ? "Refrigerant Recovered"
                : event.jobType === "leak_test"
                ? "Inspection Result"
                : "Refrigerant Dispensed"
              : "Cylinder Weight at Event"}
          </div>
          <div style={{ fontSize: "1.65rem", fontWeight: 800, color: themeColor, marginTop: "0.15rem" }}>
            {isUsage
              ? event.jobType === "leak_test"
                ? "0.00 kg (Pass)"
                : `${isRecovery ? "+" : "-"}${qtyNum.toFixed(2)} kg`
              : event.computedAfter === 0 && bottle.category === "reclaim" && isBottleTrace(bottle)
              ? "Trace"
              : `${event.computedAfter.toFixed(2)} kg`}
          </div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.55)", marginTop: "0.1rem" }}>
            {effectiveGas} {gwp > 0 && qtyNum > 0 ? `· ${co2eTonnes.toFixed(3)} t CO₂e` : ""}
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Card 1: Mass Balance & Weight Progression */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Scale size={17} /> Mass-Balance &amp; Cylinder Weight Progression
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Weight Before</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#fff", marginTop: "0.2rem" }}>
                {event.computedBefore.toFixed(2)} kg
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
                {beforePct.toFixed(0)}% of {capacity.toFixed(1)} kg capacity
              </div>
            </div>

            <div style={{ textAlign: "center", padding: "0 0.5rem" }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 800,
                  padding: "0.25rem 0.6rem",
                  borderRadius: "20px",
                  background:
                    qtyNum === 0
                      ? "rgba(255,255,255,0.07)"
                      : isRecovery
                      ? "rgba(255,170,0,0.15)"
                      : "rgba(239,68,68,0.15)",
                  color: qtyNum === 0 ? "rgba(255,255,255,0.6)" : isRecovery ? "#ffaa00" : "#f87171",
                  marginBottom: "0.25rem"
                }}
              >
                {qtyNum === 0 ? "0.00 kg" : `${isRecovery ? "+" : "-"}${qtyNum.toFixed(2)} kg`}
              </div>
              <ArrowRight size={18} style={{ opacity: 0.4, margin: "0 auto" }} />
            </div>

            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600 }}>Weight After</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: themeColor, marginTop: "0.2rem" }}>
                {event.computedAfter === 0 && event.action === "emptied"
                  ? "Trace (0.00 kg bulk)"
                  : `${event.computedAfter.toFixed(2)} kg`}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.45)" }}>
                {afterPct.toFixed(0)}% of {capacity.toFixed(1)} kg capacity
              </div>
            </div>
          </div>

          {/* Visual Capacity Bar */}
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.35rem" }}>
              <span>Cylinder Fill Level After Event</span>
              <span>
                {event.computedAfter.toFixed(2)} / {capacity.toFixed(2)} kg (Available Space: {Math.max(0, capacity - event.computedAfter).toFixed(2)} kg)
              </span>
            </div>
            <div style={{ width: "100%", height: "10px", background: "rgba(255,255,255,0.08)", borderRadius: "6px", overflow: "hidden" }}>
              <div
                style={{
                  width: `${afterPct}%`,
                  height: "100%",
                  background: themeColor,
                  transition: "width 0.3s ease"
                }}
              />
            </div>
          </div>

          {/* F-Gas / Environmental Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.6rem", fontSize: "0.82rem" }}>
            <div style={{ background: "rgba(255,255,255,0.025)", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Refrigerant Gas</div>
              <div style={{ fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>{effectiveGas}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.025)", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>GWP (AR4 100-yr)</div>
              <div style={{ fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>{gwp > 0 ? gwp.toLocaleString() : "N/A"}</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.025)", padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>CO₂ Equivalent</div>
              <div style={{ fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>
                {gwp > 0 && qtyNum > 0 ? `${co2eTonnes.toFixed(3)} t CO₂e` : "0.000 t"}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Engineer, Supervision & Vehicle Custody */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <User size={17} /> Engineer, Qualification &amp; Vehicle Custody
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Logged By Engineer</span>
              <strong style={{ color: "#fff" }}>{engineerProfile?.name || event.engineer || "System"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Role &amp; Employer</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>
                {engineerProfile
                  ? `${engineerProfile.role.charAt(0).toUpperCase() + engineerProfile.role.slice(1)} · ${engineerProfile.employer || "21 Degrees"}`
                  : "Certified Engineer · 21 Degrees"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>F-Gas Certificate</span>
              <span style={{ color: "#10b981", fontWeight: 700, fontFamily: "var(--font-geist-mono)" }}>
                {engineerProfile?.certificate || "REF1010728 (Cat I)"}
              </span>
            </div>

            {supervisionInfo && (
              <div
                style={{
                  background: "rgba(255,170,0,0.08)",
                  border: "1px solid rgba(255,170,0,0.25)",
                  borderRadius: "8px",
                  padding: "0.65rem 0.85rem"
                }}
              >
                <div style={{ fontSize: "0.72rem", color: "#ffaa00", fontWeight: 700, textTransform: "uppercase" }}>
                  Supervised Operative Log
                </div>
                <div style={{ fontSize: "0.85rem", color: "#fff", marginTop: "0.2rem" }}>
                  Supervising Lead Engineer: <strong>{supervisionInfo.leadName}</strong> ({supervisionInfo.cert})
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Vehicle Registration</span>
              <span style={{ fontWeight: 700, color: "#00e5ff", fontFamily: "var(--font-geist-mono)" }}>
                {event.vehicleReg || engineerProfile?.vehicleReg || bottle.vehicleReg || "—"}
              </span>
            </div>

            {engineerProfile?.email && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Contact Email</span>
                <span style={{ color: "rgba(255,255,255,0.75)" }}>{engineerProfile.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custody Flow / Location & Job Site Details */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.25rem", marginBottom: "1.25rem" }}>
        {/* Origin -> Destination / Custody Card */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Truck size={17} /> Chain of Custody &amp; Location Details
          </h3>

          {!isUsage ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "0.75rem", background: "rgba(255,255,255,0.03)", padding: "1rem", borderRadius: "10px", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Origin (From)</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginTop: "0.2rem" }}>
                    {event.from || "—"}
                  </div>
                  {event.from && crmJobMap.get(event.from.trim().toUpperCase())?.siteTitle && (
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>
                      {crmJobMap.get(event.from.trim().toUpperCase())!.siteTitle}
                    </div>
                  )}
                </div>

                <ArrowRight size={20} color="#00e5ff" />

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Destination (To)</div>
                  <div style={{ fontSize: "1rem", fontWeight: 700, color: "#00e5ff", marginTop: "0.2rem" }}>
                    {event.to || "—"}
                  </div>
                  {event.to && crmJobMap.get(event.to.trim().toUpperCase())?.siteTitle && (
                    <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.15rem" }}>
                      {crmJobMap.get(event.to.trim().toUpperCase())!.siteTitle}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "0.85rem 1rem" }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, marginBottom: "0.3rem" }}>
                  Audit Movement Notes
                </div>
                <div style={{ fontSize: "0.88rem", color: "#fff", lineHeight: 1.5, wordBreak: "break-word" }}>
                  {(event.notes || "Standard custody transfer recorded.").replace(/\[Photo:\s*[^\]]+\]/g, "").trim()}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "var(--text-muted)" }}>Job Reference Number</span>
                {event.siteRef ? (
                  <Link
                    href={`/admin/jobs/${encodeURIComponent(event.siteRef)}`}
                    style={{ color: "#00e5ff", fontWeight: 700, fontFamily: "var(--font-geist-mono)", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
                  >
                    {event.siteRef} <ExternalLink size={13} />
                  </Link>
                ) : (
                  <span style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "var(--text-muted)" }}>Site / Client Name</span>
                <strong style={{ color: "#fff", textAlign: "right" }}>
                  {event.siteName || matchedCrmJob?.siteTitle || matchedCrmJob?.customer || "—"}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ color: "var(--text-muted)" }}>Site Address</span>
                <span style={{ color: "rgba(255,255,255,0.85)", textAlign: "right", maxWidth: "65%" }}>
                  {event.siteAddress || matchedCrmJob?.siteAddress || "—"}
                  {matchedCrmJob?.sitePostcode ? ` (${matchedCrmJob.sitePostcode})` : ""}
                </span>
              </div>

              {matchedCrmJob?.uprn && (
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.6rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ color: "var(--text-muted)" }}>Property UPRN</span>
                  <span style={{ color: "#00e5ff", fontFamily: "var(--font-geist-mono)", fontWeight: 600 }}>
                    {matchedCrmJob.uprn}
                  </span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Activity Classification</span>
                <span style={{ color: themeColor, fontWeight: 700 }}>{formatJobTypeFull(event.jobType)}</span>
              </div>
            </div>
          )}

          {/* Companion events at the same timestamp */}
          {companionEvents.length > 0 && (
            <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.45rem" }}>
                Linked Simultaneous Event(s) on this Visit
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {companionEvents.map(ce => (
                  <Link
                    key={ce.id}
                    href={`/admin/bottles/${encodeURIComponent(serialStr)}/audit/${encodeURIComponent(ce.id)}?type=${ce.logType}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.5rem 0.75rem",
                      background: "rgba(0,229,255,0.06)",
                      border: "1px solid rgba(0,229,255,0.2)",
                      borderRadius: "7px",
                      color: "#fff",
                      textDecoration: "none",
                      fontSize: "0.82rem"
                    }}
                  >
                    <span>
                      <strong style={{ color: "#00e5ff" }}>{ce.action}</strong> — {ce.notes || `${ce.from || ""} → ${ce.to || ""}`}
                    </span>
                    <ArrowRight size={14} color="#00e5ff" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Cylinder Master Profile Snapshot */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Package size={17} /> Cylinder Registration &amp; Master Metadata
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", fontSize: "0.88rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.55rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Cylinder Serial</span>
              <Link href={`/admin/bottles/${encodeURIComponent(bottle.serial)}`} style={{ color: "#00e5ff", fontWeight: 700, fontFamily: "var(--font-geist-mono)" }}>
                {bottle.serial}
              </Link>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.55rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Category</span>
              <strong style={{ color: "#fff", textTransform: "capitalize" }}>
                {bottle.category === "reclaim" ? "Reclaim / Waste Cylinder" : bottle.category === "recycled" ? "Recycled Refrigerant Cylinder" : bottle.category === "nitrogen" ? "Nitrogen (OFN)" : "New Virgin Refrigerant"}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.55rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Supplier &amp; PO Number</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>
                {bottle.supplier || "—"} {bottle.poNumber ? `· PO: ${bottle.poNumber}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.55rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Registered Into System</span>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>
                {bottle.registeredAt ? new Date(bottle.registeredAt).toLocaleDateString("en-GB") : "—"}
                {bottle.registeredBy ? ` by ${bottle.registeredBy}` : ""}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "0.55rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Live Location</span>
              <span style={{ color: "#fff", fontWeight: 600 }}>
                {bottle.locationId || bottle.locationType} ({isBottleTrace(bottle) ? "Trace" : bottle.status})
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Current Live Weight</span>
              <strong style={{ color: isBottleTrace(bottle) ? "#ffaa00" : "#22c55e" }}>
                {isBottleTrace(bottle) ? "Trace" : `${(bottle.currentWeight ?? 0).toFixed(2)} kg`} / {(bottle.initialWeight ?? 0).toFixed(2)} kg
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Breakdown Table (for Usage / Recovery / Leak Check events) */}
      {isUsage && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wrench size={17} /> Equipment &amp; Plant Systems Serviced / Recovered
          </h3>

          {event.equipmentDetails && event.equipmentDetails.length > 0 ? (
            <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Unit #</th>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>System / Asset Ref</th>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Manufacturer &amp; Model</th>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600 }}>Equipment Serial</th>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>Refrigerant Qty</th>
                    <th style={{ padding: "0.75rem 1rem", color: "var(--text-muted)", fontWeight: 600, textAlign: "right" }}>CO₂e Impact</th>
                  </tr>
                </thead>
                <tbody>
                  {event.equipmentDetails.map((eq: any, i: number) => {
                    const eqWt = Number(eq.weight ?? 0);
                    const eqCo2 = calculateCO2e(effectiveGas, eqWt);
                    return (
                      <tr key={i} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <td style={{ padding: "0.75rem 1rem", color: "rgba(255,255,255,0.6)" }}>Unit {i + 1}</td>
                        <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#fff" }}>
                          {eq.systemName || eq.assetName || eq.category || `System ${i + 1}`}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", color: "#fff" }}>
                          {[eq.manufacturer, eq.model].filter(Boolean).join(" ") || "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "var(--font-geist-mono)", color: "#00e5ff" }}>
                          {eq.serial || "—"}
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: themeColor }}>
                          {eqWt.toFixed(2)} kg
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "rgba(255,255,255,0.7)" }}>
                          {gwp > 0 ? `${eqCo2.toFixed(3)} t` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ padding: "1rem", background: "rgba(255,255,255,0.025)", borderRadius: "8px", color: "var(--text-muted)", fontSize: "0.86rem" }}>
              No individual unit sub-breakdown was recorded for this entry (Total logged: <strong style={{ color: "#fff" }}>{qtyNum.toFixed(2)} kg</strong> on job <strong style={{ color: "#00e5ff" }}>{event.siteRef || "—"}</strong>).
            </div>
          )}
        </div>
      )}

      {/* Linked HWCNs, Decommissioning Records & Supplier Paperwork Photo */}
      {(relatedHwcns.length > 0 || relatedDecommissions.length > 0 || eventPhotoUrl) && (
        <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "1.25rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#00e5ff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <ClipboardList size={17} /> Associated Compliance Paperwork (HWCNs &amp; Decommissioning)
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {relatedHwcns.length > 0 && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Hazardous Waste Consignment Notes (HWCN)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                  {relatedHwcns.map((h: any) => (
                    <Link
                      key={h.id}
                      href={`/admin/hwcn/${encodeURIComponent(h.id)}`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.85rem 1rem",
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "#fff"
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem" }}>
                          {h.id}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Dest: {h.destination || "HQ-Stores"} · {h.fillWeight ? `${Number(h.fillWeight).toFixed(2)} kg` : "Trace"}
                        </div>
                      </div>
                      <ExternalLink size={15} color="#00e5ff" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {relatedDecommissions.length > 0 && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Linked Decommissioning Certificates
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
                  {relatedDecommissions.map((d: any) => (
                    <Link
                      key={d.id}
                      href={d.jobNumber ? `/admin/jobs/${encodeURIComponent(d.jobNumber)}` : `/admin/decommission`}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "0.85rem 1rem",
                        background: "rgba(255,170,0,0.06)",
                        border: "1px solid rgba(255,170,0,0.25)",
                        borderRadius: "8px",
                        textDecoration: "none",
                        color: "#fff"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#ffaa00", fontSize: "0.9rem" }}>
                          Decommission Job {d.jobNumber || "—"} — {d.siteName || "Site"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                          Engineer: {d.engineer || "—"} · Recovered: {Number(d.totalWeightRecovered || 0).toFixed(2)} kg
                        </div>
                      </div>
                      <ExternalLink size={15} color="#ffaa00" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {eventPhotoUrl && (
              <div>
                <div style={{ fontSize: "0.75rem", color: "#a855f7", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                  <Camera size={14} /> Attached Supplier HWCN Paperwork Photo
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {eventPhotoUrl
                    .split(",")
                    .map(s => s.trim())
                    .filter(Boolean)
                    .map((url, idx) => (
                      <div key={idx} style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(168,85,247,0.3)", maxWidth: "680px" }}>
                        <img src={url} alt={`Supplier HWCN Paperwork ${idx + 1}`} style={{ width: "100%", display: "block" }} />
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Immutable F-Gas Change History for this specific record */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#c084fc", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <ShieldCheck size={17} /> Immutable F-Gas Audit Corrections for this Event ({recordAuditChanges.length})
        </h3>

        {recordAuditChanges.length === 0 ? (
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            ✓ Original unedited field entry — no administrative corrections have been made to this record.
          </div>
        ) : (
          <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)", textAlign: "left" }}>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Timestamp</th>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Admin User</th>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Field</th>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Previous Value</th>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Corrected Value</th>
                  <th style={{ padding: "0.7rem 1rem", color: "var(--text-muted)" }}>Justification</th>
                </tr>
              </thead>
              <tbody>
                {recordAuditChanges.map(a => (
                  <tr key={a.id} style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <td style={{ padding: "0.7rem 1rem", color: "rgba(255,255,255,0.65)" }}>
                      {new Date(a.createdAt).toLocaleString("en-GB")}
                    </td>
                    <td style={{ padding: "0.7rem 1rem", fontWeight: 600, color: "#fff" }}>{a.changedBy}</td>
                    <td style={{ padding: "0.7rem 1rem", fontFamily: "var(--font-geist-mono)", color: "#00e5ff" }}>{a.fieldName}</td>
                    <td style={{ padding: "0.7rem 1rem", color: "#f87171", textDecoration: "line-through" }}>{a.oldValue || "—"}</td>
                    <td style={{ padding: "0.7rem 1rem", color: "#22c55e", fontWeight: 700 }}>{a.newValue || "—"}</td>
                    <td style={{ padding: "0.7rem 1rem", fontStyle: "italic", color: "rgba(255,255,255,0.85)" }}>&ldquo;{a.reason}&rdquo;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inline Correction Modal */}
      {showEditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem"
          }}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "520px",
              width: "100%",
              background: "#12141a",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "12px",
              padding: "1.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.15rem"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit3 size={18} color="var(--primary)" />
                Correct {isUsage ? "Usage Record" : "Movement Record"}
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem", color: "var(--primary)" }}>
              All edits are recorded in the immutable F-Gas Audit Trail with before/after values, your name, and your stated justification.
            </div>

            {!isUsage ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>From Location</label>
                  <input
                    type="text"
                    value={editFrom}
                    onChange={e => setEditFrom(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>To Location / Destination</label>
                  <input
                    type="text"
                    value={editTo}
                    onChange={e => setEditTo(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Engineer Name</label>
                  <input
                    type="text"
                    value={editEngineer}
                    onChange={e => setEditEngineer(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Site Job Reference</label>
                  <input
                    type="text"
                    value={editSiteRef}
                    onChange={e => setEditSiteRef(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Weight Dispensed / Recovered (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editWeight}
                    onChange={e => setEditWeight(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Engineer Name</label>
                  <input
                    type="text"
                    value={editEngineer}
                    onChange={e => setEditEngineer(e.target.value)}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#ffaa00", marginBottom: "0.4rem" }}>
                * Reason for Correction (Mandatory Audit Justification)
              </label>
              <textarea
                rows={3}
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="e.g. Engineer typo in site reference; job was C37231"
                style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "6px", color: "#fff", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{ padding: "0.55rem 1rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!editReason.trim() || isSavingEdit}
                onClick={async () => {
                  if (!editReason.trim()) return;
                  setIsSavingEdit(true);
                  try {
                    if (!isUsage) {
                      await db.updateMovementLogWithAudit(
                        event.rawId,
                        { from: editFrom, to: editTo, engineer: editEngineer },
                        user?.name || "Administrator",
                        editReason.trim()
                      );
                    } else {
                      await db.updateUsageLogWithAudit(
                        event.rawId,
                        {
                          siteRef: editSiteRef,
                          weightUsed: parseFloat(editWeight) || 0,
                          engineer: editEngineer
                        },
                        user?.name || "Administrator",
                        editReason.trim()
                      );
                    }
                    window.location.reload();
                  } catch (err) {
                    alert("Error saving correction: " + (err instanceof Error ? err.message : String(err)));
                    setIsSavingEdit(false);
                  }
                }}
                style={{
                  padding: "0.55rem 1.2rem",
                  background: editReason.trim() ? "#00e5ff" : "rgba(255,255,255,0.1)",
                  color: editReason.trim() ? "#000" : "rgba(255,255,255,0.4)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 700,
                  cursor: editReason.trim() ? "pointer" : "not-allowed"
                }}
              >
                {isSavingEdit ? "Saving..." : "Save & Record Audit Trail"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
