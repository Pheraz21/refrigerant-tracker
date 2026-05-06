"use client";

import { useState, useEffect } from "react";
import { db, Bottle } from "@/lib/db";
import { CalendarClock, AlertCircle, Clock, CheckCircle2, Filter, Trash2, Edit2 } from "lucide-react";
import styles from "../../engineer/page.module.css";
import { useRouter } from "next/navigation";

export default function ExpiryPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div style={{maxWidth: "1100px"}}>
      <div style={{marginBottom: "2.5rem"}}>
        <h1 style={{fontSize: "1.8rem", fontWeight: 700, margin: 0, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem"}}>
          <CalendarClock size={28} /> Rental Expiry Tracking
        </h1>
        <p style={{color: "var(--text-muted)", margin: "0.25rem 0 0"}}>Monitor hire periods and minimize rental costs</p>
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
                    <div style={{fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "#00e5ff", fontSize: "1.1rem"}}>
                      {b.serial}
                    </div>
                    <div style={{fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem"}}>
                      {b.gasType} • {b.supplier}
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
