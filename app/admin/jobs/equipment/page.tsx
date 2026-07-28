"use client";

import React, { useEffect, useState, useMemo } from "react";
import { db, CrmJob } from "@/lib/db";
import { Wrench, Search, ChevronDown, ChevronRight, X, Calendar, ExternalLink, Printer, FileText } from "lucide-react";
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
  events: ServiceEvent[];
  firstDate: string;
  lastDate: string;
  jobCount: number;
}

function equipmentKey(manufacturer: string, model: string, serial: string): string {
  if (serial) return `sn:${serial.toLowerCase().trim()}`;
  const mm = `${manufacturer}|${model}`.toLowerCase().trim();
  if (mm !== "|") return `mm:${mm}`;
  return `unknown`;
}

function displaySerial(g: EquipmentGroup) {
  return g.equipmentSerial || <span style={{ color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>No serial</span>;
}

export default function EquipmentRegisterPage() {
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [crmJobMap, setCrmJobMap] = useState<Map<string, CrmJob>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    db.getUsageLogsWithEquipment().then(logs => {
      setRawLogs(logs);
      const jobRefs = new Set<string>();
      logs.forEach(l => l.site_ref && jobRefs.add(l.site_ref));
      if (jobRefs.size > 0) {
        db.getCrmJobsByNumbers(Array.from(jobRefs)).then(jobs => {
          setCrmJobMap(new Map(jobs.map(j => [j.jobNumber, j])));
        });
      }
      setLoading(false);
    });
  }, []);

  const equipmentGroups = useMemo<EquipmentGroup[]>(() => {
    const grouped = new Map<string, { representative: any; events: ServiceEvent[] }>();

    for (const log of rawLogs) {
      const items: any[] = Array.isArray(log.equipment_details) ? log.equipment_details : [];
      for (const eq of items) {
        const mfr = eq.manufacturer || "";
        const mdl = eq.model || "";
        const sn = eq.serial || "";
        if (!mfr && !mdl && !sn) continue;
        const key = equipmentKey(mfr, mdl, sn);
        if (!grouped.has(key)) {
          grouped.set(key, { representative: eq, events: [] });
        }
        const entry = grouped.get(key)!;
        // Keep the most recent representative (logs are ordered desc by date)
        // Since we iterate desc, the first encounter is most recent
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
      return {
        key,
        manufacturer: representative.manufacturer || "",
        model: representative.model || "",
        equipmentSerial: representative.serial || "",
        events: sorted,
        firstDate: sorted[sorted.length - 1].date,
        lastDate: sorted[0].date,
        jobCount: new Set(sorted.map(e => e.jobRef).filter(Boolean)).size || sorted.length,
      };
    }).sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
  }, [rawLogs]);

  const filtered = useMemo(() => {
    return equipmentGroups.filter(g => {
      const s = search.toLowerCase();
      if (s && !g.equipmentSerial.toLowerCase().includes(s) &&
          !g.manufacturer.toLowerCase().includes(s) &&
          !g.model.toLowerCase().includes(s) &&
          !g.events.some(e => e.jobRef?.toLowerCase().includes(s) || e.engineer.toLowerCase().includes(s))) {
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
  }, [equipmentGroups, search, dateFrom, dateTo]);

  const toggleExpand = (key: string) =>
    setExpandedKeys(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const hasFilters = !!(search || dateFrom || dateTo);

  const printEquipmentRegister = () => {
    const reportDate = new Date().toLocaleDateString("en-GB", { dateStyle: "long" });
    const filterDesc = [
      search ? `Search: "${search}"` : "",
      dateFrom ? `From: ${new Date(dateFrom).toLocaleDateString("en-GB")}` : "",
      dateTo ? `To: ${new Date(dateTo).toLocaleDateString("en-GB")}` : "",
    ].filter(Boolean).join(" · ") || "All equipment";

    const rows = filtered.map(g => {
      const serviceRows = g.events.map(ev => {
        const siteName = ev.jobRef ? crmJobMap.get(ev.jobRef)?.siteTitle : null;
        const jtColors: Record<string, string> = { service: "#155724", install: "#0c5460", recovery: "#856404", retrofit: "#4a235a", waste: "#721c24" };
        const jtBg: Record<string, string> = { service: "#d4edda", install: "#d1ecf1", recovery: "#fff3cd", retrofit: "#e8d5f5", waste: "#f8d7da" };
        const color = jtColors[ev.jobType] || "#555";
        const bg = jtBg[ev.jobType] || "#f8f9fa";
        return `
          <tr style="background:#fafafa">
            <td style="padding:5px 8px;font-size:9px;color:#666">${ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "—"}</td>
            <td style="padding:5px 8px;font-size:9px;font-family:monospace;font-weight:600;color:#1a202c">${ev.jobRef || "—"}</td>
            <td style="padding:5px 8px;font-size:9px;color:#555">${siteName || "—"}</td>
            <td style="padding:5px 8px">
              <span style="font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;background:${bg};color:${color};text-transform:capitalize">${ev.jobType || "—"}</span>
            </td>
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
            </div>
            <div style="font-size:9px;color:#888">${g.events.length} service${g.events.length !== 1 ? "s" : ""} &nbsp;·&nbsp; ${new Date(g.firstDate).toLocaleDateString("en-GB")} – ${new Date(g.lastDate).toLocaleDateString("en-GB")}</div>
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

    const html = `<!DOCTYPE html><html><head><title>Equipment Register — 21 Degrees</title>
      <style>
        @page { margin: 0; size: A4 portrait; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 10mm; color: #333; line-height: 1.4; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
        .logo-section { display: flex; gap: 12px; align-items: flex-end; }
        .company-info { font-size: 9px; line-height: 1.5; color: #555; }
        .report-info { text-align: right; }
        .report-title { font-size: 18px; font-weight: bold; text-transform: uppercase; color: #1a202c; }
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
          <div class="report-title">Equipment Register</div>
          <div class="report-meta">Generated: ${reportDate} &nbsp;·&nbsp; Filter: ${filterDesc} &nbsp;·&nbsp; ${filtered.length} unit${filtered.length !== 1 ? "s" : ""}</div>
        </div>
      </div>
      ${rows}
      <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd</div>
    </body></html>`;

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  const thBase: React.CSSProperties = {
    padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.72rem",
    color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase",
    borderBottom: "1px solid rgba(255,255,255,0.06)", whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.85rem" };

  const jobTypeColor = (jt: string) => {
    switch (jt) {
      case "recovery": return { bg: "rgba(255,170,0,0.1)", color: "#ffaa00" };
      case "service":  return { bg: "rgba(34,197,94,0.1)", color: "#22c55e" };
      case "install":  return { bg: "rgba(0,229,255,0.08)", color: "#00e5ff" };
      case "retrofit": return { bg: "rgba(168,85,247,0.1)", color: "#a855f7" };
      case "waste":    return { bg: "rgba(255,51,102,0.08)", color: "#ff3366" };
      default:         return { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" };
    }
  };

  if (loading) return <div style={{ padding: "2rem", color: "var(--text-muted)" }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Wrench size={28} /> Equipment Register
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          All equipment that has had refrigerant work carried out, grouped by unit
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
              placeholder="Serial, manufacturer, model, job ref, engineer..."
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

        {hasFilters && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
            style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end" }}
          >
            <X size={14} /> Clear
          </button>
        )}
        <button
          onClick={printEquipmentRegister}
          disabled={filtered.length === 0}
          style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", border: "1px solid rgba(255,170,0,0.25)", background: "rgba(255,170,0,0.08)", color: filtered.length === 0 ? "rgba(255,170,0,0.3)" : "#ffaa00", cursor: filtered.length === 0 ? "default" : "pointer", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.35rem", alignSelf: "flex-end", fontWeight: 600 }}
        >
          <Printer size={15} /> Print PDF
        </button>
      </div>

      <div style={{ marginBottom: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        {filtered.length} piece{filtered.length !== 1 ? "s" : ""} of equipment
        {hasFilters && <span style={{ color: "#00e5ff" }}> (filtered)</span>}
      </div>

      {filtered.length === 0 ? (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", padding: "4rem 2rem", textAlign: "center", color: "var(--text-muted)" }}>
          <Wrench size={48} style={{ marginBottom: "1rem", opacity: 0.2 }} />
          <p style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem" }}>No Equipment Found</p>
          <p style={{ fontSize: "0.85rem" }}>
            {hasFilters
              ? "Try adjusting your filters."
              : "Equipment details entered during refrigerant usage will appear here."}
          </p>
        </div>
      ) : (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                <th style={{ ...thBase, width: "2rem" }}></th>
                <th style={thBase}>Serial No.</th>
                <th style={thBase}>Manufacturer</th>
                <th style={thBase}>Model</th>
                <th style={{ ...thBase, textAlign: "center" }}>Service Count</th>
                <th style={thBase}>First Service</th>
                <th style={thBase}>Last Service</th>
                <th style={thBase}>Last Job</th>
                <th style={{ ...thBase, textAlign: "right" }}>Report</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((g, idx) => {
                const isExpanded = expandedKeys.has(g.key);
                const lastEvent = g.events[0];
                const lastJobSite = lastEvent.jobRef ? crmJobMap.get(lastEvent.jobRef)?.siteTitle : null;
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
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.3)", paddingLeft: "1.25rem" }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </td>
                      <td style={{ ...tdBase, fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: g.equipmentSerial ? "#fff" : "rgba(255,255,255,0.25)" }}>
                        {g.equipmentSerial ? g.equipmentSerial.toUpperCase() : <em style={{ fontSize: "0.78rem" }}>No serial</em>}
                      </td>
                      <td style={{ ...tdBase, color: g.manufacturer ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>
                        {g.manufacturer || "—"}
                      </td>
                      <td style={{ ...tdBase, color: g.model ? "rgba(255,255,255,0.85)" : "var(--text-muted)" }}>
                        {g.model ? g.model.toUpperCase() : "—"}
                      </td>
                      <td style={{ ...tdBase, textAlign: "center" }}>
                        <span style={{ background: "rgba(0,229,255,0.08)", color: "#00e5ff", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 600 }}>
                          {g.events.length}
                        </span>
                      </td>
                      <td style={{ ...tdBase, color: "var(--text-muted)" }}>
                        {g.firstDate ? new Date(g.firstDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ ...tdBase, color: "rgba(255,255,255,0.7)" }}>
                        {g.lastDate ? new Date(g.lastDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ ...tdBase }}>
                        {lastEvent.jobRef ? (
                          <div>
                            <Link
                              href={`/admin/jobs/${encodeURIComponent(lastEvent.jobRef)}`}
                              onClick={e => e.stopPropagation()}
                              style={{ color: "#00e5ff", fontFamily: "var(--font-geist-mono)", fontWeight: 600, fontSize: "0.85rem", textDecoration: "none" }}
                            >
                              {lastEvent.jobRef}
                            </Link>
                            {lastJobSite && (
                              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.1rem" }}>{lastJobSite}</div>
                            )}
                          </div>
                        ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                      </td>
                      <td style={{ ...tdBase, textAlign: "right" }} onClick={e => e.stopPropagation()}>
                        <Link
                          href={reportUrl}
                          target="_blank"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.3rem 0.65rem",
                            borderRadius: "5px",
                            background: "rgba(0,229,255,0.08)",
                            border: "1px solid rgba(0,229,255,0.25)",
                            color: "#00e5ff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <FileText size={12} /> View Report
                        </Link>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr style={{ background: "rgba(0,229,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <td colSpan={9} style={{ padding: "0.75rem 1rem 0.75rem 3.5rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                              <Wrench size={14} style={{ color: "#00e5ff" }} /> Bottle Action & Service Logs ({g.events.length})
                            </span>
                            <Link
                              href={reportUrl}
                              target="_blank"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.25rem 0.65rem",
                                borderRadius: "5px",
                                background: "linear-gradient(135deg, #00e5ff 0%, #00b4d8 100%)",
                                color: "#0a0e17",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                textDecoration: "none",
                              }}
                            >
                              <Printer size={12} /> Open Equipment Report & Print
                            </Link>
                          </div>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
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
                                const jtStyle = jobTypeColor(ev.jobType);
                                return (
                                  <tr key={ev.usageLogId + ev.date} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                                    <td style={{ padding: "0.5rem 1rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                                      {ev.date ? new Date(ev.date).toLocaleDateString("en-GB") : "—"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 600 }}>
                                      {ev.jobRef ? (
                                        <Link
                                          href={`/admin/jobs/${encodeURIComponent(ev.jobRef)}`}
                                          style={{ color: "#00e5ff", textDecoration: "none" }}
                                        >
                                          {ev.jobRef}
                                        </Link>
                                      ) : <span style={{ color: "var(--text-muted)" }}>—</span>}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.55)", fontSize: "0.8rem" }}>
                                      {siteName || "—"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.4rem", borderRadius: "3px", background: jtStyle.bg, color: jtStyle.color, textTransform: "capitalize" }}>
                                        {ev.jobType || "—"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem", color: "rgba(255,255,255,0.7)" }}>{ev.engineer}</td>
                                    <td style={{ padding: "0.5rem 1rem", textAlign: "right", fontWeight: 600, color: "#22c55e" }}>
                                      {ev.equipmentWeight > 0 ? `${ev.equipmentWeight.toFixed(2)} kg` : "—"}
                                    </td>
                                    <td style={{ padding: "0.5rem 1rem" }}>
                                      <Link
                                        href={`/admin/bottles/${encodeURIComponent(ev.bottleSerial)}`}
                                        style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-geist-mono)", fontSize: "0.78rem", textDecoration: "none" }}
                                        onClick={e => e.stopPropagation()}
                                      >
                                        {ev.bottleSerial} <ExternalLink size={10} style={{ verticalAlign: "middle", opacity: 0.5 }} />
                                      </Link>
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
    </div>
  );
}
