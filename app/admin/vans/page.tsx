"use client";

import { useEffect, useState } from "react";
import { db, Bottle, AppUser } from "@/lib/db";
import { Truck, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Download, Calendar, Filter as FilterIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "locationChangedAt" | "supplier" | "registeredAt";

// ── Export helpers ──

function downloadFile(content: string, filename: string, type: string) {
  const bom = "\uFEFF";
  const dataUri = `data:${type};charset=utf-8,` + encodeURIComponent(bom + content);
  const a = document.createElement("a");
  a.setAttribute("href", dataUri);
  a.setAttribute("download", filename);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function exportVanCSV(bottles: Bottle[], engineer: string) {
  const header = "Serial,Category,Gas Type,Full Weight (kg),Current Weight (kg),Since";
  const rows = bottles.map(b =>
    `${b.serial},${b.category === "new" ? "New" : b.category === "reclaim" ? "Reclaim" : "N₂"},${b.gasType},${b.initialWeight.toFixed(2)},${b.category === "nitrogen" ? "N/A" : b.currentWeight.toFixed(2)},${b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : ""}`
  );
  const fileName = engineer === "all" ? "fleet_inventory.csv" : `${engineer}_van.csv`;
  downloadFile([header, ...rows].join("\n"), fileName, "text/csv");
}

function exportVanPDF(bottles: Bottle[], engineer: string) {
  const reportDate = new Date().toLocaleDateString("en-GB");
  const rows = bottles.map(b => {
    const catLabel = b.category === "new" ? "New" : b.category === "reclaim" ? "Reclaim / Haz" : "Nitrogen";
    return `<tr>
      <td style="font-weight:bold">${b.serial}</td>
      <td>${catLabel}</td>
      <td>${b.gasType}</td>
      <td>${(b.initialWeight || 0).toFixed(2)} kg</td>
      <td style="font-weight:bold">${b.category === "nitrogen" ? "N/A" : (b.currentWeight || 0).toFixed(2) + " kg"}</td>
      <td>${b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—"}</td>
    </tr>`;
  }).join("");

  const html = `
    <html>
      <head>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #333; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px; }
          .logo-section { display: flex; gap: 15px; align-items: flex-end; }
          .company-info { font-size: 10px; line-height: 1.4; color: #555; }
          .report-info { text-align: right; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
          .report-meta { font-size: 11px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; font-size: 10px; }
          th { background: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #555; }
          .footer { margin-top: 20px; font-size: 9px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <img src="/21-degrees-logo-reports.png" style="width: 100px; height: auto;" />
            <div class="company-info">
              <strong>21 Degrees Ltd</strong><br />
              Unit 10, Apollo Court, Monkton Business Park<br />
              Hebburn, Tyne & Wear, NE31 2ES<br />
              Tel: 0191 495 7224
            </div>
          </div>
          <div class="report-info">
            <div class="report-title">Van Inventory Report</div>
            <div class="report-meta">
              <div>Engineer: ${engineer === "all" ? "All Engineers / Fleet" : engineer}</div>
              <div>Generated: ${reportDate}</div>
              <div>Results: ${bottles.length} Bottles</div>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Serial</th><th>Category</th><th>Gas Type</th><th>Capacity</th><th>Current</th><th>Since</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        
        <div class="footer">
          Printed from F-Gas Tracker Pro | &copy; 21 Degrees Ltd
        </div>
      </body>
    </html>
  `;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => { w.print(); }, 500); }
}

function saveVanPDF(bottles: Bottle[], engineer: string) {
  // Reusing the same formal template as exportVanPDF for consistency
  exportVanPDF(bottles, engineer);
}

// ── Component ──

