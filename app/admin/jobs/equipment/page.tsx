"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db, CrmJob, EquipmentItem, calculateLeakCheckInterval } from "@/lib/db";
import { calculateCO2e } from "@/lib/gwp";
import {
  Wrench,
  Search,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  ExternalLink,
  Printer,
  FileText,
  Archive,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Save,
} from "lucide-react";
import Link from "next/link";

interface ServiceEvent {
  date: string;
  jobRef: string | null;
  jobType: string;
  engineer: string;
  bottleSerial: string;
  equipmentWeight: number;
  usageLogId: string;
}

interface EquipmentGroup {
  key: string;
  manufacturer: string;
  model: string;
  equipmentSerial: string;
  gasType: string;
  nominalChargeKg: number;
  co2eTonnes: number;
  hermeticallySealed: boolean;
  leakCheckIntervalMonths: number;
  leakRule: string;
  lastLeakCheckDate?: string;
  nextLeakCheckDueDate?: string;
  events: ServiceEvent[];
  firstDate: string;
  lastDate: string;
  jobCount: number;
  archived: boolean;
}

function equipmentKey(manufacturer: string, model: string, serial: string): string {
  if (serial) return `sn:${serial.toLowerCase().trim()}`;
  const mm = `${manufacturer}|${model}`.toLowerCase().trim();
  if (mm !== "|") return `mm:${mm}`;
  return `unknown`;
}

