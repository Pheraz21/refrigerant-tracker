"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Check, AlertTriangle, Camera } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db, BrazingGasType } from "@/lib/db";

export default function BrazingPurchasePage() {
  const router = useRouter();
  const { user, activeVehicleReg } = useAuth();

  const [gasType, setGasType] = useState<BrazingGasType>("Oxygen");
  const [supplier, setSupplier] = useState<string>("FSW");
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const handleGasChange = (type: BrazingGasType) => {
    setGasType(type);
    setSupplier(type === "Oxygen" ? "FSW" : "Calor Gas");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMessage("");

    if (!reason.trim()) {
      setErrorMessage("Please enter an explanation / justification for this purchase.");
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
        actionType: "purchase_new",
        quantity,
        reason: reason.trim(),
        poNumber: poNumber.trim() || undefined,
        receiptPhotoUrl: photoUrl || undefined,
        notes: notes.trim() || undefined,
        loggedBy: user.name || "Engineer",
      });

      setIsSuccess(true);
      setTimeout(() => {
        router.push("/engineer/brazing");
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to record purchase");
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
          background: "rgba(245, 158, 11, 0.2)",
          color: "#f59e0b",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <ShoppingCart size={26} />
        </div>
        <div>
          <h1 style={{ fontSize: "1.45rem", fontWeight: 800, margin: 0, color: "#fff" }}>
            Purchase New Bottle
          </h1>
          <p style={{ fontSize: "0.82rem", color: "#94a3b8", margin: "2px 0 0 0" }}>
            Adds +1 cylinder to your van stock
          </p>
        </div>
      </div>

      {/* Warning Alert */}
      <div style={{
        background: "rgba(245, 158, 11, 0.12)",
        border: "1px solid #f59e0b",
        borderRadius: "12px",
        padding: "1rem 1.25rem",
        marginBottom: "1.75rem",
        display: "flex",
        gap: "0.85rem",
        alignItems: "flex-start"
      }}>
        <AlertTriangle size={22} color="#f59e0b" style={{ flexShrink: 0, marginTop: "2px" }} />
        <div style={{ fontSize: "0.85rem", lineHeight: "1.45", color: "#fef3c7" }}>
          <strong style={{ color: "#f59e0b", display: "block", marginBottom: "3px" }}>
            Warning: New Cylinder Purchase
          </strong>
          All engineers have already been allocated their standard brazing sets. Normal procedure is to exchange an empty cylinder for a full one (1-for-1 swap). Only record a New Purchase if an outright new cylinder was bought (e.g. replacing a lost cylinder or specifically authorized by management).
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
            Purchase Recorded!
          </h2>
          <p style={{ color: "#94a3b8", fontSize: "0.9rem" }}>
            Added {quantity}x {gasType} to your van stock. Returning to Brazing Kit...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Step 1: Select Gas */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.6rem" }}>
              1. Gas Purchased
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
              </button>
            </div>
          </div>

          {/* Step 2: Quantity */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              2. Quantity Purchased
            </label>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {[1, 2, 3].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setQuantity(qty)}
                  style={{
                    flex: 1,
                    padding: "0.85rem",
                    borderRadius: "12px",
                    border: quantity === qty ? "2px solid #f59e0b" : "1px solid rgba(255,255,255,0.15)",
                    background: quantity === qty ? "rgba(245, 158, 11, 0.25)" : "var(--surface, #1e293b)",
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

          {/* Step 3: Reason */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 700, marginBottom: "4px", color: "#f59e0b" }}>
              3. Reason for Outright Purchase *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Replacing stolen/damaged bottle, authorized spare set"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{
                width: "100%",
                padding: "0.85rem",
                background: "var(--surface, #1e293b)",
                border: "2px solid #f59e0b",
                borderRadius: "12px",
                color: "#fff",
                fontSize: "0.92rem"
              }}
            />
          </div>

          {/* Step 4: Optional PO & Receipt Photo */}
          <div style={{
            background: "var(--surface, #1e293b)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "14px",
            padding: "1.25rem",
            marginBottom: "1.75rem"
          }}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", color: "#94a3b8", marginBottom: "4px" }}>
                PO Number / Invoice Reference (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. PO-8921"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
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
                Receipt Photo / Supplier Invoice (Optional)
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

          {errorMessage && (
            <div style={{ color: "#ef4444", fontSize: "0.88rem", marginBottom: "1.25rem", fontWeight: 600 }}>
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "1.1rem",
              borderRadius: "16px",
              border: "none",
              background: "#f59e0b",
              color: "#000",
              fontWeight: 800,
              fontSize: "1.1rem",
              cursor: "pointer",
              boxShadow: "0 6px 20px rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px"
            }}
          >
            {isSubmitting ? (
              "Recording..."
            ) : (
              <>
                <ShoppingCart size={20} /> Record New Purchase (+{quantity} Cyl)
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
