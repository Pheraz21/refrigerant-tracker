"use client";

import { useEffect, useState } from "react";
import { db, Bottle } from "@/lib/db";
import { ShieldAlert, Truck, MapPin, Warehouse, Package, ArrowRight, AlertTriangle, Info } from "lucide-react";
import Link from "next/link";

export default function HazWasteSummaryPage() {
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.getAllBottles().then(data => {
      // Only include active reclaim bottles (waste)
      const wasteBottles = data.filter(b => b.category === "reclaim" && b.status === "active");
      setBottles(wasteBottles);
      setLoading(false);
    });
  }, []);

  if (loading) return <div style={{ padding: "2rem", color: "#fff" }}>Calculating company waste exposure...</div>;

  const vanWaste = bottles.filter(b => b.locationType === "van");
  const siteWaste = bottles.filter(b => b.locationType === "site");
  const storesWaste = bottles.filter(b => b.locationType === "office");

  const calculateTotals = (list: Bottle[]) => ({
    count: list.length,
    weight: list.reduce((sum, b) => sum + (b.currentWeight || 0), 0)
  });

  const vanTotals = calculateTotals(vanWaste);
  const siteTotals = calculateTotals(siteWaste);
  const storesTotals = calculateTotals(storesWaste);
  const globalTotal = calculateTotals(bottles);

  const StatCard = ({ title, totals, icon: Icon, color, href }: any) => (
    <div className="glass-panel" style={{ padding: "1.5rem", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: "-10px", top: "-10px", opacity: 0.05 }}>
        <Icon size={120} color={color} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
        <div style={{ 
          width: "48px", height: "48px", borderRadius: "12px", background: `${color}15`, 
          display: "flex", alignItems: "center", justifyContent: "center", color: color,
          border: `1px solid ${color}30`
        }}>
          <Icon size={24} />
        </div>
        <Link href={href} style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
          View List <ArrowRight size={14} />
        </Link>
      </div>
      
      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "0.25rem" }}>{title}</h3>
      <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "1.5rem" }}>Hazardous Waste Inventory</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#fff", lineHeight: 1 }}>{totals.count}</div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: "0.4rem" }}>Cylinders</div>
        </div>
        <div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, color: color, lineHeight: 1 }}>{totals.weight.toFixed(2)}</div>
          <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", marginTop: "0.4rem" }}>Total kg</div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: "1200px" }}>
      <div style={{ marginBottom: "2.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <ShieldAlert size={28} color="#ff3366" /> Haz Waste In Company
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Total hazardous waste holdings awaiting supplier return</p>
        </div>
        
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.25rem" }}>Total Company Exposure</div>
          <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#fff", lineHeight: 1 }}>
            <span style={{ color: "var(--primary)" }}>{globalTotal.weight.toFixed(2)}</span> <small style={{ fontSize: "1rem", opacity: 0.5 }}>kg</small>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", marginBottom: "3rem" }}>
        <StatCard 
          title="Bottles in Vans" 
          totals={vanTotals} 
          icon={Truck} 
          color="#ffaa00" 
          href="/admin/vans"
        />
        <StatCard 
          title="Bottles on Site" 
          totals={siteTotals} 
          icon={MapPin} 
          color="#a855f7" 
          href="/admin/onsite"
        />
        <StatCard 
          title="Bottles in Stores" 
          totals={storesTotals} 
          icon={Warehouse} 
          color="#00e5ff" 
          href="/admin/stores"
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "2rem" }}>
        {/* Warning Section */}
        <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #ffbb00" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffbb00", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <AlertTriangle size={20} /> High-Weight Reclaim Alerts
          </h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.6)", marginBottom: "1.5rem" }}>
            Cylinders exceeding 10kg of waste or held for more than 30 days should be prioritized for return to supplier or stores.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {bottles.filter(b => b.currentWeight > 10).length === 0 ? (
              <div style={{ padding: "1.5rem", textAlign: "center", color: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                No high-weight cylinders detected.
              </div>
            ) : (
              bottles.filter(b => b.currentWeight > 10).map(b => {
                const daysHeld = b.locationChangedAt
                  ? Math.floor((Date.now() - new Date(b.locationChangedAt).getTime()) / 86400000)
                  : null;
                const heldColor = daysHeld === null ? "rgba(255,255,255,0.4)"
                  : daysHeld > 28 ? "#ff3366"
                  : daysHeld > 14 ? "#ffaa00"
                  : "#22c55e";
                return (
                  <Link key={b.serial} href={`/admin/bottles/${b.serial}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "1rem", background: "rgba(255,187,0,0.08)", border: "1px solid rgba(255,187,0,0.2)",
                      borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center"
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "#fff" }}>{b.serial}</div>
                        <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                          {b.locationId} • {b.gasType}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                        <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#ffbb00" }}>{b.currentWeight.toFixed(2)} kg</div>
                        {daysHeld !== null && (
                          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: heldColor }}>
                            {daysHeld === 0 ? "Arrived today" : `${daysHeld} days held`}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Compliance Info */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Info size={18} color="var(--primary)" /> Compliance Status
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>Total Waste Assets</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#fff" }}>{globalTotal.count} Cylinders</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginBottom: "0.25rem" }}>Active HWCN Links</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--primary)" }}>{bottles.filter(b => b.activeHWCN).length} Linked</div>
            </div>
            <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.06)", margin: "0.5rem 0" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Waste cylinders must be transferred to the central stores once they exceed 75% capacity to maintain field safety standards.
            </p>
            <Link href="/admin/reports" style={{ 
              display: "block", textAlign: "center", padding: "0.75rem", background: "rgba(255,255,255,0.05)",
              borderRadius: "8px", color: "#fff", textDecoration: "none", fontSize: "0.85rem", fontWeight: 600
            }}>
              Generate Full Waste Audit
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
