"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, Bottle, MovementLog, UsageLog, CrmJob, AuditTrailEntry } from "@/lib/db";
import { ArrowLeft, Edit3, History, ArrowRight, User, Package, Calendar, MapPin, Truck, Building2, FileText, FileSpreadsheet, ClipboardList, Wrench, Tag, CheckCircle, RotateCcw, RefreshCw, Camera, ZoomIn, ZoomOut, Printer, Maximize2, Trash2, Archive, Recycle, AlertTriangle, Pencil, ShieldCheck, X } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { getCylinderGenealogy } from "@/lib/genealogy";

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

function CylinderWeightChart({
  bottle,
  moveLogs,
  usageLogs,
}: {
  bottle: Bottle;
  moveLogs: MovementLog[];
  usageLogs: UsageLog[];
}) {
  const isReclaim = bottle.category === "reclaim";
  const initialWeight = bottle.initialWeight ?? 0;
  const currentWeight = bottle.currentWeight ?? 0;

  const points = useMemo(() => {
    const list: Array<{
      date: string;
      weight: number;
      label: string;
      change?: number;
      engineer?: string;
    }> = [];

    // 1. Initial point
    list.push({
      date: bottle.registeredAt || new Date().toISOString(),
      weight: initialWeight,
      label: isReclaim ? "Empty Reclaim Registration (Tare)" : "Initial Registration",
    });

    // 2. Intermediary usage/movement points
    const events: Array<{ date: string; weight: number; label: string; change?: number; engineer?: string }> = [];

    usageLogs.forEach(u => {
      const isRec = ["recovery", "retrofit", "waste", "reclaim"].includes((u.jobType || "").toLowerCase());
      const change = isRec ? (u.weightUsed || 0) : -(u.weightUsed || 0);
      const w = u.weightAfter !== undefined && u.weightAfter !== null ? u.weightAfter : (initialWeight + change);
      events.push({
        date: u.date,
        weight: Math.max(0, w),
        label: u.siteRef ? `Job ${u.siteRef}` : "Refrigerant Action",
        change,
        engineer: u.engineer,
      });
    });

    moveLogs.forEach(m => {
      const logWeight = (m as any).currentWeight ?? (m as any).weight;
      if (logWeight !== undefined && logWeight !== null && m.action !== "registered") {
        events.push({
          date: m.date,
          weight: logWeight,
          label: `Action: ${m.action.replace(/_/g, " ")}`,
          engineer: m.engineer,
        });
      }
    });

    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    events.forEach(e => {
      list.push(e);
    });

    const lastPoint = list[list.length - 1];
    if (!lastPoint || lastPoint.weight !== currentWeight) {
      list.push({
        date: bottle.locationChangedAt || new Date().toISOString(),
        weight: currentWeight,
        label: "Current Balance",
      });
    }

    return list;
  }, [bottle, moveLogs, usageLogs, isReclaim]);

  const themeColor = isReclaim ? "#ffaa00" : "#00e5ff";
  const themeBorder = isReclaim ? "rgba(255, 170, 0, 0.3)" : "rgba(0, 229, 255, 0.25)";
  const themeBg = isReclaim ? "rgba(255, 170, 0, 0.08)" : "rgba(0, 229, 255, 0.08)";

  const gasChange = currentWeight - initialWeight;
  const percentageRemaining = initialWeight > 0 ? Math.min(100, Math.max(0, (currentWeight / initialWeight) * 100)) : 0;
  const reclaimFillPct = initialWeight > 0 ? Math.min(100, Math.max(0, (gasChange / Math.max(initialWeight, 1)) * 100)) : 0;

  const hasEvents = usageLogs.length > 0 || moveLogs.some(m => (m as any).currentWeight !== undefined && m.action !== "registered");
  if (!hasEvents || (isReclaim && currentWeight <= initialWeight) || points.length < 2) {
    return null;
  }

  const svgWidth = 650;
  const svgHeight = 140;
  const paddingX = 35;
  const paddingY = 20;

  const weightsArr = points.map(p => p.weight);
  const minW = Math.min(...weightsArr, 0);
  const maxW = Math.max(...weightsArr, initialWeight * 1.05, 1);

  const getX = (index: number) => {
    if (points.length === 1) return paddingX;
    return paddingX + (index / (points.length - 1)) * (svgWidth - paddingX * 2);
  };

  const getY = (w: number) => {
    const ratio = (w - minW) / Math.max(maxW - minW, 0.001);
    return svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
  };

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i).toFixed(1)} ${getY(p.weight).toFixed(1)}`).join(" ");

  const areaD = `${pathD} L ${getX(points.length - 1).toFixed(1)} ${svgHeight - paddingY} L ${paddingX} ${svgHeight - paddingY} Z`;

  return (
    <div style={{
      background: "rgba(17, 24, 39, 0.7)",
      border: `1px solid ${themeBorder}`,
      borderRadius: "12px",
      padding: "1.25rem 1.5rem",
      marginBottom: "1.5rem",
      backdropFilter: "blur(12px)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "0.72rem", color: themeColor, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {isReclaim ? "Reclaim Cylinder Accumulation & Fill Trajectory" : "Cylinder Weight Loss & Usage Trajectory"}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff", marginTop: "2px" }}>
            {currentWeight.toFixed(2)} kg <span style={{ fontSize: "0.82rem", color: "#94a3b8", fontWeight: 500 }}>
              {isReclaim ? `(Tare: ${initialWeight.toFixed(2)} kg)` : `of ${initialWeight.toFixed(2)} kg capacity`}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
          {isReclaim ? (
            <>
              <div style={{ background: themeBg, border: `1px solid ${themeBorder}`, padding: "0.3rem 0.75rem", borderRadius: "8px", textAlign: "right" }}>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Gas Recovered In</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#ffaa00" }}>
                  +{gasChange >= 0 ? gasChange.toFixed(2) : "0.00"} kg
                </div>
              </div>
              <div style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.25)", padding: "0.3rem 0.75rem", borderRadius: "8px", textAlign: "right" }}>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Fill Ratio</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#a855f7" }}>
                  {reclaimFillPct.toFixed(1)}% Full
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: "rgba(0, 229, 255, 0.08)", border: "1px solid rgba(0, 229, 255, 0.25)", padding: "0.3rem 0.75rem", borderRadius: "8px", textAlign: "right" }}>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Gas Remaining</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: percentageRemaining > 20 ? "#22c55e" : "#ffaa00" }}>
                  {percentageRemaining.toFixed(1)}%
                </div>
              </div>
              <div style={{ background: "rgba(255, 170, 0, 0.08)", border: "1px solid rgba(255, 170, 0, 0.25)", padding: "0.3rem 0.75rem", borderRadius: "8px", textAlign: "right" }}>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Total Serviced</div>
                <div style={{ fontSize: "0.95rem", fontWeight: 800, color: (initialWeight - currentWeight) >= 0 ? "#ffaa00" : "#22c55e" }}>
                  {(initialWeight - currentWeight) >= 0 ? `-${(initialWeight - currentWeight).toFixed(2)} kg` : `+${Math.abs(initialWeight - currentWeight).toFixed(2)} kg`}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ width: "100%", overflowX: "auto" }} className="scrollbar-none">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "auto", minWidth: "450px" }}>
          <defs>
            <linearGradient id={`weightGradient_${isReclaim ? 'rec' : 'virgin'}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={paddingX} y1={getY(initialWeight)} x2={svgWidth - paddingX} y2={getY(initialWeight)} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={getY(maxW / 2)} x2={svgWidth - paddingX} y2={getY(maxW / 2)} stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />

          <path d={areaD} fill={`url(#weightGradient_${isReclaim ? 'rec' : 'virgin'})`} />
          <path d={pathD} fill="none" stroke={themeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {points.map((p, i) => {
            const cx = getX(i);
            const cy = getY(p.weight);
            const isLast = i === points.length - 1;

            return (
              <g key={i} style={{ cursor: "pointer" }}>
                <circle cx={cx} cy={cy} r={isLast ? 6 : 4} fill={isLast ? (isReclaim ? "#ffaa00" : "#22c55e") : themeColor} stroke="#0f172a" strokeWidth="2" />
                <title>{`${new Date(p.date).toLocaleDateString("en-GB")}: ${p.weight.toFixed(2)} kg (${p.label})`}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.4rem" }}>
        <div>Registered: {new Date(points[0].date).toLocaleDateString("en-GB")} ({points[0].weight.toFixed(2)} kg)</div>
        <div>Current Balance: {new Date(points[points.length - 1].date).toLocaleDateString("en-GB")} ({points[points.length - 1].weight.toFixed(2)} kg)</div>
      </div>
    </div>
  );
}

export default function ViewBottlePage() {
  const { serial } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [moveLogs, setMoveLogs] = useState<MovementLog[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [decommissions, setDecommissions] = useState<any[]>([]);
  const [auditTrail, setAuditTrail] = useState<AuditTrailEntry[]>([]);
  const [editingLog, setEditingLog] = useState<{
    id: string;
    logType: 'movement' | 'usage';
    serial: string;
    from?: string;
    to?: string;
    siteRef?: string;
    weightUsed?: number;
    engineer?: string;
    date?: string;
    notes?: string;
    vehicleReg?: string;
  } | null>(null);
  const [editReason, setEditReason] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("audit");
  const [resolvedRegisteredBy, setResolvedRegisteredBy] = useState<string | null>(null);
  const [selectedLifecycleIndex, setSelectedLifecycleIndex] = useState<number | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);
  const [crmJobMap, setCrmJobMap] = useState<Map<string, CrmJob>>(new Map());

  const serialStr = decodeURIComponent(serial as string);

  useEffect(() => {
    if (serial) {
      Promise.all([
        db.getBottle(serialStr),
        db.getMovementLogs(serialStr),
        db.getUsageLogs(serialStr),
        db.getHWCNsForBottle(serialStr),
        db.getDecommissionsByBottleSerial(serialStr),
        db.getAuditTrailForSerial(serialStr),
      ]).then(([bottleData, moveData, useData, hwcnData, decommData, auditData]) => {
        setBottle(bottleData);
        setMoveLogs(moveData);
        setUsageLogs(useData);
        setHwcns(hwcnData);
        setDecommissions(decommData);
        setAuditTrail(auditData || []);
        setLoading(false);

        // Resolve registeredBy if it doesn't look like a human name (e.g. it's a UUID from old data)
        const regBy = bottleData?.registeredBy;
        if (regBy && (!regBy.includes(' ') || /[0-9a-fA-F]{8}-/.test(regBy))) {
          db.getEngineerById(regBy).then(eng => {
            if (eng?.name) setResolvedRegisteredBy(eng.name);
          }).catch(() => { /* not a valid ID, leave as-is */ });
        }

        // Build a map of job-number → CRM job for enriching location displays
        const jobRefs = new Set<string>();
        useData.forEach(l => l.siteRef && jobRefs.add(l.siteRef));
        if (bottleData?.locationType === "site" && bottleData.locationId) jobRefs.add(bottleData.locationId);
        moveData.forEach(l => { if (l.to) jobRefs.add(l.to); if (l.from) jobRefs.add(l.from); });
        if (jobRefs.size > 0) {
          db.getCrmJobsByNumbers(Array.from(jobRefs)).then(jobs => {
            setCrmJobMap(new Map(jobs.map(j => [j.jobNumber, j])));
          });
        }
      });
    }
  }, [serial]);

  const lifecycles = useMemo(() => deriveLifecycles(moveLogs), [moveLogs]);
  const genealogy = useMemo(() => getCylinderGenealogy(bottle, moveLogs), [bottle, moveLogs]);

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

  const [isRepairing, setIsRepairing] = useState(false);

  const anomalousMovement = useMemo(() => {
    if (!bottle) return null;
    const isOffice = bottle.locationType === "office";
    const lastMove = moveLogs[0];
    if (
      lastMove &&
      lastMove.from &&
      lastMove.to &&
      lastMove.from === lastMove.to &&
      lastMove.to.includes(" - Van") &&
      (isOffice || bottle.locationId === "HQ-Stores" || bottle.locationId === lastMove.to)
    ) {
      return lastMove;
    }
    return null;
  }, [bottle, moveLogs]);

  const handleRepairMovement = async () => {
    if (!bottle) return;
    setIsRepairing(true);
    try {
      await db.fixAnomalousStoreMovement(serialStr);
      window.location.reload();
    } catch (e) {
      console.error("Failed to repair movement:", e);
      alert("Failed to repair movement record. Check console for details.");
      setIsRepairing(false);
    }
  };

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

  const activePhotoUrl = useMemo(() => {
    const isLatest = !selectedLifecycle || selectedLifecycle.index === lifecycles[0]?.index;
    if (isLatest && bottle?.supplierHwcnPhotoUrl) return bottle.supplierHwcnPhotoUrl;

    const logWithPhoto = filteredMoveLogs.find(l => l.notes?.includes("[Photo: "));
    if (logWithPhoto) {
      const match = logWithPhoto.notes?.match(/\[Photo:\s*([^\]]+)\]/);
      if (match) return match[1];
    }
    return isLatest ? (bottle?.supplierHwcnPhotoUrl || null) : null;
  }, [bottle?.supplierHwcnPhotoUrl, filteredMoveLogs, selectedLifecycle, lifecycles]);

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
        siteRef: l.siteRef,
        equipmentDetails: l.equipmentDetails || null,
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

    const rows = sorted.map(log => {
      const eqList: any[] = log.equipmentDetails || [];
      const eq = eqList[0] || null;
      return `
      <tr>
        <td style="white-space: nowrap">${new Date(log.date).toLocaleDateString("en-GB")}</td>
        <td style="font-family: monospace; font-weight: 600">${log.siteRef || "—"}</td>
        <td>${crmJobMap.get(log.siteRef || '')?.siteTitle || log.siteName || "—"}</td>
        <td>${log.engineer || "—"}</td>
        <td>${eq?.manufacturer || "—"}</td>
        <td>${eq?.model || "—"}</td>
        <td style="font-family: monospace; font-size: 9px">${eq?.serial || "—"}</td>
        <td style="text-align: right; font-weight: 600; color: #e53e3e">${log.weightUsed?.toFixed(2) || "—"} kg</td>
        <td style="text-align: right">${log.weightBefore?.toFixed(2) || "—"} kg</td>
        <td style="text-align: right">${log.weightAfter?.toFixed(2) || "—"} kg</td>
      </tr>`;
    }).join("");

    const html = `
      <html><head><style>
        @page { margin: 0; size: A4 landscape; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 10mm; color: #333; line-height: 1.4; }
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
            <div class="report-title">Cylinder Usage Report</div>
            <div class="report-meta"><div>Generated: ${reportDate}</div><div>Cylinder: ${bottle.serial}</div></div>
          </div>
        </div>
        <table class="summary-table"><tr>
          <td class="summary-cell"><div class="summary-label">Cylinder Serial</div><div class="summary-value">${bottle.serial}</div></td>
          <td class="summary-cell"><div class="summary-label">Refrigerant</div><div class="summary-value">${bottle.gasType}</div></td>
          <td class="summary-cell"><div class="summary-label">Cylinder Capacity</div><div class="summary-value">${(bottle.initialWeight ?? 0).toFixed(2)} kg</div></td>
          <td class="summary-cell"><div class="summary-label">Current Balance</div><div class="summary-value">${(bottle.currentWeight ?? 0).toFixed(2)} kg</div></td>
          <td class="summary-cell"><div class="summary-label">Total Used</div><div class="summary-value">${totalUsed.toFixed(2)} kg</div></td>
          ${bottle.supplier ? `<td class="summary-cell"><div class="summary-label">Supplier</div><div class="summary-value">${bottle.supplier}</div></td>` : ""}
          ${bottle.poNumber ? `<td class="summary-cell"><div class="summary-label">PO Number</div><div class="summary-value">${bottle.poNumber}</div></td>` : ""}
        </tr></table>
        <table class="log"><thead><tr>
          <th style="width: 80px">Date</th><th style="width: 100px">Job Ref</th><th>Site</th>
          <th style="width: 120px">Engineer</th><th style="width: 110px">Manufacturer</th>
          <th style="width: 130px">Model</th><th style="width: 160px">Serial No.</th>
          <th style="width: 80px; text-align: right">Qty Used</th>
          <th style="width: 90px; text-align: right">Wt. Before</th><th style="width: 90px; text-align: right">Wt. After</th>
        </tr></thead><tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="7" style="text-align: right">Total Gas Used</td>
            <td style="text-align: right; color: #e53e3e">${totalUsed.toFixed(2)} kg</td>
            <td colspan="2"></td>
          </tr>
        </tbody></table>
        <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
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
    // Pre-compute which log ID represents the supplier return event, so the map
    // doesn't have to guess via field equality (which can fail for batch-HWCN returns).
    // logs is reverse-chronological, so .find() returns the most recent match
    const returnLogId: string | null = (() => {
      if (bottle.status !== "returned") return null;
      const explicit = logs.find(l => l.action === "returned_to_supplier");
      if (explicit) return explicit.id;
      const lastReceived = logs.find(l => l.action === "received");
      if (lastReceived) return lastReceived.id;
      const lastMove = logs.find(l => (l as any).logType === "movement");
      return lastMove?.id ?? null;
    })();
    const rows = logs.map(log => {
      const qty = (log as any).qty;
      const balance = (log as any).balance;
      const eqList: any[] = (log as any).equipmentDetails || [];
      const isUsage = log.action === "Gas Used" || log.action === "Gas Recovered";
      const isReturnedToSupplier = !!returnLogId && log.id === returnLogId;
      const isRegistered = log.action === "registered" || log.action === "re_registered";
      const effectiveFrom = isRegistered && (!log.from || log.from === "—") ? "Supplier" : log.from;
      const fromSite = effectiveFrom ? crmJobMap.get(effectiveFrom)?.siteTitle : null;
      // to_location is stored as generic "supplier" — substitute the real name from bottle.locationId
      const effectiveTo = isReturnedToSupplier && log.to === "supplier"
        ? (bottle.locationId && bottle.locationId !== "Supplier (Returned)" ? bottle.locationId : log.to)
        : log.to;
      const toSite = effectiveTo ? crmJobMap.get(effectiveTo)?.siteTitle : null;
      const fromCell = effectiveFrom ? (fromSite ? `${effectiveFrom}<br/><span style="color:#718096;font-size:8px">${fromSite}</span>` : effectiveFrom) : '—';
      const toCellBase = effectiveTo ? (toSite ? `${effectiveTo}<br/><span style="color:#718096;font-size:8px">${toSite}</span>` : effectiveTo) : '—';
      const toCell = isReturnedToSupplier
        ? `${toCellBase}<br/><span style="color:#a855f7;font-size:8px;font-weight:600">(Returned to Supplier)</span>`
        : toCellBase;
      const eqRow = eqList.length > 0 ? `
        <tr style="background-color:#f0f4ff;">
          <td colspan="7" style="padding:3px 12px 5px 22px; font-size:8px; color:#4a5568; border-bottom:1px solid #e2e8f0;">
            ${eqList.map(eq => {
              const name = [eq.manufacturer, eq.model].filter(Boolean).join(" ") || "Unknown unit";
              const sn = eq.serial ? ` &nbsp;&middot;&nbsp; SN: ${eq.serial}` : "";
              const wt = eq.weight > 0 ? ` &nbsp;&middot;&nbsp; ${Number(eq.weight).toFixed(2)} kg` : "";
              return `<span style="margin-right:12px">${name}${sn}${wt}</span>`;
            }).join("")}
          </td>
        </tr>` : "";
      return `
        <tr style="${isUsage ? 'background-color: #f8fafc;' : ''}">
          <td style="white-space: nowrap; font-size: 9px;">${new Date(log.date).toLocaleDateString("en-GB")}</td>
          <td><strong style="text-transform: uppercase; font-size: 8px; color: ${isUsage ? '#2c5282' : '#2d3748'}">${log.action.replace(/_/g, " ")}</strong></td>
          <td style="font-size: 9px;">${fromCell}</td>
          <td style="font-size: 9px;">${toCell}</td>
          <td style="text-align: center; font-weight: bold; color: ${qty ? '#e53e3e' : '#cbd5e0'}; font-size: 10px;">${qty ? `${qty} kg` : '—'}</td>
          <td style="text-align: center; font-weight: bold; color: #2d3748; font-size: 10px;">${balance ? `${balance.toFixed(2)} kg` : '—'}</td>
          <td style="font-size: 9px;">${log.engineer}</td>
        </tr>${eqRow}
      `;
    }).join("");
    const html = `
      <html><head><style>
        @page { margin: 0; size: A4 landscape; }
        body { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 10mm; color: #333; line-height: 1.4; }
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
          ${bottle.supplier ? `<td class="summary-cell"><div class="summary-label">Supplier</div><div class="summary-value">${bottle.supplier}</div></td>` : ""}
          ${bottle.poNumber ? `<td class="summary-cell"><div class="summary-label">PO Number</div><div class="summary-value">${bottle.poNumber}</div></td>` : ""}
        </tr></table>
        ${genealogy ? `
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-bottom: 15px; font-size: 11px; color: #166534; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>REFCOM Audit Genealogy:</strong> Recycled refrigerant derived from source Reclaim Cylinder <strong>#${genealogy.sourceSerial}</strong> (${genealogy.relationType === 'decanted' ? 'Filtered Workshop Decant' : 'In-Place Reclassification'}). Full parent chain of custody verified.
            </div>
            <div style="font-family: monospace; font-weight: bold; color: #15803d;">Source Reclaim #${genealogy.sourceSerial}</div>
          </div>
        ` : ""}
        <h3 style="font-size: 14px; margin-bottom: 12px; color: #2d3748; border-left: 5px solid #a3e635; padding-left: 12px;">Full Audit History</h3>
        <table><thead><tr>
          <th style="width: 85px;">Date</th><th style="width: 100px;">Action</th>
          <th style="width: 200px;">From</th><th style="width: 200px;">To</th>
          <th style="width: 70px; text-align: center;">Qty (kg)</th>
          <th style="width: 70px; text-align: center;">Balance</th><th>User</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd</div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win?.document.write(html);
    win?.document.close();
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
      case "recycled": return { bg: "rgba(16,185,129,0.12)", color: "#10b981", label: "Recycled Refrigerant" };
      default:        return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "Nitrogen" };
    }
  };

  const getStatusBadge = () => {
    switch (bottle.status) {
      case "active":   return { bg: "rgba(34,197,94,0.12)",  color: "#22c55e", label: "Active" };
      case "returned": return { bg: "rgba(168,85,247,0.12)", color: "#a855f7", label: "Returned" };
      case "archived": return { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", label: "Archived (Audit Trail)" };
      case "full":     return { bg: "rgba(59,130,246,0.12)", color: "#3b82f6", label: "Full" };
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

  const openHwcnPhotoFullSize = () => {
    const raw = activePhotoUrl || "";
    const urls = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    urls.forEach(url => {
      if (url.startsWith("data:")) {
        const win = window.open("", "_blank");
        if (!win) return;
        win.document.write(`<!DOCTYPE html><html><head><title>Supplier HWCN — ${serialStr}</title><style>body{margin:0;background:#000}img{max-width:100%;display:block}</style></head><body><img src="${url}" /></body></html>`);
        win.document.close();
      } else {
        window.open(url, "_blank");
      }
    });
  };

  const printHwcnPhoto = () => {
    const raw = activePhotoUrl || "";
    const urls = raw.split(",").map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const imgsHtml = urls.map(u => `<img src="${u}" style="max-width:100%;margin-bottom:15px;display:block;page-break-after:always;" />`).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Supplier HWCN — ${serialStr}</title><style>body{margin:0;padding:10mm;}@media print{body{margin:0;padding:0}}</style></head><body>${imgsHtml}</body></html>`);
    win.document.close();
  };

  return (
    <div style={{ maxWidth: "1200px" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/admin/bottles");
              }
            }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
            title="Go back"
          >
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
          <button onClick={() => router.push(`/admin/bottles/${serialStr}/report`)} style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff", padding: "0.6rem 1rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FileText size={18} /> Cylinder Audit Report
          </button>
          <Link href={`/admin/bottles/${serial}/edit`} style={{ textDecoration: "none" }}>
            <button style={{ background: "rgba(0,229,255,0.1)", border: "1px solid var(--primary)", color: "var(--primary)", padding: "0.6rem 1.2rem", borderRadius: "8px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Edit3 size={18} /> Edit
            </button>
          </Link>
          {bottle.status !== "archived" && (
            <Link href={`/admin/bottles/${encodeURIComponent(serialStr)}/archive`} style={{ textDecoration: "none" }}>
              <button
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "#f59e0b",
                  padding: "0.6rem 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                <Archive size={18} /> Archive Cylinder
              </button>
            </Link>
          )}
        </div>
      </div>

      {bottle.status === "archived" && (
        <div style={{
          background: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <Archive size={24} color="#ef4444" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#ef4444", fontSize: "0.95rem" }}>
              Cylinder Soft-Archived — Retained for 5-Year Statutory Audit Compliance (SOP-001 / SOP-002)
            </div>
            <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", marginTop: "0.25rem" }}>
              Archived on {bottle.archivedAt ? new Date(bottle.archivedAt).toLocaleString("en-GB") : "—"} by {bottle.archivedBy || "Admin"}. Reason: {bottle.archiveReason || "Archived by administrator"}. All historical movements and usage logs remain preserved.
            </div>
          </div>
        </div>
      )}

      {anomalousMovement && (
        <div style={{
          background: "rgba(245, 158, 11, 0.12)",
          border: "1px solid rgba(245, 158, 11, 0.4)",
          borderRadius: "10px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "1rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: "260px" }}>
            <AlertTriangle size={24} color="#f59e0b" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: "#f59e0b", fontSize: "0.95rem" }}>
                Movement Log Discrepancy Detected
              </div>
              <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.7)", marginTop: "0.25rem" }}>
                This cylinder is registered in <strong>HQ-Stores</strong>, but its most recent movement was recorded as <code>{anomalousMovement.from} &rarr; {anomalousMovement.to}</code>.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRepairMovement}
            disabled={isRepairing}
            style={{
              background: "#f59e0b",
              color: "#000",
              fontWeight: 700,
              fontSize: "0.85rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              cursor: isRepairing ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            {isRepairing ? "Repairing..." : "Correct Log to HQ-Stores"}
          </button>
        </div>
      )}

      {genealogy && (
        <div
          style={{
            background: "linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(5, 150, 105, 0.08) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            boxShadow: "0 4px 20px -5px rgba(16, 185, 129, 0.2)",
            borderRadius: "12px",
            padding: "0.9rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.85rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                border: "1px solid rgba(16, 185, 129, 0.4)",
                borderRadius: "8px",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Recycle size={22} color="#10b981" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#10b981" }}>
                  REFCOM Audit Genealogy
                </span>
                <span
                  style={{
                    background: "rgba(16, 185, 129, 0.2)",
                    color: "#a7f3d0",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    fontFamily: "var(--font-geist-mono)",
                  }}
                >
                  {genealogy.relationType === "decanted" ? "Filtered Workshop Decant" : "In-Place Reclassification"}
                </span>
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fff", marginTop: "0.15rem" }}>
                {genealogy.displayText}
              </div>
              {genealogy.notes && (
                <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginTop: "0.2rem" }}>
                  {genealogy.notes}
                </div>
              )}
            </div>
          </div>

          <Link
            href={`/admin/bottles/${encodeURIComponent(genealogy.sourceSerial)}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.45rem",
              background: "rgba(16, 185, 129, 0.2)",
              border: "1px solid rgba(16, 185, 129, 0.5)",
              color: "#a7f3d0",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: 700,
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
          >
            <span>Inspect Source Reclaim Cylinder #{genealogy.sourceSerial}</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

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

              {genealogy && (
                <div>
                  <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.3rem" }}>
                    Source Reclaim Cylinder
                  </div>
                  <Link
                    href={`/admin/bottles/${encodeURIComponent(genealogy.sourceSerial)}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.4rem",
                      background: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.35)",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "6px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      textDecoration: "none",
                    }}
                  >
                    <Recycle size={14} />
                    <span>#{genealogy.sourceSerial}</span>
                  </Link>
                </div>
              )}

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
                {bottle.locationType === "site" && crmJobMap.get(bottle.locationId)?.siteTitle && (
                  <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.55)", marginTop: "0.15rem", paddingLeft: "1.75rem" }}>
                    {crmJobMap.get(bottle.locationId)!.siteTitle}
                  </div>
                )}
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
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{resolvedRegisteredBy || bottle.registeredBy}</div>
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

          {/* Weight Loss & Usage Trajectory Chart */}
          <CylinderWeightChart bottle={bottle} moveLogs={moveLogs} usageLogs={usageLogs} />

          {/* Tab bar */}
          <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.25rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <button style={tabStyle("audit")} onClick={() => setActiveTab("audit")}>
              <History size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Audit Trail ({logs.length})
            </button>
            <button style={tabStyle("hwcns")} onClick={() => setActiveTab("hwcns")}>
              <ClipboardList size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              HWCNs {(filteredHwcns.length + (activePhotoUrl ? 1 : 0)) > 0 ? `(${filteredHwcns.length + (activePhotoUrl ? 1 : 0)})` : ""}
            </button>
            <button style={tabStyle("usage")} onClick={() => setActiveTab("usage")}>
              <Tag size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Refrigerant Usage {filteredUsageLogs.filter(l => l.jobType !== "recovery").length > 0 ? `(${filteredUsageLogs.filter(l => l.jobType !== "recovery").length})` : ""}
            </button>
            <button style={tabStyle("decommission")} onClick={() => setActiveTab("decommission")}>
              <Wrench size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Decommission Records {filteredDecommissions.length > 0 ? `(${filteredDecommissions.length})` : ""}
            </button>
            <button style={tabStyle("change_history")} onClick={() => setActiveTab("change_history")}>
              <ShieldCheck size={14} style={{ display: "inline", marginRight: "0.35rem" }} />
              Change History {auditTrail.length > 0 ? `(${auditTrail.length})` : ""}
            </button>
          </div>

          {/* Audit Trail */}
          {activeTab === "audit" && (
            <div>
              {logs.length === 0 ? (
                emptyState(<History size={40} style={{ opacity: 0.2 }} />, "No history logs found for this cylinder.")
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {logs.map(log => {
                    const rawId = (log as any).id || "";
                    const isEdited = auditTrail.some(a => a.recordId === rawId || a.recordId === rawId.replace('-usage', ''));
                    const isUsage = (log as any).logType === "usage" || log.action === "Gas Used" || log.action === "Gas Recovered";
                    const canEdit = user?.availableRoles?.includes("admin") || user?.availableRoles?.includes("office") || user?.role === "admin" || user?.role === "office";

                    return (
                      <div key={log.id} className="glass-panel" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
                        <div style={{ width: "80px", fontSize: "0.8rem", color: "rgba(255,255,255,0.4)" }}>
                          {new Date(log.date).toLocaleDateString()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                            <span style={{ fontSize: "0.65rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", background: "rgba(0,229,255,0.1)", color: "var(--primary)", textTransform: "uppercase" }}>
                              {log.action.replace(/_/g, " ")}
                            </span>
                            {isEdited && (
                              <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.4rem", borderRadius: "3px", background: "rgba(168,85,247,0.15)", color: "#c084fc", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                                <ShieldCheck size={11} /> Edited
                              </span>
                            )}
                            <span style={{ fontSize: "0.75rem", color: "#fff", fontWeight: 600 }}>
                              {log.from}
                              {log.from && crmJobMap.get(log.from)?.siteTitle && (
                                <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}> — {crmJobMap.get(log.from)!.siteTitle}</span>
                              )}
                              {" "}<ArrowRight size={12} style={{ opacity: 0.3 }} />{" "}
                              {log.to}
                              {log.to && crmJobMap.get(log.to)?.siteTitle && (
                                <span style={{ color: "rgba(255,255,255,0.4)", fontWeight: 400 }}> — {crmJobMap.get(log.to)!.siteTitle}</span>
                              )}
                            </span>
                          </div>
                          {log.notes && (
                            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                              {log.notes}
                              {(log as any).siteRef && crmJobMap.get((log as any).siteRef)?.siteTitle && (
                                <span style={{ color: "rgba(255,255,255,0.3)" }}> — {crmJobMap.get((log as any).siteRef)!.siteTitle}</span>
                              )}
                            </div>
                          )}
                          {(log as any).equipmentDetails && (log as any).equipmentDetails.length > 0 && (
                            <div style={{ marginTop: "0.3rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
                              {(log as any).equipmentDetails.map((eq: any, i: number) => (
                                <div key={i} style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                                  <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                                    {[eq.manufacturer, eq.model].filter(Boolean).join(" ") || "Unknown unit"}
                                  </span>
                                  {eq.serial && <span>· SN: {eq.serial}</span>}
                                  {eq.weight > 0 && <span>· {Number(eq.weight).toFixed(2)} kg</span>}
                                </div>
                              ))}
                            </div>
                          )}
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
                          {log.vehicleReg && (
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.75rem" }}>· {log.vehicleReg}</span>
                          )}
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLog({
                                id: rawId,
                                logType: isUsage ? "usage" : "movement",
                                serial: serialStr,
                                from: log.from,
                                to: log.to,
                                siteRef: (log as any).siteRef || (isUsage ? (log.notes?.replace('Site Job: ', '').trim() || log.to) : ''),
                                weightUsed: (log as any).qty ? parseFloat((log as any).qty) : undefined,
                                engineer: log.engineer,
                                date: log.date ? log.date.split('T')[0] : '',
                                notes: log.notes,
                                vehicleReg: log.vehicleReg,
                              });
                              setEditReason("");
                            }}
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: "6px",
                              color: "rgba(255,255,255,0.7)",
                              padding: "0.35rem 0.6rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.35rem",
                              fontSize: "0.75rem",
                              flexShrink: 0
                            }}
                            title="Correct this record (audited)"
                          >
                            <Pencil size={12} /> Edit
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* HWCNs */}
          {activeTab === "hwcns" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {filteredHwcns.length === 0 && !activePhotoUrl ? (
                emptyState(<ClipboardList size={40} style={{ opacity: 0.2 }} />, "No HWCNs recorded for this cylinder.")
              ) : (
                <>
                  {filteredHwcns.length > 0 && (
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
                  {activePhotoUrl && (() => {
                    const photoUrls = activePhotoUrl.split(",").map(s => s.trim()).filter(Boolean);
                    return (
                      <div style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: "10px", padding: "1.25rem" }}>
                        {/* Header + controls */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700, color: "#a855f7" }}>
                            <Camera size={16} /> Supplier HWCN Paperwork {photoUrls.length > 1 ? `(${photoUrls.length} Pages)` : ""}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                            {/* Zoom controls */}
                            <div style={{ display: "flex", alignItems: "center", gap: "0.2rem", background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "0.2rem 0.5rem" }}>
                              <button onClick={() => setPhotoZoom(z => Math.max(+(z - 0.25).toFixed(2), 0.5))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: "0.1rem 0.2rem", display: "flex", alignItems: "center" }}>
                                <ZoomOut size={14} />
                              </button>
                              <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.6)", minWidth: "38px", textAlign: "center" }}>{Math.round(photoZoom * 100)}%</span>
                              <button onClick={() => setPhotoZoom(z => Math.min(+(z + 0.25).toFixed(2), 4))} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.7)", padding: "0.1rem 0.2rem", display: "flex", alignItems: "center" }}>
                                <ZoomIn size={14} />
                              </button>
                              {photoZoom !== 1 && (
                                <button onClick={() => setPhotoZoom(1)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)", padding: "0.1rem 0.3rem", fontSize: "0.72rem" }}>Reset</button>
                              )}
                            </div>
                            {/* Print */}
                            <button onClick={printHwcnPhoto} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.3rem 0.7rem", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500 }}>
                              <Printer size={13} /> Print
                            </button>
                            {/* Full size */}
                            <button onClick={openHwcnPhotoFullSize} style={{ display: "flex", alignItems: "center", gap: "0.3rem", background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: "6px", padding: "0.3rem 0.7rem", color: "#a855f7", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600 }}>
                              <Maximize2 size={13} /> Full size
                            </button>
                          </div>
                        </div>
                        {/* Meta */}
                        {(bottle.returnedAt || bottle.returnedBy) && (
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.75rem" }}>
                            {bottle.returnedAt ? `Returned ${new Date(bottle.returnedAt).toLocaleDateString("en-GB")}` : ""}
                            {bottle.returnedBy ? ` · ${bottle.returnedBy}` : ""}
                          </div>
                        )}
                        {/* Photos */}
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {photoUrls.map((url, idx) => (
                            <div key={idx} style={{ borderRadius: "8px", overflow: "auto", maxHeight: "520px", border: "1px solid rgba(168,85,247,0.15)" }}>
                              {photoUrls.length > 1 && (
                                <div style={{ padding: "0.4rem 0.75rem", background: "rgba(0,0,0,0.4)", color: "#a855f7", fontSize: "0.75rem", fontWeight: 700 }}>
                                  Document Page {idx + 1} of {photoUrls.length}
                                </div>
                              )}
                              <img
                                src={url}
                                alt={`Supplier HWCN Page ${idx + 1}`}
                                style={{ width: `${photoZoom * 100}%`, display: "block", maxWidth: "none", transition: "width 0.15s ease" }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </>
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
                          <td style={{ ...tableTd, fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 700 }}>
                            {l.siteRef ? (
                              <Link href={`/admin/jobs/${encodeURIComponent(l.siteRef)}`} style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)" }}>
                                {l.siteRef}
                              </Link>
                            ) : "—"}
                          </td>
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
                            <td style={{ ...tableTd, fontFamily: "var(--font-geist-mono)", color: "#00e5ff", fontWeight: 700 }}>
                              {d.jobNumber ? (
                                <Link href={`/admin/jobs/${encodeURIComponent(d.jobNumber)}`} style={{ color: "#00e5ff", textDecoration: "underline", textDecorationColor: "rgba(0,229,255,0.4)" }}>
                                  {d.jobNumber}
                                </Link>
                              ) : "—"}
                            </td>
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

          {/* Change History (Immutable F-Gas Audit Trail) */}
          {activeTab === "change_history" && (
            <div>
              {auditTrail.length === 0 ? (
                emptyState(<ShieldCheck size={40} style={{ opacity: 0.2 }} />, "No administrative corrections recorded for this cylinder.")
              ) : (
                <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                        <th style={tableTh}>Date & Time</th>
                        <th style={tableTh}>Admin User</th>
                        <th style={tableTh}>Record / Field</th>
                        <th style={tableTh}>Previous Value</th>
                        <th style={tableTh}>Corrected Value</th>
                        <th style={tableTh}>Audit Justification / Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditTrail.map(a => (
                        <tr key={a.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                          <td style={{ ...tableTd, fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", whiteSpace: "nowrap" }}>
                            {new Date(a.createdAt).toLocaleString("en-GB")}
                          </td>
                          <td style={{ ...tableTd, fontWeight: 600 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <User size={13} style={{ opacity: 0.5 }} /> {a.changedBy}
                            </div>
                          </td>
                          <td style={{ ...tableTd, fontSize: "0.8rem" }}>
                            <span style={{ fontFamily: "var(--font-geist-mono)", color: "#00e5ff" }}>
                              {a.tableName.replace('_logs', '')}.{a.fieldName}
                            </span>
                          </td>
                          <td style={{ ...tableTd, fontSize: "0.8rem", color: "#ef4444" }}>
                            <span style={{ textDecoration: "line-through", opacity: 0.8 }}>{a.oldValue || "—"}</span>
                          </td>
                          <td style={{ ...tableTd, fontSize: "0.8rem", color: "#22c55e", fontWeight: 600 }}>
                            {a.newValue || "—"}
                          </td>
                          <td style={{ ...tableTd, fontSize: "0.82rem", color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}>
                            &ldquo;{a.reason}&rdquo;
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Log Modal */}
      {editingLog && (
        <div style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div className="glass-panel" style={{
            maxWidth: "520px",
            width: "100%",
            background: "#12141a",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            padding: "1.75rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit3 size={18} color="var(--primary)" />
                Correct {editingLog.logType === 'usage' ? 'Usage Record' : 'Movement Record'}
              </h3>
              <button
                onClick={() => setEditingLog(null)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", padding: "0.75rem", fontSize: "0.8rem", color: "var(--primary)" }}>
              All edits are recorded in the immutable F-Gas Audit Trail with before/after values, your name, and your stated justification.
            </div>

            {editingLog.logType === 'movement' ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>From Location</label>
                  <input
                    type="text"
                    value={editingLog.from || ""}
                    onChange={e => setEditingLog({ ...editingLog, from: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>To Location / Destination</label>
                  <input
                    type="text"
                    value={editingLog.to || ""}
                    onChange={e => setEditingLog({ ...editingLog, to: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Engineer Name</label>
                  <input
                    type="text"
                    value={editingLog.engineer || ""}
                    onChange={e => setEditingLog({ ...editingLog, engineer: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Site Job Reference</label>
                  <input
                    type="text"
                    value={editingLog.siteRef || ""}
                    onChange={e => setEditingLog({ ...editingLog, siteRef: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Weight Dispensed/Recovered (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingLog.weightUsed ?? ""}
                    onChange={e => setEditingLog({ ...editingLog, weightUsed: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "6px", color: "#fff" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.25rem" }}>Engineer Name</label>
                  <input
                    type="text"
                    value={editingLog.engineer || ""}
                    onChange={e => setEditingLog({ ...editingLog, engineer: e.target.value })}
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
                placeholder="e.g. Engineer typo in site reference; job was C37231 (Santander Dundee)"
                style={{ width: "100%", padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,170,0,0.4)", borderRadius: "6px", color: "#fff", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                style={{ padding: "0.6rem 1rem", background: "transparent", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "6px", color: "#fff", cursor: "pointer" }}
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
                    if (editingLog.logType === 'movement') {
                      await db.updateMovementLogWithAudit(
                        editingLog.id,
                        {
                          to: editingLog.to,
                          from: editingLog.from,
                          engineer: editingLog.engineer,
                        },
                        user?.name || "Administrator",
                        editReason.trim()
                      );
                    } else {
                      await db.updateUsageLogWithAudit(
                        editingLog.id.replace('-usage', ''),
                        {
                          siteRef: editingLog.siteRef,
                          weightUsed: editingLog.weightUsed,
                          engineer: editingLog.engineer,
                        },
                        user?.name || "Administrator",
                        editReason.trim()
                      );
                    }
                    window.location.reload();
                  } catch (err) {
                    console.error("Failed to save correction:", err);
                    alert("Error saving correction: " + (err instanceof Error ? err.message : String(err)));
                    setIsSavingEdit(false);
                  }
                }}
                style={{
                  padding: "0.6rem 1.25rem",
                  background: editReason.trim() ? "var(--primary)" : "rgba(255,255,255,0.1)",
                  color: editReason.trim() ? "#00e5ff" : "rgba(255,255,255,0.4)",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 600,
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
