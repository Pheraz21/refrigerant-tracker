"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Flame, RefreshCw, Warehouse, ChevronDown, ChevronUp, Camera, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, BrazingInventoryItem, BrazingExchange } from "@/lib/db";

export default function EngineerBrazingPage() {
  const { user, activeVehicleReg } = useAuth();
  const [items, setItems] = useState<BrazingInventoryItem[]>([]);
  const [exchanges, setExchanges] = useState<BrazingExchange[]>([]);
  const [loading, setLoading] = useState(true);

  // History collapse toggle
  const [showHistory, setShowHistory] = useState(false);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [inv, logs] = await Promise.all([
        db.getBrazingInventory("engineer", user.id),
        db.getBrazingExchanges({ engineerId: user.id, limit: 10 })
      ]);
      setItems(inv || []);
      setExchanges(logs || []);
    } catch (e) {
      console.error("Error loading brazing data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const oxygenItem = items.find(i => i.gasType === "Oxygen");
  const propaneItem = items.find(i => i.gasType === "Propane");

  const oxygenCount = oxygenItem !== undefined ? oxygenItem.quantity : 1;
  const propaneCount = propaneItem !== undefined ? propaneItem.quantity : 1;

  if (!user) {
    return (
      <div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8" }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={{ padding: "1.25rem 1rem", maxWidth: "520px", margin: "0 auto", paddingBottom: "6rem" }}>
      {/* Top Back Navigation */}
      <div style={{ marginBottom: "1rem" }}>
        <Link
          href="/engineer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.9rem",
            fontWeight: 600,
            padding: "4px 0"
          }}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </Link>
      </div>

      {/* Screen Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <div style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: "rgba(249, 115, 22, 0.2)",
          color: "#f97316",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Flame size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "#fff" }}>
            Brazing Gas Kit
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
            {activeVehicleReg || user.vehicleReg || "Assigned Van Stock"}
          </p>
        </div>
      </div>

      {/* Current Balances - Large & Simple */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.85rem",
        marginBottom: "1.75rem"
      }}>
        {/* Oxygen Card */}
        <Link
          href="/engineer/brazing/swap?gas=Oxygen"
          style={{
            background: "rgba(59, 130, 246, 0.12)",
            border: "2px solid rgba(59, 130, 246, 0.35)",
            borderRadius: "16px",
            padding: "1.25rem 1rem",
            textAlign: "center",
            textDecoration: "none",
            display: "block",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Oxygen (FSW)
          </div>
          <div style={{ fontSize: "2.75rem", fontWeight: 900, color: "#fff", lineHeight: 1.1, margin: "0.5rem 0" }}>
            {loading ? "…" : oxygenCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Bottle{oxygenCount !== 1 ? "s" : ""} on Van
          </div>
        </Link>

        {/* Propane Card */}
        <Link
          href="/engineer/brazing/swap?gas=Propane"
          style={{
            background: "rgba(249, 115, 22, 0.12)",
            border: "2px solid rgba(249, 115, 22, 0.35)",
            borderRadius: "16px",
            padding: "1.25rem 1rem",
            textAlign: "center",
            textDecoration: "none",
            display: "block",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#fb923c", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Propane (Calor)
          </div>
          <div style={{ fontSize: "2.75rem", fontWeight: 900, color: "#fff", lineHeight: 1.1, margin: "0.5rem 0" }}>
            {loading ? "…" : propaneCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
            Bottle{propaneCount !== 1 ? "s" : ""} on Van
          </div>
        </Link>
      </div>

      {/* Big Action Buttons */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
        {/* Action 1: Supplier 1-for-1 Swap */}
        <Link
          href="/engineer/brazing/swap"
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
            color: "#fff",
            textDecoration: "none",
            boxSizing: "border-box",
            borderRadius: "16px",
            padding: "1.25rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            cursor: "pointer",
            textAlign: "left",
            boxShadow: "0 6px 20px rgba(249, 115, 22, 0.35)",
            transition: "transform 0.1s ease"
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <RefreshCw size={26} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              Log Bottle Swap
            </div>
            <div style={{ fontSize: "0.82rem", opacity: 0.9, marginTop: "2px" }}>
              Exchanged empty for full at FSW or Calor Gas
            </div>
          </div>
        </Link>

        {/* Action 2: Stores Move */}
        <Link
          href="/engineer/brazing/stores"
          style={{
            width: "100%",
            background: "var(--surface, #1e293b)",
            border: "2px solid rgba(255, 255, 255, 0.18)",
            color: "#fff",
            textDecoration: "none",
            boxSizing: "border-box",
            borderRadius: "16px",
            padding: "1.25rem 1.25rem",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            cursor: "pointer",
            textAlign: "left",
            boxShadow: "0 4px 14px rgba(0,0,0,0.2)"
          }}
        >
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "rgba(255, 255, 255, 0.08)",
            color: "#f8fafc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Warehouse size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>
              Move In / Out of Stores
            </div>
            <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "2px" }}>
              Pick up from or drop off bottle at HQ Stores
            </div>
          </div>
        </Link>
      </div>

      {/* Rare purchase link */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link
          href="/engineer/brazing/purchase"
          style={{
            background: "transparent",
            border: "none",
            color: "#94a3b8",
            fontSize: "0.82rem",
            cursor: "pointer",
            textDecoration: "underline",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <ShoppingCart size={13} /> Bought a brand new bottle instead of swapping? Tap here
        </Link>
      </div>

      {/* Collapsible Recent Activity */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "1rem" }}>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#94a3b8",
            fontSize: "0.88rem",
            fontWeight: 600,
            cursor: "pointer",
            padding: "0.5rem 0"
          }}
        >
          <span>Recent Activity ({exchanges.length})</span>
          {showHistory ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showHistory && (
          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {exchanges.length === 0 ? (
              <p style={{ fontSize: "0.8rem", color: "#64748b", textAlign: "center", padding: "1rem" }}>
                No recent activity recorded.
              </p>
            ) : (
              exchanges.map((exc) => (
                <div
                  key={exc.id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: "10px",
                    padding: "0.75rem 0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: exc.gasType === "Oxygen" ? "#60a5fa" : "#fb923c" }}>
                      {exc.quantity}x {exc.gasType} • {exc.actionType === "purchase_new" ? "New Buy" : exc.actionType === "transfer_stores" ? "Stores Move" : "1-for-1 Swap"}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {exc.supplier} {exc.branch ? `(${exc.branch})` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                      {new Date(exc.exchangeDate).toLocaleDateString("en-GB")}
                    </div>
                    {exc.receiptPhotoUrl && (
                      <button
                        type="button"
                        onClick={() => setPreviewPhotoUrl(exc.receiptPhotoUrl!)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#38bdf8",
                          fontSize: "0.7rem",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "2px",
                          marginTop: "2px"
                        }}
                      >
                        <Camera size={10} /> Photo
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
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
