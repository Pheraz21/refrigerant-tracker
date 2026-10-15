"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Warehouse, Check, AlertTriangle, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, BrazingGasType, BrazingInventoryItem } from "@/lib/db";

function BrazingStoresContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeVehicleReg } = useAuth();

  const initialGas = (searchParams.get("gas") as BrazingGasType) || "Oxygen";
  const [gasType, setGasType] = useState<BrazingGasType>(initialGas);
  const [direction, setDirection] = useState<"pickup_from_stores" | "return_to_stores">("pickup_from_stores");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [vanInventory, setVanInventory] = useState<BrazingInventoryItem[]>([]);
  const [storesInventory, setStoresInventory] = useState<BrazingInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [vanData, storesData] = await Promise.all([
        db.getBrazingInventory("engineer", user.id),
        db.getBrazingInventory("stores", "stores")
      ]);
      setVanInventory(vanData || []);
      setStoresInventory(storesData || []);
    } catch (e) {
      console.error("Error loading stores data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const vanItem = vanInventory.find(i => i.gasType === gasType);
  const currentVanCount = vanItem !== undefined ? vanItem.quantity : 1;

  const storesItem = storesInventory.find(i => i.gasType === gasType);
  const currentStoresCount = storesItem !== undefined ? storesItem.quantity : 0;

  // Maximum allowed
  const maxAllowedQty = direction === "pickup_from_stores" ? currentStoresCount : currentVanCount;
  const effectiveQty = maxAllowedQty > 0 ? Math.min(quantity, maxAllowedQty) : 0;
  const qtyOptions = maxAllowedQty > 0 ? Array.from({ length: Math.min(maxAllowedQty, 10) }, (_, i) => i + 1) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage("");

    if (maxAllowedQty === 0) {
      setErrorMessage(
        direction === "pickup_from_stores"
          ? `HQ Stores currently has 0 ${gasType} bottles in stock to pick up.`
          : `You currently have 0 ${gasType} bottles on your van to drop off.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await db.transferBrazingWithStores({
        engineerId: user.id,
        engineerName: user.name || "Engineer",
        vehicleReg: activeVehicleReg || user.vehicleReg,
        gasType,
        direction,
        quantity: effectiveQty,
        notes: notes.trim() || undefined
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/engineer/brazing");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to complete stores transfer");
      setIsSubmitting(false);
    }
  };

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
      <div style={{ marginBottom: "1.25rem" }}>
        <Link
          href="/engineer/brazing"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            color: "#94a3b8",
            textDecoration: "none",
            fontSize: "0.92rem",
            fontWeight: 600,
            padding: "4px 0"
          }}
        >
          <ArrowLeft size={18} /> Back to Brazing Gas Kit
        </Link>
      </div>

      {/* Screen Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1.5rem" }}>
        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          background: "rgba(139, 92, 246, 0.2)",
          color: "#c4b5fd",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Warehouse size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#fff" }}>
            Move In / Out of Stores
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
            HQ Stores cylinder transfer • Fleet total stays constant
          </p>
        </div>
      </div>

      {isSuccess ? (
        <div style={{
          background: "var(--surface, #1e293b)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          borderRadius: "16px",
          padding: "3rem 1.5rem",
          textAlign: "center"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#22c55e",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem auto"
          }}>
            <Check size={38} />
          </div>
          <h2 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            Stores Transfer Complete!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            {direction === "pickup_from_stores"
              ? `Picked up ${effectiveQty}x ${gasType} onto your van.`
              : `Dropped off ${effectiveQty}x ${gasType} at HQ Stores.`} Returning...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Step 1: Direction Toggle */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              1. What Are You Doing?
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <button
                type="button"
                onClick={() => setDirection("pickup_from_stores")}
                style={{
                  padding: "1.1rem 0.75rem",
                  borderRadius: "14px",
                  border: direction === "pickup_from_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                  background: direction === "pickup_from_stores" ? "rgba(139, 92, 246, 0.25)" : "var(--surface, #1e293b)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 800, fontSize: "1.05rem" }}>
                  <ArrowDownRight size={20} color="#c4b5fd" /> Pick Up
                </div>
                <div style={{ fontSize: "0.8rem", color: "#c4b5fd", marginTop: "3px", fontWeight: 600 }}>
                  Stores → Van (+1)
                </div>
                <div style={{ fontSize: "0.72rem", color: currentStoresCount === 0 ? "#ef4444" : "#94a3b8", marginTop: "4px", fontWeight: currentStoresCount === 0 ? 700 : 400 }}>
                  {loading ? "…" : currentStoresCount === 0 ? "Stores: Out of stock (0)" : `Stores has ${currentStoresCount}`}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDirection("return_to_stores")}
                style={{
                  padding: "1.1rem 0.75rem",
                  borderRadius: "14px",
                  border: direction === "return_to_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                  background: direction === "return_to_stores" ? "rgba(139, 92, 246, 0.25)" : "var(--surface, #1e293b)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 800, fontSize: "1.05rem" }}>
                  <ArrowUpRight size={20} color="#c4b5fd" /> Drop Off
                </div>
                <div style={{ fontSize: "0.8rem", color: "#c4b5fd", marginTop: "3px", fontWeight: 600 }}>
                  Van → Stores (-1)
                </div>
                <div style={{ fontSize: "0.72rem", color: currentVanCount === 0 ? "#ef4444" : "#94a3b8", marginTop: "4px", fontWeight: currentVanCount === 0 ? 700 : 400 }}>
                  {loading ? "…" : currentVanCount === 0 ? "Van: None (0)" : `Van has ${currentVanCount}`}
                </div>
              </button>
            </div>
          </div>

          {/* Step 2: Select Gas */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              2. Select Gas Type
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <button
                type="button"
                onClick={() => setGasType("Oxygen")}
                style={{
                  padding: "1.1rem 0.75rem",
                  borderRadius: "14px",
                  border: gasType === "Oxygen" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                  background: gasType === "Oxygen" ? "rgba(59, 130, 246, 0.22)" : "var(--surface, #1e293b)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>Oxygen</div>
                <div style={{ fontSize: "0.8rem", color: "#60a5fa", marginTop: "3px", fontWeight: 600 }}>
                  FSW Cylinder
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGasType("Propane")}
                style={{
                  padding: "1.1rem 0.75rem",
                  borderRadius: "14px",
                  border: gasType === "Propane" ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.15)",
                  background: gasType === "Propane" ? "rgba(249, 115, 22, 0.22)" : "var(--surface, #1e293b)",
                  color: "#fff",
                  cursor: "pointer",
                  textAlign: "center"
                }}
              >
                <div style={{ fontSize: "1.15rem", fontWeight: 800 }}>Propane</div>
                <div style={{ fontSize: "0.8rem", color: "#fb923c", marginTop: "3px", fontWeight: 600 }}>
                  Calor Gas Cylinder
                </div>
              </button>
            </div>
          </div>

          {/* Warning if 0 available */}
          {maxAllowedQty === 0 && (
            <div style={{
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid #ef4444",
              borderRadius: "12px",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#fca5a5",
              fontSize: "0.88rem",
              fontWeight: 600
            }}>
              <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>
                {direction === "pickup_from_stores"
                  ? `There are currently 0 ${gasType} bottles in HQ Stores to pick up.`
                  : `You currently have 0 ${gasType} bottles on your van to drop off.`}
              </span>
            </div>
          )}

          {/* Step 3: Quantity Selection */}
          {maxAllowedQty > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                3. Number of Cylinders to Move (Max: {maxAllowedQty})
              </label>
              <div style={{ display: "flex", gap: "0.6rem" }}>
                {qtyOptions.map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    style={{
                      flex: 1,
                      padding: "0.85rem",
                      borderRadius: "12px",
                      border: effectiveQty === qty ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                      background: effectiveQty === qty ? "rgba(139, 92, 246, 0.3)" : "var(--surface, #1e293b)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "1.1rem",
                      cursor: "pointer"
                    }}
                  >
                    {qty}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional Note */}
          {maxAllowedQty > 0 && (
            <div style={{ marginBottom: "1.75rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                Note (Optional)
              </label>
              <input
                type="text"
                placeholder={direction === "pickup_from_stores" ? "e.g. Extra kit for big install" : "e.g. De-kitted spare van bottle"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "0.9rem"
                }}
              />
            </div>
          )}

          {errorMessage && (
            <div style={{ color: "#ef4444", fontSize: "0.88rem", marginBottom: "1.25rem", fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || maxAllowedQty === 0}
            style={{
              width: "100%",
              padding: "1.1rem",
              borderRadius: "16px",
              border: "none",
              background: maxAllowedQty === 0
                ? "rgba(255,255,255,0.1)"
                : "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
              color: maxAllowedQty === 0 ? "#64748b" : "#fff",
              fontWeight: 800,
              fontSize: "1.1rem",
              cursor: maxAllowedQty === 0 ? "not-allowed" : "pointer",
              boxShadow: maxAllowedQty > 0 ? "0 6px 20px rgba(139, 92, 246, 0.35)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {isSubmitting ? (
              "Updating Stores..."
            ) : maxAllowedQty === 0 ? (
              direction === "pickup_from_stores" ? "Cannot Pick Up (0 in Stores)" : "Cannot Drop Off (0 on Van)"
            ) : (
              <>
                <Warehouse size={20} /> Confirm Move ({effectiveQty}x {gasType})
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function BrazingStoresPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8" }}>Loading...</div>}>
      <BrazingStoresContent />
    </Suspense>
  );
}
