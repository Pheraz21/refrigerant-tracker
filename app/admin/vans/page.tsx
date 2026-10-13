"use client";

import { useEffect, useState } from "react";
import { db, Bottle, AppUser } from "@/lib/db";
import { Truck, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Calendar, Filter as FilterIcon, Settings2, Users, UserCheck, XCircle, Shield, Check, Package } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate";

const COLUMN_DEFS = [
  { key: "serial",      label: "Serial",       required: true },
  { key: "category",    label: "Category"                     },
  { key: "gasType",     label: "Gas Type"                     },
  { key: "capacity",    label: "Capacity"                     },
  { key: "gasInBottle", label: "Gas In Bottle"                },
  { key: "balance",     label: "Balance"                      },
  { key: "engineer",    label: "Engineer"                     },
  { key: "supplier",    label: "Supplier"                     },
  { key: "poNumber",    label: "PO Number"                    },
  { key: "registered",  label: "Registered"                   },
  { key: "expiry",      label: "Expiry Date"                    },
  { key: "inVanSince",  label: "In Van Since"                 },
] as const;

function downloadFile(content: string, filename: string, type: string) {
  const bom = "﻿";
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
    `${b.serial},${b.category === "new" ? "New" : b.category === "reclaim" ? "Reclaim" : "N₂"},${b.gasType},${(b.initialWeight || 0).toFixed(2)},${b.category === "nitrogen" ? "N/A" : (b.currentWeight || 0).toFixed(2)},${b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : ""}`
  );
  const fileName = engineer === "all" ? "fleet_inventory.csv" : `${engineer}_van.csv`;
  downloadFile([header, ...rows].join("\n"), fileName, "text/csv");
}

