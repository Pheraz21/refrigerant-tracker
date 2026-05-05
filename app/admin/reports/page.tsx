"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { FileText, Droplets, MapPin, ClipboardList, ShieldAlert, FileSpreadsheet, Calendar } from "lucide-react";

type ReportView = "usage" | "locations" | "hwcn" | "waste";

export default function ReportsPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ReportView>("usage");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const exportCSV = (rows: string[][], filename: string) => {
    const content = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    Promise.all([db.getAllBottles(), db.getAllHWCNs()]).then(([b, h]) => {
      setBottles(b);
      setHwcns(h);
      setLoading(false);
    });
  }, []);

  const reports = [
    { key: "usage" as ReportView, label: "Refrigerant Usage Log", icon: Droplets, desc: "Where new refrigerant has been used" },
    { key: "locations" as ReportView, label: "Current Bottle Locations", icon: MapPin, desc: "Where all bottles are right now" },
    { key: "waste" as ReportView, label: "Full Waste Audit", icon: ShieldAlert, desc: "Consolidated haz-waste exposure" },
    { key: "hwcn" as ReportView, label: "Completed HWCNs", icon: ClipboardList, desc: "All completed consignment notes" },
  ];

  const inRange = (dateStr: string) => {
    const d = dateStr?.slice(0, 10) || "";
    return (!dateFrom || d >= dateFrom) && (!dateTo || d <= dateTo);
  };

  const newBottles = bottles.filter(b => b.category === "new" && (!dateFrom && !dateTo || inRange(b.registeredAt)));
  const completedHWCNs = hwcns.filter(h => h.hwcnStatus === "complete" && (!dateFrom && !dateTo || inRange(h.date)));
  const today = new Date().toISOString().split("T")[0];

  const locGroups: Record<string, Bottle[]> = {};
  bottles.forEach(b => {
    const key = b.locationType === "van" ? `Van — ${b.locationId}` :
                b.locationType === "site" ? `Site — ${b.locationId}` :
                b.locationType === "office" ? "Office / Stores" :
                `Supplier — ${b.supplier || "Unknown"}`;
    if (!locGroups[key]) locGroups[key] = [];
    locGroups[key].push(b);
  });

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <FileText size={28} /> Reports
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Compliance reports and bottle tracking</p>
      </div>

      {/* Report selector */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", marginBottom: "2rem"}}>
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)} style={{
            padding: "1rem",
            borderRadius: "10px",
            border: activeReport === r.key ? "2px solid #00e5ff" : "1px solid rgba(255,255,255,0.08)",
            background: activeReport === r.key ? "rgba(0,229,255,0.06)" : "rgba(255,255,255,0.02)",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.15s"
          }}>
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem"}}>
              <r.icon size={18} color={activeReport === r.key ? "#00e5ff" : "rgba(255,255,255,0.4)"} />
              <span style={{fontWeight: 600, fontSize: "0.9rem", color: activeReport === r.key ? "#00e5ff" : "#fff"}}>{r.label}</span>
            </div>
            <span style={{fontSize: "0.78rem", color: "var(--text-muted)"}}>{r.desc}</span>
          </button>
        ))}
      </div>

      {/* Date Range Filter */}
      <div style={{display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Calendar size={15} color="var(--primary)" />
          <span style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontWeight: 600}}>Date Range:</span>
        </div>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{padding: "0.45rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", colorScheme: "dark", fontSize: "0.85rem"}} />
        <span style={{color: "rgba(255,255,255,0.3)", fontSize: "0.85rem"}}>to</span>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{padding: "0.45rem 0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", outline: "none", colorScheme: "dark", fontSize: "0.85rem"}} />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(""); setDateTo(""); }} style={{background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.4rem 0.75rem", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: "0.8rem"}}>
            Clear filter
          </button>
        )}
        <span style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginLeft: "auto"}}>Applies to Usage &amp; HWCN tabs</span>
      </div>

      {/* Report Content */}
      <div style={{borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"}}>

        {/* USAGE LOG */}
        {activeReport === "usage" && (
          <>
            <div style={{padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <h3 style={{margin: 0, fontSize: "1rem"}}>New Refrigerant Usage Log</h3>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)"}}>
                  {newBottles.length} bottle{newBottles.length !== 1 ? "s" : ""}{(dateFrom || dateTo) ? " (filtered)" : ""}
                </p>
              </div>
              <button onClick={() => exportCSV(
                [["Serial","Gas Type","Full Weight (kg)","Current Weight (kg)","Weight Used (kg)","Location"],
                 ...newBottles.map(b => [b.serial, b.gasType, b.initialWeight.toFixed(2), b.currentWeight.toFixed(2), (b.initialWeight - b.currentWeight).toFixed(2), b.locationId || b.locationType])],
                `refrigerant_usage_${today}.csv`
              )} style={{display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "7px", color: "#00e5ff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"}}>
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
            <table style={{width: "100%", borderCollapse: "collapse"}}>
              <thead>
                <tr style={{background: "rgba(255,255,255,0.04)"}}>
                  {["Serial", "Gas Type", "Full Weight", "Current Weight", "Weight Used", "Current Location"].map(h => (
                    <th key={h} style={{padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newBottles.map(b => (
                  <tr key={b.serial} style={{borderBottom: "1px solid rgba(255,255,255,0.04)"}}>
                    <td style={{padding: "0.8rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff"}}>{b.serial}</td>
                    <td style={{padding: "0.8rem 1rem"}}>{b.gasType}</td>
                    <td style={{padding: "0.8rem 1rem"}}>{b.initialWeight.toFixed(2)} kg</td>
                    <td style={{padding: "0.8rem 1rem", color: "#22c55e", fontWeight: 600}}>{b.currentWeight.toFixed(2)} kg</td>
                    <td style={{padding: "0.8rem 1rem", color: "#ffc107", fontWeight: 600}}>{(b.initialWeight - b.currentWeight).toFixed(2)} kg</td>
                    <td style={{padding: "0.8rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.locationId || b.locationType}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background: "rgba(255,255,255,0.03)", borderTop: "2px solid rgba(255,255,255,0.1)"}}>
                  <td colSpan={2} style={{padding: "0.8rem 1rem", fontWeight: 700}}>Totals</td>
                  <td style={{padding: "0.8rem 1rem", fontWeight: 700}}>{newBottles.reduce((sum, b) => sum + b.initialWeight, 0).toFixed(2)} kg</td>
                  <td style={{padding: "0.8rem 1rem", fontWeight: 700, color: "#22c55e"}}>{newBottles.reduce((sum, b) => sum + b.currentWeight, 0).toFixed(2)} kg</td>
                  <td style={{padding: "0.8rem 1rem", fontWeight: 700, color: "#ffc107"}}>{newBottles.reduce((sum, b) => sum + (b.initialWeight - b.currentWeight), 0).toFixed(2)} kg</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* LOCATIONS */}
        {activeReport === "locations" && (
          <>
            <div style={{padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <h3 style={{margin: 0, fontSize: "1rem"}}>Current Bottle Locations</h3>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)"}}>{bottles.length} bottles across {Object.keys(locGroups).length} locations</p>
              </div>
              <button onClick={() => {
                const rows = Object.entries(locGroups).flatMap(([loc, bots]) => bots.map(b => [b.serial, b.gasType, b.category, b.currentWeight.toFixed(2), loc]));
                exportCSV([["Serial","Gas Type","Category","Current Weight (kg)","Location"], ...rows], `bottle_locations_${today}.csv`);
              }} style={{display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "7px", color: "#00e5ff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"}}>
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
            <div style={{padding: "1rem"}}>
              {Object.entries(locGroups).map(([loc, bots]) => (
                <div key={loc} style={{marginBottom: "1.25rem"}}>
                  <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "6px"}}>
                    <span style={{fontWeight: 700, fontSize: "0.95rem"}}>{loc}</span>
                    <span style={{fontSize: "0.82rem", color: "var(--text-muted)"}}>{bots.length} bottle{bots.length > 1 ? "s" : ""}</span>
                  </div>
                  <div style={{display: "flex", flexDirection: "column", gap: "0.35rem", paddingLeft: "0.75rem"}}>
                    {bots.map(b => (
                      <div key={b.serial} style={{display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "0.4rem 0.5rem", borderBottom: "1px solid rgba(255,255,255,0.03)"}}>
                        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                          <span style={{fontFamily: "var(--font-geist-mono)", fontWeight: 600, color: "#00e5ff"}}>{b.serial}</span>
                          <span style={{color: "var(--text-muted)"}}>{b.gasType}</span>
                        </div>
                        <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                          <span>
                            {b.category === "reclaim" 
                              ? `${b.currentWeight.toFixed(2)} / ${b.initialWeight.toFixed(2)} kg` 
                              : b.category === "nitrogen" 
                                ? `${b.initialWeight.toFixed(2)} kg` 
                                : `${b.currentWeight.toFixed(2)} kg`}
                          </span>
                          <span style={{
                            fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.5rem", borderRadius: "12px",
                            background: b.category === "reclaim" ? "rgba(255,170,0,0.1)" : "rgba(0,229,255,0.08)",
                            color: b.category === "reclaim" ? "#ffaa00" : "#00e5ff"
                          }}>
                            {b.category === "new" ? "New" : b.category === "reclaim" ? "Haz" : "N₂"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* WASTE AUDIT */}
        {activeReport === "waste" && (
          <>
            <div style={{padding: "1rem 1.25rem", background: "rgba(255,51,102,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <h3 style={{margin: 0, fontSize: "1rem", color: "#ff3366"}}>Hazardous Waste Audit</h3>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)"}}>Full summary of reclaim cylinders currently held by company</p>
              </div>
              <button onClick={() => {
                const rows = Object.entries(locGroups).flatMap(([loc, bots]) => bots.filter(b => b.category === "reclaim").map(b => [b.serial, b.gasType, b.currentWeight.toFixed(2), b.initialWeight.toFixed(2), loc]));
                exportCSV([["Serial","Gas Type","Current Weight (kg)","Max Weight (kg)","Location"], ...rows], `haz_waste_audit_${today}.csv`);
              }} style={{display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.2)", borderRadius: "7px", color: "#ff3366", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"}}>
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
            <div style={{padding: "1rem"}}>
              {Object.entries(locGroups).map(([loc, bots]) => {
                const wasteBots = bots.filter(b => b.category === "reclaim");
                if (wasteBots.length === 0) return null;
                const totalWeight = wasteBots.reduce((sum, b) => sum + b.currentWeight, 0);

                return (
                  <div key={loc} style={{marginBottom: "1.5rem", padding: "1rem", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)"}}>
                    <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem"}}>
                      <span style={{fontWeight: 700, fontSize: "1rem"}}>{loc}</span>
                      <div style={{textAlign: "right"}}>
                        <div style={{fontSize: "1.1rem", fontWeight: 800, color: "#fff"}}>{totalWeight.toFixed(2)} kg</div>
                        <div style={{fontSize: "0.7rem", color: "rgba(255,255,255,0.3)", fontWeight: 700}}>{wasteBots.length} BOTTLES</div>
                      </div>
                    </div>
                    <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                      {wasteBots.map(b => (
                        <div key={b.serial} style={{display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "0.5rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px"}}>
                          <div style={{display: "flex", alignItems: "center", gap: "1rem"}}>
                            <span style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "var(--primary)"}}>{b.serial}</span>
                            <span style={{color: "rgba(255,255,255,0.6)"}}>{b.gasType}</span>
                          </div>
                          <span style={{fontWeight: 600}}>{b.currentWeight.toFixed(2)} kg</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* COMPLETED HWCNs */}
        {activeReport === "hwcn" && (
          <>
            <div style={{padding: "1rem 1.25rem", background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <div>
                <h3 style={{margin: 0, fontSize: "1rem"}}>Completed Consignment Notes</h3>
                <p style={{margin: "0.25rem 0 0", fontSize: "0.82rem", color: "var(--text-muted)"}}>
                  {completedHWCNs.length} completed HWCNs{(dateFrom || dateTo) ? " (filtered)" : ""}
                </p>
              </div>
              <button onClick={() => exportCSV(
                [["HWCN Code","Serial","Engineer","Destination","Date","Received By","Completed"],
                 ...completedHWCNs.map(h => [h.id, h.serial, h.engineer, h.destination || "", new Date(h.date).toLocaleDateString("en-GB"), h.receivedBy || "", h.partECompletedAt ? new Date(h.partECompletedAt).toLocaleDateString("en-GB") : ""])],
                `hwcn_completed_${today}.csv`
              )} style={{display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 0.9rem", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "7px", color: "#00e5ff", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer"}}>
                <FileSpreadsheet size={14} /> Export CSV
              </button>
            </div>
            {completedHWCNs.length === 0 ? (
              <div style={{padding: "3rem", textAlign: "center", color: "var(--text-muted)"}}>
                <p>No completed HWCNs yet</p>
              </div>
            ) : (
              <table style={{width: "100%", borderCollapse: "collapse"}}>
                <thead>
                  <tr style={{background: "rgba(255,255,255,0.04)"}}>
                    {["HWCN Code", "Bottle Serial", "Engineer", "Destination", "Date", "Received By", "Completed"].map(h => (
                      <th key={h} style={{padding: "0.7rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,0.06)"}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedHWCNs.map(h => (
                    <tr key={h.id} style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer"}}
                      onClick={() => window.location.href = `/admin/hwcn/${h.id}`}
                    >
                      <td style={{padding: "0.8rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#22c55e"}}>{h.id}</td>
                      <td style={{padding: "0.8rem 1rem", fontFamily: "var(--font-geist-mono)"}}>{h.serial}</td>
                      <td style={{padding: "0.8rem 1rem"}}>{h.engineer}</td>
                      <td style={{padding: "0.8rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{h.destination}</td>
                      <td style={{padding: "0.8rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{new Date(h.date).toLocaleDateString("en-GB")}</td>
                      <td style={{padding: "0.8rem 1rem"}}>{h.receivedBy || "—"}</td>
                      <td style={{padding: "0.8rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>{h.partECompletedAt ? new Date(h.partECompletedAt).toLocaleDateString("en-GB") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
}
