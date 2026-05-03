"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { BarChart2, User, Truck, AlertTriangle, CheckCircle2, Package, Wind, ArrowRight, Clock } from "lucide-react";
import Link from "next/link";

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "4px", height: "6px", overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color, borderRadius: "4px", transition: "width 0.6s ease" }} />
    </div>
  );
}

function StatCard({ label, value, sub, color = "#00e5ff", icon }: { label: string; value: string | number; sub?: string; color?: string; icon?: React.ReactNode }) {
  return (
    <div className="glass-panel" style={{ padding: "1.25rem 1.5rem" }}>
      <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
        {icon} {label}
      </div>
      <div style={{ fontSize: "2rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", marginTop: "0.4rem" }}>{sub}</div>}
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [engineerStats, setEngineerStats] = useState<any[]>([]);
  const [efficiencyStats, setEfficiencyStats] = useState<any>({});
  const [gasInventory, setGasInventory] = useState<any[]>([]);
  const [fleetHealth, setFleetHealth] = useState<any>({});
  const [idleBottles, setIdleBottles] = useState<any[]>([]);
  const [maxEngineerKg, setMaxEngineerKg] = useState(1);

  useEffect(() => {
    async function compute() {
      const [bottles, users, hwcns] = await Promise.all([
        db.getAllBottles(),
        db.getAllUsers(),
        db.getAllHWCNs(),
      ]);

      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

      // ── Section 1: Engineer Holdings ──────────────────────────────────
      const engineers = users.filter((u: any) =>
        (u.availableRoles || [u.role]).includes("engineer") && u.status === "approved"
      );

      const stats = engineers.map((eng: any) => {
        const vanBottles = bottles.filter(
          (b: any) =>
            b.locationType === "van" &&
            (b.locationId || "").toLowerCase().includes(eng.name.toLowerCase())
        );
        const newB = vanBottles.filter((b: any) => b.category === "new");
        const nitroB = vanBottles.filter((b: any) => b.category === "nitrogen");
        const reclaimB = vanBottles.filter((b: any) => b.category === "reclaim");
        const newKg = newB.reduce((s: number, b: any) => s + (b.currentWeight || 0), 0);
        const nitroKg = nitroB.reduce((s: number, b: any) => s + (b.currentWeight || 0), 0);
        const reclaimKg = reclaimB.reduce((s: number, b: any) => s + (b.currentWeight || 0), 0);
        const totalKg = newKg + nitroKg + reclaimKg;
        return {
          name: eng.name,
          vehicleReg: eng.vehicleReg || "—",
          newBottles: newB.length,
          newKg,
          nitroBottles: nitroB.length,
          nitroKg,
          reclaimBottles: reclaimB.length,
          reclaimKg,
          totalBottles: vanBottles.length,
          totalKg,
        };
      }).sort((a: any, b: any) => b.totalBottles - a.totalBottles);

      const maxKg = Math.max(...stats.map((s: any) => s.totalKg), 1);
      setEngineerStats(stats);
      setMaxEngineerKg(maxKg);

      // ── Section 2: Efficiency ─────────────────────────────────────────
      const returnedNew = bottles.filter((b: any) => b.status === "returned" && b.category === "new");
      const returnedWithGas = returnedNew.filter((b: any) => (b.currentWeight || 0) > 0);
      const unusedReturnRate = returnedNew.length > 0 ? (returnedWithGas.length / returnedNew.length) * 100 : 0;
      const avgWasteRemaining = returnedWithGas.length > 0
        ? returnedWithGas.reduce((s: number, b: any) => s + (b.currentWeight || 0), 0) / returnedWithGas.length
        : 0;

      const activeReclaim = bottles.filter((b: any) => b.category === "reclaim" && b.status === "active" && (b.currentWeight || 0) > 0 && (b.initialWeight || 0) > 0);
      const avgWasteFill = activeReclaim.length > 0
        ? activeReclaim.reduce((s: number, b: any) => s + ((b.currentWeight || 0) / (b.initialWeight || 1)) * 100, 0) / activeReclaim.length
        : 0;
      const consolidationCount = activeReclaim.filter((b: any) => (b.currentWeight || 0) / (b.initialWeight || 1) < 0.5).length;

      const activeNew = bottles.filter((b: any) => b.category === "new" && b.status === "active" && (b.initialWeight || 0) > 0);
      const avgNewUtilisation = activeNew.length > 0
        ? activeNew.reduce((s: number, b: any) => s + ((b.initialWeight - b.currentWeight) / b.initialWeight) * 100, 0) / activeNew.length
        : 0;

      setEfficiencyStats({ unusedReturnRate, avgWasteRemaining, avgWasteFill, consolidationCount, activeReclaimCount: activeReclaim.length, activeNewCount: activeNew.length, avgNewUtilisation });

      // ── Section 3: Gas Inventory by Type ─────────────────────────────
      const activeBottles = bottles.filter((b: any) => b.status === "active");
      const gasMap: Record<string, { totalKg: number; count: number; inVans: number; inSites: number; inStores: number }> = {};
      for (const b of activeBottles) {
        const g = b.gasType || "Unknown";
        if (!gasMap[g]) gasMap[g] = { totalKg: 0, count: 0, inVans: 0, inSites: 0, inStores: 0 };
        gasMap[g].totalKg += b.currentWeight || 0;
        gasMap[g].count += 1;
        if (b.locationType === "van") gasMap[g].inVans += 1;
        else if (b.locationType === "site") gasMap[g].inSites += 1;
        else if (b.locationType === "office") gasMap[g].inStores += 1;
      }
      const gasRows = Object.entries(gasMap)
        .map(([gasType, data]) => ({ gasType, ...data }))
        .sort((a, b) => b.totalKg - a.totalKg);
      const totalFleetKg = gasRows.reduce((s, r) => s + r.totalKg, 0);
      setGasInventory(gasRows.map(r => ({ ...r, pct: totalFleetKg > 0 ? (r.totalKg / totalFleetKg) * 100 : 0 })));

      // ── Section 4: Fleet Health ───────────────────────────────────────
      const totalActive = activeBottles.length;
      const avgAgeMs = activeBottles.length > 0
        ? activeBottles.reduce((s: number, b: any) => s + (now - new Date(b.registeredAt).getTime()), 0) / activeBottles.length
        : 0;
      const avgAgeDays = Math.round(avgAgeMs / (24 * 60 * 60 * 1000));

      const idle = activeBottles.filter((b: any) => {
        if (!b.locationChangedAt) return false;
        return (now - new Date(b.locationChangedAt).getTime()) > thirtyDaysMs;
      }).map((b: any) => ({
        serial: b.serial,
        gasType: b.gasType,
        locationId: b.locationId,
        locationType: b.locationType,
        daysSince: Math.floor((now - new Date(b.locationChangedAt).getTime()) / (24 * 60 * 60 * 1000)),
      })).sort((a: any, b: any) => b.daysSince - a.daysSince);

      const totalWasteKg = activeReclaim.reduce((s: number, b: any) => s + (b.currentWeight || 0), 0);

      const recentHwcns = hwcns.filter((h: any) => new Date(h.date).getTime() > now - ninetyDaysMs);
      const completedHwcns = recentHwcns.filter((h: any) => h.hwcnStatus === "complete").length;
      const hwcnCompletionRate = recentHwcns.length > 0 ? (completedHwcns / recentHwcns.length) * 100 : 0;

      setFleetHealth({ totalActive, avgAgeDays, idleCount: idle.length, totalWasteKg, hwcnCompletionRate, recentHwcnsTotal: recentHwcns.length });
      setIdleBottles(idle);
      setLoading(false);
    }
    compute();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "4rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
        <BarChart2 size={48} style={{ marginBottom: "1rem", opacity: 0.3 }} />
        <p>Computing analytics…</p>
      </div>
    );
  }

  const wasteFillColor = efficiencyStats.avgWasteFill > 70 ? "#22c55e" : efficiencyStats.avgWasteFill > 40 ? "#ffaa00" : "#ff3366";
  const unusedReturnColor = efficiencyStats.unusedReturnRate < 20 ? "#22c55e" : efficiencyStats.unusedReturnRate < 40 ? "#ffaa00" : "#ff3366";

  return (
    <div style={{ maxWidth: "1100px" }}>

      {/* Header */}
      <div style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <BarChart2 size={28} color="var(--primary)" /> Analytics
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)", margin: "0.25rem 0 0", fontSize: "0.9rem" }}>Fleet performance, gas efficiency and operational health</p>
      </div>

      {/* ── Section 1: Engineer Holdings ── */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <User size={18} /> Bottle Holdings by Engineer
        </h2>
        {engineerStats.length === 0 ? (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No engineers found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {engineerStats.map((eng, i) => (
              <div key={eng.name} className="glass-panel" style={{ padding: "1.25rem 1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.75rem", color: "var(--primary)" }}>
                      #{i + 1}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1rem" }}>{eng.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", fontFamily: "var(--font-geist-mono)" }}>{eng.vehicleReg}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ padding: "0.3rem 0.7rem", borderRadius: "20px", background: "rgba(0,229,255,0.1)", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 700 }}>
                      {eng.totalBottles} bottle{eng.totalBottles !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                      {eng.totalKg.toFixed(1)} kg
                    </span>
                  </div>
                </div>

                {/* Category bars */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                      <span style={{ color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><Package size={11} /> New Gas</span>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{eng.newKg.toFixed(1)} kg · {eng.newBottles}b</span>
                    </div>
                    <MiniBar pct={(eng.newKg / maxEngineerKg) * 100} color="var(--primary)" />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                      <span style={{ color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><Wind size={11} /> Nitrogen</span>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{eng.nitroKg.toFixed(1)} kg · {eng.nitroBottles}b</span>
                    </div>
                    <MiniBar pct={(eng.nitroKg / maxEngineerKg) * 100} color="#22c55e" />
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                      <span style={{ color: "var(--warning)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem" }}><AlertTriangle size={11} /> Waste</span>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{eng.reclaimKg.toFixed(1)} kg · {eng.reclaimBottles}b</span>
                    </div>
                    <MiniBar pct={(eng.reclaimKg / maxEngineerKg) * 100} color="var(--warning)" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 2: Efficiency ── */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Efficiency &amp; Waste Analysis
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>

          {/* Card A: Unused return rate */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderTop: `3px solid ${unusedReturnColor}` }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Unused Gas Return Rate
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: unusedReturnColor, lineHeight: 1 }}>
              {efficiencyStats.unusedReturnRate.toFixed(0)}%
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              of returned new bottles still had gas in them
            </div>
            {efficiencyStats.avgWasteRemaining > 0 && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "rgba(255,255,255,0.04)", borderRadius: "6px", fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
                Avg <strong style={{ color: unusedReturnColor }}>{efficiencyStats.avgWasteRemaining.toFixed(2)} kg</strong> remaining per returned bottle
              </div>
            )}
            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              Lower is better — high % means gas sent back unused
            </div>
          </div>

          {/* Card B: Waste bottle fill */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderTop: `3px solid ${wasteFillColor}` }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Waste Bottle Fill Efficiency
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: wasteFillColor, lineHeight: 1 }}>
              {efficiencyStats.avgWasteFill.toFixed(0)}%
            </div>
            <MiniBar pct={efficiencyStats.avgWasteFill} color={wasteFillColor} />
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              avg fill across {efficiencyStats.activeReclaimCount} active waste bottle{efficiencyStats.activeReclaimCount !== 1 ? "s" : ""}
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              Higher is better — low % means costly near-empty returns
            </div>
          </div>

          {/* Card C: Consolidation */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderTop: "3px solid #ffaa00" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              Consolidation Opportunities
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: efficiencyStats.consolidationCount > 0 ? "#ffaa00" : "#22c55e", lineHeight: 1 }}>
              {efficiencyStats.consolidationCount}
            </div>
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              waste bottle{efficiencyStats.consolidationCount !== 1 ? "s" : ""} under 50% capacity
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              Consider consolidating before returning to reduce collections
            </div>
          </div>

          {/* Card D: New gas utilisation */}
          <div className="glass-panel" style={{ padding: "1.5rem", borderTop: "3px solid var(--primary)" }}>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
              New Gas Utilisation
            </div>
            <div style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>
              {efficiencyStats.avgNewUtilisation.toFixed(0)}%
            </div>
            <MiniBar pct={efficiencyStats.avgNewUtilisation} color="var(--primary)" />
            <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.5rem", lineHeight: 1.4 }}>
              avg gas consumed across {efficiencyStats.activeNewCount} active new bottles
            </div>
            <div style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>
              How much of ordered gas has been used on average
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Gas Inventory ── */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Package size={18} /> Live Gas Inventory by Type
        </h2>
        {gasInventory.length === 0 ? (
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>No active bottles found.</div>
        ) : (
          <div className="glass-panel" style={{ padding: "0.5rem 0", overflow: "hidden" }}>
            {gasInventory.map((row, i) => (
              <div key={row.gasType} style={{
                display: "grid", gridTemplateColumns: "160px 1fr auto",
                alignItems: "center", gap: "1.5rem",
                padding: "1rem 1.5rem",
                borderBottom: i < gasInventory.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none"
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{row.gasType}</div>
                  <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.35)", marginTop: "0.2rem" }}>
                    {row.count} bottle{row.count !== 1 ? "s" : ""}
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", marginBottom: "0.3rem" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{row.pct.toFixed(1)}% of fleet</span>
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{row.totalKg.toFixed(2)} kg</span>
                  </div>
                  <MiniBar pct={row.pct} color="var(--primary)" />
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                  {row.inVans > 0 && (
                    <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(0,229,255,0.1)", color: "var(--primary)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.2rem" }}>
                      <Truck size={10} /> {row.inVans}
                    </span>
                  )}
                  {row.inSites > 0 && (
                    <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,170,0,0.1)", color: "#ffaa00", fontWeight: 600 }}>
                      Site {row.inSites}
                    </span>
                  )}
                  {row.inStores > 0 && (
                    <span style={{ fontSize: "0.68rem", padding: "0.2rem 0.5rem", borderRadius: "4px", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
                      Stores {row.inStores}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Section 4: Fleet Health ── */}
      <section style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--primary)", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 size={18} /> Fleet Health
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          <StatCard label="Total Active Bottles" value={fleetHealth.totalActive} color="var(--primary)" icon={<Package size={12} />} />
          <StatCard
            label="Avg Bottle Age"
            value={`${fleetHealth.avgAgeDays}d`}
            sub="since registration"
            color={fleetHealth.avgAgeDays > 180 ? "#ffaa00" : "var(--primary)"}
            icon={<Clock size={12} />}
          />
          <StatCard
            label="Total Waste Held"
            value={`${fleetHealth.totalWasteKg.toFixed(1)} kg`}
            sub="active reclaim gas"
            color="#ffaa00"
            icon={<AlertTriangle size={12} />}
          />
          <StatCard
            label="Idle Bottles (30+ days)"
            value={fleetHealth.idleCount}
            sub="no location change"
            color={fleetHealth.idleCount > 0 ? "#ffaa00" : "#22c55e"}
            icon={<Clock size={12} />}
          />
          <StatCard
            label="HWCN Completion Rate"
            value={`${fleetHealth.hwcnCompletionRate.toFixed(0)}%`}
            sub={`last 90 days (${fleetHealth.recentHwcnsTotal} total)`}
            color={fleetHealth.hwcnCompletionRate >= 80 ? "#22c55e" : fleetHealth.hwcnCompletionRate >= 50 ? "#ffaa00" : "#ff3366"}
            icon={<CheckCircle2 size={12} />}
          />
        </div>

        {/* Idle bottle list */}
        {idleBottles.length > 0 && (
          <div>
            <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ffaa00", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Clock size={15} /> Idle Bottles — No Movement in 30+ Days
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {idleBottles.map(b => (
                <div key={b.serial} className="glass-panel" style={{ padding: "0.75rem 1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
                    <span style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, color: "var(--primary)", fontSize: "0.85rem" }}>{b.serial}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.6)" }}>{b.gasType}</span>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.4)", textTransform: "capitalize" }}>{b.locationType} — {b.locationId}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <span style={{ fontSize: "0.8rem", color: "#ffaa00", fontWeight: 700 }}>{b.daysSince} days idle</span>
                    <Link href={`/admin/bottles/${b.serial}`} style={{ textDecoration: "none" }}>
                      <button style={{ background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "6px", padding: "0.3rem 0.6rem", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        View <ArrowRight size={12} />
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
