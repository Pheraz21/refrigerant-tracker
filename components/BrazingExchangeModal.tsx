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
  const [actionMode, setActionMode] = useState<"exchange" | "stores" | "purchase">(initialMode);
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

  // Stores Transfer specific state
  const [storesDirection, setStoresDirection] = useState<"pickup_from_stores" | "return_to_stores">("pickup_from_stores");
  const [vanInventory, setVanInventory] = useState<BrazingInventoryItem[]>([]);
  const [storesInventory, setStoresInventory] = useState<BrazingInventoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActionMode(initialMode);
      setGasType(initialGasType);
      setSupplier(initialGasType === "Oxygen" ? "FSW" : "Calor Gas");
      setQuantity(1);
      setReason("");
      setPoNumber("");
      setNotes("");
      setPhotoUrl("");
      setErrorMessage("");
      setIsSuccess(false);

      // Load inventory balances for stores transfer preview
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

  // Preview calculations for Stores Transfer
  const currentVanCount = (vanInventory.find(i => i.gasType === gasType)?.quantity) ?? 1;
  const currentStoresCount = (storesInventory.find(i => i.gasType === gasType)?.quantity) ?? 0;

  const nextVanCount = storesDirection === "pickup_from_stores"
    ? currentVanCount + quantity
    : Math.max(0, currentVanCount - quantity);

  const nextStoresCount = storesDirection === "pickup_from_stores"
    ? Math.max(0, currentStoresCount - quantity)
    : currentStoresCount + quantity;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

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
          quantity,
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
          quantity,
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
        maxWidth: "520px",
        maxHeight: "92vh",
        overflowY: "auto",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
        border: "1px solid rgba(255, 255, 255, 0.1)"
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(249, 115, 22, 0.2)",
              color: "#f97316",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Flame size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                {actionMode === "exchange"
                  ? "Exchange Brazing Bottle"
                  : actionMode === "stores"
                    ? "Move Bottle In / Out of Stores"
                    : "Purchase New Bottle"}
              </h2>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: 0 }}>
                Purchased fleet tracking (non-serialized)
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
              {actionMode === "exchange"
                ? "Exchange Logged!"
                : actionMode === "stores"
                  ? "Stores Transfer Complete!"
                  : "Purchase Recorded!"}
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
              {actionMode === "exchange"
                ? `1-for-1 swap of ${gasType} with ${supplier} successfully recorded.`
                : actionMode === "stores"
                  ? storesDirection === "pickup_from_stores"
                    ? `Picked up ${quantity}x ${gasType} from Stores to Van.`
                    : `Returned ${quantity}x ${gasType} from Van to Stores.`
                  : `New ${gasType} cylinder added to your van kit.`}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: "1.25rem 1.5rem" }}>
            {/* Mode Selector Tabs (3 options) */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr 1.1fr",
              gap: "4px",
              background: "rgba(0,0,0,0.25)",
              padding: "4px",
              borderRadius: "10px",
              marginBottom: "1.25rem"
            }}>
              <button
                type="button"
                onClick={() => setActionMode("exchange")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  background: actionMode === "exchange" ? "var(--primary, #3b82f6)" : "transparent",
                  color: actionMode === "exchange" ? "#fff" : "#94a3b8"
                }}
              >
                <RefreshCw size={13} /> Supplier Swap
              </button>
              <button
                type="button"
                onClick={() => setActionMode("stores")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  background: actionMode === "stores" ? "#8b5cf6" : "transparent",
                  color: actionMode === "stores" ? "#fff" : "#94a3b8"
                }}
              >
                <Warehouse size={13} /> Stores Transfer
              </button>
              <button
                type="button"
                onClick={() => setActionMode("purchase")}
                style={{
                  padding: "8px 6px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "5px",
                  background: actionMode === "purchase" ? "#f59e0b" : "transparent",
                  color: actionMode === "purchase" ? "#000" : "#94a3b8"
                }}
              >
                <ShoppingCart size={13} /> + Buy New
              </button>
            </div>

            {/* Warning when in Purchase Mode */}
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

            {/* Stores Transfer Direction Toggle */}
            {actionMode === "stores" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                  Transfer Direction
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => setStoresDirection("pickup_from_stores")}
                    style={{
                      padding: "0.75rem 0.5rem",
                      borderRadius: "10px",
                      border: storesDirection === "pickup_from_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                      background: storesDirection === "pickup_from_stores" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 700, fontSize: "0.88rem" }}>
                      <ArrowDownRight size={16} color="#a78bfa" /> Pick Up from Stores
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                      Stores → Van (+1 Van)
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStoresDirection("return_to_stores")}
                    style={{
                      padding: "0.75rem 0.5rem",
                      borderRadius: "10px",
                      border: storesDirection === "return_to_stores" ? "2px solid #8b5cf6" : "1px solid rgba(255,255,255,0.15)",
                      background: storesDirection === "return_to_stores" ? "rgba(139, 92, 246, 0.2)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      cursor: "pointer",
                      textAlign: "center"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontWeight: 700, fontSize: "0.88rem" }}>
                      <ArrowUpRight size={16} color="#a78bfa" /> Return to Stores
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "2px" }}>
                      Van → Stores (-1 Van)
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Gas Type Selection */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                Select Gas Type
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => handleGasChange("Oxygen")}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: gasType === "Oxygen" ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.15)",
                    background: gasType === "Oxygen" ? "rgba(59, 130, 246, 0.15)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1rem", fontWeight: 700 }}>Oxygen</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                    Supplier: FSW Only
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleGasChange("Propane")}
                  style={{
                    padding: "0.75rem",
                    borderRadius: "10px",
                    border: gasType === "Propane" ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.15)",
                    background: gasType === "Propane" ? "rgba(249, 115, 22, 0.15)" : "rgba(255,255,255,0.05)",
                    color: "#fff",
                    cursor: "pointer",
                    textAlign: "center"
                  }}
                >
                  <div style={{ fontSize: "1rem", fontWeight: 700 }}>Propane</div>
                  <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "2px" }}>
                    Supplier: Calor Gas
                  </div>
                </button>
              </div>
            </div>

            {/* Live Count Preview (Only for Stores Transfer) */}
            {actionMode === "stores" && (
              <div style={{
                background: "rgba(139, 92, 246, 0.1)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
                borderRadius: "10px",
                padding: "0.75rem 1rem",
                marginBottom: "1rem"
              }}>
                <div style={{ fontSize: "0.78rem", color: "#a78bfa", fontWeight: 700, marginBottom: "4px" }}>
                  Balance Impact Preview ({gasType})
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <div>
                    Van Stock: <strong>{currentVanCount}</strong> → <span style={{ color: "#22c55e", fontWeight: 800 }}>{nextVanCount}</span>
                  </div>
                  <div>
                    Stores Stock: <strong>{currentStoresCount}</strong> → <span style={{ color: "#a78bfa", fontWeight: 800 }}>{nextStoresCount}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier & Branch (Only for Exchange Mode) */}
            {actionMode === "exchange" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Supplier
                  </label>
                  <div style={{
                    padding: "0.6rem 0.75rem",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}>
                    <Building2 size={16} color="#94a3b8" />
                    {supplier}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    Branch / Location (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hebburn, Team Valley"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </div>
            )}

            {/* Quantity */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                Quantity
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {[1, 2, 3].map((qty) => (
                  <button
                    key={qty}
                    type="button"
                    onClick={() => setQuantity(qty)}
                    style={{
                      flex: 1,
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: quantity === qty ? "2px solid var(--primary, #3b82f6)" : "1px solid rgba(255,255,255,0.1)",
                      background: quantity === qty ? "rgba(59, 130, 246, 0.2)" : "rgba(255,255,255,0.05)",
                      color: "#fff",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    {qty} Cylinder{qty > 1 ? "s" : ""}
                  </button>
                ))}
              </div>
            </div>

            {/* Purchase Mode Specific Fields */}
            {actionMode === "purchase" && (
              <>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "4px", color: "#f59e0b" }}>
                    Reason for Outright Purchase *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Replacing damaged/lost cylinder, approved spare kit"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid #f59e0b",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                    PO Number / Supplier Invoice Ref (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-8921"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.75rem",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.9rem"
                    }}
                  />
                </div>
              </>
            )}

            {/* Receipt Photo Capture (For Exchange and Purchase) */}
            {actionMode !== "stores" && (
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Receipt / Collection Slip Photo (Optional)
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.5rem 0.85rem",
                    background: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600
                  }}>
                    <Camera size={16} /> Take Photo / Upload
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
                      <Check size={14} /> Photo Attached
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "#94a3b8", marginBottom: "4px" }}>
                Notes / Reference (Optional)
              </label>
              <input
                type="text"
                placeholder={actionMode === "stores" ? "e.g. Returned spare bottle, de-kitted van" : "Any additional details..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.6rem 0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "0.9rem"
                }}
              />
            </div>

            {errorMessage && (
              <div style={{ color: "#ef4444", fontSize: "0.85rem", marginBottom: "1rem" }}>
                {errorMessage}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "transparent",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  flex: 2,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "none",
                  background: actionMode === "purchase" ? "#f59e0b" : actionMode === "stores" ? "#8b5cf6" : "var(--primary, #3b82f6)",
                  color: actionMode === "purchase" ? "#000" : "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                {isSubmitting ? (
                  "Saving..."
                ) : actionMode === "purchase" ? (
                  <>Record New Cylinder (+1)</>
                ) : actionMode === "stores" ? (
                  <>Confirm Stores Transfer</>
                ) : (
                  <>Confirm 1-for-1 Swap</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
