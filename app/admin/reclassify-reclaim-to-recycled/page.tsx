"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { db, Bottle, MovementLog } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import {
  Recycle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Search,
  ArrowRight,
  ShieldAlert,
  Info,
  Calendar,
  Layers,
  Sparkles,
  History,
  Check
} from "lucide-react";
import Link from "next/link";

function fmtDate(iso: string | undefined | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ReclassifyRecycledPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"reclassify" | "transfer">("reclassify");

  // Bottle states
  const [storesBottles, setStoresBottles] = useState<Bottle[]>([]);
  const [gasCatalogue, setGasCatalogue] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<MovementLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Mode 1: In-Place Reclassify State
  const [selectedReclaimSerial, setSelectedReclaimSerial] = useState<string>("");
  const [targetGasType, setTargetGasType] = useState<string>("");
  const [reclassifyWeight, setReclassifyWeight] = useState<string>("");
  const [reclassifyCapacity, setReclassifyCapacity] = useState<string>("");
  const [reclassifyNotes, setReclassifyNotes] = useState<string>(
    "Cleaned, filtered, and certified for reuse in service."
  );
  const [reclassifySearch, setReclassifySearch] = useState<string>("");
  const [submittingReclassify, setSubmittingReclassify] = useState(false);
  const [reclassifyError, setReclassifyError] = useState("");
  const [reclassifySuccess, setReclassifySuccess] = useState<string | null>(null);

  // Mode 2: Decant Transfer State
  const [donorSerial, setDonorSerial] = useState<string>("");
  const [recipientSerial, setRecipientSerial] = useState<string>("");
  const [transferWeightInput, setTransferWeightInput] = useState<string>("");
  const [transferNotes, setTransferNotes] = useState<string>(
    "Workshop decant through filtration rig into recycled cylinder."
  );
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [transferError, setTransferError] = useState("");
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [allStoresBottles, gases, allLogs] = await Promise.all([
        db.getBottlesByLocation("office"),
        db.getGases(),
        db.getMovementLogs("all")
      ]);
      setStoresBottles(allStoresBottles);
      setGasCatalogue(gases);

      // Filter recent relevant logs
      const relevant = (allLogs || []).filter(
        (l: any) =>
          l.action === "reclassified_recycled" ||
          l.action === "workshop_decant_out" ||
          l.action === "workshop_decant_in"
      ).slice(0, 15);
      setRecentLogs(relevant);
    } catch (err) {
      console.error("Failed to load stores bottles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered lists strictly in Stores
  const reclaimBottlesInStores = useMemo(() => {
    return storesBottles.filter(
      b => b.category === "reclaim" && b.status !== "returned"
    );
  }, [storesBottles]);

  const recycledBottlesInStores = useMemo(() => {
    return storesBottles.filter(
      b => b.category === "recycled" && b.status !== "returned"
    );
  }, [storesBottles]);

  // Selected Reclaim bottle for Tab 1
  const selectedReclaimBottle = useMemo(() => {
    return reclaimBottlesInStores.find(b => b.serial === selectedReclaimSerial) || null;
  }, [reclaimBottlesInStores, selectedReclaimSerial]);

  // When a reclaim bottle is selected, pre-fill target fields
  useEffect(() => {
    if (selectedReclaimBottle) {
      setReclassifyWeight(String(selectedReclaimBottle.currentWeight ?? 0));
      setReclassifyCapacity(String(selectedReclaimBottle.initialWeight ?? 12));
      const cleanGas =
        selectedReclaimBottle.gasType && selectedReclaimBottle.gasType !== "Mixed/Recovery"
          ? selectedReclaimBottle.gasType
          : "R410A";
      setTargetGasType(cleanGas);
      setReclassifyError("");
      setReclassifySuccess(null);
    }
  }, [selectedReclaimBottle]);

  // Selected donor & recipient for Tab 2
  const selectedDonorBottle = useMemo(() => {
    return reclaimBottlesInStores.find(b => b.serial === donorSerial) || null;
  }, [reclaimBottlesInStores, donorSerial]);

  const selectedRecipientBottle = useMemo(() => {
    return recycledBottlesInStores.find(b => b.serial === recipientSerial) || null;
  }, [recycledBottlesInStores, recipientSerial]);

  // When recipient bottle is picked in Tab 2, default gas or notes if needed
  useEffect(() => {
    setTransferError("");
    setTransferSuccess(null);
  }, [donorSerial, recipientSerial]);

  // Search filtered list for Tab 1
  const filteredReclaimList = useMemo(() => {
    const q = reclassifySearch.trim().toLowerCase();
    if (!q) return reclaimBottlesInStores;
    return reclaimBottlesInStores.filter(
      b =>
        b.serial.toLowerCase().includes(q) ||
        (b.gasType || "").toLowerCase().includes(q) ||
        (b.poNumber || "").toLowerCase().includes(q)
    );
  }, [reclaimBottlesInStores, reclassifySearch]);

  // Execution: Tab 1 Reclassify
  const handleReclassifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReclaimBottle) {
      setReclassifyError("Please select a Reclaim cylinder to reclassify.");
      return;
    }
    const weightNum = parseFloat(reclassifyWeight);
    const capacityNum = parseFloat(reclassifyCapacity);

    if (isNaN(weightNum) || weightNum < 0) {
      setReclassifyError("Please enter a valid live weight (>= 0 kg).");
      return;
    }
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setReclassifyError("Please enter a valid cylinder capacity (> 0 kg).");
      return;
    }
    if (weightNum > capacityNum) {
      setReclassifyError("Live weight cannot exceed cylinder capacity.");
      return;
    }
    if (!targetGasType) {
      setReclassifyError("Please select the pure gas type for the recycled bottle.");
      return;
    }

    try {
      setSubmittingReclassify(true);
      setReclassifyError("");
      await db.reclassifyReclaimToRecycled({
        serial: selectedReclaimBottle.serial,
        gasType: targetGasType,
        currentWeight: Number(weightNum.toFixed(2)),
        initialWeight: Number(capacityNum.toFixed(2)),
        performedBy: user?.name || "HQ-Stores",
        notes: reclassifyNotes.trim()
      });

      setReclassifySuccess(
        `Cylinder ${selectedReclaimBottle.serial} successfully reclassified to Recycled Bottle (${targetGasType}, ${weightNum.toFixed(2)}kg)!`
      );
      setSelectedReclaimSerial("");
      await loadData();
    } catch (err: any) {
      console.error("Reclassify error:", err);
      setReclassifyError(err.message || "Failed to reclassify bottle.");
    } finally {
      setSubmittingReclassify(false);
    }
  };

  // Execution: Tab 2 Transfer
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorBottle) {
      setTransferError("Please select a donor Reclaim cylinder in Stores.");
      return;
    }
    if (!selectedRecipientBottle) {
      setTransferError("Please select a recipient Recycled cylinder in Stores.");
      return;
    }
    const transferNum = parseFloat(transferWeightInput);
    if (isNaN(transferNum) || transferNum <= 0) {
      setTransferError("Please enter a valid transfer weight (> 0 kg).");
      return;
    }
    if (transferNum > (selectedDonorBottle.currentWeight || 0)) {
      setTransferError(
        `Transfer weight exceeds available gas in donor bottle (${(selectedDonorBottle.currentWeight || 0).toFixed(2)}kg).`
      );
      return;
    }
    const recipientCapacity = selectedRecipientBottle.initialWeight || 20;
    const recipientCurrent = selectedRecipientBottle.currentWeight || 0;
    const spaceLeft = Math.max(0, recipientCapacity - recipientCurrent);
    if (transferNum > spaceLeft) {
      setTransferError(
        `Transfer exceeds recipient safe capacity. Available space: ${spaceLeft.toFixed(2)}kg.`
      );
      return;
    }

    try {
      setSubmittingTransfer(true);
      setTransferError("");
      await db.transferGasReclaimToRecycled({
        donorSerial: selectedDonorBottle.serial,
        recipientSerial: selectedRecipientBottle.serial,
        transferWeight: Number(transferNum.toFixed(2)),
        performedBy: user?.name || "HQ-Stores",
        notes: transferNotes.trim()
      });

      setTransferSuccess(
        `Successfully transferred ${transferNum.toFixed(2)}kg filtered gas from ${selectedDonorBottle.serial} to Recycled bottle ${selectedRecipientBottle.serial}!`
      );
      setTransferWeightInput("");
      setDonorSerial("");
      await loadData();
    } catch (err: any) {
      console.error("Transfer error:", err);
      setTransferError(err.message || "Failed to transfer gas.");
    } finally {
      setSubmittingTransfer(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1400px", margin: "0 auto", color: "#fff" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
              } else {
                router.push("/admin/stores");
              }
            }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: "40px", height: "40px", borderRadius: "10px",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              color: "#fff", cursor: "pointer"
            }}
            title="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.35rem",
                  padding: "0.2rem 0.6rem", borderRadius: "6px",
                  background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)",
                  color: "#10b981", fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase"
                }}
              >
                <Recycle size={13} /> Workshop Recycling & Decant
              </span>
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, margin: "0.25rem 0 0.15rem", letterSpacing: "-0.02em" }}>
              Recycled Bottle: Reclassify Reclaim Bottle to Recycled Bottle
            </h1>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
              Reclassify cleaned reclaim cylinders to recycled bottles or transfer filtered gas between store cylinders. (Stores cylinders only)
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setActiveTab("reclassify")}
          style={{
            padding: "0.75rem 1.25rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem",
            background: activeTab === "reclassify" ? "rgba(16,185,129,0.2)" : "transparent",
            color: activeTab === "reclassify" ? "#10b981" : "rgba(255,255,255,0.6)",
            border: activeTab === "reclassify" ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"
          }}
        >
          <Sparkles size={16} /> Mode 1: Reclassify Reclaim to Recycled Bottle
        </button>
        <button
          onClick={() => setActiveTab("transfer")}
          style={{
            padding: "0.75rem 1.25rem", borderRadius: "8px", fontWeight: 700, fontSize: "0.9rem",
            background: activeTab === "transfer" ? "rgba(0,229,255,0.15)" : "transparent",
            color: activeTab === "transfer" ? "#00e5ff" : "rgba(255,255,255,0.6)",
            border: activeTab === "transfer" ? "1px solid rgba(0,229,255,0.4)" : "1px solid transparent",
            cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem"
          }}
        >
          <ArrowRight size={16} /> Mode 2: Decant Gas Transfer (Reclaim → Recycled)
        </button>
      </div>

      {/* TAB 1: RECLASSIFY RECLAIM TO RECYCLED */}
      {activeTab === "reclassify" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Left Column: Reclaim Cylinders in Stores */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: 0, color: "#fff" }}>
                  1. Select Reclaim Cylinder in Stores
                </h3>
                <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.5)" }}>
                  Only cylinders physically at HQ-Stores are eligible for workshop reclassification.
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.75rem", padding: "0.2rem 0.6rem", borderRadius: "12px",
                  background: "rgba(255,187,0,0.15)", color: "#ffbb00", fontWeight: 700
                }}
              >
                {reclaimBottlesInStores.length} in Stores
              </span>
            </div>

            {/* Search Input */}
            <div style={{ position: "relative", marginBottom: "1rem" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "12px", color: "rgba(255,255,255,0.4)" }} />
              <input
                type="text"
                placeholder="Search serial, gas type..."
                value={reclassifySearch}
                onChange={e => setReclassifySearch(e.target.value)}
                style={{
                  width: "100%", padding: "0.7rem 0.7rem 0.7rem 2.2rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none"
                }}
              />
            </div>

            {/* Bottle List */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "rgba(255,255,255,0.4)" }}>
                <Loader2 size={24} className="spinner" style={{ margin: "0 auto 0.5rem" }} />
                Loading stores inventory...
              </div>
            ) : filteredReclaimList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <Info size={24} style={{ color: "rgba(255,255,255,0.3)", margin: "0 auto 0.5rem" }} />
                <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.5)" }}>
                  No reclaim cylinders found in Stores.
                </p>
                <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "rgba(255,255,255,0.3)" }}>
                  Reclaim cylinders must be received into Stores before reclassifying.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "450px", overflowY: "auto", paddingRight: "4px" }}>
                {filteredReclaimList.map(b => {
                  const isSelected = selectedReclaimSerial === b.serial;
                  return (
                    <div
                      key={b.serial}
                      onClick={() => setSelectedReclaimSerial(b.serial)}
                      style={{
                        padding: "0.85rem 1rem", borderRadius: "8px", cursor: "pointer",
                        background: isSelected ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.03)",
                        border: isSelected ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.07)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        transition: "all 0.15s ease"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <span style={{ fontWeight: 800, fontSize: "0.95rem", color: isSelected ? "#10b981" : "#fff" }}>
                            {b.serial}
                          </span>
                          <span
                            style={{
                              fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: "4px",
                              background: "rgba(255,187,0,0.15)", color: "#ffbb00", fontWeight: 600
                            }}
                          >
                            Reclaim
                          </span>
                          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)" }}>
                            {b.gasType}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "1rem", marginTop: "0.3rem", fontSize: "0.75rem", color: "rgba(255,255,255,0.4)" }}>
                          <span>Live Weight: <strong style={{ color: "#fff" }}>{Number(b.currentWeight ?? 0).toFixed(2)} kg</strong></span>
                          <span>Capacity: {Number(b.initialWeight ?? 12).toFixed(2)} kg</span>
                          <span>Received: {fmtDate(b.locationChangedAt || b.registeredAt)}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          width: "22px", height: "22px", borderRadius: "50%",
                          border: isSelected ? "2px solid #10b981" : "2px solid rgba(255,255,255,0.2)",
                          background: isSelected ? "#10b981" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center"
                        }}
                      >
                        {isSelected && <Check size={13} color="#000" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Reclassification Specification Form */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 1.25rem", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Recycle size={18} color="#10b981" /> 2. Recycled Bottle Configuration
            </h3>

            {!selectedReclaimBottle ? (
              <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
                  Select a reclaim cylinder from the list to begin reclassification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReclassifySubmit}>
                {/* Active Bottle Snapshot */}
                <div
                  style={{
                    padding: "0.85rem 1rem", borderRadius: "8px",
                    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                    marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", fontWeight: 700 }}>
                      Selected Cylinder
                    </div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#10b981" }}>
                      {selectedReclaimBottle.serial}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontSize: "0.8rem", color: "rgba(255,255,255,0.7)" }}>
                    <div>Current: {selectedReclaimBottle.gasType}</div>
                    <div>Live Gas: <strong>{Number(selectedReclaimBottle.currentWeight ?? 0).toFixed(2)} kg</strong></div>
                  </div>
                </div>

                {/* Target Gas Selection */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                    Pure Refrigerant Type <span style={{ color: "#ff3366" }}>*</span>
                  </label>
                  <select
                    value={targetGasType}
                    onChange={e => setTargetGasType(e.target.value)}
                    required
                    style={{
                      width: "100%", padding: "0.8rem 1rem",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", colorScheme: "dark"
                    }}
                  >
                    <option value="" disabled>Select pure refrigerant</option>
                    {["R410A", "R32", "R134a", "R404A", "R407C", "R422D", "R507"].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                    {gasCatalogue
                      .filter(g => !["R410A", "R32", "R134a", "R404A", "R407C", "R422D", "R507", "Mixed/Recovery"].includes(g.name))
                      .map(g => (
                        <option key={g.id || g.name} value={g.name}>{g.name}</option>
                      ))}
                  </select>
                  <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)" }}>
                    Recycled bottles must be designated to a single pure gas type for servicing reuse.
                  </p>
                </div>

                {/* Weight & Capacity Inputs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                      Current Live Gas (kg) <span style={{ color: "#ff3366" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={reclassifyWeight}
                      onChange={e => setReclassifyWeight(e.target.value)}
                      required
                      style={{
                        width: "100%", padding: "0.8rem 1rem",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none"
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                      Cylinder Capacity (kg) <span style={{ color: "#ff3366" }}>*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.1"
                      value={reclassifyCapacity}
                      onChange={e => setReclassifyCapacity(e.target.value)}
                      required
                      style={{
                        width: "100%", padding: "0.8rem 1rem",
                        background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Workshop Notes */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                    Workshop Cleaning / Certification Notes
                  </label>
                  <textarea
                    rows={2}
                    value={reclassifyNotes}
                    onChange={e => setReclassifyNotes(e.target.value)}
                    style={{
                      width: "100%", padding: "0.75rem 1rem",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", resize: "none"
                    }}
                  />
                </div>

                {/* Error / Success Feedback */}
                {reclassifyError && (
                  <div
                    style={{
                      padding: "0.75rem 1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)",
                      borderRadius: "8px", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem"
                    }}
                  >
                    <AlertCircle size={16} /> {reclassifyError}
                  </div>
                )}
                {reclassifySuccess && (
                  <div
                    style={{
                      padding: "0.75rem 1rem", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: "8px", color: "#10b981", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem"
                    }}
                  >
                    <CheckCircle2 size={16} /> {reclassifySuccess}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submittingReclassify}
                  style={{
                    width: "100%", padding: "0.95rem",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none", borderRadius: "8px", color: "#fff", fontWeight: 800, fontSize: "0.95rem",
                    cursor: submittingReclassify ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    opacity: submittingReclassify ? 0.6 : 1
                  }}
                >
                  {submittingReclassify ? (
                    <>
                      <Loader2 size={18} className="spinner" /> Reclassifying...
                    </>
                  ) : (
                    <>
                      <Recycle size={18} /> Confirm Reclassification to Recycled Bottle
                    </>
                  )}
                </button>

                <p style={{ margin: "0.8rem 0 0", fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", textAlign: "center" }}>
                  Authorized by {user?.name || "Office Staff"}. Past consignment notes and movements remain permanently preserved in history.
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DECANT GAS TRANSFER */}
      {activeTab === "transfer" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.5rem", alignItems: "start" }}>
          {/* Left Column: Select Donor & Recipient */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 1.25rem", color: "#fff" }}>
              1. Workshop Decant Transfer (Between Stores Cylinders)
            </h3>

            {/* Step A: Donor Reclaim Cylinder */}
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#ffbb00", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                Step A: Select Donor Reclaim Cylinder (in Stores)
              </label>
              <select
                value={donorSerial}
                onChange={e => setDonorSerial(e.target.value)}
                style={{
                  width: "100%", padding: "0.8rem 1rem",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", colorScheme: "dark"
                }}
              >
                <option value="">-- Choose Donor Reclaim Bottle --</option>
                {reclaimBottlesInStores
                  .filter(b => (b.currentWeight || 0) > 0)
                  .map(b => (
                    <option key={b.serial} value={b.serial}>
                      {b.serial} — {b.gasType} ({Number(b.currentWeight || 0).toFixed(2)} kg available)
                    </option>
                  ))}
              </select>
              {selectedDonorBottle && (
                <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", background: "rgba(255,187,0,0.08)", borderRadius: "6px", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                  Donor Available: <strong style={{ color: "#ffbb00" }}>{Number(selectedDonorBottle.currentWeight || 0).toFixed(2)} kg</strong> of {selectedDonorBottle.gasType}
                </div>
              )}
            </div>

            {/* Step B: Recipient Recycled Cylinder */}
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#10b981", marginBottom: "0.5rem", textTransform: "uppercase" }}>
                Step B: Select Recipient Recycled Cylinder (in Stores)
              </label>
              {recycledBottlesInStores.length === 0 ? (
                <div style={{ padding: "1rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.15)", fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                  No existing Recycled cylinders found in Stores. Please use Mode 1 above to reclassify a cylinder first.
                </div>
              ) : (
                <>
                  <select
                    value={recipientSerial}
                    onChange={e => setRecipientSerial(e.target.value)}
                    style={{
                      width: "100%", padding: "0.8rem 1rem",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none", colorScheme: "dark"
                    }}
                  >
                    <option value="">-- Choose Recipient Recycled Bottle --</option>
                    {recycledBottlesInStores
                      .filter(b => b.serial !== donorSerial)
                      .map(b => {
                        const cur = b.currentWeight || 0;
                        const cap = b.initialWeight || 20;
                        const space = Math.max(0, cap - cur);
                        return (
                          <option key={b.serial} value={b.serial}>
                            {b.serial} — {b.gasType} (Current: {cur.toFixed(2)} kg | Space: {space.toFixed(2)} kg)
                          </option>
                        );
                      })}
                  </select>
                  {selectedRecipientBottle && (
                    <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.8rem", background: "rgba(16,185,129,0.08)", borderRadius: "6px", fontSize: "0.78rem", color: "rgba(255,255,255,0.7)" }}>
                      Recipient Capacity: <strong>{Number(selectedRecipientBottle.initialWeight || 20).toFixed(2)} kg</strong> | Current Balance: <strong>{Number(selectedRecipientBottle.currentWeight || 0).toFixed(2)} kg</strong> | Safe Space Left: <strong style={{ color: "#10b981" }}>{Math.max(0, (selectedRecipientBottle.initialWeight || 20) - (selectedRecipientBottle.currentWeight || 0)).toFixed(2)} kg</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Right Column: Transfer Form & Balance Preview */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h3 style={{ fontSize: "1.05rem", fontWeight: 700, margin: "0 0 1.25rem", color: "#fff" }}>
              2. Transfer Details & Balance Preview
            </h3>

            {(!selectedDonorBottle || !selectedRecipientBottle) ? (
              <div style={{ textAlign: "center", padding: "3rem 1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px dashed rgba(255,255,255,0.1)" }}>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
                  Select both a donor Reclaim bottle and a recipient Recycled bottle to proceed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleTransferSubmit}>
                {/* Transfer Weight Input */}
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                    Weight to Decant / Transfer (kg) <span style={{ color: "#ff3366" }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={Number(selectedDonorBottle.currentWeight || 0)}
                    placeholder={`Max ${(selectedDonorBottle.currentWeight || 0).toFixed(2)} kg`}
                    value={transferWeightInput}
                    onChange={e => setTransferWeightInput(e.target.value)}
                    required
                    style={{
                      width: "100%", padding: "0.8rem 1rem",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: "#fff", fontSize: "0.9rem", outline: "none"
                    }}
                  />
                </div>

                {/* Real-time Math Preview */}
                {parseFloat(transferWeightInput) > 0 && (
                  <div
                    style={{
                      padding: "1rem", borderRadius: "8px",
                      background: "rgba(0,229,255,0.05)", border: "1px solid rgba(0,229,255,0.2)",
                      marginBottom: "1rem", fontSize: "0.82rem"
                    }}
                  >
                    <div style={{ fontWeight: 700, color: "#00e5ff", marginBottom: "0.5rem" }}>
                      Mass Balance Preview:
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                      <span>Donor Reclaim ({selectedDonorBottle.serial}):</span>
                      <span>
                        {(selectedDonorBottle.currentWeight || 0).toFixed(2)} kg →{" "}
                        <strong style={{ color: "#ffbb00" }}>
                          {Math.max(0, (selectedDonorBottle.currentWeight || 0) - parseFloat(transferWeightInput)).toFixed(2)} kg
                        </strong>
                        {Math.max(0, (selectedDonorBottle.currentWeight || 0) - parseFloat(transferWeightInput)) === 0 && (
                          <span style={{ color: "#10b981", marginLeft: "4px" }}>(Will become Empty)</span>
                        )}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Recipient Recycled ({selectedRecipientBottle.serial}):</span>
                      <span>
                        {(selectedRecipientBottle.currentWeight || 0).toFixed(2)} kg →{" "}
                        <strong style={{ color: "#10b981" }}>
                          {((selectedRecipientBottle.currentWeight || 0) + parseFloat(transferWeightInput)).toFixed(2)} kg
                        </strong>
                      </span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.7)", marginBottom: "0.4rem" }}>
                    Transfer & Filtration Notes
                  </label>
                  <textarea
                    rows={2}
                    value={transferNotes}
                    onChange={e => setTransferNotes(e.target.value)}
                    style={{
                      width: "100%", padding: "0.75rem 1rem",
                      background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "8px", color: "#fff", fontSize: "0.85rem", outline: "none", resize: "none"
                    }}
                  />
                </div>

                {/* Error & Success Alerts */}
                {transferError && (
                  <div
                    style={{
                      padding: "0.75rem 1rem", background: "rgba(255,51,102,0.1)", border: "1px solid rgba(255,51,102,0.3)",
                      borderRadius: "8px", color: "#ff3366", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem"
                    }}
                  >
                    <AlertCircle size={16} /> {transferError}
                  </div>
                )}
                {transferSuccess && (
                  <div
                    style={{
                      padding: "0.75rem 1rem", background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)",
                      borderRadius: "8px", color: "#10b981", fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem"
                    }}
                  >
                    <CheckCircle2 size={16} /> {transferSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingTransfer}
                  style={{
                    width: "100%", padding: "0.95rem",
                    background: "linear-gradient(135deg, #00e5ff 0%, #0088ff 100%)",
                    border: "none", borderRadius: "8px", color: "#000", fontWeight: 800, fontSize: "0.95rem",
                    cursor: submittingTransfer ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem",
                    opacity: submittingTransfer ? 0.6 : 1
                  }}
                >
                  {submittingTransfer ? (
                    <>
                      <Loader2 size={18} className="spinner" /> Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={18} /> Execute Decant Transfer
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Audit History Timeline */}
      <div className="glass-panel" style={{ marginTop: "2rem", padding: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
          <History size={18} color="#10b981" />
          <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "#fff" }}>
            Recent Recycled & Decant Workshop Activity
          </h3>
        </div>

        {recentLogs.length === 0 ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "rgba(255,255,255,0.4)" }}>
            No recent reclassifications or decant transfers recorded yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left", color: "rgba(255,255,255,0.5)" }}>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Date</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Cylinder Serial</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Action</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Performed By</th>
                  <th style={{ padding: "0.6rem 0.8rem" }}>Notes / Audit Trace</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.map((log: any) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "0.6rem 0.8rem", color: "rgba(255,255,255,0.6)" }}>
                      {fmtDate(log.date || log.created_at)}
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem", fontWeight: 700, color: "#fff" }}>
                      <Link href={`/admin/bottles/${encodeURIComponent(log.serial)}`} style={{ color: "#00e5ff", textDecoration: "none" }}>
                        {log.serial}
                      </Link>
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem" }}>
                      <span
                        style={{
                          fontSize: "0.72rem", padding: "0.15rem 0.45rem", borderRadius: "4px",
                          background:
                            log.action === "reclassified_recycled"
                              ? "rgba(16,185,129,0.15)"
                              : "rgba(0,229,255,0.15)",
                          color:
                            log.action === "reclassified_recycled"
                              ? "#10b981"
                              : "#00e5ff",
                          fontWeight: 600
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem", color: "rgba(255,255,255,0.8)" }}>
                      {log.engineer || "HQ-Stores"}
                    </td>
                    <td style={{ padding: "0.6rem 0.8rem", color: "rgba(255,255,255,0.6)" }}>
                      {log.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
