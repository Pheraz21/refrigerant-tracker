"use client";

import { useEffect, useState } from "react";
import { db, SupplierReturnGroup, Bottle } from "@/lib/db";
import Link from "next/link";
import { FileText, Search, ArrowUpDown, ArrowUp, ArrowDown, Camera, X } from "lucide-react";

const statusTabs = [
  { key: "all",                  label: "All" },
  { key: "awaiting_consignee",   label: "Awaiting Part E" },
  { key: "complete",             label: "Complete" },
  { key: "supplier_return",      label: "Supplier Returns From Office" },
  { key: "direct_return",        label: "Direct To Supplier Returns" },
  { key: "draft",                label: "Draft" },
];

type SortKey = "id" | "serial" | "engineer" | "type" | "date" | "gasType" | "fillWeight" | "hwcnStatus";

interface UnifiedRow {
  id: string;
  serial: string;
  engineer: string;
  type: "Office Return" | "Supplier Transfer" | "Supplier Return Note" | "Direct Return";
  date: string;
  gasType: string;
  fillWeight: number | null;
  hwcnStatus: string;
  photoUrl?: string;
  isSupplierReturn: boolean;
  isDirectReturn: boolean;
}

const getDigitalType = (destination: string): "Office Return" | "Supplier Transfer" =>
  destination === "HQ-Stores" ? "Office Return" : "Supplier Transfer";

const getStatusBadge = (status: string) => {
  switch (status) {
    case "complete":           return { bg: "rgba(34,197,94,0.12)",   color: "#22c55e", label: "Complete" };
    case "awaiting_consignee": return { bg: "rgba(255,193,7,0.15)",   color: "#ffc107", label: "Awaiting Part E" };
    case "supplier_return":    return { bg: "rgba(34,197,94,0.12)",   color: "#22c55e", label: "Complete" };
    case "direct_return":      return { bg: "rgba(168,85,247,0.12)", color: "#a855f7", label: "Complete" };
    default:                   return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", label: "Draft" };
  }
};

const getTypeBadge = (type: UnifiedRow["type"]) => {
  switch (type) {
    case "Office Return":        return { bg: "rgba(0,229,255,0.1)",   color: "#00e5ff" };
    case "Supplier Transfer":    return { bg: "rgba(255,170,0,0.1)",   color: "#ffaa00" };
    case "Supplier Return Note": return { bg: "rgba(168,85,247,0.12)", color: "#a855f7" };
    case "Direct Return":        return { bg: "rgba(255,80,80,0.1)",   color: "#ff5050" };
  }
};

