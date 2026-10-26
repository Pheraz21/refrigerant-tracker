"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { db, Bottle, AppUser, isBottleTrace, hasReclaimWaste } from "@/lib/db";
import Link from "next/link";
import { Truck, AlertTriangle, Search, ArrowUpDown, ArrowUp, ArrowDown, FileText, FileSpreadsheet, Calendar, Filter as FilterIcon, Settings2, Users, UserCheck, XCircle, Shield, Check, Package, ArrowRight, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTablePrefs } from "@/lib/useTablePrefs";
import { ColumnCustomizer } from "@/app/components/ColumnCustomizer";
import { DoubleScrollContainer } from "@/app/components/DoubleScrollContainer";

type SortKey = "serial" | "category" | "gasType" | "currentWeight" | "initialWeight" | "locationId" | "locationChangedAt" | "supplier" | "registeredAt" | "rentalExpiryDate" | "status" | "intendedDestination" | "activeHWCN";

const COLUMN_DEFS = [
  { key: "serial",              label: "Serial",               required: true },
  { key: "category",            label: "Category"                             },
  { key: "gasType",             label: "Gas Type"                             },
  { key: "capacity",            label: "Capacity"                             },
  { key: "gasInBottle",         label: "Gas In Bottle"                        },
  { key: "balance",             label: "Balance"                              },
  { key: "status",              label: "Status"                               },
  { key: "engineer",            label: "Engineer"                             },
  { key: "intendedDestination", label: "Intended Destination"                 },
  { key: "activeHWCN",          label: "Active HWCN #"                        },
  { key: "supplier",            label: "Supplier"                             },
  { key: "poNumber",            label: "PO Number"                            },
  { key: "registered",          label: "Registered"                           },
  { key: "expiry",              label: "Expiry Date"                          },
  { key: "inVanSince",          label: "In Van Since"                         },
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
  const header = "Serial,Category,Gas Type,Full Weight (kg),Current Weight (kg),Status,Intended Destination,Active HWCN #,Since";
  const rows = bottles.map(b =>
    `${b.serial},${b.category === "new" ? "New" : b.category === "reclaim" ? "Reclaim" : "N₂"},${b.gasType},${(b.initialWeight || 0).toFixed(2)},${b.category === "nitrogen" ? "N/A" : (b.currentWeight || 0).toFixed(2)},${isBottleTrace(b) ? "Trace" : (b.status || "")},"${b.intendedDestination || ""}","${b.activeHWCN || ""}",${b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : ""}`
  );
  const fileName = engineer === "all" ? "fleet_inventory.csv" : `${engineer}_van.csv`;
  downloadFile([header, ...rows].join("\n"), fileName, "text/csv");
}

