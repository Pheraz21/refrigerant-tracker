"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db, Bottle } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/AuthContext";
import { Truck, Search, Plus, Trash2, Camera, AlertCircle, CheckCircle2, Loader2, ArrowLeft, X, Lock, Calendar } from "lucide-react";
import Link from "next/link";
import HwcnLightboxModal from "@/components/HwcnLightboxModal";

export default function SupplierReturnPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [hwcnNumber, setHwcnNumber] = useState("");
  const [returnSupplier, setReturnSupplier] = useState("");
  const [returnSupplierBranch, setReturnSupplierBranch] = useState("");
  const [supplierLock, setSupplierLock] = useState("");
  const [returnDate, setReturnDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [inputSerial, setInputSerial] = useState("");
  const [selectedBottles, setSelectedBottles] = useState<Bottle[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Active database bottles for autocomplete & on-entry check
  const [activeBottles, setActiveBottles] = useState<Bottle[]>([]);
  const [allBottles, setAllBottles] = useState<Bottle[]>([]);
  const [matchedBottleInfo, setMatchedBottleInfo] = useState<Bottle | null>(null);
  const [matchedBottleError, setMatchedBottleError] = useState<string>("");

  // Multi-image state & lightbox
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    async function loadBottles() {
      try {
        const bottles = await db.getAllBottles();
        setAllBottles(bottles);
        const active = bottles.filter(b => b.status !== "returned");
        setActiveBottles(active);
      } catch (err) {
        console.error("Failed to load bottles for return page validation", err);
      }
    }
    loadBottles();
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(f => URL.createObjectURL(f));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removePhoto = (index: number) => {
    setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSerialInputChange = (val: string) => {
    const cleanVal = val.toUpperCase();
    setInputSerial(cleanVal);
    setError("");

    const trimmed = cleanVal.trim();
    if (!trimmed) {
      setMatchedBottleInfo(null);
      setMatchedBottleError("");
      return;
    }

    const activeMatch = activeBottles.find(b => b.serial.toUpperCase() === trimmed);
    if (activeMatch) {
      setMatchedBottleInfo(activeMatch);
      setMatchedBottleError("");
      // Auto-complete supplier name if not already set or locked
      if (!returnSupplier && activeMatch.supplier) {
        setReturnSupplier(activeMatch.supplier);
      }
    } else {
      setMatchedBottleInfo(null);
      const returnedMatch = allBottles.find(b => b.serial.toUpperCase() === trimmed);
      if (returnedMatch && returnedMatch.status === "returned") {
        setMatchedBottleError(`Cylinder ${trimmed} has already been returned to a supplier.`);
      } else {
        setMatchedBottleError(`Cylinder ${trimmed} not found in company active inventory.`);
      }
    }
  };

  const handleAddBottle = async () => {
    const serialToUse = inputSerial.trim().toUpperCase();
    if (!serialToUse) return;
    
    // Check if already added
    if (selectedBottles.find(b => b.serial === serialToUse)) {
      setError("Bottle already in list");
      return;
    }

    try {
      let bottle = activeBottles.find(b => b.serial.toUpperCase() === serialToUse);
      if (!bottle) {
        const fetched = await db.getBottle(serialToUse);
        if (!fetched) {
          setError(`Bottle "${serialToUse}" is not in the company database. Only current company bottles can be returned.`);
          return;
        }
        if (fetched.status === "returned") {
          setError(`Bottle "${serialToUse}" has already been returned to a supplier.`);
          return;
        }
        bottle = fetched;
      }

      const bottleSupplier = bottle.supplier || "";

      if (selectedBottles.length === 0) {
        // First bottle — auto-populate supplier from bottle data
        if (bottleSupplier) {
          setReturnSupplier(bottleSupplier);
          setSupplierLock(bottleSupplier);
        }
      } else {
        // Subsequent bottles — enforce same supplier
        const expected = supplierLock || returnSupplier;
        if (bottleSupplier && expected && bottleSupplier.toLowerCase() !== expected.toLowerCase()) {
          setError(
            `Supplier mismatch: ${bottle.serial} belongs to "${bottleSupplier}" but you are returning to "${expected}". All bottles on one return note must be from the same supplier.`
          );
          return;
        }
      }

      setSelectedBottles(prev => [...prev, bottle!]);
      setWeights(prev => ({ ...prev, [bottle!.serial]: bottle!.currentWeight }));
      setInputSerial("");
      setMatchedBottleInfo(null);
      setMatchedBottleError("");
      setError("");
    } catch (err) {
      setError("Error finding bottle in database");
    }
  };

  const removeBottle = (serial: string) => {
    const remaining = selectedBottles.filter(b => b.serial !== serial);
    setSelectedBottles(remaining);
    const newWeights = { ...weights };
    delete newWeights[serial];
    setWeights(newWeights);
    if (remaining.length === 0) {
      setSupplierLock("");
      setReturnSupplier("");
    }
  };

  const handleWeightChange = (serial: string, val: string) => {
    const num = parseFloat(val);
    setWeights({ ...weights, [serial]: isNaN(num) ? 0 : num });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSupplier.trim()) {
      setError("Please enter the supplier name");
      return;
    }
    if (!returnSupplierBranch.trim()) {
      setError("Please enter the supplier branch");
      return;
    }
    if (!hwcnNumber) {
      setError("Please enter the Supplier's HWCN number");
      return;
    }
    if (selectedBottles.length === 0) {
      setError("Please add at least one bottle");
      return;
    }

    setLoading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photoFiles.length; i++) {
        const file = photoFiles[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `supplier-returns/${hwcnNumber}-${Date.now()}-${i + 1}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from("hwcn-photos")
            .upload(path, file, { upsert: true });
          if (uploadError) {
            console.error(`Photo ${i + 1} storage upload warning:`, uploadError);
            if (uploadError.message?.toLowerCase().includes("row-level security") || uploadError.message?.toLowerCase().includes("row security")) {
              console.warn("Storage RLS bypass warning — saving photo data reference");
              uploadedUrls.push(photoPreviewUrls[i] || "");
            } else {
              throw new Error(`Photo ${i + 1} upload failed: ${uploadError.message}`);
            }
          } else {
            const { data: urlData } = supabase.storage.from("hwcn-photos").getPublicUrl(path);
            uploadedUrls.push(urlData.publicUrl);
          }
        } catch (stErr: any) {
          if (stErr.message?.toLowerCase().includes("row-level security") || stErr.message?.toLowerCase().includes("row security")) {
            console.warn("Storage RLS warning caught in submit");
            uploadedUrls.push(photoPreviewUrls[i] || "");
          } else {
            throw stErr;
          }
        }
      }

      await db.returnBottleToSupplier({
        serials: selectedBottles.map(b => b.serial),
        returnHwcnNumber: hwcnNumber,
        returnedBy: user?.name || "Office Admin",
        weights: weights,
        hwcnPhotoUrl: uploadedUrls[0] || "",
        hwcnPhotoUrls: uploadedUrls,
        returnSupplier: returnSupplier.trim(),
        returnSupplierBranch: returnSupplierBranch.trim(),
        returnedAt: returnDate ? new Date(returnDate).toISOString() : new Date().toISOString()
      });
      setIsSuccess(true);
      setTimeout(() => router.push("/admin"), 3000);
    } catch (err: any) {
      console.error("Error submitting supplier return:", err);
      if (err?.message?.toLowerCase().includes("row-level security") || err?.message?.toLowerCase().includes("row security")) {
        setError("Database security policy (RLS) prevented updating bottle record. Please check Supabase RLS policies for the bottles table.");
      } else {
        setError(err?.message || "Failed to process return. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
        <div style={{ textAlign: "center", maxWidth: "450px", background: "rgba(17,24,39,0.8)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "16px", padding: "3rem 2rem" }}>
          <CheckCircle2 size={54} color="#22c55e" style={{ marginBottom: "1rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>Return Completed</h2>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: "1.5rem" }}>
            {selectedBottles.length} bottle{selectedBottles.length !== 1 ? "s" : ""} recorded under HWCN <strong>{hwcnNumber}</strong> to <strong>{returnSupplier} ({returnSupplierBranch})</strong> on {returnDate}.
          </p>
          <div style={{ fontSize: "0.8rem", color: "#00e5ff" }}>Redirecting to Admin Portal...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <HwcnLightboxModal
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        photoUrl={photoPreviewUrls}
        title={`Uploaded HWCN Paperwork Preview (${photoPreviewUrls.length} Pages)`}
      />
      <div style={{ minHeight: "100vh", background: "#0a0e17", color: "#e2e8f0", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: "1000px", margin: "0 auto 1.5rem auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "#94a3b8", textDecoration: "none", fontSize: "0.9rem", fontWeight: 600 }}>
          <ArrowLeft size={16} /> Back to Admin
        </Link>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: "1000px", margin: "0 auto" }}>
        <div style={{ background: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "1rem" }}>
            <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(0,229,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#00e5ff" }}>
              <Truck size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: 800, margin: 0, color: "#fff" }}>Supplier Returns & Waste Collection</h1>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", margin: 0 }}>Record cylinders returned or collected by gas suppliers</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600 }}>
                Supplier Name {supplierLock && <Lock size={12} style={{ marginLeft: "0.3rem", color: "#00e5ff" }} />}
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BOC, Air Products"
                value={returnSupplier}
                onChange={e => setReturnSupplier(e.target.value)}
                disabled={!!supplierLock}
                style={{
                  width: "100%", padding: "0.75rem 1rem", background: supplierLock ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "0.95rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600 }}>
                Supplier Branch / Depot
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Birtley, Gateshead"
                value={returnSupplierBranch}
                onChange={e => setReturnSupplierBranch(e.target.value)}
                style={{
                  width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "0.95rem"
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600 }}>
                Collection / Return Date
              </label>
              <input
                type="date"
                required
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                style={{
                  width: "100%", padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#fff", outline: "none", fontSize: "0.95rem",
                  colorScheme: "dark"
                }}
              />
            </div>
          </div>

          {/* Add Bottle Section */}
          <div style={{ marginBottom: "2rem" }}>
            <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.4rem", fontWeight: 600 }}>
              Scan / Enter Bottle Serial (Verified against active database)
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                type="text"
                list="active-bottles-list"
                placeholder="e.g. REC-1029 or 8849201B"
                value={inputSerial}
                onChange={e => handleSerialInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddBottle(); } }}
                style={{
                  flex: 1, padding: "0.75rem 1rem", background: "rgba(255,255,255,0.05)",
                  border: matchedBottleInfo
                    ? "1px solid rgba(34,197,94,0.5)"
                    : matchedBottleError
                    ? "1px solid rgba(255,51,102,0.5)"
                    : "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px", color: "#fff", outline: "none",
                  fontFamily: "var(--font-geist-mono), monospace", fontSize: "1rem", fontWeight: 600
                }}
              />
              <datalist id="active-bottles-list">
                {activeBottles.map(b => (
                  <option key={b.serial} value={b.serial}>
                    {b.serial} — {b.gasType} ({b.category}){b.supplier ? ` [Supplier: ${b.supplier}]` : ""}
                  </option>
                ))}
              </datalist>
              <button
                type="button"
                onClick={handleAddBottle}
                style={{
                  padding: "0.75rem 1.25rem", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)",
                  borderRadius: "8px", color: "#00e5ff", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem"
                }}
              >
                <Plus size={16} /> Add Cylinder
              </button>
            </div>
            {matchedBottleInfo && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <CheckCircle2 size={14} /> Active bottle in database: <strong>{matchedBottleInfo.serial}</strong> ({matchedBottleInfo.gasType}, {matchedBottleInfo.category}){matchedBottleInfo.supplier ? ` — Supplier: "${matchedBottleInfo.supplier}"` : ""}
              </div>
            )}
            {matchedBottleError && inputSerial.trim().length > 0 && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#ff3366", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <AlertCircle size={14} /> {matchedBottleError}
              </div>
            )}
          </div>

          {/* Selected Bottles List */}
          {selectedBottles.length > 0 && (
            <div style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", marginBottom: "0.75rem" }}>
                Selected Cylinders ({selectedBottles.length})
              </h3>
              <div style={{ border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", overflow: "hidden" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "left", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", textTransform: "uppercase" }}>Serial</th>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "left", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", textTransform: "uppercase" }}>Category</th>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "left", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", textTransform: "uppercase" }}>Gas Type</th>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "right", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", textTransform: "uppercase" }}>Current Weight (kg)</th>
                      <th style={{ padding: "0.65rem 1rem", textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "0.7rem", textTransform: "uppercase" }}>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBottles.map(b => (
                      <tr key={b.serial} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <td style={{ padding: "0.65rem 1rem", fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700, color: "#00e5ff" }}>{b.serial}</td>
                        <td style={{ padding: "0.65rem 1rem", textTransform: "capitalize", color: "rgba(255,255,255,0.7)" }}>{b.category}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "rgba(255,255,255,0.7)" }}>{b.gasType}</td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                          <input
                            type="number"
                            step="0.01"
                            value={weights[b.serial] ?? b.currentWeight}
                            onChange={e => handleWeightChange(b.serial, e.target.value)}
                            style={{
                              width: "90px", padding: "0.35rem 0.5rem", background: "rgba(255,255,255,0.05)",
                              border: "1px solid rgba(255,255,255,0.12)", borderRadius: "6px", color: "#fff", textAlign: "right", fontSize: "0.85rem"
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => removeBottle(b.serial)}
                            style={{ background: "transparent", border: "none", color: "#ff3366", cursor: "pointer", padding: "0.2rem" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* HWCN & Paperwork Details */}
          <div style={{ gridTemplateColumns: "1fr", gap: "1.25rem", marginBottom: "2rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Supplier's HWCN Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. BJJ-123456"
                value={hwcnNumber}
                onChange={e => setHwcnNumber(e.target.value.toUpperCase())}
                style={{
                  width: "100%", padding: "0.85rem 1rem", background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", color: "#fff", outline: "none", fontSize: "1rem", fontWeight: 700
                }}
              />
            </div>

            {/* Multi-Photo Upload Section */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", color: "rgba(255,255,255,0.6)", marginBottom: "0.5rem", fontWeight: 600 }}>
                Photos / Paperwork Pages of Supplier Note ({photoFiles.length} uploaded)
              </label>

              {photoPreviewUrls.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "0.85rem", marginBottom: "1rem" }}>
                  {photoPreviewUrls.map((url, idx) => (
                    <div key={idx} style={{ position: "relative", borderRadius: "8px", overflow: "hidden", border: "1px solid rgba(0,229,255,0.3)", background: "#1a202c" }}>
                      <img
                        src={url}
                        alt={`HWCN page ${idx + 1}`}
                        onClick={() => { setSelectedPhotoIndex(idx); setIsLightboxOpen(true); }}
                        style={{ width: "100%", height: "110px", objectFit: "cover", display: "block", cursor: "pointer" }}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        style={{
                          position: "absolute", top: "0.35rem", right: "0.35rem",
                          background: "rgba(0,0,0,0.75)", border: "none", borderRadius: "50%",
                          padding: "0.25rem", color: "#ff3366", cursor: "pointer", display: "flex"
                        }}
                      >
                        <X size={14} />
                      </button>
                      <div
                        onClick={() => { setSelectedPhotoIndex(idx); setIsLightboxOpen(true); }}
                        style={{ padding: "0.25rem 0.5rem", background: "rgba(0,0,0,0.6)", fontSize: "0.68rem", color: "#00e5ff", fontWeight: 600, textAlign: "center", cursor: "pointer" }}
                      >
                        Page {idx + 1} (Preview)
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", padding: "0.75rem 1.25rem", background: "rgba(255,255,255,0.05)", border: "1px dashed rgba(0,229,255,0.4)", borderRadius: "8px", color: "#00e5ff", fontWeight: 600, fontSize: "0.85rem" }}>
                <input type="file" multiple accept="image/*,application/pdf" onChange={handlePhotoSelect} style={{ display: "none" }} />
                <Camera size={18} />
                {photoFiles.length === 0 ? "Upload HWCN Photos / Paperwork Pages" : "+ Add Another Page / Photo"}
              </label>
            </div>

            {error && (
              <div style={{ 
                padding: "0.75rem 1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.2)", 
                borderRadius: "8px", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem"
              }}>
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || selectedBottles.length === 0}
              style={{
                width: "100%", padding: "1rem", background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                border: "none", borderRadius: "10px", color: "#000", fontWeight: 800, fontSize: "1rem",
                cursor: (loading || selectedBottles.length === 0) ? "not-allowed" : "pointer", opacity: (loading || selectedBottles.length === 0) ? 0.6 : 1,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem"
              }}
            >
              {loading ? <Loader2 size={20} className="spinner" /> : "Complete Supplier Return"}
            </button>
          </div>

          <div style={{ padding: "1.25rem", background: "rgba(255,187,0,0.05)", border: "1px solid rgba(255,187,0,0.15)", borderRadius: "12px" }}>
            <h4 style={{ fontSize: "0.85rem", color: "#ffbb00", fontWeight: 700, marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <AlertCircle size={16} /> Compliance Notice
            </h4>
            <p style={{ fontSize: "0.75rem", color: "rgba(255,187,0,0.8)", lineHeight: 1.5, margin: 0 }}>
              Marking these cylinders as returned will remove them from your active inventory. This action is permanent and logs a movement log for regulatory auditing.
            </p>
          </div>
        </div>
      </form>
    </div>
    </>
  );
}