export default function AllHWCNsPage() {
  const [digitalHwcns, setDigitalHwcns] = useState<any[]>([]);
  const [returnGroups, setReturnGroups] = useState<SupplierReturnGroup[]>([]);
  const [directReturns, setDirectReturns] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewPhotoUrl, setViewPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      db.getAllHWCNs(),
      db.getSupplierReturnGroups(),
      db.getDirectEngineerReturns(),
    ]).then(([hwcns, groups, direct]) => {
      setDigitalHwcns(hwcns);
      setReturnGroups(groups);
      setDirectReturns(direct);
      setLoading(false);
    });
  }, []);

  const allRows: UnifiedRow[] = [
    ...digitalHwcns.map(h => ({
      id: h.id,
      serial: h.serial,
      engineer: h.engineer,
      type: getDigitalType(h.destination ?? "") as "Office Return" | "Supplier Transfer",
      date: h.date,
      gasType: h.gasType || "—",
      fillWeight: h.fillWeight ? Number(h.fillWeight) : null,
      hwcnStatus: h.hwcnStatus,
      isSupplierReturn: false,
      isDirectReturn: false,
    })),
    ...returnGroups.map(g => ({
      id: g.hwcnNumber,
      serial: g.serials.length === 1
        ? g.serials[0]
        : `${g.serials[0]} +${g.serials.length - 1} more`,
      engineer: g.returnedBy,
      type: "Supplier Return Note" as const,
      date: g.returnedAt,
      gasType: g.gasTypes.join(", ") || "—",
      fillWeight: g.totalWeight,
      hwcnStatus: "supplier_return",
      photoUrl: g.photoUrl,
      isSupplierReturn: true,
      isDirectReturn: false,
    })),
    ...directReturns.map(b => ({
      id: b.serial,
      serial: b.serial,
      engineer: b.returnedBy || "—",
      type: "Direct Return" as const,
      date: b.returnedAt || b.registeredAt,
      gasType: b.gasType || "—",
      fillWeight: b.currentWeight ?? null,
      hwcnStatus: "direct_return",
      photoUrl: b.supplierHwcnPhotoUrl,
      isSupplierReturn: false,
      isDirectReturn: true,
    })),
  ];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: "0.3rem" }} />;
    return sortDir === "asc"
      ? <ArrowUp size={12} style={{ opacity: 0.8, marginLeft: "0.3rem" }} />
      : <ArrowDown size={12} style={{ opacity: 0.8, marginLeft: "0.3rem" }} />;
  };

  const tabCount = (key: string) => {
    if (key === "all") return allRows.length;
    return allRows.filter(r => r.hwcnStatus === key).length;
  };

  const filtered = allRows
    .filter(r => activeTab === "all" || r.hwcnStatus === activeTab)
    .filter(r => {
      if (!search) return true;
      const s = search.toLowerCase();
      return r.id?.toLowerCase().includes(s) || r.serial?.toLowerCase().includes(s) || r.engineer?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let av: any, bv: any;
      if (sortKey === "fillWeight") {
        av = a.fillWeight ?? 0;
        bv = b.fillWeight ?? 0;
        return sortDir === "asc" ? av - bv : bv - av;
      }
      av = String(a[sortKey] ?? "").toLowerCase();
      bv = String(b[sortKey] ?? "").toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const thStyle = (col: SortKey): React.CSSProperties => ({
    padding: "0.75rem 1rem",
    textAlign: "left",
    fontSize: "0.78rem",
    color: "rgba(255,255,255,0.5)",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  return (
    <div>
      {/* Photo modal */}
      {viewPhotoUrl && (
        <div
          onClick={() => setViewPhotoUrl(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}
        >
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: "800px", width: "100%", borderRadius: "12px", overflow: "hidden", boxShadow: "0 0 60px rgba(0,0,0,0.6)" }}>
            <img src={viewPhotoUrl} alt="Supplier HWCN" style={{ width: "100%", display: "block" }} />
            <div style={{ padding: "0.75rem 1rem", background: "rgba(20,20,30,0.95)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Camera size={14} /> Supplier HWCN Photo
              </span>
              <div style={{ display: "flex", gap: "1.25rem", alignItems: "center" }}>
                <a href={viewPhotoUrl} target="_blank" rel="noreferrer" style={{ color: "#a855f7", fontSize: "0.85rem", textDecoration: "none", fontWeight: 600 }}>
                  Open full size →
                </a>
                <button onClick={() => setViewPhotoUrl(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.85rem" }}>
                  <X size={16} /> Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FileText size={28} /> All HWCNs
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
          All consignment notes — digital internal HWCNs and supplier return notes · {loading ? "…" : allRows.length} total
        </p>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.25rem", flexWrap: "wrap" }}>
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.85rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#000" : "rgba(255,255,255,0.6)",
              background: activeTab === tab.key ? "#00e5ff" : "transparent",
              transition: "all 0.15s",
            }}>
              {tab.label}
              {!loading && tab.key !== "all" && (
                <span style={{ marginLeft: "0.4rem", opacity: 0.7 }}>({tabCount(tab.key)})</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ position: "relative" }}>
          <Search size={16} style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
          <input
            type="text"
            placeholder="Search by HWCN, serial, engineer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", width: "280px", outline: "none" }}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <FileText size={40} style={{ opacity: 0.3, marginBottom: "0.5rem" }} />
          <p>No records found</p>
        </div>
      ) : (
        <div style={{ borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "820px" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.04)" }}>
                  <th style={thStyle("id")} onClick={() => handleSort("id")}>Note / Serial <SortIcon col="id" /></th>
                  <th style={thStyle("serial")} onClick={() => handleSort("serial")}>Serial(s) <SortIcon col="serial" /></th>
                  <th style={thStyle("engineer")} onClick={() => handleSort("engineer")}>Engineer <SortIcon col="engineer" /></th>
                  <th style={thStyle("type")} onClick={() => handleSort("type")}>Type <SortIcon col="type" /></th>
                  <th style={thStyle("date")} onClick={() => handleSort("date")}>Date <SortIcon col="date" /></th>
                  <th style={thStyle("gasType")} onClick={() => handleSort("gasType")}>Gas <SortIcon col="gasType" /></th>
                  <th style={thStyle("fillWeight")} onClick={() => handleSort("fillWeight")}>Weight <SortIcon col="fillWeight" /></th>
                  <th style={thStyle("hwcnStatus")} onClick={() => handleSort("hwcnStatus")}>Status <SortIcon col="hwcnStatus" /></th>
                  <th style={{ padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, i) => {
                  const badge = getStatusBadge(row.hwcnStatus);
                  const typeBadge = getTypeBadge(row.type);
                  return (
                    <tr
                      key={`${row.id}-${i}`}
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: row.isDirectReturn ? "default" : "pointer" }}
                      onClick={() => {
                        if (row.isDirectReturn) return;
                        if (row.isSupplierReturn) window.location.href = `/admin/supplier-hwcn/${encodeURIComponent(row.id)}`;
                        else window.location.href = `/admin/hwcn/${encodeURIComponent(row.id)}`;
                      }}
                      onMouseEnter={e => { if (!row.isDirectReturn) e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: row.isDirectReturn ? "#a855f7" : "#00e5ff", fontSize: "0.88rem" }}>{row.id}</td>
                      <td style={{ padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontSize: "0.85rem", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.serial}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.88rem" }}>{row.engineer}</td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600, background: typeBadge.bg, color: typeBadge.color }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {row.date ? new Date(row.date).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)" }}>{row.gasType}</td>
                      <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {row.fillWeight != null ? `${row.fillWeight.toFixed(2)} kg` : "—"}
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600 }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.85rem 1rem" }}>
                        {row.isDirectReturn ? (
                          row.photoUrl ? (
                            <button
                              onClick={e => { e.stopPropagation(); setViewPhotoUrl(row.photoUrl!); }}
                              style={{ color: "#a855f7", fontSize: "0.85rem", background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}
                            >
                              <Camera size={14} /> View →
                            </button>
                          ) : (
                            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem" }}>No photo</span>
                          )
                        ) : row.isSupplierReturn ? (
                          <Link
                            href={`/admin/supplier-hwcn/${encodeURIComponent(row.id)}`}
                            style={{ color: "#a855f7", fontSize: "0.85rem", textDecoration: "none" }}
                            onClick={e => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        ) : (
                          <Link
                            href={`/admin/hwcn/${encodeURIComponent(row.id)}`}
                            style={{ color: "#00e5ff", fontSize: "0.85rem", textDecoration: "none" }}
                            onClick={e => e.stopPropagation()}
                          >
                            View →
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
