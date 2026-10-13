"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Wrench,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  MapPin,
  Building2,
  Users,
  Plus,
  Trash2,
} from "lucide-react";
import { db, Bottle, LocationType } from "@/lib/db";
import { useAuth } from "@/lib/AuthContext";
import { useOffline } from "./OfflineContext";

interface OfflineBottleModalProps {
  bottle: Bottle | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}

type ModalTab = "overview" | "log" | "move";

interface EquipmentFormItem {
  id: number;
  manufacturer: string;
  model: string;
  serial: string;
  weight: string;
  decommissioned?: boolean;
  nominalChargeKg?: string;
  leakCheckResult?: "pass" | "fail" | "repaired";
}

export function OfflineBottleModal({
  bottle: initialBottle,
  isOpen,
  onClose,
  onUpdated,
}: OfflineBottleModalProps) {
  const { user, activeVehicleReg, activeVehicleOwner } = useAuth();
  const { refreshMeta, openOfflineGateModal } = useOffline();

  const [bottle, setBottle] = useState<Bottle | null>(initialBottle);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");

  // Log Form State
  const [jobNo, setJobNo] = useState<string>("");
  const [jobType, setJobType] = useState<string>("service");
  const [equipmentList, setEquipmentList] = useState<EquipmentFormItem[]>([
    {
      id: 1,
      manufacturer: "",
      model: "",
      serial: "",
      weight: "",
      decommissioned: false,
      leakCheckResult: "pass",
    },
  ]);
  const [isSubmittingLog, setIsSubmittingLog] = useState<boolean>(false);
  const [logSuccess, setLogSuccess] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);

  // Move Form State
  const [moveDest, setMoveDest] = useState<LocationType>("site");
  const [moveLocId, setMoveLocId] = useState<string>("");
  const [isSubmittingMove, setIsSubmittingMove] = useState<boolean>(false);
  const [moveSuccess, setMoveSuccess] = useState<boolean>(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  useEffect(() => {
    setBottle(initialBottle);
    setActiveTab("overview");

    // Pre-fill Job No. if cylinder is already assigned to a site
    if (initialBottle?.locationType === "site" && initialBottle?.locationId) {
      setJobNo(initialBottle.locationId);
    } else {
      setJobNo("");
    }

    // Default job type based on cylinder category
    if (initialBottle?.category === "reclaim") {
      setJobType("recovery");
    } else if (initialBottle?.category === "recycled") {
      setJobType("recycled_charge");
    } else {
      setJobType("service");
    }

    setEquipmentList([
      {
        id: Date.now(),
        manufacturer: "",
        model: "",
        serial: "",
        weight: "",
        decommissioned: false,
        leakCheckResult: "pass",
      },
    ]);

    setLogSuccess(false);
    setLogError(null);

    // If cylinder is on site or in stores, destination rule mandates moving back to van
    const isLocked =
      initialBottle?.locationType === "site" || initialBottle?.locationType === "office";
    setMoveDest(isLocked ? "van" : "site");
    setMoveLocId("");
    setMoveSuccess(false);
    setMoveError(null);
  }, [initialBottle, isOpen]);

  const totalWeight = useMemo(() => {
    if (jobType === "leak_test") return 0;
    return equipmentList.reduce(
      (sum, eq) => sum + (parseFloat(eq.weight) || 0),
      0
    );
  }, [jobType, equipmentList]);

  if (!isOpen || !bottle) return null;

  const isReclaim = bottle.category === "reclaim";
  const isRecycled = bottle.category === "recycled";
  const isNitrogen = bottle.category === "nitrogen";
  const cap = bottle.initialWeight || 0;
  const cur = bottle.currentWeight || 0;
  const isLockedToVan = bottle.locationType === "site" || bottle.locationType === "office";

  const getBorderColor = () => {
    if (isRecycled) return "#10b981";
    if (isReclaim) return "var(--warning)";
    if (isNitrogen) return "#22c55e";
    return "var(--primary)";
  };

  const getCategoryLabel = () => {
    if (isRecycled) return `Recycled (${bottle.gasType || "Refrigerant"})`;
    if (isReclaim) return "Reclaim / Haz";
    if (isNitrogen) return "Nitrogen";
    return bottle.gasType || "New Refrigerant";
  };

  const addEquipment = () => {
    setEquipmentList((prev) => [
      ...prev,
      {
        id: Date.now(),
        manufacturer: "",
        model: "",
        serial: "",
        weight: "",
        decommissioned: false,
        leakCheckResult: "pass",
      },
    ]);
  };

  const updateEquipment = (
    id: number,
    field: keyof EquipmentFormItem,
    value: any
  ) => {
    const finalValue =
      field === "model" || field === "serial"
        ? (value as string).toUpperCase()
        : value;
    setEquipmentList((prev) =>
      prev.map((eq) => (eq.id === id ? { ...eq, [field]: finalValue } : eq))
    );
  };

  const removeEquipment = (id: number) => {
    setEquipmentList((prev) => prev.filter((eq) => eq.id !== id));
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);

    // Job Number Format Validation (1 letter followed by numbers)
    const cleanJobNo = (jobNo || "").trim().replace(/\s+/g, "").toUpperCase();
    if (!/^[A-Za-z]\d+$/.test(cleanJobNo)) {
      setLogError(
        "Job No. must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201)."
      );
      return;
    }

    if (equipmentList.length === 0) {
      setLogError("Please enter at least one equipment / asset item.");
      return;
    }

    // Equipment validation
    for (let i = 0; i < equipmentList.length; i++) {
      const eq = equipmentList[i];
      if (!eq.manufacturer.trim()) {
        setLogError(`Asset ${i + 1}: Please enter the manufacturer.`);
        return;
      }
      if (!eq.model.trim()) {
        setLogError(`Asset ${i + 1}: Please enter the model number.`);
        return;
      }
      if (!eq.serial.trim()) {
        setLogError(`Asset ${i + 1}: Please enter the serial number.`);
        return;
      }
      if (jobType !== "leak_test") {
        const w = parseFloat(eq.weight);
        if (isNaN(w) || w <= 0) {
          setLogError(`Asset ${i + 1}: Please enter a valid weight greater than 0 kg.`);
          return;
        }
      }
    }

    // Weight balance checks against cylinder capacity/fill
    if (jobType !== "leak_test") {
      if (totalWeight <= 0) {
        setLogError("Total logged weight must be greater than 0 kg.");
        return;
      }
      if (isReclaim) {
        const maxCap = bottle.initialWeight || 20;
        if (cur + totalWeight > maxCap) {
          setLogError(
            `Cannot add ${totalWeight.toFixed(2)}kg. Cylinder only has ${(
              maxCap - cur
            ).toFixed(2)}kg of space remaining (max fill: ${maxCap.toFixed(2)}kg).`
          );
          return;
        }
      } else {
        if (totalWeight > cur) {
          setLogError(
            `Cannot log ${totalWeight.toFixed(2)}kg. Only ${cur.toFixed(
              2
            )}kg of refrigerant is currently in this cylinder.`
          );
          return;
        }
      }
    }

    setIsSubmittingLog(true);
    try {
      const engName = activeVehicleOwner || user?.name || "Engineer";
      const equipmentToSave = equipmentList.map((eq) => ({
        manufacturer: eq.manufacturer.trim(),
        model: eq.model.trim().toUpperCase(),
        serial: eq.serial.trim().toUpperCase(),
        weight: jobType === "leak_test" ? 0 : parseFloat(eq.weight) || 0,
        nominalChargeKg: eq.nominalChargeKg
          ? parseFloat(eq.nominalChargeKg)
          : undefined,
        leakCheckResult: eq.leakCheckResult || "pass",
      }));

      await db.logUsage(
        bottle.serial,
        jobType,
        jobType === "leak_test" ? 0 : totalWeight,
        isReclaim,
        undefined,
        bottle.gasType,
        engName,
        cleanJobNo,
        equipmentToSave
      );

      // Optimistically adjust displayed weight
      const updatedWeight = isReclaim
        ? cur + totalWeight
        : jobType === "leak_test"
        ? cur
        : Math.max(0, cur - totalWeight);
      setBottle({ ...bottle, currentWeight: updatedWeight });

      setLogSuccess(true);
      refreshMeta();
      if (onUpdated) onUpdated();
      setTimeout(() => {
        setLogSuccess(false);
        setActiveTab("overview");
      }, 1500);
    } catch (err: any) {
      setLogError(err?.message || "Failed to save offline log.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const handleMoveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMoveError(null);

    // Business rule: cylinders on site or stores can only be returned to active van
    const targetDest = isLockedToVan ? "van" : moveDest;

    let finalLocId = "";
    if (targetDest === "site") {
      finalLocId = moveLocId.trim().replace(/\s+/g, "").toUpperCase();
      if (!/^[A-Za-z]\d+$/.test(finalLocId)) {
        setMoveError(
          "Site Job No. must start with 1 letter followed by numbers without spaces (e.g. J12345, M98201)."
        );
        return;
      }
    } else if (targetDest === "van") {
      finalLocId = `${activeVehicleOwner || user?.name || "Engineer"} - Van`;
    } else if (targetDest === "office") {
      finalLocId = "HQ-Stores / Office";
    }

    setIsSubmittingMove(true);
    try {
      const engName = activeVehicleOwner || user?.name || "Engineer";
      const targetVanReg =
        targetDest === "van" ? activeVehicleReg || user?.vehicleReg : undefined;

      await db.updateBottleLocation(
        bottle.serial,
        targetDest,
        finalLocId,
        undefined,
        undefined,
        undefined,
        engName,
        targetVanReg,
        user?.name
      );

      // Optimistically update displayed location
      setBottle({
        ...bottle,
        locationType: targetDest,
        locationId: finalLocId,
      });

      setMoveSuccess(true);
      refreshMeta();
      if (onUpdated) onUpdated();
      setTimeout(() => {
        setMoveSuccess(false);
        setActiveTab("overview");
      }, 1500);
    } catch (err: any) {
      setMoveError(err?.message || "Failed to save offline move.");
    } finally {
      setIsSubmittingMove(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: "0",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "540px",
          maxHeight: "92vh",
          overflowY: "auto",
          background: "#0c131c",
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          border: `1px solid rgba(255, 255, 255, 0.12)`,
          borderBottom: "none",
          padding: "1.25rem 1.25rem 2rem",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.6)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            paddingBottom: "0.75rem",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {activeTab !== "overview" && (
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  padding: "0.25rem",
                  marginRight: "0.25rem",
                }}
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    background: `${getBorderColor()}20`,
                    color: getBorderColor(),
                    border: `1px solid ${getBorderColor()}40`,
                  }}
                >
                  {getCategoryLabel()}
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "0.2rem 0.5rem",
                    borderRadius: "4px",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "var(--warning)",
                    fontWeight: 700,
                  }}
                >
                  Offline
                </span>
              </div>
              <h2
                style={{
                  margin: "0.25rem 0 0",
                  fontSize: "1.3rem",
                  fontWeight: 800,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  letterSpacing: "0.5px",
                }}
              >
                {bottle.serial}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div>
            {/* Stats Card */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderLeft: `4px solid ${getBorderColor()}`,
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1.25rem",
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                    Gas Type
                  </span>
                  <strong style={{ fontSize: "0.95rem", color: "#fff" }}>{bottle.gasType || "—"}</strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                    Current Location
                  </span>
                  <strong style={{ fontSize: "0.95rem", color: "#fff", textTransform: "capitalize" }}>
                    {bottle.locationId || bottle.locationType}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                    {isReclaim ? "Filled Weight" : "Current Weight"}
                  </span>
                  <strong
                    style={{
                      fontSize: "1.1rem",
                      color: isReclaim ? "var(--warning)" : "var(--success)",
                    }}
                  >
                    {cur.toFixed(2)} kg
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                    {isReclaim ? "Max Fill Weight" : "Full Weight"}
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: "#fff" }}>{cap.toFixed(2)} kg</strong>
                </div>
              </div>
            </div>

            {/* Offline Action Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setActiveTab("log")}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid var(--primary)",
                  background: "rgba(0, 229, 255, 0.08)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Wrench size={18} color="var(--primary)" />
                {isReclaim ? "Log Refrigerant Recovery" : "Log Gas Usage"}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("move")}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.6rem",
                  fontSize: "1rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <Truck size={18} />
                Move Bottle Location
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== "undefined" && !navigator.onLine) {
                    openOfflineGateModal(
                      "Viewing full supplier paperwork, digital HWCN certificates, and photos requires an active internet connection.",
                      "History Requires Signal"
                    );
                    return;
                  }
                  window.location.href = `/engineer/bottle/${encodeURIComponent(bottle.serial)}`;
                }}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.02)",
                  color: "#94a3b8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <span>View Full History & Paperwork</span>
                <span style={{ fontSize: "0.7rem", color: "var(--warning)" }}>☁️ Online</span>
              </button>
            </div>

            <p
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "flex-start",
                marginTop: "1.25rem",
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                lineHeight: 1.4,
              }}
            >
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "0.15rem", color: "var(--warning)" }} />
              <span>
                Offline Mode: Changes saved here are timestamped with the exact current time and queued
                on this device. They will automatically sync with HQ as soon as internet connection is restored.
              </span>
            </p>
          </div>
        )}

        {/* LOG USAGE TAB */}
        {activeTab === "log" && (
          <form onSubmit={handleLogSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ margin: "0", fontSize: "1.05rem", fontWeight: 700 }}>
              {isReclaim
                ? "Record Refrigerant Recovery"
                : isRecycled
                ? "Record Recycled Gas Charge"
                : "Record Gas Usage"}
            </h3>

            {logSuccess ? (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  padding: "1rem",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={22} />
                <span>Log saved to device! Will auto-sync when online.</span>
              </div>
            ) : (
              <>
                {/* Job No. Input */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.4rem",
                    }}
                  >
                    <label style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      Job No. (e.g. J12345, M98201) *
                    </label>
                    {bottle.locationType === "site" && bottle.locationId && (
                      <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600 }}>
                        📍 Pre-filled from site
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={jobNo}
                    pattern="^[A-Za-z][0-9]+$"
                    title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                    onChange={(e) => setJobNo(e.target.value.replace(/\s+/g, "").toUpperCase())}
                    placeholder="e.g. J12345"
                    required
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "1rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                {/* Activity / Job Type */}
                {isReclaim ? (
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #ffaa00",
                      background: "rgba(255, 170, 0, 0.12)",
                      color: "#ffaa00",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>⚠️</span>
                    <span>Refrigerant Recovery (Hazardous Waste)</span>
                  </div>
                ) : isRecycled ? (
                  <div
                    style={{
                      padding: "0.65rem 0.85rem",
                      borderRadius: "8px",
                      border: "1px solid #10b981",
                      background: "rgba(16, 185, 129, 0.12)",
                      color: "#10b981",
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span>♻️</span>
                    <span>Recycled Gas Charge into Equipment</span>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Activity / Job Type
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <button
                        type="button"
                        onClick={() => setJobType("service")}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          border:
                            jobType === "service"
                              ? "1px solid var(--primary)"
                              : "1px solid rgba(255,255,255,0.12)",
                          background:
                            jobType === "service"
                              ? "rgba(0,229,255,0.15)"
                              : "rgba(255,255,255,0.05)",
                          color: jobType === "service" ? "#00e5ff" : "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        Service / Addition
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobType("install")}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          border:
                            jobType === "install"
                              ? "1px solid var(--primary)"
                              : "1px solid rgba(255,255,255,0.12)",
                          background:
                            jobType === "install"
                              ? "rgba(0,229,255,0.15)"
                              : "rgba(255,255,255,0.05)",
                          color: jobType === "install" ? "#00e5ff" : "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        Commissioning
                      </button>
                      <button
                        type="button"
                        onClick={() => setJobType("leak_test")}
                        style={{
                          gridColumn: "1 / -1",
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          border:
                            jobType === "leak_test"
                              ? "1px solid #c084fc"
                              : "1px solid rgba(255,255,255,0.12)",
                          background:
                            jobType === "leak_test"
                              ? "rgba(168,85,247,0.15)"
                              : "rgba(255,255,255,0.05)",
                          color: jobType === "leak_test" ? "#c084fc" : "rgba(255,255,255,0.7)",
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}
                      >
                        🔍 Statutory Leak Test (0 kg)
                      </button>
                    </div>
                  </div>
                )}

                {/* Total Logged Weight Summary Card */}
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    background:
                      jobType === "leak_test"
                        ? "rgba(168, 85, 247, 0.1)"
                        : isRecycled
                        ? "rgba(34, 197, 94, 0.1)"
                        : isReclaim
                        ? "rgba(245, 158, 11, 0.1)"
                        : "rgba(0, 229, 255, 0.1)",
                    border: `1px solid ${
                      jobType === "leak_test"
                        ? "#c084fc"
                        : isRecycled
                        ? "var(--success)"
                        : isReclaim
                        ? "var(--warning)"
                        : "var(--primary)"
                    }`,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      {jobType === "leak_test"
                        ? "Usage"
                        : isReclaim
                        ? "Total Recovered"
                        : "Total Dispensed"}
                    </span>
                    <strong
                      style={{
                        fontSize: "1.25rem",
                        color:
                          jobType === "leak_test"
                            ? "#c084fc"
                            : isRecycled
                            ? "var(--success)"
                            : isReclaim
                            ? "var(--warning)"
                            : "var(--primary)",
                      }}
                    >
                      {jobType === "leak_test" ? "0.00 kg" : `${totalWeight.toFixed(2)} kg`}
                    </strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                      {isReclaim ? "Cylinder Space Left" : "Available in Cylinder"}
                    </span>
                    <span style={{ fontSize: "0.95rem", color: "#fff", fontWeight: 700 }}>
                      {isReclaim
                        ? `${Math.max(
                            0,
                            (bottle.initialWeight || 20) - cur
                          ).toFixed(2)} kg`
                        : `${cur.toFixed(2)} kg`}
                    </span>
                  </div>
                </div>

                {/* Equipment / Asset Details Section */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                    marginTop: "0.25rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#fff" }}>
                      {isRecycled
                        ? "Recipient Equipment Assets"
                        : jobType === "leak_test"
                        ? "Inspected Equipment Assets"
                        : isReclaim
                        ? "Source Equipment Assets"
                        : "Equipment / Asset Details"}
                    </h4>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {equipmentList.length} {equipmentList.length === 1 ? "asset" : "assets"}
                    </span>
                  </div>

                  {equipmentList.map((eq, index) => (
                    <div
                      key={eq.id}
                      style={{
                        position: "relative",
                        padding: "1rem",
                        borderRadius: "10px",
                        background: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderLeft: `3px solid ${
                          jobType === "leak_test"
                            ? "#c084fc"
                            : isReclaim
                            ? "var(--warning)"
                            : "var(--primary)"
                        }`,
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8" }}>
                          Asset #{index + 1}
                        </span>
                        {equipmentList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeEquipment(eq.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              color: "#ff3366",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.3rem",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              padding: "0.2rem 0.4rem",
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      {/* Reclaim Decommissioned Toggle */}
                      {isReclaim && (
                        <div
                          style={{
                            padding: "0.6rem 0.75rem",
                            borderRadius: "8px",
                            background: eq.decommissioned
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(255,255,255,0.03)",
                            border: eq.decommissioned
                              ? "1px solid rgba(239, 68, 68, 0.4)"
                              : "1px solid rgba(255,255,255,0.06)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "0.5rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: eq.decommissioned ? "#ef4444" : "var(--text-muted)",
                              fontWeight: 600,
                            }}
                          >
                            Equipment Decommissioned?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateEquipment(eq.id, "decommissioned", !eq.decommissioned)
                            }
                            style={{
                              padding: "0.3rem 0.65rem",
                              borderRadius: "6px",
                              border: "none",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              background: eq.decommissioned ? "#ef4444" : "rgba(255,255,255,0.08)",
                              color: "#fff",
                            }}
                          >
                            {eq.decommissioned ? "✓ Yes" : "No"}
                          </button>
                        </div>
                      )}

                      <div>
                        <label
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Manufacturer *
                        </label>
                        <input
                          type="text"
                          value={eq.manufacturer}
                          onChange={(e) => updateEquipment(eq.id, "manufacturer", e.target.value)}
                          placeholder="e.g. Daikin, Mitsubishi"
                          required
                          style={{
                            width: "100%",
                            padding: "0.7rem 0.8rem",
                            background: "rgba(255, 255, 255, 0.05)",
                            border: "1px solid rgba(255, 255, 255, 0.12)",
                            borderRadius: "6px",
                            color: "#fff",
                            fontSize: "0.9rem",
                            outline: "none",
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <div>
                          <label
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Model Number *
                          </label>
                          <input
                            type="text"
                            value={eq.model}
                            onChange={(e) => updateEquipment(eq.id, "model", e.target.value)}
                            placeholder="e.g. FDTC50VF"
                            required
                            style={{
                              width: "100%",
                              padding: "0.7rem 0.8rem",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              borderRadius: "6px",
                              color: "#fff",
                              fontSize: "0.9rem",
                              textTransform: "uppercase",
                              outline: "none",
                            }}
                          />
                        </div>
                        <div>
                          <label
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            Serial Number *
                          </label>
                          <input
                            type="text"
                            value={eq.serial}
                            onChange={(e) => updateEquipment(eq.id, "serial", e.target.value)}
                            placeholder="e.g. 9948201B"
                            required
                            style={{
                              width: "100%",
                              padding: "0.7rem 0.8rem",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.12)",
                              borderRadius: "6px",
                              color: "#fff",
                              fontSize: "0.9rem",
                              textTransform: "uppercase",
                              outline: "none",
                            }}
                          />
                        </div>
                      </div>

                      {jobType === "leak_test" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                          <div>
                            <label
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Nominal Charge (kg)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={eq.nominalChargeKg || ""}
                              onChange={(e) =>
                                updateEquipment(eq.id, "nominalChargeKg", e.target.value)
                              }
                              placeholder="e.g. 3.2"
                              style={{
                                width: "100%",
                                padding: "0.7rem 0.8rem",
                                background: "rgba(168, 85, 247, 0.05)",
                                border: "1px solid rgba(168, 85, 247, 0.3)",
                                borderRadius: "6px",
                                color: "#fff",
                                fontSize: "0.9rem",
                                outline: "none",
                              }}
                            />
                          </div>
                          <div>
                            <label
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                display: "block",
                                marginBottom: "0.25rem",
                              }}
                            >
                              Inspection Outcome
                            </label>
                            <select
                              value={eq.leakCheckResult || "pass"}
                              onChange={(e) =>
                                updateEquipment(
                                  eq.id,
                                  "leakCheckResult",
                                  e.target.value as any
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "0.7rem 0.6rem",
                                background: "#161f2c",
                                border: "1px solid rgba(168, 85, 247, 0.3)",
                                borderRadius: "6px",
                                color: "#fff",
                                fontSize: "0.82rem",
                                outline: "none",
                              }}
                            >
                              <option value="pass">✓ Pass — No leak</option>
                              <option value="repaired">🔧 Repaired</option>
                              <option value="fail">✗ Leak detected</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {isReclaim
                              ? "Weight Recovered into Cylinder (kg) *"
                              : "Weight Dispensed / Used (kg) *"}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={eq.weight}
                            onChange={(e) => updateEquipment(eq.id, "weight", e.target.value)}
                            placeholder="e.g. 1.25"
                            required
                            style={{
                              width: "100%",
                              padding: "0.7rem 0.8rem",
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.15)",
                              borderRadius: "6px",
                              color: "#fff",
                              fontSize: "1rem",
                              fontWeight: 700,
                              outline: "none",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addEquipment}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: "transparent",
                      border: `1px dashed ${
                        jobType === "leak_test"
                          ? "#c084fc"
                          : isReclaim
                          ? "var(--warning)"
                          : "var(--primary)"
                      }`,
                      color:
                        jobType === "leak_test"
                          ? "#c084fc"
                          : isReclaim
                          ? "var(--warning)"
                          : "var(--primary)",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <Plus size={16} />
                    <span>+ Add Another Asset</span>
                  </button>
                </div>

                {logError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {logError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "10px",
                    background: "var(--primary)",
                    border: "none",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {isSubmittingLog ? (
                    <Loader2 size={18} className="spin" />
                  ) : (
                    <>Save Log to Device (Offline)</>
                  )}
                </button>
              </>
            )}
          </form>
        )}

        {/* MOVE BOTTLE TAB */}
        {activeTab === "move" && (
          <form onSubmit={handleMoveSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h3 style={{ margin: "0", fontSize: "1.05rem", fontWeight: 700 }}>
              {isLockedToVan ? "Return Bottle to Van" : "Move Bottle Location"}
            </h3>

            {moveSuccess ? (
              <div
                style={{
                  background: "rgba(34, 197, 94, 0.15)",
                  border: "1px solid var(--success)",
                  color: "var(--success)",
                  padding: "1rem",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.6rem",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 size={22} />
                <span>Location updated on device! Will auto-sync when online.</span>
              </div>
            ) : (
              <>
                {/* On-Site Cylinder Rule: Must return to Van stock */}
                {isLockedToVan ? (
                  <div
                    style={{
                      padding: "1rem",
                      borderRadius: "12px",
                      background: "rgba(0, 229, 255, 0.08)",
                      border: "1px solid var(--primary)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Truck size={20} color="var(--primary)" />
                      <span style={{ fontWeight: 700, color: "#fff", fontSize: "0.95rem" }}>
                        Return to Active Van Stock
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>
                      This cylinder is currently logged{" "}
                      <strong style={{ color: "#fff" }}>
                        {bottle.locationType === "site" ? `on site (${bottle.locationId})` : "in Stores"}
                      </strong>
                      . Under business rules, it can only be transferred back into your active vehicle stock before being assigned elsewhere.
                    </p>
                    <div
                      style={{
                        padding: "0.75rem 1rem",
                        borderRadius: "8px",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "0.85rem",
                        color: "#fff",
                      }}
                    >
                      <span
                        style={{
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          display: "block",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Target Van
                      </span>
                      <strong>
                        {activeVehicleOwner || user?.name || "Engineer"} - Van (
                        {activeVehicleReg || user?.vehicleReg || "Assigned"})
                      </strong>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: "0.4rem",
                      }}
                    >
                      New Destination
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      {[
                        { id: "site", label: "Job Site", icon: <MapPin size={16} />, onlineOnly: false },
                        { id: "van", label: "My Van", icon: <Truck size={16} />, onlineOnly: false },
                        { id: "office", label: "Stores", icon: <Building2 size={16} />, onlineOnly: false },
                        { id: "engineer", label: "Handover", icon: <Users size={16} />, onlineOnly: true },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            if (d.onlineOnly) {
                              openOfflineGateModal(
                                "Bottle handover to another engineer requires an active internet connection so both engineers' accounts update simultaneously.",
                                "Handover Requires Signal"
                              );
                              return;
                            }
                            setMoveDest(d.id as LocationType);
                          }}
                          style={{
                            padding: "0.75rem 0.5rem",
                            borderRadius: "8px",
                            position: "relative",
                            border:
                              !d.onlineOnly && moveDest === d.id
                                ? "2px solid var(--primary)"
                                : "1px solid rgba(255, 255, 255, 0.1)",
                            background:
                              !d.onlineOnly && moveDest === d.id
                                ? "rgba(0, 229, 255, 0.12)"
                                : "rgba(255, 255, 255, 0.03)",
                            color: !d.onlineOnly && moveDest === d.id ? "var(--primary)" : "#fff",
                            fontWeight: 700,
                            fontSize: "0.82rem",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: "0.35rem",
                            opacity: d.onlineOnly ? 0.65 : 1,
                          }}
                        >
                          {d.onlineOnly && (
                            <span
                              style={{
                                position: "absolute",
                                top: "4px",
                                right: "4px",
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.35rem",
                                borderRadius: "4px",
                                background: "rgba(245, 158, 11, 0.2)",
                                color: "var(--warning)",
                                border: "1px solid rgba(245, 158, 11, 0.4)",
                              }}
                            >
                              ☁️ Online
                            </span>
                          )}
                          {d.icon}
                          <span>{d.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* If moving from Van to Site */}
                {!isLockedToVan && moveDest === "site" && (
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Site Job No. (e.g. J12345, M98201) *
                    </label>
                    <input
                      type="text"
                      value={moveLocId}
                      pattern="^[A-Za-z][0-9]+$"
                      title="Job number must start with 1 letter followed by numbers without spaces (e.g. J12345)"
                      onChange={(e) => setMoveLocId(e.target.value.replace(/\s+/g, "").toUpperCase())}
                      placeholder="e.g. J12345"
                      required
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        background: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "8px",
                        color: "#fff",
                        fontSize: "1rem",
                        fontWeight: 700,
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {!isLockedToVan && moveDest === "van" && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Transferring to your active van:{" "}
                    <strong style={{ color: "#fff" }}>
                      {activeVehicleOwner || user?.name} ({activeVehicleReg || user?.vehicleReg || "Assigned"})
                    </strong>
                  </div>
                )}

                {!isLockedToVan && moveDest === "office" && (
                  <div
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    Transferring to <strong style={{ color: "#fff" }}>Unit 10 Apollo Court (HQ-Stores)</strong>.
                  </div>
                )}

                {moveError && (
                  <div
                    style={{
                      background: "rgba(239, 68, 68, 0.15)",
                      border: "1px solid #ef4444",
                      color: "#ef4444",
                      padding: "0.75rem",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    {moveError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingMove}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "10px",
                    background: "var(--primary)",
                    border: "none",
                    color: "#000",
                    fontWeight: 800,
                    fontSize: "1rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {isSubmittingMove ? (
                    <Loader2 size={18} className="spin" />
                  ) : isLockedToVan ? (
                    <>Confirm Transfer to My Van (Offline)</>
                  ) : (
                    <>Save Location to Device (Offline)</>
                  )}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