function exportVanPDF(bottles: Bottle[], engineer: string, engineerProfiles: AppUser[]) {
  const reportDate = new Date().toLocaleDateString("en-GB");

  const resolveEngineer = (b: Bottle) => {
    const idOrName = b.locationId.replace(" - Van", "");
    const user = engineerProfiles.find(e => e.id === idOrName || e.name === idOrName);
    return { name: user ? user.name : idOrName, reg: b.vehicleReg || user?.vehicleReg || "—" };
  };

  // Type summary counts
  const newCount      = bottles.filter(b => b.category === "new").length;
  const recycledCount = bottles.filter(b => b.category === "recycled").length;
  const reclaimCount  = bottles.filter(b => b.category === "reclaim").length;
  const n2Count       = bottles.filter(b => b.category === "nitrogen").length;

  // Per-engineer breakdown
  const engMap = new Map<string, { name: string; reg: string; new: number; recycled: number; reclaim: number; nitrogen: number }>();
  bottles.forEach(b => {
    const { name, reg } = resolveEngineer(b);
    if (!engMap.has(name)) engMap.set(name, { name, reg, new: 0, recycled: 0, reclaim: 0, nitrogen: 0 });
    const entry = engMap.get(name)!;
    if (b.category === "new")           entry.new++;
    else if (b.category === "recycled") entry.recycled++;
    else if (b.category === "reclaim")  entry.reclaim++;
    else                                entry.nitrogen++;
  });
  const engRows = Array.from(engMap.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => `<tr>
      <td>${e.name}</td>
      <td style="font-family:monospace">${e.reg}</td>
      <td style="text-align:center;font-weight:bold">${e.new}</td>
      <td style="text-align:center;font-weight:bold">${e.recycled}</td>
      <td style="text-align:center;font-weight:bold">${e.reclaim}</td>
      <td style="text-align:center;font-weight:bold">${e.nitrogen}</td>
      <td style="text-align:center;font-weight:bold">${e.new + e.recycled + e.reclaim + e.nitrogen}</td>
    </tr>`).join("");

  const rows = bottles.map(b => {
    const catLabel = b.category === "new" ? "New" : b.category === "recycled" ? "Recycled" : b.category === "reclaim" ? "Reclaim / Haz" : "Nitrogen";
    const { name: engineerName, reg } = resolveEngineer(b);
    return `<tr>
      <td style="font-weight:bold">${b.serial}</td>
      <td>${catLabel}</td><td>${b.gasType}</td>
      <td>${(b.initialWeight||0).toFixed(2)} kg</td>
      <td style="font-weight:bold">${b.category==="nitrogen"?"N/A":(b.currentWeight||0).toFixed(2)+" kg"}</td>
      <td>${b.locationChangedAt?new Date(b.locationChangedAt).toLocaleDateString("en-GB"):"—"}</td>
      <td>${engineerName}</td>
      <td style="font-family:monospace">${reg}</td>
    </tr>`;
  }).join("");

  const html = `
    <html><head><style>
      @page{margin:0;size:A4 landscape;}
      body{font-family:sans-serif;margin:0;padding:10mm;color:#333}
      .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:20px}
      .logo-section{display:flex;gap:15px;align-items:flex-end}
      .company-info{font-size:10px;line-height:1.4;color:#555}
      .report-info{text-align:right}
      .report-title{font-size:20px;font-weight:bold;margin-bottom:5px;text-transform:uppercase}
      .report-meta{font-size:11px;color:#666}
      .summary-boxes{display:flex;gap:12px;margin-bottom:20px}
      .summary-box{flex:1;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;background:#f9fafb}
      .summary-box .label{font-size:8px;text-transform:uppercase;color:#718096;font-weight:700;letter-spacing:0.08em;margin-bottom:4px}
      .summary-box .value{font-size:20px;font-weight:bold;color:#1a202c}
      .section-title{font-size:12px;font-weight:700;text-transform:uppercase;color:#2d3748;border-left:4px solid #a3e635;padding-left:8px;margin:20px 0 6px}
      table{width:100%;border-collapse:collapse;margin-top:6px}
      th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;font-size:10px}
      th{background:#f8f9fa;font-weight:bold;text-transform:uppercase;color:#555}
      .footer{margin-top:20px;font-size:9px;color:#999;text-align:center;border-top:1px solid #eee;padding-top:10px}
    </style></head><body>
      <div class="header">
        <div class="logo-section">
          <img src="/21-degrees-logo-reports.png" style="width:100px;height:auto"/>
          <div class="company-info"><strong>21 Degrees Ltd</strong><br/>Unit 10, Apollo Court, Monkton Business Park<br/>Hebburn, Tyne & Wear, NE31 2ES<br/>Tel: 0191 495 7224</div>
        </div>
        <div class="report-info">
          <div class="report-title">Van Inventory Report</div>
          <div class="report-meta">
            <div>Engineer: ${engineer==="all"?"All Engineers / Fleet":engineer}</div>
            <div>Generated: ${reportDate}</div>
          </div>
        </div>
      </div>
      <div class="summary-boxes">
        <div class="summary-box"><div class="label">Total Cylinders</div><div class="value">${bottles.length}</div></div>
        <div class="summary-box"><div class="label">New Gas</div><div class="value">${newCount}</div></div>
        <div class="summary-box"><div class="label">Recycled</div><div class="value">${recycledCount}</div></div>
        <div class="summary-box"><div class="label">Reclaim / Haz</div><div class="value">${reclaimCount}</div></div>
        <div class="summary-box"><div class="label">Nitrogen</div><div class="value">${n2Count}</div></div>
      </div>
      <div class="section-title">Engineer Summary</div>
      <table><thead><tr><th>Engineer</th><th>Vehicle Reg</th><th style="text-align:center">New Gas</th><th style="text-align:center">Recycled</th><th style="text-align:center">Reclaim / Haz</th><th style="text-align:center">Nitrogen</th><th style="text-align:center">Total</th></tr></thead>
      <tbody>${engRows}</tbody></table>
      <div class="section-title">Cylinder Detail</div>
      <table><thead><tr><th>Serial</th><th>Category</th><th>Gas Type</th><th>Capacity</th><th>Current</th><th>Since</th><th>Engineer</th><th>Vehicle Reg</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; 2026 21 Degrees Ltd</div>
    </body></html>
  `;
  const w = window.open("", "_blank");
  if (w) { w.document.write(html); w.document.close(); }
}

