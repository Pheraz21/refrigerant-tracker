"use client";

import { useEffect, useState } from "react";
import { Flame, RefreshCw, Warehouse, PlusCircle, CheckCircle2, ArrowRightLeft } from "lucide-react";
import { db, BrazingInventoryItem, BrazingGasType } from "@/lib/db";
import { BrazingExchangeModal } from "./BrazingExchangeModal";

interface BrazingKitCardProps {
  engineerId: string;
  engineerName: string;
  vehicleReg?: string;
  compact?: boolean;
}

export function BrazingKitCard({
  engineerId,
  engineerName,
  vehicleReg,
  compact = false
}: BrazingKitCardProps) {
  const [items, setItems] = useState<BrazingInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedGas, setSelectedGas] = useState<BrazingGasType>("Oxygen");
  const [modalMode, setModalMode] = useState<"exchange" | "stores" | "purchase">("exchange");

  const loadInventory = async () => {
    if (!engineerId) return;
    try {
      const data = await db.getBrazingInventory("engineer", engineerId);
      setItems(data);
    } catch (e) {
      console.error("Error loading brazing inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, [engineerId]);

  const oxygenItem = items.find(i => i.gasType === "Oxygen");
  const propaneItem = items.find(i => i.gasType === "Propane");

  // Default standard issue is 1 Oxygen and 1 Propane if unset
  const oxygenCount = oxygenItem !== undefined ? oxygenItem.quantity : 1;
  const propaneCount = propaneItem !== undefined ? propaneItem.quantity : 1;

  const handleOpenModal = (gas: BrazingGasType = "Oxygen", mode: "exchange" | "stores" | "purchase" = "exchange") => {
    setSelectedGas(gas);
    setModalMode(mode);
    setIsModalOpen(true);
  };

  return (
    <>
      <div style={{
        background: "var(--surface, #1e293b)",
        border: "1px solid rgba(249, 115, 22, 0.25)",
        borderRadius: "14px",
        padding: compact ? "1rem" : "1.25rem",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Subtle orange accent stripe */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "3px",
          background: "linear-gradient(90deg, #f97316, #eab308)"
        }} />

        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          marginBottom: "0.85rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "rgba(249, 115, 22, 0.2)",
              color: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={18} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Brazing Gas Kit</span>
                <span style={{
                  fontSize: "0.7rem",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#22c55e",
                  fontWeight: 600
                }}>
                  Purchased Fleet
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                Oxygen (FSW) & Propane (Calor Gas)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              onClick={() => handleOpenModal("Oxygen", "stores")}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                background: "rgba(139, 92, 246, 0.15)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                color: "#c4b5fd",
                fontWeight: 600,
                fontSize: "0.78rem",
                cursor: "pointer"
              }}
            >
              <Warehouse size={13} /> Stores Move
            </button>
            <button
              onClick={() => handleOpenModal("Oxygen", "exchange")}
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "0.45rem 0.75rem",
                borderRadius: "8px",
                background: "#f97316",
                color: "#fff",
                fontWeight: 700,
                fontSize: "0.78rem",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(249, 115, 22, 0.3)"
              }}
            >
              <RefreshCw size={13} /> Log Bottle Swap
            </button>
          </div>
        </div>

        {/* Cylinder counts grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem"
        }}>
          {/* Oxygen Card */}
          <div
            onClick={() => handleOpenModal("Oxygen", "exchange")}
            style={{
              background: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "10px",
              padding: "0.75rem",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#60a5fa" }}>Oxygen</span>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>FSW Only</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                {loading ? "-" : oxygenCount}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                bottle{oxygenCount !== 1 ? "s" : ""} on van
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#38bdf8", marginTop: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
              <RefreshCw size={10} /> Tap to swap / move
            </div>
          </div>

          {/* Propane Card */}
          <div
            onClick={() => handleOpenModal("Propane", "exchange")}
            style={{
              background: "rgba(249, 115, 22, 0.08)",
              border: "1px solid rgba(249, 115, 22, 0.2)",
              borderRadius: "10px",
              padding: "0.75rem",
              cursor: "pointer",
              transition: "transform 0.15s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#fb923c" }}>Propane</span>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Calor Gas</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginTop: "4px" }}>
              <span style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                {loading ? "-" : propaneCount}
              </span>
              <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                bottle{propaneCount !== 1 ? "s" : ""} on van
              </span>
            </div>
            <div style={{ fontSize: "0.7rem", color: "#fb923c", marginTop: "4px", display: "flex", alignItems: "center", gap: "3px" }}>
              <RefreshCw size={10} /> Tap to swap / move
            </div>
          </div>
        </div>
      </div>

      <BrazingExchangeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        engineerId={engineerId}
        engineerName={engineerName}
        vehicleReg={vehicleReg}
        initialGasType={selectedGas}
        initialMode={modalMode}
        onSuccess={loadInventory}
      />
    </>
  );
}
