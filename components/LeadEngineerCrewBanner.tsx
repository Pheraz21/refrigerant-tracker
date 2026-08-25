"use client";

import { useEffect, useState } from "react";
import { Users, CheckCircle, XCircle, UserMinus, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, VanPairing } from "@/lib/db";

export function LeadEngineerCrewBanner() {
  const { user } = useAuth();
  const [pairings, setPairings] = useState<VanPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPairings = async () => {
    if (!user || user.role !== "engineer") return;
    try {
      const data = await db.getPairingsForLeadEngineer(user.name);
      setPairings(data);
    } catch (e) {
      console.error("Failed to load lead engineer pairings:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPairings();
    const interval = setInterval(loadPairings, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  if (!user || user.role !== "engineer" || pairings.length === 0) {
    return null;
  }

  const pendingRequests = pairings.filter(p => p.pairingStatus === "pending");
  const approvedCrew = pairings.filter(p => p.pairingStatus === "approved");

  const handleResponse = async (id: string, status: "approved" | "rejected" | "revoked") => {
    setIsProcessing(true);
    try {
      await db.respondToPairingRequest(id, status);
      await loadPairings();
    } catch (err) {
      console.error("Failed to respond to pairing request:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ marginBottom: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {/* 1. Pending Approval Requests */}
      {pendingRequests.map(req => (
        <div
          key={req.id}
          className="glass-panel"
          style={{
            border: "1px solid #eab308",
            background: "linear-gradient(90deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)",
            padding: "1rem 1.25rem",
            borderRadius: "14px",
            animation: "pulse 2s infinite"
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(234, 179, 8, 0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Users size={20} color="#eab308" />
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "#fff", fontSize: "0.95rem" }}>
                  Van Access Request: {req.mateName}
                </div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                  {req.mateRole.toUpperCase()} requested access to your van ({req.vehicleReg}) and sites.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <button
                disabled={isProcessing}
                onClick={() => handleResponse(req.id, "approved")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.5rem 0.9rem",
                  background: "#22c55e",
                  border: "none",
                  borderRadius: "8px",
                  color: "#000",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleResponse(req.id, "rejected")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.5rem 0.9rem",
                  background: "rgba(239, 68, 68, 0.2)",
                  border: "1px solid rgba(239, 68, 68, 0.4)",
                  borderRadius: "8px",
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: "pointer"
                }}
              >
                <XCircle size={16} /> Decline
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* 2. Active Paired Crew Members */}
      {approvedCrew.length > 0 && (
        <div
          className="glass-panel"
          style={{
            border: "1px solid rgba(34, 197, 94, 0.3)",
            background: "rgba(34, 197, 94, 0.05)",
            padding: "0.85rem 1.1rem",
            borderRadius: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <ShieldCheck size={16} color="#22c55e" />
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#22c55e", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Paired Crew with Access ({approvedCrew.length})
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {approvedCrew.map(crew => (
              <div
                key={crew.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(0, 0, 0, 0.3)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem"
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{crew.mateName}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                    ({crew.mateRole.toUpperCase()})
                  </span>
                </div>

                <button
                  disabled={isProcessing}
                  onClick={() => handleResponse(crew.id, "revoked")}
                  title="Remove this operative's access to your van and sites"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0.35rem 0.65rem",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "6px",
                    color: "#f87171",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <UserMinus size={13} /> Remove Access
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
