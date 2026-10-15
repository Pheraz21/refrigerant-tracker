"use client";

import { useState, useEffect } from "react";
import { Flame, X, Camera, AlertTriangle, Check, RefreshCw, ShoppingCart, Building2, Warehouse, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { db, BrazingGasType, BrazingActionType, BrazingInventoryItem } from "@/lib/db";

interface BrazingExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  engineerId: string;
  engineerName: string;
  vehicleReg?: string;
  onSuccess?: () => void;
  initialGasType?: BrazingGasType;
  initialMode?: "exchange" | "stores" | "purchase";
}

export function BrazingExchangeModal({
  isOpen,
  onClose,
  engineerId,
  engineerName,
  vehicleReg,
  onSuccess,
  initialGasType = "Oxygen",
  initialMode = "exchange"
}: BrazingExchangeModalProps) {
  const actionMode = initialMode;
  const [gasType, setGasType] = useState<BrazingGasType>(initialGasType);
  const [supplier, setSupplier] = useState<string>(initialGasType === "Oxygen" ? "FSW" : "Calor Gas");
  const [branch, setBranch] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Stores Transfer direction
  const [storesDirection, setStoresDirection] = useState<"pickup_from_stores" | "return_to_stores">("pickup_from_stores");
  const [vanInventory, setVanInventory] = useState<BrazingInventoryItem[]>([]);
  const [storesInventory, setStoresInventory] = useState<BrazingInventoryItem[]>([]);

  // Always load live inventories when opened
  useEffect(() => {
    if (isOpen) {
      setGasType(initialGasType);
      setSupplier(initialGasType === "Oxygen" ? "FSW" : "Calor Gas");
      setQuantity(1);
      setReason("");
      setPoNumber("");
      setNotes("");
      setPhotoUrl("");
      setErrorMessage("");
      setIsSuccess(false);

      Promise.all([
        db.getBrazingInventory("engineer", engineerId),
        db.getBrazingInventory("stores", "stores")
      ]).then(([vanData, storesData]) => {
        setVanInventory(vanData || []);
        setStoresInventory(storesData || []);
      });
    }
  }, [isOpen, initialMode, initialGasType, engineerId]);

  if (!isOpen) return null;

  const handleGasChange = (type: BrazingGasType) => {
    setGasType(type);
    if (type === "Oxygen") {
      setSupplier("FSW");
    } else {
      setSupplier("Calor Gas");
    }
  };

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Live count lookups
  const vanItem = vanInventory.find(i => i.gasType === gasType);
  const currentVanCount = vanItem !== undefined ? vanItem.quantity : 1;

  const storesItem = storesInventory.find(i => i.gasType === gasType);
  const currentStoresCount = storesItem !== undefined ? storesItem.quantity : 0;

  // Determine maximum allowable quantity based on mode and direction
  let maxAllowedQty = 1;
  let cannotPerformReason = "";

  if (actionMode === "exchange") {
    maxAllowedQty = currentVanCount;
    if (currentVanCount === 0) {
      cannotPerformReason = `You currently have 0 ${gasType} bottles on your van to exchange.`;
    }
  } else if (actionMode === "stores") {
    if (storesDirection === "pickup_from_stores") {
      maxAllowedQty = currentStoresCount;
      if (currentStoresCount === 0) {
        cannotPerformReason = `There are currently 0 ${gasType} bottles in HQ Stores to pick up.`;
      }
    } else {
      // return_to_stores
      maxAllowedQty = currentVanCount;
      if (currentVanCount === 0) {
        cannotPerformReason = `You currently have 0 ${gasType} bottles on your van to return.`;
      }
    }
  } else {
    // purchase
    maxAllowedQty = 3;
  }

  // Auto-clamp selected quantity to maximum allowable
  const effectiveQty = maxAllowedQty > 0 ? Math.min(Math.max(1, quantity), maxAllowedQty) : 0;

  // Generate integer options strictly up to maxAllowedQty
  const qtyOptions = maxAllowedQty > 0
    ? Array.from({ length: Math.min(maxAllowedQty, 10) }, (_, i) => i + 1)
    : [];

  // Preview calculations for Stores Transfer
  const nextVanCount = storesDirection === "pickup_from_stores"
    ? currentVanCount + effectiveQty
    : Math.max(0, currentVanCount - effectiveQty);

  const nextStoresCount = storesDirection === "pickup_from_stores"
    ? Math.max(0, currentStoresCount - effectiveQty)
    : currentStoresCount + effectiveQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (maxAllowedQty === 0) {
      setErrorMessage(cannotPerformReason || "Action cannot be performed with 0 available bottles.");
      return;
    }

    if (actionMode === "purchase" && !reason.trim()) {
      setErrorMessage("Please enter a justification/reason for purchasing a new cylinder.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionMode === "stores") {
        await db.transferBrazingWithStores({
          engineerId,
          engineerName,
          vehicleReg,
          gasType,
          direction: storesDirection,
          quantity: effectiveQty,
          notes: notes.trim() || undefined
        });
      } else {
        const actionType: BrazingActionType = actionMode === "purchase" ? "purchase_new" : "swap_empty_for_full";
        await db.logBrazingExchange({
          exchangeDate: new Date().toISOString(),
          engineerId,
          engineerName,
          gasType,
          supplier,
          actionType,
          quantity: effectiveQty,
          reason: actionMode === "purchase" ? reason.trim() : undefined,
          poNumber: poNumber.trim() || undefined,
          branch: branch.trim() || undefined,
          receiptPhotoUrl: photoUrl || undefined,
          notes: notes.trim() || undefined,
          loggedBy: engineerName,
        });
      }

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log brazing operation");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem"
    }}>
      <div style={{
        background: "var(--surface, #1e293b)",
        color: "var(--foreground, #fff)",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "480px",
        maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Dedicated Header for the Action */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: actionMode === "exchange"
                ? "rgba(249, 115, 22, 0.2)"
                : actionMode === "stores"
                  ? "rgba(139, 92, 246, 0.2)"
                  : "rgba(245, 158, 11, 0.2)",
              color: actionMode === "exchange"
                ? "#f97316"
                : actionMode === "stores"
                  ? "#c4b5fd"
                  : "#f59e0b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              {actionMode === "exchange" && <RefreshCw size={22} />}
              {actionMode === "stores" && <Warehouse size={22} />}
              {actionMode === "purchase" && <ShoppingCart size={22} />}
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                {actionMode === "exchange" && "Log Bottle Swap (1-for-1)"}
                {actionMode === "stores" && "Move In / Out of Stores"}
                {actionMode === "purchase" && "Purchase New Bottle"}
              </h2>
              <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
                {actionMode === "exchange" && "Empty cylinder returned for full"}
                {actionMode === "stores" && "Transfer between Van and HQ Stores"}
                {actionMode === "purchase" && "Rare outright fleet purchase"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {isSuccess ? (
          <div style={{ padding: "3rem 1.5rem", textAlign: "center" }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#22c55e",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem auto"
            }}>
              <Check size={36} />
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {actionMode === "exchange" && "Bottle Swap Logged!"}
              {actionMode === "stores" && "Stores Move Complete!"}
              {actionMode === "purchase" && "New Purchase Recorded!"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              {actionMode === "exchange" && `1-for-1 swap of ${effectiveQty}x ${gasType} confirmed.`}
              {actionMode === "stores" && (storesDirection === "pickup_from_stores"
                ? `Picked up ${effectiveQty}x ${gasType} from Stores onto your van.`
                : `Returned ${effectiveQty}x ${gasType} from your van to Stores.`)}
              {actionMode === "purchase" && `New ${effectiveQty}x ${gasType} cylinder added to your van kit.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.25rem 1.5rem" }}>

            {/* Warning ONLY for Purchase Mode */}
            {actionMode === "purchase" && (
              <div style={{
                background: "rgba(245, 158, 11, 0.12)",
                border: "1px solid #f59e0b",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start"
              }}>
                <AlertTriangle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
                <div style={{ fontSize: "0.82rem", lineHeight: "1.4", color: "#fef3c7" }}>
                  <strong style={{ color: "#f59e0b", display: "block", marginBottom: "3px" }}>
                    Warning: New Cylinder Purchase
                  </strong>
                  All engineers have already been allocated their standard brazing sets. Normal procedure is to exchange an empty cylinder for a full one (1-for-1 swap). Only record a New Purchase if an outright new cylinder was bought (e.g. replacing a lost cylinder or specifically authorized by management).
                </div>
              </div>
            )}

            {/* Stores Direction Toggle (ONLY for Stores Mode) */}
            {actionMode === "stores" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                  Select Direction
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setStoresDirection("pickup_from_stores")}
                    style={{
                      padding: "0.85rem 0.5rem",
                      borderRadius: "12px",
                      border: storesDirection === "pickup_from_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                      background: storesDirection === "pickup_from_stores" ? "rgba(139, 92, 246, 0.25)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 700, fontSize: "0.92rem" }}>
                      <ArrowDownRight size={18} color="#a78bfa" /> Pick Up
                    </div>
                    <div style={{ fontSize: "0.75rem", color: currentStoresCount === 0 ? "#ef4444" : "#94a3b8", marginTop: "3px", fontWeight: currentStoresCount === 0 ? 700 : 400 }}>
                      {currentStoresCount === 0 ? "Out of Stock (0)" : `Stores has ${currentStoresCount}`}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoresDirection("return_to_stores")}
                    style={{
                      padding: "0.85rem 0.5rem",
                      borderRadius: "12px",
                      border: storesDirection === "return_to_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                      background: storesDirection === "return_to_stores" ? "rgba(139, 92, 246, 0.25)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 700, fontSize: "0.92rem" }}>
                      <ArrowUpRight size={18} color="#a78bfa" /> Return
                    </div>
                    <div style={{ fontSize: "0.75rem", color: currentVanCount === 0 ? "#ef4444" : "#94a3b8", marginTop: "3px", fontWeight: currentVanCount === 0 ? 700 : 400 }}>
                      {currentVanCount === 0 ? "Van has 0" : `Van has ${currentVanCount}`}
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Which Gas? */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                Select Gas
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => handleGasChange("Oxygen")}
                  style={{
                    padding: "0.9rem",
                    borderRadius: "12px",
                    border: gasType === "Oxygen" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                    background: gasType === "Oxygen" ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>Oxygen</div>
                  <div style={{ fontSize: "0.75rem", color: "#60a5fa", marginTop: "2px", fontWeight: 600 }}>
                    FSW Only
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleGasChange("Propane")}
                  style={{
                    padding: "0.9rem",
                    borderRadius: "12px",
                    border: gasType === "Propane" ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.15)",
                    background: gasType === "Propane" ? "rgba(249, 115, 22, 0.2)" : "rgba(255,255,255,0.04)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>Propane</div>
                  <div style={{ fontSize: "0.75rem", color: "#fb923c", marginTop: "2px", fontWeight: 600 }}>
                    Calor Gas
                  </div>
                </button>
              </div>
            </div>

            {/* Warning if cannot perform (0 available) */}
            {cannotPerformReason ? (
              <div style={{
                background: "rgba(239, 68, 68, 0.12)",
                border: "1px solid #ef4444",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#fca5a5",
                fontSize: "0.85rem",
                fontWeight: 600
              }}>
                <AlertTriangle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{cannotPerformReason}</span>
              </div>
            ) : null}

            {/* Live Count Preview (Only for Stores Mode when valid) */}
            {actionMode === "stores" && maxAllowedQty > 0 && (
              <div style={{
                background: "rgba(139, 92, 246, 0.12)",
                border: "1px solid rgba(139, 92, 246, 0.3)",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                marginBottom: "1.25rem"
              }}>
                <div style={{ fontSize: "0.78rem", color: "#a78bfa", fontWeight: 700, marginBottom: "4px" }}>
                  Stock Balance Preview ({gasType})
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                  <div>
                    Van: <strong>{currentVanCount}</strong> → <span style={{ color: "#22c55e", fontWeight: 800 }}>{nextVanCount}</span>
                  </div>
                  <div>
                    Stores: <strong>{currentStoresCount}</strong> → <span style={{ color: "#a78bfa", fontWeight: 800 }}>{nextStoresCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity Selector - Integers up to maxAllowedQty */}
            {maxAllowedQty > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.4rem" }}>
                  Quantity to {actionMode === "exchange" ? "Swap" : storesDirection === "pickup_from_stores" ? "Pick Up" : "Return"}
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 400, marginLeft: "6px" }}>
                    (Max: {maxAllowedQty})
                  </span>
                </label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {qtyOptions.map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuantity(qty)}
                      style={{
                        flex: 1,
                        padding: "0.65rem",
                        borderRadius: "10px",
                        border: effectiveQty === qty ? "2px solid var(--primary, #3b82f6)" : "1px solid rgba(255,255,255,0.15)",
                        background: effectiveQty === qty ? "rgba(59, 130, 246, 0.25)" : "rgba(255,255,255,0.05)",
                        color: "#fff",
                        fontWeight: 800,
                        fontSize: "1rem",
                        cursor: "pointer"
                      }}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Purchase Mode Specific Fields */}
            {actionMode === "purchase" && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: "4px", color: "#f59e0b" }}>
                    Reason for Outright Purchase *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Replacing damaged/lost cylinder"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid #f59e0b",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    PO Number / Reference (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8921"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.7rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </>
            )}

            {/* Optional Branch / Location for Exchange */}
            {actionMode === "exchange" && maxAllowedQty > 0 && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Branch / Location (Optional)
                </label>
                <input
                  type="text"
                  placeholder={gasType === "Oxygen" ? "e.g. FSW Hebburn, Team Valley" : "e.g. Calor Gas Newcastle"}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.7rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    color: "#fff",
                    fontSize: "0.9rem"
                  }}
                />
              </div>
            )}

            {/* Optional Photo (For Exchange and Purchase) */}
            {actionMode !== "stores" && maxAllowedQty > 0 && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.6rem 1rem",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}>
                    <Camera size={16} /> Optional Receipt Photo
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoCapture}
                      style={{ display: "none" }}
                    />
                  </label>
                  {photoUrl && (
                    <span style={{ fontSize: "0.8rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "4px" }}>
                      <Check size={14} /> Attached
                    </span>
                  )}
                </div>
              </div>
            )}

            {errorMessage && (
              <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {errorMessage}
              </div>
            )}

            {/* Big Action Submit Button */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: "0.85rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.95rem"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || maxAllowedQty === 0}
                style={{
                  flex: 2,
                  padding: "0.85rem",
                  borderRadius: "12px",
                  border: "none",
                  background: maxAllowedQty === 0
                    ? "rgba(255,255,255,0.1)"
                    : actionMode === "purchase"
                      ? "#f59e0b"
                      : actionMode === "stores"
                        ? "#8b5cf6"
                        : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
                  color: maxAllowedQty === 0
                    ? "#64748b"
                    : actionMode === "purchase"
                      ? "#000"
                      : "#fff",
                  fontWeight: 800,
                  fontSize: "1rem",
                  cursor: maxAllowedQty === 0 ? "not-allowed" : "pointer",
                  boxShadow: maxAllowedQty > 0 ? "0 4px 14px rgba(0,0,0,0.25)" : "none"
                }}
              >
                {isSubmitting
                  ? "Saving..."
                  : maxAllowedQty === 0
                    ? "Cannot Confirm (0 Available)"
                    : actionMode === "purchase"
                      ? "Record New Purchase"
                      : actionMode === "stores"
                        ? "Confirm Stores Move"
                        : "Confirm 1-for-1 Swap"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
