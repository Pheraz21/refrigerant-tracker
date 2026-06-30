"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, Bottle } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { PackageCheck, AlertCircle, CheckCircle2, Loader2, ArrowLeft, Search, Lock } from "lucide-react";
import Link from "next/link";

export default function StoresCollectionPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [storesBottles, setStoresBottles] = useState<Bottle[]>([]);
  const [loadingBottles, setLoadingBottles] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");

  const [supplier, setSupplier] = useState("");
  const [supplierLock, setSupplierLock] = useState("");
  const [supplierBranch, setSupplierBranch] = useState("");
  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    db.getBottlesByLocation("office").then(bottles => {
      // Exclude reclaim bottles — those have their own HWCN process
      setStoresBottles(bottles.filter(b =>
        b.category !== "reclaim" &&
        (b.supplier || "").toLowerCase() !== "21 degrees"
      ));
      setLoadingBottles(false);
    });
  }, []);

  const filtered = storesBottles.filter(b =>
    filter === "" ||
    b.serial.toLowerCase().includes(filter.toLowerCase()) ||
    b.gasType.toLowerCase().includes(filter.toLowerCase()) ||
    (b.supplier || "").toLowerCase().includes(filter.toLowerCase())
  );

  const toggleSelect = (bottle: Bottle) => {
    setError("");
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(bottle.serial)) {
        next.delete(bottle.serial);
        if (next.size === 0) {
          setSupplier("");
          setSupplierLock("");
        }
      } else {
        const bottleSupplier = bottle.supplier || "";
        if (next.size === 0 && bottleSupplier) {
          setSupplier(bottleSupplier);
          setSupplierLock(bottleSupplier);
        } else if (supplierLock && bottleSupplier && bottleSupplier.toLowerCase() !== supplierLock.toLowerCase()) {
          setError(`Supplier mismatch: ${bottle.serial} belongs to "${bottleSupplier}" but you are collecting from "${supplierLock}".`);
          return prev;
        }
        next.add(bottle.serial);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
      setSupplier("");
      setSupplierLock("");
    } else {
      const firstWithSupplier = filtered.find(b => b.supplier);
      if (firstWithSupplier?.supplier) {
        setSupplier(firstWithSupplier.supplier);
        setSupplierLock(firstWithSupplier.supplier);
      }
      setSelected(new Set(filtered.map(b => b.serial)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selected.size === 0) { setError("Please select at least one bottle"); return; }
    if (!supplier.trim()) { setError("Please enter the supplier name"); return; }
    if (!supplierBranch.trim()) { setError("Please enter the supplier branch"); return; }
    if (!collectionDate) { setError("Please enter the collection date"); return; }

    setSubmitting(true);
    try {
      await db.confirmStoresCollection({
        serials: Array.from(selected),
        collectionDate,
        collectedBy: user?.name || "Office Admin",
        supplier: supplier.trim(),
        supplierBranch: supplierBranch.trim(),
      });
      setSuccessCount(selected.size);
      setIsSuccess(true);
      setTimeout(() => router.push("/admin/stores"), 3000);
    } catch {
      setError("Failed to confirm collection. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
        <CheckCircle2 size={64} color="#22c55e" style={{ margin: "0 auto 1.5rem" }} />
        <h1 className="text-gradient" style={{ fontSize: "2rem", marginBottom: "1rem" }}>Collection Confirmed</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
          {successCount} {successCount === 1 ? "bottle has" : "bottles have"} been marked as collected by <strong>{supplier}</strong>.<br />
          They have been removed from stores inventory.
        </p>
        <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.4)" }}>Redirecting to Stores Inventory...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/admin" style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", marginBottom: "1rem" }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, marginBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <PackageCheck size={28} color="var(--primary)" /> Supplier Collection from Stores
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Confirm bottles collected by supplier from HQ Stores</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "2rem", alignItems: "start" }}>

        {/* Left: Stores bottle list */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
              Stores Inventory
              {selected.size > 0 && (
                <span style={{ marginLeft: "0.75rem", fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600 }}>
                  {selected.size} selected
                </span>
              )}
            </h3>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={toggleAll}
                style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
              >
                {selected.size === filtered.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>

          <div style={{ position: "relative", marginBottom: "1.25rem" }}>
            <Search size={16} style={{ position: "absolute", left: "0.9rem", top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
            <input
              type="text"
              placeholder="Filter by serial, gas type or supplier..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                width: "100%", padding: "0.75rem 1rem 0.75rem 2.5rem",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "8px", color: "#fff", outline: "none", fontSize: "0.9rem"
              }}
            />
          </div>

          {loadingBottles ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.3)" }}>
              <Loader2 size={32} className="spinner" style={{ margin: "0 auto 1rem" }} />
              <p>Loading stores inventory...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center", color: "rgba(255,255,255,0.2)", border: "2px dashed rgba(255,255,255,0.05)", borderRadius: "12px" }}>
              <PackageCheck size={40} style={{ marginBottom: "1rem", opacity: 0.15 }} />
              <p>{storesBottles.length === 0 ? "No bottles currently in stores." : "No bottles match your filter."}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {filtered.map(b => {
                const isSelected = selected.has(b.serial);
                return (
                  <div
                    key={b.serial}
                    onClick={() => toggleSelect(b)}
                    style={{
                      padding: "0.9rem 1.1rem",
                      background: isSelected ? "rgba(0,229,255,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${isSelected ? "rgba(0,229,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                      borderRadius: "10px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      transition: "all 0.15s"
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
                      border: `2px solid ${isSelected ? "var(--primary)" : "rgba(255,255,255,0.2)"}`,
                      background: isSelected ? "var(--primary)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {isSelected && <span style={{ color: "#000", fontSize: "0.75rem", fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: isSelected ? "var(--primary)" : "#fff", fontSize: "0.95rem" }}>{b.serial}</div>
                      <div style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.45)", marginTop: "0.15rem" }}>
                        {b.gasType}
                        {b.category === "nitrogen" && " (Nitrogen)"}
                        {" • "}{b.currentWeight} kg
                        {b.supplier && ` • ${b.supplier}`}
                      </div>
                    </div>
                    <div style={{
                      fontSize: "0.72rem", fontWeight: 600, padding: "0.2rem 0.6rem", borderRadius: "6px",
                      background: b.category === "nitrogen" ? "rgba(168,85,247,0.15)" : "rgba(0,229,255,0.1)",
                      color: b.category === "nitrogen" ? "#a855f7" : "#00e5ff"
                    }}>
                      {b.category}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Collection details */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "#fff" }}>Collection Details</h3>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Date of Collection <span style={{ color: "#ff3366" }}>*</span>
              </label>
              <input
                type="date"
                required
                value={collectionDate}
                onChange={e => setCollectionDate(e.target.value)}
                style={{
                  width: "100%", padding: "0.85rem 1rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px", color: "#fff", outline: "none", colorScheme: "dark"
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                <span>Supplier Name <span style={{ color: "#ff3366" }}>*</span></span>
                {supplierLock && (
                  <span style={{ display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.7rem", color: "#22c55e", fontWeight: 600 }}>
                    <Lock size={11} /> Auto-filled from bottle
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                placeholder="Select a bottle — supplier will auto-fill"
                value={supplier}
                onChange={e => !supplierLock && setSupplier(e.target.value)}
                readOnly={!!supplierLock}
                style={{
                  width: "100%", padding: "0.85rem 1rem",
                  background: supplierLock ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${supplierLock ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.12)"}`,
                  borderRadius: "10px", color: "#fff", outline: "none",
                  cursor: supplierLock ? "default" : "text"
                }}
              />
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Supplier Branch <span style={{ color: "#ff3366" }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Newcastle, Leeds"
                value={supplierBranch}
                onChange={e => setSupplierBranch(e.target.value)}
                style={{
                  width: "100%", padding: "0.85rem 1rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px", color: "#fff", outline: "none"
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "0.75rem 1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.2)",
                borderRadius: "8px", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem"
              }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || selected.size === 0}
              style={{
                width: "100%", padding: "1rem",
                background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "1rem",
                cursor: (submitting || selected.size === 0) ? "not-allowed" : "pointer",
                opacity: (submitting || selected.size === 0) ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
              }}
            >
              {submitting
                ? <Loader2 size={20} className="spinner" />
                : `Confirm Collection (${selected.size} bottle${selected.size !== 1 ? "s" : ""})`}
            </button>
          </div>

          <div style={{ padding: "1.25rem", background: "rgba(255,187,0,0.05)", border: "1px solid rgba(255,187,0,0.15)", borderRadius: "12px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "#ffbb00", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={16} /> Notice
            </h4>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,187,0,0.8)", lineHeight: 1.5, margin: 0 }}>
              Confirming collection will mark the selected bottles as returned and remove them from your active stores inventory. This action is permanent and creates an audit trail entry.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