export default function VanInventoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [engineers, setEngineers] = useState<AppUser[]>([]);
  const [activePairings, setActivePairings] = useState<any[]>([]);
  const [selectedEngineer, setSelectedEngineer] = useState<string>("");
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [sinceDate, setSinceDate] = useState("");
  const [customizerOpen, setCustOpen] = useState(false);

  const { visibleCols, hidden, order, toggleCol, moveCol, reset } =
    useTablePrefs("vans", COLUMN_DEFS.map(c => c.key));

  useEffect(() => {
    const engId = searchParams.get("engineer");
    if (engId) setSelectedEngineer(engId);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      db.getAllUsers(),
      db.getAllActivePairings()
    ]).then(([users, pairings]) => {
      const fieldUsers = users.filter(u => 
        u.status === "approved" && (
          u.role === "engineer" || 
          u.role === "mate" || 
          u.role === "apprentice" || 
          (u.vehicleReg && u.vehicleReg.trim().length > 0)
        )
      );
      setEngineers(fieldUsers);
      setActivePairings(pairings.filter(p => p.pairingStatus === "approved"));
      setSelectedEngineer("all");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (selectedEngineer) {
      db.getBottlesByVan(selectedEngineer).then(setBottles);
    }
  }, [selectedEngineer]);

  const handleUnpair = async (pairingId: string, mateName: string, leadName: string) => {
    if (!confirm(`Are you sure you want to unpair ${mateName} from ${leadName}?`)) return;
    try {
      await db.respondToPairingRequest(pairingId, "revoked");
      const updated = await db.getAllActivePairings();
      setActivePairings(updated.filter(p => p.pairingStatus === "approved"));
    } catch (err) {
      console.error("Failed to unpair crew:", err);
      alert("Failed to unpair crew. Please try again.");
    }
  };

  const getCrewBottleCount = (reg: string, leadName: string) => {
    const cleanReg = (reg || "").trim().toUpperCase();
    const cleanLead = (leadName || "").trim().toLowerCase();
    return bottles.filter(b => {
      const bReg = (b.vehicleReg || "").trim().toUpperCase();
      const bLoc = (b.locationId || "").trim().toLowerCase();
      return (cleanReg && bReg === cleanReg) || (cleanLead && bLoc.includes(cleanLead));
    }).length;
  };

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
      case "reclaim":  return { bg: "rgba(255,170,0,0.12)", color: "#ffaa00", label: "Reclaim / Haz" };
      case "new":      return { bg: "rgba(0,229,255,0.08)", color: "#00e5ff",  label: "New"           };
      case "recycled": return { bg: "rgba(16,185,129,0.12)", color: "#10b981", label: "Recycled" };
      default:         return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", label: "N₂" };
    }
  };

  const getEngineerDisplay = (locationId: string) => {
    const idOrName = locationId.replace(" - Van", "");
    const user = engineers.find(e => e.id === idOrName || e.name === idOrName);
    return user ? user.name : idOrName;
  };

  const thBase: React.CSSProperties = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none", whiteSpace: "nowrap"
  };

  const exportBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.85rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
    transition: "all 0.15s"
  };

  function renderHeader(key: string) {
    const s: React.CSSProperties = { ...thBase, cursor: "pointer" };
    const ns: React.CSSProperties = { ...thBase, cursor: "default" };
    switch (key) {
      case "serial":      return <th key={key} style={s} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></th>;
      case "category":    return <th key={key} style={s} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></th>;
      case "gasType":     return <th key={key} style={s} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></th>;
      case "capacity":    return <th key={key} style={s} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></th>;
      case "gasInBottle": return <th key={key} style={s} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></th>;
      case "balance":     return <th key={key} style={ns}>Balance</th>;
      case "engineer":    return <th key={key} style={s} onClick={() => handleSort("locationId")}>Engineer <SortIcon col="locationId" /></th>;
      case "supplier":    return <th key={key} style={s} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></th>;
      case "poNumber":    return <th key={key} style={ns}>PO Number</th>;
      case "registered":  return <th key={key} style={s} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></th>;
      case "expiry":      return <th key={key} style={s} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></th>;
      case "inVanSince":  return <th key={key} style={s} onClick={() => handleSort("locationChangedAt")}>In Van Since <SortIcon col="locationChangedAt" /></th>;
      default:            return null;
    }
  }

  function renderCell(key: string, b: Bottle) {
    const badge = getCatBadge(b.category);
    const isReclaim = b.category === "reclaim";
    const isNitrogen = b.category === "nitrogen";
    const balance = b.initialWeight - b.currentWeight;
    const percent = Math.min(100, Math.max(0, (b.currentWeight / b.initialWeight) * 100));

    switch (key) {
      case "serial":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
              {b.serial}
              {isReclaim && b.currentWeight > 0 && <AlertTriangle size={14} color="#ffaa00" />}
            </div>
          </td>
        );
      case "category":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{background: badge.bg, color: badge.color, padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>
              {badge.label}
            </span>
          </td>
        );
      case "gasType":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{b.gasType}</td>;
      case "capacity":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            <div style={{fontWeight: 600}}>{b.initialWeight.toFixed(2)} kg</div>
            <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>
              {isReclaim ? "Max Capacity" : isNitrogen ? "Full Weight" : "Full Charge"}
            </div>
          </td>
        );
      case "gasInBottle":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            {isNitrogen ? (
              <span style={{color: "var(--text-muted)"}}>N/A</span>
            ) : (
              <>
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{b.currentWeight.toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>{isReclaim ? "Recovered" : "Remaining"}</div>
                <div style={{width: "60px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", marginTop: "4px", overflow: "hidden"}}>
                  <div style={{width: `${percent}%`, height: "100%", background: isReclaim ? "#ffaa00" : "#22c55e", transition: "width 0.3s"}} />
                </div>
              </>
            )}
          </td>
        );
      case "balance":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>
            {isNitrogen ? (
              <span style={{color: "var(--text-muted)"}}>N/A</span>
            ) : (
              <>
                <div style={{fontWeight: 700, color: isReclaim ? "#22c55e" : "#ffc107"}}>{balance.toFixed(2)} kg</div>
                <div style={{fontSize: "0.72rem", color: "var(--text-muted)"}}>{isReclaim ? "Available Space" : "Total Used"}</div>
              </>
            )}
          </td>
        );
      case "engineer":
        return (
          <td key={key}
            style={{padding: "0.85rem 1rem", fontSize: "0.9rem", color: "#00e5ff", fontWeight: 600, cursor: "pointer"}}
            onClick={(e) => { e.stopPropagation(); router.push(`/admin/vans?engineer=${b.locationId}`); }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
          >
            {getEngineerDisplay(b.locationId)}
          </td>
        );
      case "supplier":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>
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
        );
      case "poNumber":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.poNumber ? "rgba(255,255,255,0.75)" : "var(--text-muted)"}}>{b.poNumber || "—"}</td>;
      case "registered":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—"}</td>;
      case "expiry":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? "#ff3366" : "var(--text-muted)", fontWeight: b.rentalExpiryDate && new Date(b.rentalExpiryDate) < new Date() ? 600 : "normal"}}>{b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—"}</td>;
      case "inVanSince":
        return <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--text-muted)"}}>{b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—"}</td>;
      default: return null;
    }
  }

  if (loading) return <div style={{padding: "2rem", color: "var(--text-muted)"}}>Loading...</div>;

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <Truck size={28} /> Van Inventory
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>View bottles assigned to each engineer&apos;s van</p>
      </div>

      {/* ── Active Field Crews & Vehicle Pairings (Office Dispatch) ── */}
      <div
        className="glass-panel"
        style={{
          background: "linear-gradient(145deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.6) 100%)",
          border: "1.5px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "14px",
          padding: "1.25rem 1.5rem",
          marginBottom: "2rem",
          boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        }}
      >
        {/* Widget Header & Metrics */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid rgba(34, 197, 94, 0.4)",
                  borderRadius: "8px",
                  padding: "0.45rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Users size={20} color="#22c55e" />
              </div>
              <div>
                <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  Active Field Crews &amp; Vehicle Deployments
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      background: "rgba(34, 197, 94, 0.15)",
                      border: "1px solid rgba(34, 197, 94, 0.35)",
                      color: "#4ade80",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "0.15rem 0.5rem",
                      borderRadius: "20px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 8px #22c55e" }} />
                    Live Mobile Pairings
                  </span>
                </h2>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.6)" }}>
                  Real-time dispatch view: Mates and apprentices currently paired with lead engineers in company vehicles
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "0.45rem 0.85rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: 700 }}>Active Crews</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#22c55e" }}>{activePairings.length}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "0.45rem 0.85rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: 700 }}>Paired Personnel</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#00e5ff" }}>{activePairings.length * 2}</div>
            </div>
            <div style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "8px", padding: "0.45rem 0.85rem", textAlign: "center" }}>
              <div style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.5)", textTransform: "uppercase", fontWeight: 700 }}>Solo Engineers</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#94a3b8" }}>
                {Math.max(0, engineers.filter(e => e.role === "engineer").length - new Set(activePairings.map(p => p.leadEngineerName.toLowerCase())).size)}
              </div>
            </div>
          </div>
        </div>

        {/* Crew Cards Grid */}
        {activePairings.length === 0 ? (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px dashed rgba(255, 255, 255, 0.12)",
              borderRadius: "10px",
              padding: "2rem 1.5rem",
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.6)",
            }}
          >
            <Users size={32} style={{ color: "rgba(255, 255, 255, 0.3)", marginBottom: "0.5rem" }} />
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#fff" }}>No Two-Person Crew Pairings Currently Active</div>
            <div style={{ fontSize: "0.82rem", maxWidth: "540px", margin: "0.35rem auto 0", lineHeight: 1.5 }}>
              All field personnel are currently operating solo. When an apprentice or mate boards a van and pairs with a lead engineer on their mobile hub, their live van team will appear here automatically.
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "1rem" }}>
            {activePairings.map(p => {
              const leadUser = engineers.find(e => e.name.toLowerCase() === p.leadEngineerName.toLowerCase());
              const vanBottles = getCrewBottleCount(p.vehicleReg, p.leadEngineerName);
              const isApprentice = p.mateRole === "apprentice";

              return (
                <div
                  key={p.id}
                  style={{
                    background: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(34, 197, 94, 0.25)",
                    borderRadius: "12px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "0.85rem",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Top: License Plate & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        background: "#facc15",
                        color: "#000",
                        fontFamily: "var(--font-geist-mono), monospace",
                        fontWeight: 900,
                        fontSize: "0.85rem",
                        letterSpacing: "0.08em",
                        padding: "0.25rem 0.65rem",
                        borderRadius: "5px",
                        border: "1px solid #ca8a04",
                        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.3)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                      }}
                    >
                      <Truck size={14} color="#000" />
                      <span>{p.vehicleReg || "UNASSIGNED"}</span>
                    </div>

                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "#4ade80",
                        fontWeight: 700,
                        background: "rgba(34, 197, 94, 0.12)",
                        border: "1px solid rgba(34, 197, 94, 0.25)",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "20px",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                      }}
                    >
                      <Check size={12} /> Paired Crew
                    </span>
                  </div>

                  {/* Crew Members */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {/* Lead Engineer */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          background: "rgba(0, 229, 255, 0.15)",
                          border: "1px solid rgba(0, 229, 255, 0.3)",
                          borderRadius: "6px",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Shield size={15} color="#00e5ff" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.68rem", color: "#00e5ff", fontWeight: 700, textTransform: "uppercase" }}>
                          Lead Engineer
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.leadEngineerName}
                        </div>
                      </div>
                    </div>

                    {/* Plus connection indicator */}
                    <div style={{ paddingLeft: "10px", color: "#22c55e", fontSize: "0.75rem", fontWeight: 800 }}>
                      &darr; paired with
                    </div>

                    {/* Mate / Apprentice */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div
                        style={{
                          background: isApprentice ? "rgba(56, 189, 248, 0.15)" : "rgba(245, 158, 11, 0.15)",
                          border: `1px solid ${isApprentice ? "rgba(56, 189, 248, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
                          borderRadius: "6px",
                          width: "28px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <UserCheck size={15} color={isApprentice ? "#38bdf8" : "#f59e0b"} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              background: isApprentice ? "rgba(56, 189, 248, 0.2)" : "rgba(245, 158, 11, 0.2)",
                              color: isApprentice ? "#38bdf8" : "#f59e0b",
                              padding: "0.1rem 0.4rem",
                              borderRadius: "4px",
                            }}
                          >
                            {p.mateRole}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "rgba(255, 255, 255, 0.4)" }}>
                            Since {p.requestedAt ? new Date(p.requestedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "today"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.mateName}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div
                    style={{
                      borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                      paddingTop: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div style={{ fontSize: "0.78rem", color: "rgba(255, 255, 255, 0.65)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                      <Package size={14} color="#22c55e" />
                      <span><strong>{vanBottles}</strong> bottle{vanBottles !== 1 ? "s" : ""} on van</span>
                    </div>

                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        onClick={() => {
                          if (leadUser) setSelectedEngineer(leadUser.id);
                          else setSelectedEngineer(p.leadEngineerName);
                        }}
                        style={{
                          background: "rgba(0, 229, 255, 0.1)",
                          border: "1px solid rgba(0, 229, 255, 0.25)",
                          color: "#00e5ff",
                          padding: "0.3rem 0.65rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        View Van
                      </button>

                      <button
                        onClick={() => handleUnpair(p.id, p.mateName, p.leadEngineerName)}
                        style={{
                          background: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.25)",
                          color: "#ef4444",
                          padding: "0.3rem 0.55rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Unpair Crew"
                      >
                        Unpair
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem"}}>
        <div style={{display: "flex", alignItems: "center", gap: "0.75rem"}}>
          <div>
            <label style={{display: "block", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, marginBottom: "0.4rem", textTransform: "uppercase"}}>Filter by Engineer:</label>
            <select
              value={selectedEngineer}
              onChange={e => setSelectedEngineer(e.target.value)}
              style={{padding: "0.6rem 1.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", color: "#fff", fontSize: "0.95rem", fontWeight: 600, outline: "none", textTransform: "capitalize", minWidth: "180px"}}
            >
              <option value="all" style={{color: "#fff", background: "#222"}}>All Engineers</option>
              {engineers.map(e => {
                const paired = activePairings.filter(p => p.leadEngineerName.toLowerCase() === e.name.toLowerCase());
                return (
                  <option key={e.id} value={e.id} style={{color: "#fff", background: "#222"}}>
                    {e.name} {paired.length > 0 ? `(Paired: ${paired.map(p => p.mateName).join(", ")})` : ""}
                  </option>
                );
              })}
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
              type="text" placeholder="Search serial, gas or van..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              style={{padding: "0.6rem 1rem 0.6rem 2.5rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.9rem", width: "250px", outline: "none"}}
            />
          </div>

          <div style={{display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <div style={{display: "flex", alignItems: "center", gap: "0.4rem", color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", fontWeight: 600}}>
              <FilterIcon size={16} /> Since:
            </div>
            <div style={{position: "relative"}}>
              <Calendar size={14} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#00e5ff", pointerEvents: "none"}} />
              <input type="date" value={sinceDate} onChange={e => setSinceDate(e.target.value)}
                style={{padding: "0.5rem 0.75rem 0.5rem 2.25rem", background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", colorScheme: "dark"}}
              />
            </div>
          </div>

          <div style={{display: "flex", gap: "0.5rem"}}>
            <button onClick={() => exportVanPDF(filtered, selectedEngineer, engineers)} style={exportBtnStyle}><FileText size={16} /> PDF</button>
            <button onClick={() => exportVanCSV(filtered, selectedEngineer)} style={exportBtnStyle}><FileSpreadsheet size={16} /> Excel</button>
            <button onClick={() => setCustOpen(true)} style={exportBtnStyle}><Settings2 size={16} /> Columns</button>
          </div>
        </div>
      </div>

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

      {bottles.length === 0 ? (
        <div style={{textAlign: "center", padding: "4rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.02)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)"}}>
          <Truck size={48} style={{opacity: 0.2, marginBottom: "0.75rem"}} />
          <p style={{fontSize: "1.1rem", fontWeight: 600}}>Van is empty</p>
          <p style={{fontSize: "0.85rem"}}>No bottles assigned to this engineer&apos;s van</p>
        </div>
      ) : (
        <DoubleScrollContainer>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                {visibleCols.map(key => renderHeader(key))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(b => (
                <tr key={b.serial}
                  style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer"}}
                  onClick={() => router.push(`/admin/bottles/${b.serial}`)}
                >
                  {visibleCols.map(key => renderCell(key, b))}
                </tr>
              ))}
            </tbody>
          </table>
        </DoubleScrollContainer>
      )}

      <ColumnCustomizer
        open={customizerOpen}
        onClose={() => setCustOpen(false)}
        columns={COLUMN_DEFS}
        hidden={hidden}
        order={order}
        onToggle={toggleCol}
        onMove={moveCol}
        onReset={reset}
      />
    </div>
  );
}