export default function VanInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [engineers, setEngineers] = useState<AppUser[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sinceDate, setSinceDate] = useState("");

  useEffect(() => {
    const engId = searchParams.get("engineer");
    if (engId) setSelectedEngineer(engId);
  }, [searchParams]);

  useEffect(() => {
    db.getEngineerProfiles().then(eng => {
      setEngineers(eng);
      setSelectedEngineer("all"); // Default to all engineers
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedEngineer) {
      db.getBottlesByVan(selectedEngineer).then(setBottles);
    }
  }, [selectedEngineer]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem"}} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem"}} />;
  };

  const filtered = bottles
    .filter(b => 
      b.serial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.gasType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.locationId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(b => {
      if (!sinceDate) return true;
      const bottleDate = b.locationChangedAt || b.registeredAt;
      return bottleDate && new Date(bottleDate) >= new Date(sinceDate);
    });

  const sorted = [...filtered].sort((a, b) => {
    let av: any = a[sortKey] ?? "";
    let bv: any = b[sortKey] ?? "";
    if (sortKey === "currentWeight" || sortKey === "initialWeight") { av = Number(av); bv = Number(bv); }
    else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const getCatBadge = (cat: string) => {
    switch (cat) {
      case "reclaim": return { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" };
      case "new": return { bg: "rgba(0,229,255,0.08)", color: "#00e5ff", label: "New" };
      default: return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "N₂" };
    }
  };

  const thStyle = (col: SortKey): React.CSSProperties => ({
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap"
  });

  const getEngineerDisplay = (locationId: string) => {
    const idOrName = locationId.replace(" - Van", "");
    const user = engineers.find(e => e.id === idOrName || e.name === idOrName);
    return user ? user.name : idOrName;
  };

  const exportBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.85rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
    transition: "all 0.15s"
  };

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Truck size={28} /> Van Inventory
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>View bottles assigned to each engineer&apos;s van</p>
      </div>

      {/* Engineer selector + Search */}
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: "0.4rem", textTransform: "uppercase"}}>Filter by Engineer:</label>
            <select
              value={selectedEngineer}
              onChange={e => setSelectedEngineer(e.target.value)}
              style={{
                padding: "0.6rem 1.25rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.95rem",
                fontWeight: 600,
                outline: "none",
                textTransform: "capitalize",
                minWidth: "180px"
              }}
            >
              <option value="all" style={{color: "#000"}}>All Engineers</option>
              {engineers.map(e => (
                <option key={e.id} value={e.id} style={{color: "#000"}}>
                  {e.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{marginTop: "1.6rem"}}>
            <span style={{fontSize: "0.85rem", color: "var(--text-muted)"}}>
              {filtered.length} bottle{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div style={{display: "flex", gap: "1rem", alignItems: "center"}}>
          <div style={{position: "relative"}}>
            <Search size={18} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)"}} />
            <input 
              type="text"
              placeholder="Search serial, gas or van..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: "0.6rem 1rem 0.6rem 2.5rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px",
                color: "#fff",
                fontSize: "0.9rem",
                width: "250px",
                outline: "none"
              }}
            />
          </div>

          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 600}}>
              <FilterIcon size={16} /> Since:
            </div>
            <div style={{position: "relative"}}>
              <Calendar size={14} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#00e5ff", pointerEvents: "none"}} />
              <input 
                type="date" 
                value={sinceDate} 
                onChange={e => setSinceDate(e.target.value)}
                style={{
                  padding: "0.5rem 0.75rem 0.5rem 2.25rem",
                  background: "rgba(0,229,255,0.05)",
                  border: "1px solid rgba(0,229,255,0.2)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                  colorScheme: "dark"
                }}
              />
            </div>
          </div>

          <div style={{display: "flex", gap: "0.5rem"}}>
            <button onClick={() => saveVanPDF(filtered, selectedEngineer)} style={exportBtnStyle}>
              <FileText size={16} /> PDF
            </button>
            <button onClick={() => exportVanCSV(filtered, selectedEngineer)} style={exportBtnStyle}>
              <FileSpreadsheet size={16} /> Excel
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem"}}>
        <div style={{background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.12)", borderRadius: "10px", padding: "1rem", textAlign: "center"}}>
          <div style={{fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem"}}>New Refrigerant</div>
          <div style={{fontSize: "1.5rem", fontWeight: 700, color: "#00e5ff"}}>{bottles.filter(b => b.category === "new").length}</div>
        </div>
        <div style={{background: "rgba(255,170,0,0.04)", border: "1px solid rgba(255,170,0,0.12)", borderRadius: "10px", padding: "1rem", textAlign: "center"}}>
          <div style={{fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem"}}>Reclaim / Haz</div>
          <div style={{fontSize: "1.5rem", fontWeight: 700, color: "#ffaa00"}}>{bottles.filter(b => b.category === "reclaim").length}</div>
        </div>
        <div style={{background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "1rem", textAlign: "center"}}>
          <div style={{fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.3rem"}}>Nitrogen</div>
          <div style={{fontSize: "1.5rem", fontWeight: 700}}>{bottles.filter(b => b.category === "nitrogen").length}</div>
        </div>
      </div>

      {/* Table */}
      {bottles.length === 0 ? (
        <div style={{textAlign: "center", padding: "4rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)"}}>
          <Truck size={48} style={{opacity: 0.2, marginBottom: "0.75rem"}} />
          <p style={{fontSize: "1.1rem", fontWeight: 600}}>Van is empty</p>
          <p style={{fontSize: "0.85rem"}}>No bottles assigned to this engineer&apos;s van</p>
        </div>
      ) : (
        <div style={{borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"}}>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                <th style={thStyle("serial")} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></th>
                <th style={thStyle("category")} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>
                <th style={thStyle("gasType")} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></th>
                <th style={thStyle("initialWeight")} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></th>
                <th style={thStyle("currentWeight")} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></th>
                <th style={{...thStyle("currentWeight"), cursor: "default"}}>Balance</th>
                 <th style={thStyle("locationId")} onClick={() => handleSort("locationId")}>Engineer <SortIcon col="locationId" /></th>
                <th style={thStyle("supplier")} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></th>
                <th style={thStyle("registeredAt")} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></th>
                <th style={thStyle("locationChangedAt")} onClick={() => handleSort("locationChangedAt")}>In Van Since <SortIcon col="locationChangedAt" /></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(b => {
                const badge = getCatBadge(b.category);
                const isReclaim = b.category === "reclaim";
                const isNitrogen = b.category === "nitrogen";
                const balance = b.initialWeight - b.currentWeight;
                const percent = Math.min(100, Math.max(0, (b.currentWeight / b.initialWeight) * 100));

                return (
                  <tr key={b.serial} style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer"}}
                    onClick={() => router.push(`/admin/bottles/${b.serial}`)}
                  >
                    <td style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>
                      <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
                        {b.serial}
                        {isReclaim && b.currentWeight > 0 && <AlertTriangle size={14} color="#ffaa00" />}
                      </div>
                    </td>
                    <td style={{padding: "0.85rem 1rem"}}>
                      <span style={{background: badge.bg, color: badge.color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.gasType}</td>

                    {/* CAPACITY */}
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
                      <div style={{fontWeight: 600}}>{b.initialWeight.toFixed(2)} kg</div>
                      <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>
                        {isReclaim ? "Max Capacity" : isNitrogen ? "Full Weight" : "Full Charge"}
                      </div>
                    </td>

                    {/* CURRENT GAS */}
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
                      {isNitrogen ? (
                        <span style={{color: "var(--text-muted)"}}>N/A</span>
                      ) : (
                        <>
                          <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>
                            {b.currentWeight.toFixed(2)} kg
                          </div>
                          <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>
                            {isReclaim ? "Recovered" : "Remaining"}
                          </div>
                          <div style={{width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px", overflow: "hidden"}}>
                            <div style={{
                              width: `${percent}%`, 
                              height: "100%", 
                              background: isReclaim ? "#ffaa00" : "#22c55e",
                              transition: "width 0.3s"
                            }} />
                          </div>
                        </>
                      )}
                    </td>

                    {/* BALANCE */}
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
                      {isNitrogen ? (
                        <span style={{color: "var(--text-muted)"}}>N/A</span>
                      ) : (
                        <>
                          <div style={{fontWeight: 700, color: isReclaim ? "#22c55e" : "#ffc107"}}>
                            {balance.toFixed(2)} kg
                          </div>
                          <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>
                            {isReclaim ? "Available Space" : "Total Used"}
                          </div>
                        </>
                      )}
                    </td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem", color: "#fff", fontWeight: 600}}>
                      {getEngineerDisplay(b.locationId)}
                    </td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>
                      {b.supplier ? (
                        <span 
                          onClick={(e) => { e.stopPropagation(); router.push(`/admin/suppliers?supplier=${b.supplier}`); }}
                          style={{cursor: "pointer", color: "#00e5ff", fontWeight: 500}}
                          onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
                          onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
                        >
                          {b.supplier}
                        </span>
                      ) : "—"}
                    </td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>
                      {b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>
                      {b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