function exportVanPDF(bottles: Bottle[], engineer: string, engineerProfiles: AppUser[], visibleCols: string[] = ["serial", "category", "gasType", "capacity", "gasInBottle", "balance", "status", "engineer", "intendedDestination", "activeHWCN", "supplier", "inVanSince"]) {
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

  const getCellText = (key: string, b: Bottle) => {
    const isNitrogen = b.category === "nitrogen";
    const iw = b.initialWeight ?? 0;
    const cw = b.currentWeight ?? 0;
    const bal = iw - cw;
    const { name: engineerName, reg } = resolveEngineer(b);

    switch (key) {
      case "serial": return `<strong>${b.serial}</strong>`;
      case "category": return b.category === "reclaim" ? "Reclaim / Haz" : b.category === "new" ? "New" : b.category === "recycled" ? "Recycled" : "Nitrogen";
      case "gasType": return b.gasType;
      case "capacity": return `${iw.toFixed(2)} kg`;
      case "gasInBottle": return isNitrogen ? "N/A" : `${cw.toFixed(2)} kg`;
      case "balance": return isNitrogen ? "N/A" : `${bal.toFixed(2)} kg`;
      case "status": return isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unused" : b.status ? (b.status.charAt(0).toUpperCase() + b.status.slice(1)) : "—";
      case "engineer": return `${engineerName}${reg !== "—" ? ` (${reg})` : ""}`;
      case "intendedDestination": return b.intendedDestination || "—";
      case "activeHWCN": return b.activeHWCN || "—";
      case "supplier": return b.supplier || "—";
      case "poNumber": return b.poNumber || "—";
      case "registered": return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB") : "—";
      case "expiry": return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB") : "—";
      case "inVanSince": return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB") : "—";
      default: return "—";
    }
  };

  const colsToPrint = visibleCols.map(k => ({
    key: k,
    label: COLUMN_DEFS.find(c => c.key === k)?.label || k,
  }));

  const theadHtml = colsToPrint.map(c => `<th>${c.label}</th>`).join("");
  const rows = bottles.map(b => `
    <tr>
      ${colsToPrint.map(c => `<td>${getCellText(c.key, b)}</td>`).join("")}
    </tr>
  `).join("");

  const html = `
    <!DOCTYPE html>
    <html><head><title>Van Inventory Report</title><style>
      @page { size: A4 landscape; margin: 8mm 8mm 10mm 8mm; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; margin: 0; padding: 0; color: #1e293b; font-size: 8pt; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
      .logo-section { display: flex; gap: 12px; align-items: center; }
      .company-info { font-size: 8pt; line-height: 1.3; color: #475569; }
      .report-info { text-align: right; }
      .report-title { font-size: 15pt; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 2px; }
      .report-meta { font-size: 8pt; color: #64748b; }
      .summary-boxes { display: flex; gap: 10px; margin-bottom: 14px; }
      .summary-box { flex: 1; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f8fafc; }
      .summary-box .label { font-size: 6.5pt; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.05em; margin-bottom: 2px; }
      .summary-box .value { font-size: 14pt; font-weight: 800; color: #0f172a; }
      .section-title { font-size: 9pt; font-weight: 700; text-transform: uppercase; color: #0f172a; border-left: 3px solid #0284c7; padding-left: 6px; margin: 12px 0 6px; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; table-layout: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }
      th, td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; font-size: 7.5pt; word-break: break-word; }
      th { background: #f1f5f9; font-weight: 700; text-transform: uppercase; color: #1e293b; font-size: 7pt; letter-spacing: 0.03em; }
      tr:nth-child(even) { background: #f8fafc; }
      .footer { margin-top: 15px; font-size: 7.5pt; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
    </style></head><body>
      <div class="header">
        <div class="logo-section">
          <img src="/21-degrees-logo-reports.png" style="width:90px;height:auto"/>
          <div class="company-info"><strong>21 Degrees Ltd</strong><br/>Unit 10, Apollo Court, Monkton Business Park<br/>Hebburn, Tyne &amp; Wear, NE31 2ES<br/>Tel: 0191 495 7224</div>
        </div>
        <div class="report-info">
          <div class="report-title">Van Inventory Report</div>
          <div class="report-meta">
            <div>Engineer: ${engineer === "all" ? "All Engineers / Fleet" : engineer}</div>
            <div>Generated: ${reportDate} &nbsp;·&nbsp; Total: ${bottles.length} Bottles</div>
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
      <div class="section-title">Cylinder Detail (${bottles.length} Bottles)</div>
      <table><thead><tr>${theadHtml}</tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="footer">21 Degrees F-Gas Tracker Pro | Official Audit Document | &copy; ${new Date().getFullYear()} 21 Degrees Ltd</div>
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

  // Column header filter state
  const [colFilters, setColFilters] = useState<Record<string, string>>({});
  const [colMultiFilters, setColMultiFilters] = useState<Record<string, string[]>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return;
    const close = (e: MouseEvent) => {
      const el = dropdownRefs.current[openDropdown];
      if (el && el.contains(e.target as Node)) return;
      setOpenDropdown(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [openDropdown]);

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

  const getEngineerDisplay = (locationId: string) => {
    const idOrName = locationId.replace(" - Van", "");
    const user = engineers.find(e => e.id === idOrName || e.name === idOrName);
    return user ? user.name : idOrName;
  };

  const distinctVals = useMemo(() => {
    const sets: Record<string, Set<string>> = {
      category: new Set(),
      gasType: new Set(),
      engineer: new Set(),
      supplier: new Set(),
      status: new Set()
    };
    for (const b of bottles) {
      if (b.category) sets.category.add(b.category);
      if (b.gasType) sets.gasType.add(b.gasType);
      const eng = getEngineerDisplay(b.locationId);
      if (eng) sets.engineer.add(eng);
      if (b.supplier) sets.supplier.add(b.supplier);
      const st = isBottleTrace(b) ? "trace" : (b.status || "");
      if (st) sets.status.add(st);
    }
    const result: Record<string, string[]> = {};
    for (const k of Object.keys(sets)) result[k] = Array.from(sets[k]).sort();
    return result;
  }, [bottles, engineers]);

  const activeColFilters =
    Object.values(colFilters).filter(Boolean).length +
    Object.values(colMultiFilters).filter(v => v.length > 0).length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: "0.3rem", flexShrink: 0}} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />
      : <ArrowDown size={12} style={{opacity: 0.8, marginLeft: "0.3rem", flexShrink: 0}} />;
  };

  function matchTextFilter(key: string, b: Bottle, val: string): boolean {
    if (!val) return true;
    const v = val.toLowerCase().trim();
    switch (key) {
      case "serial":      return b.serial.toLowerCase().includes(v);
      case "capacity":    return (b.initialWeight ?? 0).toFixed(2).includes(v);
      case "gasInBottle": return (b.currentWeight ?? 0).toFixed(2).includes(v);
      case "balance":     return ((b.initialWeight ?? 0) - (b.currentWeight ?? 0)).toFixed(2).includes(v);
      case "poNumber":    return (b.poNumber || "").toLowerCase().includes(v);
      case "intendedDestination": return (b.intendedDestination || "").toLowerCase().includes(v);
      case "activeHWCN":  return (b.activeHWCN || "").toLowerCase().includes(v);
      case "registered":  return b.registeredAt ? new Date(b.registeredAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "expiry":      return b.rentalExpiryDate ? new Date(b.rentalExpiryDate).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      case "inVanSince":  return b.locationChangedAt ? new Date(b.locationChangedAt).toLocaleDateString("en-GB").toLowerCase().includes(v) : false;
      default:            return true;
    }
  }

  function matchMultiFilter(key: string, b: Bottle, vals: string[]): boolean {
    if (!vals || vals.length === 0) return true;
    switch (key) {
      case "category": return vals.includes(b.category);
      case "gasType":  return vals.includes(b.gasType);
      case "engineer": return vals.includes(getEngineerDisplay(b.locationId));
      case "supplier": return vals.includes(b.supplier || "");
      case "status":   return vals.includes(isBottleTrace(b) ? "trace" : (b.status || ""));
      default:         return true;
    }
  }

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
    })
    .filter(b => Object.entries(colFilters).every(([k, v]) => matchTextFilter(k, b, v)))
    .filter(b => Object.entries(colMultiFilters).every(([k, v]) => matchMultiFilter(k, b, v)));

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

  const thBase: React.CSSProperties = {
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)",
    fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)", userSelect: "none", whiteSpace: "nowrap",
    verticalAlign: "top"
  };

  const filterInputStyle: React.CSSProperties = {
    width: "100%", padding: "0.22rem 0.45rem", marginTop: "0.4rem",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "4px", color: "#fff", fontSize: "0.7rem", outline: "none",
    boxSizing: "border-box", fontWeight: 400, textTransform: "none", letterSpacing: "normal"
  };

  const optionLabel = (k: string, o: string) => {
    if (k === "category") {
      return o === "reclaim" ? "Reclaim / Haz" : o === "new" ? "New" : o === "recycled" ? "Recycled" : "N₂ (Nitrogen)";
    }
    if (k === "status") {
      return o === "trace" ? "Trace" : o === "unused" ? "Unused" : o === "active" ? "Active" : o === "returned" ? "Returned" : o === "archived" ? "Archived" : o === "full" ? "Full" : o === "empty" ? "Empty" : o === "recycled" ? "Recycled" : (o || "(none)");
    }
    return o || "(none)";
  };

  const setCol = (k: string, v: string) => setColFilters(f => ({ ...f, [k]: v }));

  function textFilter(k: string, ph = "Filter…") {
    return (
      <input
        type="text"
        value={colFilters[k] || ""}
        onChange={e => setCol(k, e.target.value)}
        onClick={e => e.stopPropagation()}
        placeholder={ph}
        style={{
          ...filterInputStyle,
          borderColor: colFilters[k] ? "rgba(0,229,255,0.45)" : "rgba(255,255,255,0.1)"
        }}
      />
    );
  }

  function multiSelect(k: string, opts: string[]) {
    const selected = colMultiFilters[k] || [];
    const isOpen = openDropdown === k;
    const hasFilter = selected.length > 0;

    const toggleVal = (o: string) => {
      setColMultiFilters(f => {
        const cur = f[k] || [];
        const next = cur.includes(o) ? cur.filter(v => v !== o) : [...cur, o];
        return { ...f, [k]: next };
      });
    };

    const toggleAll = () => {
      setColMultiFilters(f => ({
        ...f,
        [k]: selected.length === opts.length ? [] : [...opts]
      }));
    };

    return (
      <div
        ref={el => { dropdownRefs.current[k] = el; }}
        style={{ position: "relative", marginTop: "0.4rem" }}
      >
        <div
          onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : k); }}
          style={{
            padding: "0.22rem 0.6rem 0.22rem 0.45rem",
            background: hasFilter ? "rgba(0,229,255,0.1)" : "rgba(255,255,255,0.07)",
            border: `1px solid ${hasFilter ? "rgba(0,229,255,0.45)" : "rgba(255,255,255,0.1)"}`,
            borderRadius: "4px",
            color: hasFilter ? "#00e5ff" : "rgba(255,255,255,0.35)",
            fontSize: "0.7rem", cursor: "pointer", userSelect: "none",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.3rem",
            fontWeight: hasFilter ? 700 : 400, textTransform: "none", letterSpacing: "normal",
            minWidth: "80px"
          }}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selected.length === 0
              ? "All"
              : selected.length === 1
                ? optionLabel(k, selected[0])
                : `${selected.length} selected`}
          </span>
          <span style={{ opacity: 0.55, flexShrink: 0 }}>{isOpen ? "▴" : "▾"}</span>
        </div>

        {isOpen && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 3px)", left: 0, zIndex: 300,
              background: "#0d1422", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px", minWidth: "170px", maxHeight: "220px", overflowY: "auto",
              boxShadow: "0 8px 28px rgba(0,0,0,0.6)"
            }}
          >
            <div
              onClick={toggleAll}
              style={{
                padding: "0.4rem 0.75rem", fontSize: "0.7rem",
                color: "rgba(255,255,255,0.45)", cursor: "pointer",
                borderBottom: "1px solid rgba(255,255,255,0.07)", fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.04em"
              }}
            >
              {selected.length === opts.length ? "Clear all" : "Select all"}
            </div>
            {opts.map(o => {
              const checked = selected.includes(o);
              return (
                <label
                  key={o}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.45rem 0.75rem", cursor: "pointer",
                    fontSize: "0.78rem",
                    color: checked ? "#fff" : "rgba(255,255,255,0.65)",
                    background: checked ? "rgba(0,229,255,0.06)" : "transparent",
                    transition: "background 0.1s"
                  }}
                  onMouseEnter={e => { if (!checked) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                  onMouseLeave={e => { if (!checked) e.currentTarget.style.background = "transparent"; }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleVal(o)}
                    style={{ accentColor: "#00e5ff", flexShrink: 0 }}
                  />
                  {optionLabel(k, o)}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const exportBtnStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.4rem",
    padding: "0.45rem 0.85rem", borderRadius: "6px",
    border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.04)",
    color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500,
    transition: "all 0.15s"
  };

  function renderHeader(key: string) {
    const labelStyle: React.CSSProperties = {
      display: "flex", alignItems: "center", cursor: "pointer", marginBottom: "0.1rem"
    };
    const labelStyleNoSort: React.CSSProperties = {
      display: "flex", alignItems: "center", marginBottom: "0.1rem", cursor: "default"
    };

    switch (key) {
      case "serial":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("serial")}>Serial <SortIcon col="serial" /></div>
            {textFilter("serial")}
          </th>
        );
      case "category":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("category")}>Category <SortIcon col="category" /></div>
            {multiSelect("category", distinctVals.category || [])}
          </th>
        );
      case "gasType":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("gasType")}>Gas Type <SortIcon col="gasType" /></div>
            {multiSelect("gasType", distinctVals.gasType || [])}
          </th>
        );
      case "capacity":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("initialWeight")}>Capacity <SortIcon col="initialWeight" /></div>
            {textFilter("capacity", "e.g. 10.00")}
          </th>
        );
      case "gasInBottle":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("currentWeight")}>Gas In Bottle <SortIcon col="currentWeight" /></div>
            {textFilter("gasInBottle", "e.g. 8.50")}
          </th>
        );
      case "balance":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>Balance</div>
            {textFilter("balance", "e.g. 1.50")}
          </th>
        );
      case "status":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("status")}>Status <SortIcon col="status" /></div>
            {multiSelect("status", distinctVals.status || [])}
          </th>
        );
      case "engineer":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationId")}>Engineer <SortIcon col="locationId" /></div>
            {multiSelect("engineer", distinctVals.engineer || [])}
          </th>
        );
      case "intendedDestination":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("intendedDestination")}>Intended Destination <SortIcon col="intendedDestination" /></div>
            {textFilter("intendedDestination", "e.g. HQ-Stores")}
          </th>
        );
      case "activeHWCN":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("activeHWCN")}>Active HWCN # <SortIcon col="activeHWCN" /></div>
            {textFilter("activeHWCN", "e.g. HWCN...")}
          </th>
        );
      case "supplier":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("supplier")}>Supplier <SortIcon col="supplier" /></div>
            {multiSelect("supplier", distinctVals.supplier || [])}
          </th>
        );
      case "poNumber":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyleNoSort}>PO Number</div>
            {textFilter("poNumber")}
          </th>
        );
      case "registered":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("registeredAt")}>Registered <SortIcon col="registeredAt" /></div>
            {textFilter("registered", "e.g. Jan 2026")}
          </th>
        );
      case "expiry":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("rentalExpiryDate")}>Expiry Date <SortIcon col="rentalExpiryDate" /></div>
            {textFilter("expiry", "e.g. Dec 2026")}
          </th>
        );
      case "inVanSince":
        return (
          <th key={key} style={thBase}>
            <div style={labelStyle} onClick={() => handleSort("locationChangedAt")}>In Van Since <SortIcon col="locationChangedAt" /></div>
            {textFilter("inVanSince", "e.g. Jan 2026")}
          </th>
        );
      default:
        return null;
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
              {hasReclaimWaste(b) && <AlertTriangle size={14} color="#ffaa00" />}
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
                <div style={{fontWeight: 700, color: isReclaim ? "#ffaa00" : "#22c55e"}}>{isBottleTrace(b) ? "Trace" : `${b.currentWeight.toFixed(2)} kg`}</div>
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
      case "status":
        return (
          <td key={key} style={{padding: "0.85rem 1rem"}}>
            <span style={{
              fontSize: "0.75rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "20px", textTransform: "capitalize",
              background: isBottleTrace(b) ? "rgba(255,170,0,0.12)" : b.status === "unused" ? "rgba(0,229,255,0.12)" : b.status === "active" ? "rgba(34,197,94,0.12)" : b.status === "returned" ? "rgba(168,85,247,0.12)" : b.status === "archived" ? "rgba(239,68,68,0.12)" : b.status === "full" ? "rgba(59,130,246,0.12)" : b.status === "recycled" ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.06)",
              color: isBottleTrace(b) ? "#ffaa00" : b.status === "unused" ? "#00e5ff" : b.status === "active" ? "#22c55e" : b.status === "returned" ? "#a855f7" : b.status === "archived" ? "#ef4444" : b.status === "full" ? "#3b82f6" : b.status === "recycled" ? "#10b981" : "rgba(255,255,255,0.6)"
            }}>
              {isBottleTrace(b) ? "Trace" : b.status === "unused" ? "Unused" : (b.status || "Active")}
            </span>
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
      case "intendedDestination":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: b.intendedDestination ? "#ffaa00" : "var(--text-muted)", fontWeight: b.intendedDestination ? 600 : 400}}>
            {b.intendedDestination || "—"}
          </td>
        );
      case "activeHWCN":
        return (
          <td key={key} style={{padding: "0.85rem 1rem", fontSize: "0.85rem", fontFamily: "var(--font-geist-mono)"}}>
            {b.activeHWCN ? (
              <span style={{color: "#ffaa00", background: "rgba(255,170,0,0.1)", border: "1px solid rgba(255,170,0,0.25)", padding: "0.15rem 0.45rem", borderRadius: "5px", fontWeight: 700, fontSize: "0.78rem"}}>
                {b.activeHWCN}
              </span>
            ) : (
              <span style={{color: "var(--text-muted)"}}>—</span>
            )}
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

      {/* ── Active Field Crews Banner ── */}
      {activePairings.length > 0 ? (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(34, 197, 94, 0.12) 0%, rgba(15, 23, 42, 0.6) 100%)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            borderRadius: "10px",
            padding: "0.85rem 1.25rem",
            marginBottom: "1.75rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", display: "inline-block" }} />
            <Users size={18} color="#22c55e" />
            <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#fff" }}>
              Live Field Crews:
            </span>
            <span style={{ fontSize: "0.85rem", color: "#a7f3d0" }}>
              {activePairings.length} two-person crew{activePairings.length !== 1 ? "s" : ""} deployed across company vehicles.
            </span>
          </div>

          <Link
            href="/admin/crews"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
              background: "rgba(34, 197, 94, 0.15)",
              border: "1px solid rgba(34, 197, 94, 0.4)",
              color: "#4ade80",
              fontSize: "0.8rem",
              fontWeight: 700,
              padding: "0.35rem 0.75rem",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            Manage Field Crews <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div
          style={{
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: "8px",
            padding: "0.6rem 1rem",
            marginBottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.5rem",
            fontSize: "0.8rem",
            color: "rgba(255, 255, 255, 0.6)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Users size={15} color="rgba(255,255,255,0.4)" />
            <span>Field operatives currently working solo.</span>
          </div>
          <Link
            href="/admin/crews"
            style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}
          >
            Field Crews Dashboard <ArrowRight size={12} />
          </Link>
        </div>
      )}

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

          {activeColFilters > 0 && (
            <button
              onClick={() => { setColFilters({}); setColMultiFilters({}); }}
              style={{
                display: "flex", alignItems: "center", gap: "0.35rem",
                padding: "0.45rem 0.85rem", borderRadius: "6px",
                border: "1px solid rgba(0,229,255,0.3)", background: "rgba(0,229,255,0.08)",
                color: "#00e5ff", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600
              }}
            >
              <X size={14} /> Clear {activeColFilters} filter{activeColFilters !== 1 ? "s" : ""}
            </button>
          )}

          <div style={{display: "flex", gap: "0.5rem"}}>
            <button onClick={() => exportVanPDF(filtered, selectedEngineer, engineers, visibleCols)} style={exportBtnStyle}><FileText size={16} /> PDF</button>
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
