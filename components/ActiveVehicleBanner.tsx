"use client";

import { useState, useEffect } from "react";
import { Truck, ChevronDown, Check, X, User, Car } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/db";

export function ActiveVehicleBanner() {
  const { user, activeVehicleReg, activeVehicleOwner, activePairingStatus, activePairing, setActiveVehicle, requestPairing, refreshPairing } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [companyVans, setCompanyVans] = useState<Array<{ vehicleReg: string; ownerName: string; role: string; userId: string }>>([]);
  const [customReg, setCustomReg] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestingReg, setRequestingReg] = useState<string | null>(null);

  useEffect(() => {
    if (modalOpen) {
      setLoading(true);
      db.getCompanyVans().then(vans => {
        setCompanyVans(vans);
        setLoading(false);
      });
      refreshPairing();
    }
  }, [modalOpen]);

  // Only show Active Working Van banner for Mates and Apprentices who move between vehicles
  if (user?.canViewStores || (user?.role !== "mate" && user?.role !== "apprentice")) return null;

  const isMateOrApprentice = user?.role === "mate" || user?.role === "apprentice";
  const currentDisplayReg = isMateOrApprentice && activePairingStatus === "pending"
    ? (user?.vehicleReg || "Assigned Van")
    : (activeVehicleReg || user?.vehicleReg || "Not Selected");
    
  const currentDisplayOwner = isMateOrApprentice && activePairingStatus === "pending"
    ? user?.name
    : (activeVehicleOwner || (user?.vehicleReg === currentDisplayReg ? user?.name : undefined));

  const handleSelectVan = async (reg: string, ownerName?: string) => {
    if (!isMateOrApprentice || reg === user?.vehicleReg) {
      setActiveVehicle(reg, ownerName);
      setModalOpen(false);
      return;
    }

    // If mate or apprentice selects an engineer's van:
    if (activePairing && activePairing.vehicleReg === reg && activePairing.pairingStatus === "approved") {
      setActiveVehicle(reg, ownerName);
      setModalOpen(false);
      return;
    }

    // Submit pairing request
    setRequestingReg(reg);
    await requestPairing(reg, ownerName || "Lead Engineer");
    setRequestingReg(null);
    setModalOpen(false);
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customReg.trim()) return;
    setActiveVehicle(customReg.trim().toUpperCase(), "Custom Van");
    setCustomReg("");
    setModalOpen(false);
  };

  const isPending = isMateOrApprentice && activePairingStatus === "pending";
  const isApproved = isMateOrApprentice && activePairingStatus === "approved";

  return (
    <>
      <div 
        onClick={() => setModalOpen(true)}
        style={{
          background: isPending
            ? "linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)"
            : isApproved
            ? "linear-gradient(90deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)"
            : activeVehicleReg 
            ? "linear-gradient(90deg, rgba(0, 229, 255, 0.08) 0%, rgba(0, 229, 255, 0.03) 100%)" 
            : "linear-gradient(90deg, rgba(255, 170, 0, 0.12) 0%, rgba(255, 170, 0, 0.04) 100%)",
          border: isPending
            ? "1px solid rgba(234, 179, 8, 0.5)"
            : isApproved
            ? "1px solid rgba(34, 197, 94, 0.5)"
            : activeVehicleReg ? "1px solid rgba(0, 229, 255, 0.25)" : "1px solid rgba(255, 170, 0, 0.4)",
          borderRadius: "12px",
          padding: "0.6rem 0.9rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          margin: "0 0 1rem 0",
          transition: "all 0.2s ease"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem", overflow: "hidden" }}>
          <div style={{
            width: "32px",
            height: "32px",
            borderRadius: "8px",
            background: isPending
              ? "rgba(234, 179, 8, 0.2)"
              : isApproved
              ? "rgba(34, 197, 94, 0.2)"
              : activeVehicleReg ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 170, 0, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Truck size={17} color={isPending ? "#eab308" : isApproved ? "#22c55e" : activeVehicleReg ? "var(--primary)" : "var(--warning)"} />
          </div>
          <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>
                {isMateOrApprentice ? "Active Working Van" : "Assigned Vehicle"}
              </span>
              {isPending && (
                <span style={{ fontSize: "0.68rem", background: "rgba(234, 179, 8, 0.2)", color: "#eab308", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                  Awaiting Approval
                </span>
              )}
              {isApproved && (
                <span style={{ fontSize: "0.68rem", background: "rgba(34, 197, 94, 0.2)", color: "#22c55e", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                  Paired & Approved
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <span style={{ 
                fontFamily: "var(--font-geist-mono)", 
                fontWeight: 800, 
                fontSize: "0.95rem", 
                color: isPending ? "#eab308" : isApproved ? "#fff" : activeVehicleReg ? "#fff" : "var(--warning)" 
              }}>
                {isApproved ? activeVehicleReg : currentDisplayReg}
              </span>
              {(isApproved ? activeVehicleOwner : currentDisplayOwner) && (
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  ({isApproved ? activeVehicleOwner : currentDisplayOwner})
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          background: "rgba(255, 255, 255, 0.05)",
          padding: "0.3rem 0.6rem",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: isPending ? "#eab308" : "var(--primary)",
          flexShrink: 0
        }}>
          <span>{isPending ? "Pending" : "Change"}</span>
          <ChevronDown size={14} />
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div 
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "460px",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid rgba(0, 229, 255, 0.3)",
              background: "#111822"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Truck size={20} color="var(--primary)" /> Select Operating Van
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  Choose the vehicle you are moving cylinders in today
                </p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "0.25rem" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* My Assigned Van (if exists) */}
            {user?.vehicleReg && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                  My Assigned Vehicle
                </div>
                <div
                  onClick={() => handleSelectVan(user.vehicleReg!, user.name)}
                  style={{
                    padding: "0.85rem 1rem",
                    borderRadius: "10px",
                    background: activeVehicleReg === user.vehicleReg ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    border: activeVehicleReg === user.vehicleReg ? "1px solid var(--primary)" : "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <Car size={18} color="var(--primary)" />
                    <div>
                      <div style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, fontSize: "1rem", color: "#fff" }}>
                        {user.vehicleReg}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                        My Assigned Van ({user.name})
                      </div>
                    </div>
                  </div>
                  {activeVehicleReg === user.vehicleReg && <Check size={18} color="var(--primary)" />}
                </div>
              </div>
            )}

            {/* Lead Engineers' Vans */}
            <div style={{ marginBottom: "1.25rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                Company & Lead Engineers&apos; Vans
              </div>
              {loading ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Loading company vans...
                </div>
              ) : companyVans.length === 0 ? (
                <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  No other company vans found
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {companyVans
                    .filter(v => v.vehicleReg !== user?.vehicleReg)
                    .map(van => {
                      const isVanActive = activeVehicleReg === van.vehicleReg;
                      const isVanApproved = activePairing?.vehicleReg === van.vehicleReg && activePairing?.pairingStatus === "approved";
                      const isVanPending = activePairing?.vehicleReg === van.vehicleReg && activePairing?.pairingStatus === "pending";

                      return (
                        <div
                          key={van.vehicleReg}
                          onClick={() => handleSelectVan(van.vehicleReg, van.ownerName)}
                          style={{
                            padding: "0.8rem 1rem",
                            borderRadius: "10px",
                            background: (isVanApproved && isVanActive) 
                              ? "rgba(34, 197, 94, 0.15)" 
                              : isVanPending 
                              ? "rgba(234, 179, 8, 0.15)" 
                              : isVanActive 
                              ? "rgba(0, 229, 255, 0.15)" 
                              : "rgba(255, 255, 255, 0.03)",
                            border: (isVanApproved && isVanActive)
                              ? "1px solid #22c55e"
                              : isVanPending
                              ? "1px solid #eab308"
                              : isVanActive
                              ? "1px solid var(--primary)"
                              : "1px solid rgba(255, 255, 255, 0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            cursor: "pointer",
                            transition: "all 0.15s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                            <User size={16} color={isVanApproved ? "#22c55e" : isVanPending ? "#eab308" : isVanActive ? "var(--primary)" : "var(--text-muted)"} />
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <span style={{ fontFamily: "var(--font-geist-mono)", fontWeight: 700, fontSize: "0.95rem", color: "#fff" }}>
                                  {van.vehicleReg}
                                </span>
                                {isMateOrApprentice && isVanApproved && (
                                  <span style={{ fontSize: "0.68rem", background: "rgba(34, 197, 94, 0.2)", color: "#22c55e", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                                    Approved
                                  </span>
                                )}
                                {isMateOrApprentice && isVanPending && (
                                  <span style={{ fontSize: "0.68rem", background: "rgba(234, 179, 8, 0.2)", color: "#eab308", padding: "0.1rem 0.35rem", borderRadius: "4px", fontWeight: 700 }}>
                                    Pending Approval
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {van.ownerName}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isMateOrApprentice && !isVanApproved && !isVanPending && (
                              <span style={{ fontSize: "0.72rem", background: "rgba(0, 229, 255, 0.1)", color: "var(--primary)", padding: "0.25rem 0.5rem", borderRadius: "6px", fontWeight: 600 }}>
                                Request Access
                              </span>
                            )}
                            {isVanApproved && isVanActive && <Check size={18} color="#22c55e" />}
                            {isVanPending && <span style={{ fontSize: "0.9rem" }}>⏳</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Custom Registration Input */}
            <form onSubmit={handleSaveCustom} style={{ borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.5rem" }}>
                Or Enter Another Registration
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  value={customReg}
                  onChange={e => setCustomReg(e.target.value.toUpperCase())}
                  placeholder="e.g. KV71 FLP"
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.15)",
                    borderRadius: "8px",
                    color: "#fff",
                    fontFamily: "var(--font-geist-mono)",
                    fontWeight: 700,
                    fontSize: "0.95rem"
                  }}
                />
                <button
                  type="submit"
                  disabled={!customReg.trim()}
                  style={{
                    padding: "0.75rem 1.25rem",
                    background: "var(--primary)",
                    border: "none",
                    borderRadius: "8px",
                    color: "#000",
                    fontWeight: 700,
                    cursor: customReg.trim() ? "pointer" : "not-allowed",
                    opacity: customReg.trim() ? 1 : 0.5
                  }}
                >
                  Set Van
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
