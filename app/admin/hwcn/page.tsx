"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import Link from "next/link";
import { ClipboardList, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const statusTabs = [
  { key: "all", label: "All" },
  { key: "awaiting_consignee", label: "Awaiting Part E" },
  { key: "complete", label: "Complete" },
  { key: "draft", label: "In Transit" },
];

type SortKey = "id" | "serial" | "engineer" | "destination" | "date" | "hwcnStatus";

export default function HWCNQueuePage() {
  const [hwcns, setHwcns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("awaiting_consignee");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    db.getAllHWCNs().then(h => {
      setHwcns(h);
      setLoading(false);
    });
  }, []);

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

  const filtered = hwcns
    .filter(h => activeTab === "all" || h.hwcnStatus === activeTab)
    .filter(h => {
      if (!search) return true;
      const s = search.toLowerCase();
      return h.id?.toLowerCase().includes(s) || h.serial?.toLowerCase().includes(s) || h.engineer?.toLowerCase().includes(s) || h.destination?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let av: any = a[sortKey] ?? "";
      let bv: any = b[sortKey] ?? "";
      av = String(av).toLowerCase();
      bv = String(bv).toLowerCase();
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete": return { bg: "rgba(34,197,94,0.12)", color: "#22c55e", label: "Complete" };
      case "awaiting_consignee": return { bg: "rgba(255,193,7,0.15)", color: "#ffc107", label: "Awaiting Part E" };
      default: return { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", label: "In Transit" };
    }
  };

  const thStyle = (col: SortKey): React.CSSProperties => ({
    padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid rgba(255,255,255,0.06)", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap"
  });

  return (
    <div>
      <div style={{marginBottom: "2rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <ClipboardList size={28} /> HWCN Queue
        </h1>
        <p style={{color: "var(--text-muted)", fontSize: "0.9rem"}}>Manage Hazardous Waste Consignment Notes</p>
      </div>

      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem"}}>
        <div style={{display: "flex", gap: "0.25rem", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "0.25rem"}}>
          {statusTabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.85rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? "#000" : "rgba(255,255,255,0.6)",
              background: activeTab === tab.key ? "#00e5ff" : "transparent",
              transition: "all 0.15s"
            }}>
              {tab.label}
              {tab.key !== "all" && <span style={{marginLeft: "0.4rem", opacity: 0.7}}>({hwcns.filter(h => h.hwcnStatus === tab.key).length})</span>}
            </button>
          ))}
        </div>
        <div style={{position: "relative"}}>
          <Search size={16} style={{position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)"}} />
          <input type="text" placeholder="Search by HWCN, serial, engineer..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{padding: "0.6rem 0.75rem 0.6rem 2.25rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#fff", fontSize: "0.85rem", width: "280px", outline: "none"}}
          />
        </div>
      </div>

      {loading ? (
        <p style={{color: "var(--text-muted)"}}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div style={{textAlign: "center", padding: "3rem", color: "var(--text-muted)"}}>
          <ClipboardList size={40} style={{opacity: 0.3, marginBottom: "0.5rem"}} />
          <p>No HWCNs found</p>
        </div>
      ) : (
        <div style={{borderRadius: "10px", border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden"}}>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "rgba(255,255,255,0.04)"}}>
                <th style={thStyle("id")} onClick={() => handleSort("id")}>HWCN Code <SortIcon col="id" /></th>
                <th style={thStyle("serial")} onClick={() => handleSort("serial")}>Bottle Serial <SortIcon col="serial" /></th>
                <th style={thStyle("engineer")} onClick={() => handleSort("engineer")}>Engineer <SortIcon col="engineer" /></th>
                <th style={thStyle("destination")} onClick={() => handleSort("destination")}>Destination <SortIcon col="destination" /></th>
                <th style={thStyle("date")} onClick={() => handleSort("date")}>Date <SortIcon col="date" /></th>
                <th style={thStyle("hwcnStatus")} onClick={() => handleSort("hwcnStatus")}>Status <SortIcon col="hwcnStatus" /></th>
                <th style={{padding: "0.75rem 1rem", borderBottom: "1px solid rgba(255,255,255,0.06)"}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(h => {
                const badge = getStatusBadge(h.hwcnStatus);
                return (
                  <tr key={h.id} style={{borderBottom: "1px solid rgba(255,255,255,0.04)", cursor: "pointer"}}
                    onClick={() => window.location.href = `/admin/hwcn/${encodeURIComponent(h.id)}`}>
                    <td style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "0.9rem"}}>{h.id}</td>
                    <td style={{padding: "0.85rem 1rem", fontFamily: "var(--font-geist-mono)", fontSize: "0.9rem"}}>{h.serial}</td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.9rem"}}>{h.engineer}</td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"}}>{h.destination}</td>
                    <td style={{padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--text-muted)"}}>{new Date(h.date).toLocaleDateString("en-GB")}</td>
                    <td style={{padding: "0.85rem 1rem"}}>
                      <span style={{background: badge.bg, color: badge.color, padding: "0.2rem 0.7rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 600}}>{badge.label}</span>
                    </td>
                    <td style={{padding: "0.85rem 1rem"}}>
                      <Link href={`/admin/hwcn/${encodeURIComponent(h.id)}`} style={{color: "#00e5ff", fontSize: "0.85rem", textDecoration: "none"}} onClick={e => e.stopPropagation()}>
                        {h.hwcnStatus === "awaiting_consignee" ? "Complete →" : "View →"}
                      </Link>
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
