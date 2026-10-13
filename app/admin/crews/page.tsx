"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Truck,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Search,
  ExternalLink,
  Clock,
  Phone,
  Mail,
  Package,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { db, VanPairing, Bottle, AppUser } from "@/lib/db";

export default function ActiveFieldCrewsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [engineers, setEngineers] = useState<AppUser[]>([]);
  const [activePairings, setActivePairings] = useState<VanPairing[]>([]);
  const [bottles, setBottles] = useState<Bottle[]>([]);
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [allUsers, pairings, allBottles] = await Promise.all([
        db.getAllUsers(),
        db.getAllActivePairings(),
        db.getAllBottles(),
      ]);

      const fieldUsers = (allUsers || []).filter(u =>
        u.status === "approved" && (
          u.role === "engineer" ||
          u.role === "mate" ||
          u.role === "apprentice" ||
          (u.vehicleReg && u.vehicleReg.trim().length > 0)
        )
      );

      setEngineers(fieldUsers);
      setActivePairings((pairings || []).filter(p => p.pairingStatus === "approved"));
      setBottles(allBottles || []);
    } catch (err) {
      console.error("Failed to load field crews data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000); // 15s live refresh
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleUnpair = async (pairingId: string, mateName: string, leadName: string) => {
    if (!confirm(`Are you sure you want to unpair ${mateName} from ${leadName}? This will instantly revoke vehicle access on their mobile hub.`)) {
      return;
    }
    try {
      await db.respondToPairingRequest(pairingId, "revoked");
      await loadData();
    } catch (err) {
      console.error("Failed to revoke crew pairing:", err);
      alert("Failed to unpair crew. Please try again.");
    }
  };

  const getVanBottles = (reg: string, leadName: string) => {
    const cleanReg = (reg || "").trim().toUpperCase();
    const cleanLead = (leadName || "").trim().toLowerCase();
    return bottles.filter(b => {
      const bReg = (b.vehicleReg || "").trim().toUpperCase();
      const bLoc = (b.locationId || "").trim().toLowerCase();
      return (cleanReg && bReg === cleanReg) || (cleanLead && bLoc.includes(cleanLead));
    });
  };

  const filteredPairings = activePairings.filter(p => {
    const term = search.toLowerCase();
    return (
      p.leadEngineerName.toLowerCase().includes(term) ||
      p.mateName.toLowerCase().includes(term) ||
      p.vehicleReg.toLowerCase().includes(term) ||
      p.mateRole.toLowerCase().includes(term)
    );
  });

  const leadEngineersCount = engineers.filter(e => e.role === "engineer").length;
  const pairedLeadNames = new Set(activePairings.map(p => p.leadEngineerName.toLowerCase()));
  const soloEngineers = engineers.filter(e => e.role === "engineer" && !pairedLeadNames.has(e.name.toLowerCase()));
  const matesAndApprentices = engineers.filter(e => e.role === "mate" || e.role === "apprentice");
  const pairedMateIds = new Set(activePairings.map(p => p.mateId));
  const unpairedMates = matesAndApprentices.filter(m => !pairedMateIds.has(m.id));

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
        <RefreshCw size={24} className="animate-spin" style={{ margin: "0 auto 1rem", opacity: 0.6 }} />
        <div>Loading live crew deployments...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", paddingBottom: "4rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.85rem", fontWeight: 700, margin: "0 0 0.35rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "#fff" }}>
            <Users size={30} color="var(--primary)" /> Active Field Crews &amp; Vehicle Deployments
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", margin: 0 }}>
            Real-time dispatch dashboard of paired field operatives (Lead Engineer + Mate/Apprentice), vehicle deployments, and cylinder custody.
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              color: "#fff",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.82rem",
              fontWeight: 600,
              transition: "all 0.15s"
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Live"}
          </button>

          <Link
            href="/admin/vans"
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(0, 229, 255, 0.12)",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              color: "#00e5ff",
              padding: "0.55rem 0.95rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
            }}
          >
            <Truck size={14} /> Van Inventory
          </Link>
        </div>
      </div>

      {/* KPI Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(34, 197, 94, 0.3)", background: "rgba(34, 197, 94, 0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>Active Crews</span>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#22c55e" }}>{activePairings.length}</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>Two-person teams in field</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(0, 229, 255, 0.25)", background: "rgba(0, 229, 255, 0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>Paired Personnel</span>
            <UserCheck size={16} color="#00e5ff" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#00e5ff" }}>{activePairings.length * 2}</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>Operatives paired in vans</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>Solo Lead Engineers</span>
            <Truck size={16} color="#94a3b8" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#cbd5e1" }}>{soloEngineers.length}</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>Operating without mates</div>
        </div>

        <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "12px", border: "1px solid rgba(255, 255, 255, 0.1)", background: "rgba(255, 255, 255, 0.02)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.05em" }}>Unpaired Mates / Trainees</span>
            <Users size={16} color="#fbbf24" />
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#fbbf24" }}>{unpairedMates.length}</div>
          <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.5)", marginTop: "0.25rem" }}>Available for van dispatch</div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, maxWidth: "450px" }}>
          <Search size={16} style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
          <input
            type="text"
            placeholder="Search by operative name, role, or vehicle reg..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.7rem 1rem 0.7rem 2.6rem",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "0.88rem",
            }}
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch("")}
            style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.82rem", textDecoration: "underline" }}
          >
            Clear Search
          </button>
        )}
      </div>

      {/* Active Two-Person Crews Section */}
      <div style={{ marginBottom: "3rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Users size={20} color="#22c55e" /> Active Two-Person Crews ({filteredPairings.length})
        </h2>

        {filteredPairings.length === 0 ? (
          <div
            className="glass-panel"
            style={{
              border: "1px dashed rgba(255, 255, 255, 0.15)",
              borderRadius: "12px",
              padding: "3rem 2rem",
              textAlign: "center",
              color: "rgba(255, 255, 255, 0.6)",
              background: "rgba(255, 255, 255, 0.02)",
            }}
          >
            <Users size={40} style={{ color: "rgba(255, 255, 255, 0.25)", margin: "0 auto 1rem" }} />
            <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#fff" }}>
              {search ? "No Crews Matching Search" : "No Active Two-Person Crew Pairings"}
            </div>
            <div style={{ fontSize: "0.88rem", maxWidth: "580px", margin: "0.5rem auto 0", lineHeight: 1.6, color: "var(--text-muted)" }}>
              {search
                ? `No active pairings match "${search}". Try clearing your search filter.`
                : "All engineers and mates are currently operating independently. When an apprentice or mate taps their Active Van banner on mobile and pairs with a lead engineer, their live two-person deployment will appear here instantly."}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: "1.25rem" }}>
            {filteredPairings.map(p => {
              const leadUser = engineers.find(e => e.name.toLowerCase() === p.leadEngineerName.toLowerCase());
              const mateUser = engineers.find(e => e.id === p.mateId || e.name.toLowerCase() === p.mateName.toLowerCase());
              const vanBottles = getVanBottles(p.vehicleReg, p.leadEngineerName);

              const newGasCount = vanBottles.filter(b => b.category === "new").length;
              const recycledCount = vanBottles.filter(b => b.category === "recycled").length;
              const reclaimCount = vanBottles.filter(b => b.category === "reclaim").length;
              const n2Count = vanBottles.filter(b => b.category === "nitrogen").length;

              return (
                <div
                  key={p.id}
                  className="glass-panel"
                  style={{
                    background: "linear-gradient(145deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.7) 100%)",
                    border: "1.5px solid rgba(34, 197, 94, 0.35)",
                    borderRadius: "14px",
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    boxShadow: "0 8px 24px -6px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  {/* Top Bar: Vehicle Reg & Status */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span
                        style={{
                          background: "#facc15",
                          color: "#000",
                          fontFamily: "var(--font-geist-mono), monospace",
                          fontWeight: 800,
                          fontSize: "0.95rem",
                          letterSpacing: "0.08em",
                          padding: "0.25rem 0.65rem",
                          borderRadius: "4px",
                          border: "1.5px solid #000",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
                        }}
                      >
                        {p.vehicleReg || "VAN"}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.3rem",
                          background: "rgba(34, 197, 94, 0.15)",
                          border: "1px solid rgba(34, 197, 94, 0.4)",
                          color: "#4ade80",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          borderRadius: "20px",
                          textTransform: "uppercase",
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block", boxShadow: "0 0 6px #22c55e" }} />
                        Paired Crew
                      </span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Clock size={12} />
                      {p.respondedAt || p.requestedAt
                        ? `Since ${new Date(p.respondedAt || p.requestedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`
                        : "Active"}
                    </div>
                  </div>

                  {/* Operatives Pairing Details */}
                  <div style={{ background: "rgba(0, 0, 0, 0.25)", borderRadius: "10px", padding: "0.85rem", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
                    {/* Lead Engineer */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
                          Lead Engineer (F-Gas Qualified)
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#fff" }}>
                          {p.leadEngineerName}
                        </div>
                        {leadUser?.phone && (
                          <a href={`tel:${leadUser.phone}`} style={{ fontSize: "0.78rem", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "0.25rem", textDecoration: "none", marginTop: "0.15rem" }}>
                            <Phone size={11} /> {leadUser.phone}
                          </a>
                        )}
                      </div>
                      <span
                        style={{
                          background: "rgba(0, 229, 255, 0.15)",
                          border: "1px solid rgba(0, 229, 255, 0.3)",
                          color: "#00e5ff",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        Lead
                      </span>
                    </div>

                    <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "0.6rem 0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ background: "rgba(30, 41, 59, 1)", padding: "0 0.5rem", fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.4)", textTransform: "uppercase" }}>
                        &darr; paired with
                      </span>
                    </div>

                    {/* Mate / Apprentice */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>
                          Second Operative ({p.mateRole === "apprentice" ? "Apprentice" : "Mate"})
                        </div>
                        <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#a7f3d0" }}>
                          {p.mateName}
                        </div>
                        {mateUser?.phone && (
                          <a href={`tel:${mateUser.phone}`} style={{ fontSize: "0.78rem", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: "0.25rem", textDecoration: "none", marginTop: "0.15rem" }}>
                            <Phone size={11} /> {mateUser.phone}
                          </a>
                        )}
                      </div>
                      <span
                        style={{
                          background: p.mateRole === "apprentice" ? "rgba(192, 132, 252, 0.15)" : "rgba(56, 189, 248, 0.15)",
                          border: `1px solid ${p.mateRole === "apprentice" ? "rgba(192, 132, 252, 0.3)" : "rgba(56, 189, 248, 0.3)"}`,
                          color: p.mateRole === "apprentice" ? "#c084fc" : "#38bdf8",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.55rem",
                          borderRadius: "4px",
                          textTransform: "uppercase",
                        }}
                      >
                        {p.mateRole}
                      </span>
                    </div>
                  </div>

                  {/* Van Bottle Inventory Allocation */}
                  <div style={{ background: "rgba(255, 255, 255, 0.03)", borderRadius: "8px", padding: "0.65rem 0.85rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        Vehicle Cylinder Stock:
                      </span>
                      <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#fff" }}>
                        {vanBottles.length} Bottle{vanBottles.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.72rem", color: "rgba(255,255,255,0.5)" }}>
                      <span>New: <strong style={{ color: "#00e5ff" }}>{newGasCount}</strong></span>
                      <span>Recycled: <strong style={{ color: "#10b981" }}>{recycledCount}</strong></span>
                      <span>Reclaim: <strong style={{ color: "#ffaa00" }}>{reclaimCount}</strong></span>
                      <span>N₂: <strong style={{ color: "#fff" }}>{n2Count}</strong></span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: "flex", gap: "0.6rem", marginTop: "auto", paddingTop: "0.3rem" }}>
                    <Link
                      href={`/admin/vans?engineer=${encodeURIComponent(leadUser?.id || p.leadEngineerName)}`}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.55rem",
                        borderRadius: "8px",
                        background: "rgba(0, 229, 255, 0.1)",
                        border: "1px solid rgba(0, 229, 255, 0.3)",
                        color: "#00e5ff",
                        textDecoration: "none",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                    >
                      <Truck size={14} /> View Van Stock
                    </Link>

                    <button
                      onClick={() => handleUnpair(p.id, p.mateName, p.leadEngineerName)}
                      title="Revoke pairing and return operative to solo status"
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderRadius: "8px",
                        background: "rgba(239, 68, 68, 0.12)",
                        border: "1px solid rgba(239, 68, 68, 0.3)",
                        color: "#ef4444",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                    >
                      Unpair Crew
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Solo Field Operatives Overview */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "1rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Truck size={20} color="#94a3b8" /> Solo Field Operatives &amp; Vehicles
        </h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1rem" }}>
          {/* Solo Lead Engineers */}
          <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#cbd5e1", margin: "0 0 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Solo Lead Engineers</span>
              <span style={{ fontSize: "0.75rem", background: "rgba(255,255,255,0.1)", padding: "0.15rem 0.5rem", borderRadius: "12px" }}>{soloEngineers.length}</span>
            </h3>
            {soloEngineers.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>All lead engineers are currently paired with mates.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {soloEngineers.map(e => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.6rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{e.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{e.employer || "Direct Staff"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#facc15", background: "rgba(250, 204, 21, 0.1)", padding: "0.15rem 0.4rem", borderRadius: "4px" }}>
                        {e.vehicleReg || "No Reg"}
                      </span>
                      <Link href={`/admin/vans?engineer=${encodeURIComponent(e.id)}`} style={{ color: "var(--primary)", fontSize: "0.75rem", textDecoration: "none" }}>
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unpaired Mates / Apprentices */}
          <div className="glass-panel" style={{ padding: "1.25rem", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#fbbf24", margin: "0 0 0.85rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Unpaired Mates &amp; Apprentices</span>
              <span style={{ fontSize: "0.75rem", background: "rgba(251, 191, 36, 0.15)", color: "#fbbf24", padding: "0.15rem 0.5rem", borderRadius: "12px" }}>{unpairedMates.length}</span>
            </h3>
            {unpairedMates.length === 0 ? (
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>All mates and apprentices are currently paired with lead engineers.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {unpairedMates.map(m => (
                  <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.6rem", background: "rgba(0,0,0,0.2)", borderRadius: "6px" }}>
                    <div>
                      <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#fff" }}>{m.name}</div>
                      <div style={{ fontSize: "0.72rem", color: m.role === "apprentice" ? "#c084fc" : "#38bdf8", textTransform: "uppercase", fontWeight: 700 }}>
                        {m.role}
                      </div>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                      Ready to pair
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