export default function EquipmentRegisterPage() {
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [dedicatedEquipment, setDedicatedEquipment] = useState<EquipmentItem[]>([]);
  const [crmJobMap, setCrmJobMap] = useState<Map<string, CrmJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  // Edit / F-Gas rules modal state
  const [editingGroup, setEditingGroup] = useState<EquipmentGroup | null>(null);
  const [editCharge, setEditCharge] = useState("");
  const [editGasType, setEditGasType] = useState("R410A");
  const [editSealed, setEditSealed] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchLogs = () => {
    setLoading(true);
    Promise.all([
      db.getUsageLogsWithEquipment(),
      db.getEquipmentList(),
    ]).then(([logs, eqList]) => {
      setRawLogs(logs);
      setDedicatedEquipment(eqList);

      const jobRefs = new Set<string>();
      logs.forEach(l => l.site_ref && jobRefs.add(l.site_ref));
      if (jobRefs.size > 0) {
        db.getCrmJobsByNumbers(Array.from(jobRefs)).then(jobs => {
          setCrmJobMap(new Map(jobs.map(j => [j.jobNumber, j])));
        });
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const snParam = (params.get("sn") || params.get("search") || "").trim();
      if (snParam) {
        setSearch(snParam);
        setExpandedKeys(new Set([`sn:${snParam.toLowerCase()}`]));
      }
    }
    db.purgeTestEquipmentData().then(() => {
      fetchLogs();
    });
  }, []);

  const handleArchiveEquipment = async (e: React.MouseEvent, g: EquipmentGroup) => {
    e.stopPropagation();
    const reason = prompt(
      `Archive equipment ${g.equipmentSerial || g.model || g.manufacturer}?\n\nPer SOP-001 and SOP-002, all historical service events and F-Gas usage logs remain permanently preserved for 5-year statutory audit compliance.\n\nEnter reason for archiving:`,
      "Archived by administrator"
    );
    if (reason !== null) {
      await db.deleteEquipmentItem(g.equipmentSerial, g.manufacturer, g.model, "Admin", reason);
      fetchLogs();
    }
  };

  const handleOpenEdit = (e: React.MouseEvent, g: EquipmentGroup) => {
    e.stopPropagation();
    setEditingGroup(g);
    setEditCharge(g.nominalChargeKg ? String(g.nominalChargeKg) : "");
    setEditGasType(g.gasType || "R410A");
    setEditSealed(g.hermeticallySealed);
    setEditNotes("");
  };

  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    setSavingEdit(true);

    const nomKg = parseFloat(editCharge) || 0;
    await db.saveEquipmentItem({
      serial: editingGroup.equipmentSerial,
      manufacturer: editingGroup.manufacturer,
      model: editingGroup.model,
      gasType: editGasType,
      nominalChargeKg: nomKg,
      hermeticallySealed: editSealed,
      notes: editNotes || undefined,
    });

    setSavingEdit(false);
    setEditingGroup(null);
    fetchLogs();
  };

  const handleRecordLeakCheck = async (serial: string) => {
    if (!confirm(`Mark statutory leak check as COMPLETED for ${serial}? This will set the inspection date to today and calculate the next statutory renewal date.`)) return;
    await db.recordLeakCheck(serial, new Date().toISOString(), "Admin", "Statutory leak check logged from equipment register");
    fetchLogs();
    if (editingGroup) {
      setEditingGroup(null);
    }
  };

  const equipmentGroups = useMemo<EquipmentGroup[]>(() => {
    const grouped = new Map<string, { representative: any; events: ServiceEvent[] }>();
    const dedicatedMap = new Map<string, EquipmentItem>();
    dedicatedEquipment.forEach(item => {
      dedicatedMap.set(item.id.toUpperCase(), item);
      if (item.serial) dedicatedMap.set(item.serial.toUpperCase(), item);
    });

    for (const log of rawLogs) {
      const items: any[] = Array.isArray(log.equipment_details) ? log.equipment_details : [];
      for (const eq of items) {
        const mfr = eq.manufacturer || "";
        const mdl = eq.model || "";
        const sn = eq.serial || "";
        if (!mfr && !mdl && !sn) continue;
        const key = equipmentKey(mfr, mdl, sn);
        if (!grouped.has(key)) {
          grouped.set(key, { representative: { ...eq, logGasType: log.gas_type }, events: [] });
        }
        const entry = grouped.get(key)!;
        entry.events.push({
          date: log.date,
          jobRef: log.site_ref || null,
          jobType: log.job_type || "",
          engineer: log.engineer || "—",
          bottleSerial: log.serial,
          equipmentWeight: eq.weight || 0,
          usageLogId: log.id,
        });
      }
    }

    return Array.from(grouped.entries()).map(([key, { representative, events }]) => {
      const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const snKey = (representative.serial || "").toUpperCase();
      const fallbackKey = `${representative.manufacturer || ""}-${representative.model || ""}`.toUpperCase();
      const ded = dedicatedMap.get(snKey) || dedicatedMap.get(fallbackKey);

      const gasType = ded?.gasType || representative.logGasType || "R410A";
      const nominalChargeKg = ded?.nominalChargeKg ?? representative.nominalChargeKg ?? representative.weight ?? 0;
      const hermeticallySealed = ded?.hermeticallySealed ?? representative.hermeticallySealed ?? false;
      const co2eTonnes = calculateCO2e(gasType, nominalChargeKg);
      const { intervalMonths, rule } = calculateLeakCheckInterval(co2eTonnes, hermeticallySealed);

      let lastLeakCheckDate = ded?.lastLeakCheckDate;
      const leakEvent = sorted.find(e => e.jobType === "leak_test");
      if (leakEvent && (!lastLeakCheckDate || new Date(leakEvent.date) > new Date(lastLeakCheckDate))) {
        lastLeakCheckDate = leakEvent.date;
      }

      let nextLeakCheckDueDate = ded?.nextLeakCheckDueDate;
      if (intervalMonths > 0 && !nextLeakCheckDueDate && (lastLeakCheckDate || sorted[0]?.date)) {
        const baseDate = new Date(lastLeakCheckDate || sorted[0].date);
        baseDate.setMonth(baseDate.getMonth() + intervalMonths);
        nextLeakCheckDueDate = baseDate.toISOString();
      }

      const isArchived = ded?.archived ?? representative.archived ?? false;

      return {
        key,
        manufacturer: representative.manufacturer || "",
        model: representative.model || "",
        equipmentSerial: representative.serial || "",
        gasType,
        nominalChargeKg,
        co2eTonnes,
        hermeticallySealed,
        leakCheckIntervalMonths: intervalMonths,
        leakRule: rule,
        lastLeakCheckDate,
        nextLeakCheckDueDate,
        events: sorted,
        firstDate: sorted[sorted.length - 1].date,
        lastDate: sorted[0].date,
        jobCount: new Set(sorted.map(e => e.jobRef).filter(Boolean)).size || sorted.length,
        archived: isArchived,
      };
    }).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [rawLogs, dedicatedEquipment]);

  const filtered = useMemo(() => {
    return equipmentGroups.filter(g => {
      if (!showArchived && g.archived) return false;
      const s = search.toLowerCase();
      if (
        s &&
        !g.equipmentSerial.toLowerCase().includes(s) &&
        !g.manufacturer.toLowerCase().includes(s) &&
        !g.model.toLowerCase().includes(s) &&
        !g.events.some(e => e.jobRef?.toLowerCase().includes(s) || e.engineer.toLowerCase().includes(s))
      ) {
        return false;
      }
      if (dateFrom) {
        const last = new Date(g.lastDate);
        if (last < new Date(dateFrom)) return false;
      }
      if (dateTo) {
        const first = new Date(g.firstDate);
        if (first > new Date(dateTo + "T23:59:59")) return false;
      }
      return true;
    });
  }, [equipmentGroups, search, dateFrom, dateTo, showArchived]);

  const toggleExpand = (key: string) =>
    setExpandedKeys(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const hasFilters = !!(search || dateFrom || dateTo || showArchived);

  const getDueStatus = (g: EquipmentGroup) => {
    if (g.leakCheckIntervalMonths === 0) {
      return { label: "Exempt", color: "rgba(255,255,255,0.4)", bg: "rgba(255,255,255,0.05)" };
    }
    if (!g.nextLeakCheckDueDate) {
      return { label: "Inspection Due", color: "#ffaa00", bg: "rgba(255,170,0,0.12)" };
    }
    const dueTime = new Date(g.nextLeakCheckDueDate).getTime();
    const now = Date.now();
    const diffDays = Math.round((dueTime - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `OVERDUE (${Math.abs(diffDays)}d)`, color: "#ff3366", bg: "rgba(255,51,102,0.15)" };
    }
    if (diffDays <= 30) {
      return { label: `Due Soon (${diffDays}d)`, color: "#ffaa00", bg: "rgba(255,170,0,0.15)" };
    }
    return { label: `Valid (${Math.round(diffDays / 30)}m)`, color: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  };

  const printEquipmentRegister = () => {
    const reportDate = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
    const filterDesc = [
      search ? `Search: "${search}"` : "",
      dateFrom ? `From: ${new Date(dateFrom).toLocaleDateString("en-GB")}` : "",
      dateTo ? `To: ${new Date(dateTo).toLocaleDateString("en-GB")}` : "",
    ].filter(Boolean).join(" · ") || "All equipment";

    const rows = filtered.map(g => {
      const status = getDueStatus(g);
      const serviceRows = g.events.map(ev => {
        const siteName = ev.jobRef ? crmJobMap.get(ev.jobRef)?.siteTitle : null;
        return `
          <tr style="background:#fafafa">
            <td style="padding:5px 8px;font-size:9px;color:#666">${ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "—"}</td>
            <td style="padding:5px 8px;font-size:9px;font-family:monospace;font-weight:600;color:#1a202c">${ev.jobRef || "—"}</td>
            <td style="padding:5px 8px;font-size:9px;color:#555">${siteName || "—"}</td>
            <td style="padding:5px 8px;font-size:9px;color:#555">${ev.jobType || "—"}</td>
            <td style="padding:5px 8px;font-size:9px;color:#555">${ev.engineer}</td>
            <td style="padding:5px 8px;font-size:9px;text-align:right;font-weight:600;color:#155724">${ev.equipmentWeight > 0 ? ev.equipmentWeight.toFixed(2) + " kg" : "—"}</td>
            <td style="padding:5px 8px;font-size:9px;font-family:monospace;color:#888">${ev.bottleSerial}</td>
          </tr>`;
      }).join("");

      const displayName = [g.manufacturer, g.model].filter(Boolean).join(" ") || "Unknown unit";
      return `
        <div style="margin-bottom:16px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;page-break-inside:avoid">
          <div style="background:#f8f9fa;padding:8px 12px;border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center">
            <div>
              <span style="font-family:monospace;font-weight:700;font-size:11px;color:#1a202c">${g.equipmentSerial || "No serial"}</span>
              <span style="font-size:10px;color:#555;margin-left:10px">${displayName}</span>
              <span style="font-size:9px;color:#666;margin-left:10px">${g.nominalChargeKg} kg (${g.gasType}) · <strong>${g.co2eTonnes} tCO2e</strong></span>
            </div>
            <div style="font-size:9px;font-weight:700;color:#0284c7">
              Leak Check: ${g.leakCheckIntervalMonths > 0 ? `Every ${g.leakCheckIntervalMonths}m` : 'Exempt'} (${status.label})
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f1f3f5">
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Date</th>
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Job Ref</th>
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Site</th>
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Type</th>
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Engineer</th>
                <th style="padding:4px 8px;font-size:8px;text-align:right;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Gas Qty</th>
                <th style="padding:4px 8px;font-size:8px;text-align:left;color:#888;font-weight:700;text-transform:uppercase;border-bottom:1px solid #e2e8f0">Cylinder</th>
              </tr>
            </thead>
            <tbody>${serviceRows}</tbody>
          </table>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html><head><title>Equipment &amp; Statutory Leak Check Register — 21 Degrees</title>
      <style>
        @page { margin: 0; size: A4 portrait; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10mm; color: #333; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-section { display: flex; gap: 12px; align-items: flex-end; }
        .company-info { font-size: 9px; line-height: 1.5; color: #555; }
        .report-info { text-align: right; }
        .report-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #1a202c; }
        .report-meta { font-size: 10px; color: #666; margin-top: 3px; }
        .footer { margin-top: 20px; font-size: 8px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 8px; }
      </style></head><body>
      <div class="header">
        <div class="logo-section">
          <img src="/21-degrees-logo-reports.png" style="width:90px;height:auto" />
          <div class="company-info">
            <strong>21 Degrees Ltd</strong><br/>
            Unit 10, Apollo Court, Monkton Business Park<br/>
            Hebburn, Tyne &amp; Wear, NE31 2ES &nbsp;·&nbsp; Tel: 0191 495 7224
          </div>
        </div>
        <div class="report-info">
          <div class="report-title">Equipment &amp; F-Gas Leak Check Register</div>
          <div class="report-meta">Generated: ${reportDate} &nbsp;·&nbsp; ${filtered.length} piece${filtered.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      ${rows}
      <div class="footer">21 Degrees F-Gas Tracker Pro | Statutory 5-Year Compliance Register | &copy; 2026 21 Degrees Ltd</div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const thBase: React.CSSProperties = {
    padding: "0.7rem 0.9rem",
    textAlign: "left",
    fontSize: "0.72rem",
    color: "rgba(255,255,255,0.5)",
    fontWeight: 600,
    textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = { padding: "0.75rem 0.9rem", fontSize: "0.85rem" };

  return (
    <div style={{ maxWidth: "1280px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Wrench size={26} color="#00e5ff" /> Equipment Register &amp; Statutory Leak Checks
          </h1>
          <p style={{ color: "var(--text-muted)", margin: "0.35rem 0 0", fontSize: "0.9rem" }}>
            F-Gas Article 4 inspection tracking: &ge;5 tCO<sub>2</sub>e &rarr; 12m, &ge;50 tCO<sub>2</sub>e &rarr; 6m, &ge;500 tCO<sub>2</sub>e &rarr; 3m
          </p>
        </div>

        <button
          onClick={printEquipmentRegister}
          style={{
            background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            padding: "0.6rem 1.25rem",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: "0.85rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Printer size={16} /> Print Register PDF
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: "1rem",
          borderRadius: "10px",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div style={{ position: "relative", flex: "1 1 240px", minWidth: "200px" }}>
          <Search size={15} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search serial, model, engineer, job..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.55rem 0.75rem 0.55rem 2.2rem",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.85rem",
              outline: "none",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
          <label style={{ color: "var(--text-muted)" }}>From:</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#fff",
              padding: "0.45rem 0.65rem",
              fontSize: "0.82rem",
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}>
          <label style={{ color: "var(--text-muted)" }}>To:</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "6px",
              color: "#fff",
              padding: "0.45rem 0.65rem",
              fontSize: "0.82rem",
            }}
          />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={showArchived}
            onChange={e => setShowArchived(e.target.checked)}
            style={{ accentColor: "#00e5ff" }}
          />
          Show Archived
        </label>

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); setShowArchived(false); }}
            style={{
              background: "none",
              border: "none",
              color: "#00e5ff",
              fontSize: "0.8rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>
        {filtered.length} registered equipment asset{filtered.length !== 1 ? "s" : ""}
      </div>

      {/* Equipment Table */}
      {filtered.length === 0 ? (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Wrench size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No Equipment Found</p>
          <p style={{ fontSize: "0.85rem" }}>Equipment details logged during installations, services or leak checks will appear here.</p>
        </div>
      ) : (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ ...thBase, width: "2rem" }}></th>
                <th style={thBase}>Serial No.</th>
                <th style={thBase}>Asset / Model</th>
                <th style={thBase}>Total Charge &amp; GWP</th>
                <th style={thBase}>Sealed</th>
                <th style={thBase}>Statutory Interval</th>
                <th style={thBase}>Last Inspection</th>
                <th style={thBase}>Next Due</th>
                <th style={{ ...thBase, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, idx) => {
                const isExpanded = expandedKeys.has(g.key);
                const due = getDueStatus(g);
                const reportUrl = `/admin/jobs/equipment/report?sn=${encodeURIComponent(g.equipmentSerial)}&mfr=${encodeURIComponent(g.manufacturer)}&mdl=${encodeURIComponent(g.model)}`;

                return (
                  <React.Fragment key={g.key}>
                    <tr
                      onClick={() => toggleExpand(g.key)}
                      style={{
                        borderBottom: isExpanded ? "none" : "1px solid rgba(255,255,255,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                        cursor: "pointer",
                      }}
                    >
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.3)", paddingLeft: "1rem" }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td style={{ ...tdBase, fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: g.equipmentSerial ? "#fff" : "rgba(255,255,255,0.25)" }}>
                        {g.equipmentSerial ? g.equipmentSerial.toUpperCase() : <em style={{ fontSize: "0.78rem" }}>No serial</em>}
                        {g.archived && (
                          <span style={{ marginLeft: "0.5rem", background: "rgba(239,68,68,0.12)", color: "#ef4444", fontSize: "0.68rem", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                            Archived
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.85)" }}>
                        <div style={{ fontWeight: 600 }}>{g.manufacturer || "Unknown"}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{g.model || "—"}</div>
                      </td>
                      <td style={{ ...tdBase }}>
                        <div style={{ fontWeight: 700, color: "#00e5ff" }}>
                          {g.nominalChargeKg > 0 ? `${g.nominalChargeKg.toFixed(2)} kg` : "—"}
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.35rem" }}>({g.gasType})</span>
                        </div>
                        <div style={{ fontSize: "0.72rem", color: g.co2eTonnes >= 5 ? "#ffaa00" : "var(--text-muted)", fontWeight: 600 }}>
                          {g.co2eTonnes > 0 ? `${g.co2eTonnes.toFixed(2)} tCO₂e` : "0 tCO₂e"}
                        </div>
                      </td>
                      <td style={{ ...tdBase }}>
                        <span style={{
                          padding: "0.15rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          background: g.hermeticallySealed ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.05)",
                          color: g.hermeticallySealed ? "#22c55e" : "rgba(255,255,255,0.5)",
                        }}>
                          {g.hermeticallySealed ? "Yes" : "No"}
                        </span>
                      </td>
                      <td style={{ ...tdBase }}>
                        <div style={{ fontWeight: 600, color: g.leakCheckIntervalMonths > 0 ? "#fff" : "rgba(255,255,255,0.4)", fontSize: "0.82rem" }}>
                          {g.leakCheckIntervalMonths > 0 ? `Every ${g.leakCheckIntervalMonths} Months` : "Exempt (< 5 tCO₂e)"}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{g.leakRule}</div>
                      </td>
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.7)" }}>
                        {g.lastLeakCheckDate
                          ? new Date(g.lastLeakCheckDate).toLocaleDateString("en-GB")
                          : g.lastDate
                          ? new Date(g.lastDate).toLocaleDateString("en-GB")
                          : "—"}
                      </td>
                      <td style={{ ...tdBase }}>
                        <span style={{
                          background: due.bg,
                          color: due.color,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "20px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                        }}>
                          {due.label}
                        </span>
                      </td>
                      <td style={{ ...tdBase, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                          <button
                            type="button"
                            onClick={e => handleOpenEdit(e, g)}
                            title="Edit Equipment & F-Gas Rules"
                            style={{
                              padding: "0.3rem 0.55rem",
                              borderRadius: "6px",
                              background: "rgba(0,229,255,0.08)",
                              border: "1px solid rgba(0,229,255,0.25)",
                              color: "#00e5ff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Edit3 size={12} /> Configure
                          </button>
                          <Link
                            href={reportUrl}
                            target="_blank"
                            style={{
                              padding: "0.3rem 0.55rem",
                              borderRadius: "6px",
                              background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)",
                              color: "#fff",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <FileText size={12} /> Report
                          </Link>
                          {!g.archived && (
                            <button
                              type="button"
                              onClick={e => handleArchiveEquipment(e, g)}
                              title="Archive Equipment (Retain 5-Year History)"
                              style={{
                                padding: "0.3rem 0.5rem",
                                borderRadius: "6px",
                                background: "rgba(255,170,0,0.08)",
                                border: "1px solid rgba(255,170,0,0.25)",
                                color: "#ffaa00",
                                fontSize: "0.75rem",
                                cursor: "pointer",
                              }}
                            >
                              <Archive size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Drawer with full service and leak test history */}
                    {isExpanded && (
                      <tr style={{ background: "rgba(0,229,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td colSpan={9} style={{ padding: "0.75rem 1rem 0.75rem 3rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Wrench size={14} style={{ color: "#00e5ff" }} /> Service &amp; Leak Inspection History ({g.events.length})
                            </span>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button
                                type="button"
                                onClick={() => handleRecordLeakCheck(g.equipmentSerial)}
                                style={{
                                  padding: "0.3rem 0.75rem",
                                  borderRadius: "6px",
                                  background: "rgba(168,85,247,0.15)",
                                  border: "1px solid #c084fc",
                                  color: "#c084fc",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                              >
                                ✓ Record Leak Check Today
                              </button>
                            </div>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                            <thead>
                              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Date</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Job Ref</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Site</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Job Type</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Engineer</th>
                                <th style={{ ...thBase, fontSize: "0.65rem", textAlign: "right" }}>Gas Qty</th>
                                <th style={{ ...thBase, fontSize: "0.65rem" }}>Bottle</th>
                              </tr>
                            </thead>
                            <tbody>
                              {g.events.map(ev => {
                                const siteName = ev.jobRef ? crmJobMap.get(ev.jobRef)?.siteTitle : null;
                                return (
                                  <tr key={ev.usageLogId + ev.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: "0.45rem 0.8rem", color: "var(--text-muted)" }}>
                                      {ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                    <td style={{ padding: "0.45rem 0.8rem", fontFamily: "var(--font-geist-mono)", fontWeight: 600 }}>
                                      {ev.jobRef ? (
                                        <Link href={`/admin/jobs/${encodeURIComponent(ev.jobRef)}`} style={{ color: "#00e5ff", textDecoration: "none" }}>
                                          {ev.jobRef}
                                        </Link>
                                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "0.45rem 0.8rem", color: "rgba(255,255,255,0.55)" }}>{siteName || "—"}</td>
                                    <td style={{ padding: "0.45rem 0.8rem" }}>
                                      <span style={{
                                        fontSize: "0.7rem",
                                        fontWeight: 700,
                                        padding: "0.1rem 0.4rem",
                                        borderRadius: "3px",
                                        background: ev.jobType === "leak_test" ? "rgba(168,85,247,0.15)" : "rgba(34,197,94,0.12)",
                                        color: ev.jobType === "leak_test" ? "#c084fc" : "#22c55e",
                                        textTransform: "capitalize",
                                      }}>
                                        {ev.jobType === "leak_test" ? "Leak Test" : ev.jobType}
                                      </span>
                                    </td>
                                    <td style={{ padding: "0.45rem 0.8rem", color: "rgba(255,255,255,0.7)" }}>{ev.engineer}</td>
                                    <td style={{ padding: "0.45rem 0.8rem", textAlign: "right", fontWeight: 600, color: "#22c55e" }}>
                                      {ev.equipmentWeight > 0 ? `${ev.equipmentWeight.toFixed(2)} kg` : "0.00 kg"}
                                    </td>
                                    <td style={{ padding: "0.45rem 0.8rem", fontFamily: "var(--font-geist-mono)", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                                      {ev.bottleSerial}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Equipment Configuration Modal */}
      {editingGroup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.8)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          zIndex: 9999,
        }}>
          <div style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(0,229,255,0.3)",
            borderRadius: "14px",
            maxWidth: "500px",
            width: "100%",
            padding: "1.5rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Edit3 size={18} color="#00e5ff" /> F-Gas Equipment Rules
              </h3>
              <button onClick={() => setEditingGroup(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: "1rem", fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "0.75rem", borderRadius: "8px" }}>
              <div><strong>Serial:</strong> {editingGroup.equipmentSerial || "No serial"}</div>
              <div><strong>Equipment:</strong> {editingGroup.manufacturer} {editingGroup.model}</div>
            </div>

            <form onSubmit={handleSaveEquipment} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                  Refrigerant Gas Type
                </label>
                <select
                  value={editGasType}
                  onChange={e => setEditGasType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                >
                  {["R410A", "R32", "R404A", "R134a", "R407C", "R407A", "R454B", "R290", "R744"].map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "0.3rem", fontWeight: 600 }}>
                  Total System Nominal Charge (kg) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="e.g. 3.50"
                  value={editCharge}
                  onChange={e => setEditCharge(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
              </div>

              <label style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.75rem",
                background: editSealed ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${editSealed ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: "8px",
                cursor: "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={editSealed}
                  onChange={e => setEditSealed(e.target.checked)}
                  style={{ accentColor: "#22c55e", width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>
                  Hermetically Sealed System (Threshold &ge; 10 tCO<sub>2</sub>e)
                </span>
              </label>

              {/* Dynamic Live Calculated Result */}
              {(() => {
                const kg = parseFloat(editCharge) || 0;
                const co2e = calculateCO2e(editGasType, kg);
                const { intervalMonths, rule } = calculateLeakCheckInterval(co2e, editSealed);

                return (
                  <div style={{
                    padding: "0.85rem",
                    borderRadius: "8px",
                    background: "rgba(0,229,255,0.05)",
                    border: "1px solid rgba(0,229,255,0.2)",
                    fontSize: "0.82rem",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Calculated Carbon Footprint:</span>
                      <strong style={{ color: "#00e5ff" }}>{co2e} tCO₂e</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-muted)" }}>Statutory Leak Frequency:</span>
                      <strong style={{ color: intervalMonths > 0 ? "#ffaa00" : "#22c55e" }}>
                        {intervalMonths > 0 ? `Every ${intervalMonths} Months` : "Exempt"}
                      </strong>
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.35rem" }}>
                      {rule}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setEditingGroup(null)}
                  style={{
                    flex: 1,
                    padding: "0.75rem",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "8px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    flex: 2,
                    padding: "0.75rem",
                    background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: savingEdit ? "wait" : "pointer",
                  }}
                >
                  {savingEdit ? "Saving..." : "Save Equipment Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
