"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, RefreshCw, Warehouse, History, Camera, Check } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, BrazingExchange } from "@/lib/db";
import { BrazingKitCard } from "@/components/BrazingKitCard";
import { ActiveVehicleBanner } from "@/components/ActiveVehicleBanner";

export default function EngineerBrazingPage() {
  const { user, activeVehicleReg } = useAuth();
  const [exchanges, setExchanges] = useState<BrazingExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const loadHistory = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const logs = await db.getBrazingExchanges({ engineerId: user.id, limit: 20 });
      setExchanges(logs);
    } catch (e) {
      console.error("Error loading brazing history:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [user?.id]);

  if (!user) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem", maxWidth: "600px", margin: "0 auto", paddingBottom: "5rem" }}>
      {/* Top Navigation */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <Link
          href="/engineer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.88rem",
            fontWeight: 600
          }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          background: "rgba(249, 115, 22, 0.2)",
          color: "#f97316",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Flame size={24} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
            Brazing Gas Kit
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
            Oxygen (FSW) & Propane (Calor Gas) • Purchased Fleet
          </p>
        </div>
      </div>

      <div style={{ marginBottom: "1.25rem" }}>
        <ActiveVehicleBanner />
      </div>

      {/* Brazing Kit Card (Live Balances + Swap & Move actions) */}
      <div style={{ marginBottom: "1.75rem" }}>
        <BrazingKitCard
          engineerId={user.id}
          engineerName={user.name || "Engineer"}
          vehicleReg={activeVehicleReg || user.vehicleReg}
        />
      </div>

      {/* Recent Activity Log */}
      <div>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "0.85rem"
        }}>
          <h2 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <History size={18} color="#94a3b8" /> Recent Activity
          </h2>
          <button
            onClick={loadHistory}
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", padding: "1.5rem" }}>
            Loading activity...
          </p>
        ) : exchanges.length === 0 ? (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px dashed rgba(255,255,255,0.15)",
            borderRadius: "12px",
            padding: "2rem 1rem",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "0.85rem"
          }}>
            No swaps or moves recorded yet. Use the buttons above to log an exchange at FSW/Calor or a move with Stores.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {exchanges.map((exc) => {
              const isStores = exc.actionType === "transfer_stores";
              const isPurchase = exc.actionType === "purchase_new";

              return (
                <div
                  key={exc.id}
                  style={{
                    background: "var(--surface, #1e293b)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        color: exc.gasType === "Oxygen" ? "#60a5fa" : "#fb923c"
                      }}>
                        {exc.quantity}x {exc.gasType}
                      </span>
                      <span style={{
                        fontSize: "0.7rem",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        background: isPurchase
                          ? "rgba(245, 158, 11, 0.2)"
                          : isStores
                            ? "rgba(139, 92, 246, 0.2)"
                            : "rgba(34, 197, 94, 0.15)",
                        color: isPurchase
                          ? "#f59e0b"
                          : isStores
                            ? "#c4b5fd"
                            : "#22c55e",
                        fontWeight: 600
                      }}>
                        {isPurchase
                          ? "New Purchase"
                          : isStores
                            ? "Stores Move"
                            : "1-for-1 Swap"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                      {exc.supplier} {exc.branch ? `• ${exc.branch}` : ""}
                    </div>

                    {exc.reason && (
                      <div style={{ fontSize: "0.75rem", color: "#cbd5e1", marginTop: "2px" }}>
                        {exc.reason}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {new Date(exc.exchangeDate).toLocaleDateString("en-GB")}
                    </span>
                    {exc.receiptPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(exc.receiptPhotoUrl!)}
                        style={{
                          background: "rgba(59, 130, 246, 0.15)",
                          border: "1px solid rgba(59, 130, 246, 0.3)",
                          color: "#60a5fa",
                          borderRadius: "4px",
                          padding: "2px 6px",
                          fontSize: "0.7rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px"
                        }}
                      >
                        <Camera size={11} /> Receipt
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox photo modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(4px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem"
          }}
        >
          <img
            src={previewPhotoUrl}
            alt="Receipt"
            style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "10px", objectFit: "contain" }}
          />
        </div>
      )}
    </div>
  );
}
