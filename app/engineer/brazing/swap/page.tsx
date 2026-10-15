"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Camera, Check, AlertTriangle, Building2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, BrazingGasType, BrazingInventoryItem } from "@/lib/db";

function BrazingSwapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, activeVehicleReg } = useAuth();

  const initialGas = (searchParams.get("gas") as BrazingGasType) || "Oxygen";
  const [gasType, setGasType] = useState<BrazingGasType>(initialGas);
  const [supplier, setSupplier] = useState<string>(initialGas === "Oxygen" ? "FSW" : "Calor Gas");
  const [branch, setBranch] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [vanInventory, setVanInventory] = useState<BrazingInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (user?.id) {
      db.getBrazingInventory("engineer", user.id).then((data) => {
        setVanInventory(data || []);
        setLoading(false);
      });
    }
  }, [user?.id]);

  const handleGasChange = (type: BrazingGasType) => {
    setGasType(type);
    setSupplier(type === "Oxygen" ? "FSW" : "Calor Gas");
    setQuantity(1);
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

  const vanItem = vanInventory.find(i => i.gasType === gasType);
  const currentVanCount = vanItem !== undefined ? vanItem.quantity : 1;
  const maxAllowedQty = currentVanCount;
  const effectiveQty = maxAllowedQty > 0 ? Math.min(quantity, maxAllowedQty) : 0;
  const qtyOptions = maxAllowedQty > 0 ? Array.from({ length: Math.min(maxAllowedQty, 10) }, (_, i) => i + 1) : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage("");

    if (maxAllowedQty === 0) {
      setErrorMessage(`You have 0 ${gasType} bottles on your van to exchange.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await db.logBrazingExchange({
        exchangeDate: new Date().toISOString(),
        engineerId: user.id,
        engineerName: user.name || "Engineer",
        gasType,
        supplier,
        actionType: "swap_empty_for_full",
        quantity: effectiveQty,
        branch: branch.trim() || undefined,
        receiptPhotoUrl: photoUrl || undefined,
        notes: notes.trim() || undefined,
        loggedBy: user.name || "Engineer",
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/engineer/brazing");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to log swap");
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
          background: "rgba(249, 115, 22, 0.2)",
          color: "#f97316",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <RefreshCw size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#fff" }}>
            Log Bottle Swap
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
            1-for-1 supplier exchange • Van stock stays constant
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
            Bottle Swap Confirmed!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Exchanged {effectiveQty}x {gasType} with {supplier}. Returning to your Brazing Kit...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Step 1: Select Gas */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              1. Which Gas Are You Exchanging?
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
              <button
                type="button"
                onClick={() => handleGasChange("Oxygen")}
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
                  Supplier: FSW
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "4px" }}>
                  {loading ? "…" : `${vanInventory.find(i => i.gasType === "Oxygen")?.quantity ?? 1} on van`}
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGasChange("Propane")}
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
                  Supplier: Calor Gas
                </div>
                <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "4px" }}>
                  {loading ? "…" : `${vanInventory.find(i => i.gasType === "Propane")?.quantity ?? 1} on van`}
                </div>
              </button>
            </div>
          </div>

          {/* Zero van count warning */}
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
              <span>You currently have 0 {gasType} bottles on your van to exchange.</span>
            </div>
          )}

          {/* Step 2: Quantity Selection (Integers up to Van Stock) */}
          {maxAllowedQty > 0 && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                2. Number of Cylinders to Swap (Max on Van: {maxAllowedQty})
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
                      border: effectiveQty === qty ? "2px solid #f97316" : "1px solid rgba(255,255,255,0.15)",
                      background: effectiveQty === qty ? "rgba(249, 115, 22, 0.25)" : "var(--surface, #1e293b)",
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

          {/* Step 3: Optional Branch & Receipt Photo */}
          {maxAllowedQty > 0 && (
            <div style={{
              background: "var(--surface, #1e293b)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "14px",
              padding: "1.25rem",
              marginBottom: "1.75rem"
            }}>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                  Trade Counter / Branch (Optional)
                </label>
                <input
                  type="text"
                  placeholder={gasType === "Oxygen" ? "e.g. FSW Hebburn" : "e.g. Calor Gas Newcastle"}
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
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

              <div>
                <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "6px" }}>
                  Collection Slip / Receipt (Optional)
                </label>
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0.65rem 1rem",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#fff"
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
                    <span style={{ fontSize: "0.82rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                      <Check size={16} /> Photo Attached
                    </span>
                  )}
                </div>
              </div>
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
                : "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
              color: maxAllowedQty === 0 ? "#64748b" : "#fff",
              fontWeight: 800,
              fontSize: "1.1rem",
              cursor: maxAllowedQty === 0 ? "not-allowed" : "pointer",
              boxShadow: maxAllowedQty > 0 ? "0 6px 20px rgba(249, 115, 22, 0.35)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {isSubmitting ? (
              "Confirming..."
            ) : maxAllowedQty === 0 ? (
              "Cannot Swap (0 on Van)"
            ) : (
              <>
                <RefreshCw size={20} /> Confirm 1-for-1 Swap ({effectiveQty}x {gasType})
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function BrazingSwapPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem 1.5rem", textAlign: "center", color: "#94a3b8" }}>Loading...</div>}>
      <BrazingSwapContent />
    </Suspense>
  );
}
