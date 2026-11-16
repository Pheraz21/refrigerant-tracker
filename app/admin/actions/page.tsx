"use client";

import { useState, useEffect } from "react";
import { db, MovementLog, CrmJob } from "@/lib/db";
import { History, Search, Calendar, FileText, FileSpreadsheet, Clock, User, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import styles from "../../engineer/page.module.css";

interface JobLookupInfo {
  exists: boolean;
  canonicalRef: string;
  siteName?: string;
}

function isNonJobLocation(loc?: string): boolean {
  const s = (loc || "").trim().toLowerCase();
  if (!s || s === "—" || s === "-" || s === "none" || s === "unknown") return true;
  if (s === "hq-stores" || s === "office" || s === "stores" || s.startsWith("hq-stores")) return true;
  if (s === "supplier" || s.startsWith("supplier ") || s.startsWith("supplier-") || s.startsWith("supplier(")) return true;
  if (s.includes("direct delivery to site")) return true;
  if (s === "in transit" || s.startsWith("in transit")) return true;
  if (s.startsWith("archived")) return true;
  if (s.includes(" - van") || s.startsWith("van (")) return true;
  if (s.startsWith("decanted ")) return true;
  return false;
}

export default function DailyActionsPage() {
  const [logs, setLogs] = useState<MovementLog[]>([]);
  const [bottleMap, setBottleMap] = useState<Record<string, { category: string; gasType: string; supplier?: string }>>({});
  const [jobMap, setJobMap] = useState<Record<string, JobLookupInfo>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    Promise.all([
      db.getMovementLogs(),
      db.getAllBottles(),
      db.getAllUsageLogs(),
      db.getAllDecommissions()
    ]).then(async ([movementData, bottlesData, usageData, decomData]) => {
      const map: Record<string, { category: string; gasType: string; supplier?: string }> = {};
      const producerSiteByJob = new Map<string, string>();

      bottlesData.forEach(b => {
        map[b.serial] = { category: b.category, gasType: b.gasType, supplier: b.supplier };
        if (Array.isArray(b.producerSites)) {
          b.producerSites.forEach((ps: any) => {
            const jn = (ps?.jobNumber || "").trim().toUpperCase();
            const nm = (ps?.name || "").trim();
            if (jn && nm && nm.toUpperCase() !== jn && !producerSiteByJob.has(jn)) {
              producerSiteByJob.set(jn, nm);
            }
          });
        }
      });

      const candidateRefs = new Set<string>();
      movementData.forEach(m => {
        if (m.from && !isNonJobLocation(m.from)) candidateRefs.add(m.from.trim());
        if (m.to && !isNonJobLocation(m.to)) candidateRefs.add(m.to.trim());
      });
      usageData.forEach(u => {
        if (u.siteRef && !isNonJobLocation(u.siteRef)) candidateRefs.add(u.siteRef.trim());
      });
      decomData.forEach((d: any) => {
        if (d.jobNumber && !isNonJobLocation(d.jobNumber)) candidateRefs.add(String(d.jobNumber).trim());
      });
      bottlesData.forEach(b => {
        if (b.locationType === "site" && b.locationId && !isNonJobLocation(b.locationId)) {
          candidateRefs.add(b.locationId.trim());
        }
      });

      const crmJobs: CrmJob[] = candidateRefs.size > 0
        ? await db.getCrmJobsByNumbers(Array.from(candidateRefs))
        : [];

      const crmByNumber = new Map<string, CrmJob>();
      const crmByUnprefixed = new Map<string, CrmJob>();
      crmJobs.forEach(j => {
        if (j.jobNumber) crmByNumber.set(j.jobNumber.trim().toUpperCase(), j);
        if (j.jobNumberUnprefixed && !crmByUnprefixed.has(j.jobNumberUnprefixed.trim())) {
          crmByUnprefixed.set(j.jobNumberUnprefixed.trim(), j);
        }
      });

      const usageByRef = new Map<string, { canonicalRef: string; siteName?: string }>();
      usageData.forEach(u => {
        const ref = (u.siteRef || "").trim();
        if (!ref) return;
        const key = ref.toUpperCase();
        const existing = usageByRef.get(key);
        const siteName = u.siteName && u.siteName.trim().toUpperCase() !== key ? u.siteName.trim() : undefined;
        if (!existing) {
          usageByRef.set(key, { canonicalRef: ref, siteName });
        } else if (!existing.siteName && siteName) {
          existing.siteName = siteName;
        }
      });

      const decomByRef = new Map<string, { canonicalRef: string; siteName?: string }>();
      decomData.forEach((d: any) => {
        const ref = String(d.jobNumber || "").trim();
        if (!ref) return;
        const key = ref.toUpperCase();
        const existing = decomByRef.get(key);
        const siteName = d.siteName && String(d.siteName).trim().toUpperCase() !== key ? String(d.siteName).trim() : undefined;
        if (!existing) {
          decomByRef.set(key, { canonicalRef: ref, siteName });
        } else if (!existing.siteName && siteName) {
          existing.siteName = siteName;
        }
      });

      const resolvedJobs: Record<string, JobLookupInfo> = {};
      candidateRefs.forEach(rawRef => {
        const key = rawRef.trim().toUpperCase();
        if (!key) return;
        const unpref = key.replace(/^[^0-9]+/, "");
        const crm = crmByNumber.get(key) || (unpref ? crmByUnprefixed.get(unpref) : undefined);
        const crmKey = crm?.jobNumber ? crm.jobNumber.trim().toUpperCase() : key;
        const uInfo = usageByRef.get(key) || usageByRef.get(crmKey);
        const dInfo = decomByRef.get(key) || decomByRef.get(crmKey);

        const exists = Boolean(crm || uInfo || dInfo);
        const canonicalRef = uInfo?.canonicalRef || dInfo?.canonicalRef || crm?.jobNumber || rawRef.trim();
        const siteName =
          crm?.siteTitle ||
          uInfo?.siteName ||
          dInfo?.siteName ||
          producerSiteByJob.get(key) ||
          producerSiteByJob.get(crmKey) ||
          crm?.siteAddress ||
          crm?.customer ||
          undefined;

        resolvedJobs[key] = { exists, canonicalRef, siteName };
      });

      setBottleMap(map);
      setJobMap(resolvedJobs);
      setLogs(movementData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    });
  }, []);

  const getJobInfo = (loc?: string): JobLookupInfo | null => {
    if (!loc || isNonJobLocation(loc)) return null;
    const key = loc.trim().toUpperCase();
    return jobMap[key] || null;
  };

  const getDisplayFrom = (log: MovementLog) => {
    const bSupplier = bottleMap[log.serial]?.supplier;
    if (log.from === "—" || log.from === "-" || !log.from || log.from.toLowerCase() === "none" || log.action === "registered") {
      return bSupplier ? `Supplier (${bSupplier})` : "Supplier";
    }
    return log.from;
  };

  const getDisplayTo = (log: MovementLog) => {
    const bSupplier = bottleMap[log.serial]?.supplier;
    if (log.to.toLowerCase() === "supplier") {
      return bSupplier ? `Supplier (${bSupplier})` : "Supplier";
    }
    return log.to;
  };

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const getCategoryBadge = (category?: string, action?: string, notes?: string) => {
    const cat = (category || "").toLowerCase();
    const isRecycledAction = action === "reclassified_recycled" || action === "workshop_decant_in";
    const isRecycledNotes = (notes || "").toLowerCase().includes("reclassified") || (notes || "").toLowerCase().includes("recycled");

    if (cat === "recycled" || cat === "recycle" || isRecycledAction || isRecycledNotes) {
      return {
        key: "recycled",
        label: "Recycled",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.15)",
        border: "rgba(16, 185, 129, 0.35)",
        icon: "♻️"
      };
    }
    if (cat === "reclaim") {
      return {
        key: "reclaim",
        label: "Reclaim",
        color: "#ffaa00",
        bg: "rgba(255, 170, 0, 0.15)",
        border: "rgba(255, 170, 0, 0.3)",
        icon: null
      };
    }
    if (cat === "nitrogen") {
      return {
        key: "nitrogen",
        label: "Nitrogen",
        color: "#22c55e",
        bg: "rgba(34, 197, 94, 0.15)",
        border: "rgba(34, 197, 94, 0.3)",
        icon: null
      };
    }
    return {
      key: "new",
      label: "New",
      color: "#00e5ff",
      bg: "rgba(0, 229, 255, 0.15)",
      border: "rgba(0, 229, 255, 0.3)",
      icon: null
    };
  };

  const filteredLogs = logs.filter(log => {
    const bInfo = bottleMap[log.serial];
    const displayFrom = getDisplayFrom(log);
    const displayTo = getDisplayTo(log);
    const fromJob = getJobInfo(log.from);
    const toJob = getJobInfo(log.to);
    const catBadge = getCategoryBadge(bInfo?.category, log.action, log.notes);

    const matchesCategory = categoryFilter === "all" || catBadge.key === categoryFilter;

    const q = search.toLowerCase();
    const matchesSearch = !search || 
      log.serial.toLowerCase().includes(q) || 
      log.engineer.toLowerCase().includes(q) ||
      displayTo.toLowerCase().includes(q) ||
      displayFrom.toLowerCase().includes(q) ||
      (fromJob?.siteName && fromJob.siteName.toLowerCase().includes(q)) ||
      (toJob?.siteName && toJob.siteName.toLowerCase().includes(q)) ||
      catBadge.label.toLowerCase().includes(q) ||
      (bInfo && bInfo.gasType.toLowerCase().includes(q)) ||
      (bInfo && bInfo.supplier && bInfo.supplier.toLowerCase().includes(q)) ||
      (log.notes && log.notes.toLowerCase().includes(q));
    
    const logDate = log.date.slice(0, 10);
    const matchesDate = (!dateFrom || logDate >= dateFrom) && (!dateTo || logDate <= dateTo);
    
    return matchesCategory && matchesSearch && matchesDate;
  });

  const renderLocation = (rawLoc: string, displayLoc: string, isFrom: boolean) => {
    const info = getJobInfo(rawLoc);
    if (!info) {
      return (
        <span style={{ color: isFrom ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)", fontWeight: isFrom ? 400 : 600 }}>
          {displayLoc}
        </span>
      );
    }

    return (
      <div style={{ display: "inline-flex", flexDirection: "column", gap: "0.1rem", minWidth: 0 }}>
        {info.exists ? (
          <Link
            href={`/admin/jobs/${encodeURIComponent(info.canonicalRef)}`}
            style={{
              color: "#00e5ff",
              textDecoration: "underline",
              textDecorationColor: "rgba(0,229,255,0.4)",
              fontWeight: 700,
              fontFamily: "var(--font-geist-mono)",
              fontSize: "0.85rem",
              width: "fit-content"
            }}
          >
            {displayLoc}
          </Link>
        ) : (
          <span style={{ color: isFrom ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.8)", fontWeight: isFrom ? 400 : 600, fontFamily: "var(--font-geist-mono)" }}>
            {displayLoc}
          </span>
        )}
        {info.siteName && (
          <span
            style={{
              fontSize: "0.73rem",
              color: "rgba(255,255,255,0.55)",
              fontWeight: 400,
              lineHeight: 1.25
            }}
          >
            {info.siteName}
          </span>
        )}
      </div>
    );
  };

  // Group logs by day
  const groupedLogs: Record<string, MovementLog[]> = {};
  filteredLogs.forEach(log => {
    const day = new Date(log.date).toLocaleDateString("en-GB", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (!groupedLogs[day]) groupedLogs[day] = [];
    groupedLogs[day].push(log);
  });

  const getActionColor = (action: string) => {
    switch (action) {
      case "registered":
      case "re_registered": return "#00e5ff";
      case "moved": return "#38bdf8";
      case "moved_to_site": return "#ff8800";
      case "moved_to_van": return "#22c55e";
      case "handover": return "#a855f7";
      case "signed_out": return "#0088ff";
      case "reclassified_recycled":
      case "workshop_decant_in": return "#10b981";
      case "returned_to_supplier": return "#f43f5e";
      case "received": return "#22c55e";
      default: return "rgba(255,255,255,0.5)";
    }
  };

  const formatAction = (action: string) => {
    if (action === "reclassified_recycled") return "Reclassified to Recycled";
    if (action === "workshop_decant_in") return "Decanted to Recycled";
    return action.replace(/_/g, " ");
  };

  const exportCSV = () => {
    const header = "Date,Time,Serial,Gas Type,Category,Supplier,Action,From,To,Engineer,Notes\n";
    const rows = filteredLogs.map(l => {
      const d = new Date(l.date);
      const b = bottleMap[l.serial];
      const fromLoc = getDisplayFrom(l);
      const toLoc = getDisplayTo(l);
      const catBadge = getCategoryBadge(b?.category, l.action, l.notes);
      return `${d.toLocaleDateString()},${d.toLocaleTimeString()},${l.serial},${b?.gasType || ""},${catBadge.label},${b?.supplier || ""},${formatAction(l.action)},${fromLoc},${toLoc},${l.engineer},${(l.notes || "").replace(/,/g, ";")}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bottle_actions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportPDF = () => {
    window.print(); // Browser print is often better for simple reports
  };

  const categoryCounts = {
    all: logs.length,
    new: logs.filter(l => getCategoryBadge(bottleMap[l.serial]?.category, l.action, l.notes).key === "new").length,
    recycled: logs.filter(l => getCategoryBadge(bottleMap[l.serial]?.category, l.action, l.notes).key === "recycled").length,
    reclaim: logs.filter(l => getCategoryBadge(bottleMap[l.serial]?.category, l.action, l.notes).key === "reclaim").length,
    nitrogen: logs.filter(l => getCategoryBadge(bottleMap[l.serial]?.category, l.action, l.notes).key === "nitrogen").length,
  };

  return (
    <div style={{maxWidth: "1200px"}}>
      <div style={{marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end"}}>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <History size={28} /> Daily Bottle Actions
          </h1>
          <p style={{color: "var(--text-muted)", margin: "0.25rem 0 0"}}>Chronological audit of all cylinder movements</p>
        </div>
        <div style={{display: "flex", gap: "0.75rem"}}>
          <button onClick={exportPDF} style={{padding: "0.6rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem"}}>
            <FileText size={18} /> Print PDF
          </button>
          <button onClick={exportCSV} style={{padding: "0.6rem 1rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem"}}>
            <FileSpreadsheet size={18} /> Export Excel
          </button>
        </div>
      </div>

      <div style={{display: "flex", gap: "1rem", marginBottom: "1.25rem", flexWrap: "wrap"}}>
        <div style={{position: "relative", flex: 1, maxWidth: "400px"}}>
          <Search size={18} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input 
            type="text" 
            placeholder="Search by serial, engineer, or location..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{width: "100%", padding: "0.75rem 0.75rem 0.75rem 2.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none"}}
          />
        </div>
        <div style={{display: "flex", gap: "0.5rem", alignItems: "center"}}>
          <div style={{position: "relative"}}>
            <Calendar size={18} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--primary)"}} />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{padding: "0.75rem 0.75rem 0.75rem 2.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none", colorScheme: "dark"}}
            />
          </div>
          <span style={{color: "rgba(255,255,255,0.3)", fontSize: "0.85rem", flexShrink: 0}}>to</span>
          <div style={{position: "relative"}}>
            <Calendar size={18} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "var(--primary)"}} />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{padding: "0.75rem 0.75rem 0.75rem 2.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#fff", outline: "none", colorScheme: "dark"}}
            />
          </div>
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: "0.8rem", padding: "0.4rem"}}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2rem", flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.04em", marginRight: "0.25rem" }}>
          Category:
        </span>
        {[
          { key: "all", label: "All Cylinders", count: categoryCounts.all, color: "#fff" },
          { key: "new", label: "New Gas", count: categoryCounts.new, color: "#00e5ff" },
          { key: "recycled", label: "Recycled", count: categoryCounts.recycled, color: "#10b981", icon: "♻️" },
          { key: "reclaim", label: "Reclaim", count: categoryCounts.reclaim, color: "#ffaa00" },
          { key: "nitrogen", label: "Nitrogen", count: categoryCounts.nitrogen, color: "#22c55e" },
        ].map(cat => {
          const isActive = categoryFilter === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.4rem 0.85rem",
                borderRadius: "20px",
                border: isActive ? `1.5px solid ${cat.color}` : "1px solid rgba(255, 255, 255, 0.1)",
                background: isActive ? `${cat.color}22` : "rgba(255, 255, 255, 0.03)",
                color: isActive ? cat.color : "rgba(255, 255, 255, 0.7)",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: isActive ? 700 : 500,
                transition: "all 0.15s ease",
              }}
            >
              {cat.icon && <span>{cat.icon}</span>}
              <span>{cat.label}</span>
              <span
                style={{
                  fontSize: "0.72rem",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "10px",
                  background: isActive ? `${cat.color}33` : "rgba(255, 255, 255, 0.08)",
                  color: isActive ? "#fff" : "rgba(255, 255, 255, 0.5)",
                  fontWeight: 700,
                }}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div style={{padding: "3rem", textAlign: "center", color: "var(--text-muted)"}}>Loading audit logs...</div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div className="glass-panel" style={{padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.2)"}}>
          <Clock size={48} style={{marginBottom: "1rem", opacity: 0.2}} />
          <p>No actions found matching your filters.</p>
        </div>
      ) : (
        <div style={{display: "flex", flexDirection: "column", gap: "2.5rem"}}>
          {Object.entries(groupedLogs).map(([day, dayLogs]) => (
            <section key={day}>
              <h2 style={{fontSize: "1rem", color: "var(--primary)", borderBottom: "1px solid rgba(0, 229, 255, 0.2)", paddingBottom: "0.75rem", marginBottom: "1.25rem", textTransform: "uppercase", letterSpacing: "0.05em"}}>
                {day}
              </h2>
              <div style={{display: "flex", flexDirection: "column", gap: "0.75rem"}}>
                {dayLogs.map(log => (
                  <div key={log.id} className="glass-panel" style={{padding: "1rem 1.5rem", display: "grid", gridTemplateColumns: "85px 1.4fr 1.3fr 2fr 1.2fr", alignItems: "center", gap: "1.25rem"}}>
                    <div style={{fontSize: "0.85rem", fontWeight: 700, color: "rgba(255,255,255,0.4)"}}>
                      {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <Link href={`/admin/bottles/${encodeURIComponent(log.serial)}`} style={{textDecoration: "none"}}>
                      <div style={{display: "flex", flexDirection: "column", gap: "0.2rem"}}>
                        <span style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", cursor: "pointer", fontSize: "0.95rem"}}>
                          {log.serial}
                        </span>
                        {(() => {
                          const badge = getCategoryBadge(bottleMap[log.serial]?.category, log.action, log.notes);
                          const gas = bottleMap[log.serial]?.gasType || "Refrigerant";
                          return (
                            <div style={{display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap"}}>
                              <span style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: badge.color
                              }}>
                                {gas}
                              </span>
                              <span style={{
                                fontSize: "0.62rem",
                                padding: "0.05rem 0.35rem",
                                borderRadius: "3px",
                                background: badge.bg,
                                color: badge.color,
                                textTransform: "uppercase",
                                fontWeight: 700,
                                border: `1px solid ${badge.border}`,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.2rem"
                              }}>
                                {badge.icon && <span>{badge.icon}</span>}
                                {badge.label}
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    </Link>
                    <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
                      <span style={{
                        fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "4px",
                        background: `${getActionColor(log.action)}22`, color: getActionColor(log.action),
                        textTransform: "uppercase", border: `1px solid ${getActionColor(log.action)}44`,
                        display: "inline-flex", alignItems: "center", gap: "0.3rem"
                      }}>
                        {(log.action === "reclassified_recycled" || log.action === "workshop_decant_in") && <span>♻️</span>}
                        {formatAction(log.action)}
                      </span>
                    </div>
                    <div>
                      <div style={{fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", display: "flex", alignItems: "flex-start", gap: "0.5rem"}}>
                        {renderLocation(log.from, getDisplayFrom(log), true)}
                        <ArrowRight size={14} style={{opacity: 0.3, marginTop: "0.2rem", flexShrink: 0}} />
                        {renderLocation(log.to, getDisplayTo(log), false)}
                      </div>
                      {log.notes && (
                        <div style={{fontSize: "0.74rem", color: "rgba(255,255,255,0.45)", marginTop: "0.2rem", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"}} title={log.notes}>
                          {log.notes}
                        </div>
                      )}
                    </div>
                    <div style={{fontSize: "0.85rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "flex-end"}}>
                      <User size={14} style={{opacity: 0.5}} />
                      {log.engineer}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      
      <style>{`
        @media print {
          nav, aside, button, input, select { display: none !important; }
          .glass-panel { border: 1px solid #eee !important; background: none !important; color: #000 !important; box-shadow: none !important; }
          h1, h2, h3, p, span, div { color: #000 !important; }
          body { background: #fff !important; }
        }
      `}</style>
    </div>
  );
}
