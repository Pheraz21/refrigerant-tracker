"use client";

import { useState, useEffect } from "react";
import { db, Bottle } from "@/lib/db";
import { CalendarClock, AlertCircle, Clock, CheckCircle2, RefreshCw, Edit2, Truck, ExternalLink } from "lucide-react";
import styles from "../../engineer/page.module.css";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ExpiryPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await db.getAllBottles();
    // Only show bottles with expiry date
    const withExpiry = data.filter(b => b.rentalExpiryDate && b.status !== "returned");
    // Sort by expiry date (soonest first)
    setBottles(withExpiry.sort((a, b) => new Date(a.rentalExpiryDate!).getTime() - new Date(b.rentalExpiryDate!).getTime()));
    setLoading(false);
  };

  const handleSyncAlerts = async () => {
    setSyncing(true);
    await db.syncSystemAlerts();
    await loadData();
    setSyncing(false);
  };

  const getDaysDiff = (dateStr: string) => {
    const expiry = new Date(dateStr);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getExpiryStatus = (days: number) => {
    if (days < 0) return { label: "EXPIRED", color: "#ff3366", bg: "rgba(255,51,102,0.1)" };
    if (days <= 7) return { label: "URGENT", color: "#ffaa00", bg: "rgba(255,170,0,0.1)" };
    if (days <= 30) return { label: "WARNING", color: "#ffbb00", bg: "rgba(255,187,0,0.1)" };
    return { label: "OK", color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  };

  // Metrics
  const expiredCount = bottles.filter(b => getDaysDiff(b.rentalExpiryDate!) < 0).length;
  const urgentCount = bottles.filter(b => { const d = getDaysDiff(b.rentalExpiryDate!); return d >= 0 && d <= 7; }).length;
  const warningCount = bottles.filter(b => { const d = getDaysDiff(b.rentalExpiryDate!); return d > 7 && d <= 30; }).length;
  const okCount = bottles.filter(b => getDaysDiff(b.rentalExpiryDate!) > 30).length;

  return (
    <div style={{maxWidth: "1100px"}}>
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem"}}>
        <div>
          <h1 style={{fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
            <CalendarClock size={28} /> Rental Expiry Tracking & Alerts
          </h1>
          <p style={{color: "var(--text-muted)", margin: "0.25rem 0 0"}}>Monitor hire periods, avoid holding fees, and sync automated alerts</p>
        </div>
        <button
          onClick={handleSyncAlerts}
          disabled={syncing}
          style={{
            padding: "0.65rem 1.25rem", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)",
            borderRadius: "8px", color: "#00e5ff", fontWeight: 700, cursor: syncing ? "wait" : "pointer",
            display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.9rem"
          }}
        >
          <RefreshCw size={16} className={syncing ? "spinner" : ""} /> {syncing ? "Scanning Alerts..." : "Check & Sync Alerts"}
        </button>
      </div>

      {/* Metric Summary Cards */}
      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem"}}>
        <div style={{padding: "1rem 1.25rem", background: "rgba(255,51,102,0.08)", border: "1px solid rgba(255,51,102,0.25)", borderRadius: "10px"}}>
          <div style={{fontSize: "0.75rem", color: "#ff3366", fontWeight: 700, textTransform: "uppercase"}}>Expired</div>
          <div style={{fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem"}}>{expiredCount}</div>
        </div>
        <div style={{padding: "1rem 1.25rem", background: "rgba(255,170,0,0.08)", border: "1px solid rgba(255,170,0,0.25)", borderRadius: "10px"}}>
          <div style={{fontSize: "0.75rem", color: "#ffaa00", fontWeight: 700, textTransform: "uppercase"}}>Urgent (≤ 7 Days)</div>
          <div style={{fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem"}}>{urgentCount}</div>
        </div>
        <div style={{padding: "1rem 1.25rem", background: "rgba(255,187,0,0.08)", border: "1px solid rgba(255,187,0,0.25)", borderRadius: "10px"}}>
          <div style={{fontSize: "0.75rem", color: "#ffbb00", fontWeight: 700, textTransform: "uppercase"}}>Warning (≤ 30 Days)</div>
          <div style={{fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem"}}>{warningCount}</div>
        </div>
        <div style={{padding: "1rem 1.25rem", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: "10px"}}>
          <div style={{fontSize: "0.75rem", color: "#22c55e", fontWeight: 700, textTransform: "uppercase"}}>{"OK (> 30 Days)"}</div>
          <div style={{fontSize: "1.75rem", fontWeight: 800, color: "#fff", marginTop: "0.25rem"}}>{okCount}</div>
        </div>
      </div>

      <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem"}}>
        {loading ? (
          <div style={{gridColumn: "1 / -1", padding: "3rem", textAlign: "center", color: "var(--text-muted)"}}>Loading expiry data...</div>
        ) : bottles.length === 0 ? (
          <div className="glass-panel" style={{gridColumn: "1 / -1", padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.2)"}}>
            <CheckCircle2 size={48} style={{marginBottom: "1rem", opacity: 0.2}} />
            <p>No active rental bottles found with expiry dates.</p>
          </div>
        ) : (
          bottles.map((b) => {
            const daysLeft = getDaysDiff(b.rentalExpiryDate!);
            const status = getExpiryStatus(daysLeft);
            const weeksLeft = Math.floor(daysLeft / 7);
            const remDays = daysLeft % 7;

            return (
              <div 
                key={b.serial} 
                className="glass-panel" 
                style={{
                  padding: "1.5rem",
                  borderTop: `4px solid ${status.color}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.25rem",
                  position: "relative"
                }}
              >
                <div style={{display: "flex", justifyContent: "space-between", alignItems: "flex-start"}}>
                  <div>
                    <Link href={`/admin/bottles/${b.serial}`} style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "1.1rem", textDecoration: "none"}}>
                      {b.serial} <ExternalLink size={12} />
                    </Link>
                    <div style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem"}}>
                      {b.gasType} • {b.supplier || "Supplier Unknown"}
                    </div>
                  </div>
                  <div style={{
                    padding: "0.25rem 0.6rem", background: status.bg, color: status.color,
                    borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.05em"
                  }}>
                    {status.label}
                  </div>
                </div>

                <div style={{background: "rgba(255,255,255,0.02)", borderRadius: "8px", padding: "1rem", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center"}}>
                  <div>
                    <div style={{fontSize: "2rem", fontWeight: 800, color: status.color}}>
                      {daysLeft < 0 ? Math.abs(daysLeft) : daysLeft}
                    </div>
                    <div style={{fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", fontWeight: 600}}>
                      {daysLeft < 0 ? "Days Overdue" : "Days Remaining"}
                    </div>
                    <div style={{fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginTop: "0.4rem"}}>
                      {daysLeft >= 0 && (
                        <>
                          {weeksLeft > 0 ? `${weeksLeft} weeks` : ""} {remDays > 0 ? `${remDays} days` : ""}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{display: "flex", flexDirection: "column", gap: "0.5rem"}}>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.85rem"}}>
                    <span style={{color: "rgba(255,255,255,0.4)"}}>Expiry Date:</span>
                    <span style={{color: "#fff", fontWeight: 500}}>{new Date(b.rentalExpiryDate!).toLocaleDateString("en-GB")}</span>
                  </div>
                  <div style={{display: "flex", justifyContent: "space-between", fontSize: "0.85rem"}}>
                    <span style={{color: "rgba(255,255,255,0.4)"}}>Location:</span>
                    <span style={{color: "#fff", fontWeight: 500}}>{b.locationId}</span>
                  </div>
                </div>

                <div style={{display: "flex", gap: "0.75rem", marginTop: "0.5rem"}}>
                  <button 
                    onClick={() => router.push(`/admin/bottles/${b.serial}/edit`)}
                    style={{
                      flex: 1, padding: "0.6rem", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "6px", color: "#fff", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem"
                    }}
                  >
                    <Edit2 size={14} /> Update Expiry
                  </button>
                  <button 
                    onClick={() => router.push("/admin/supplier-returns-waste")}
                    style={{
                      padding: "0.6rem 0.8rem", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)",
                      borderRadius: "6px", color: "#00e5ff", fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: "0.4rem"
                    }}
                  >
                    <Truck size={14} /> Return
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
