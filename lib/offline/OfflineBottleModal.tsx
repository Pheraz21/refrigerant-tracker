"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wrench,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Recycle,
  ArrowLeft,
  Loader2,
  MapPin,
  Building2,
  ShieldAlert,
  Users,
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

export function OfflineBottleModal({
  bottle: initialBottle,
  isOpen,
  onClose,
  onUpdated,
}: OfflineBottleModalProps) {
  const { user, activeVehicleReg, activeVehicleOwner } = useAuth();
  const { syncNow, refreshMeta, openOfflineGateModal } = useOffline();

  const [bottle, setBottle] = useState<Bottle | null>(initialBottle);
  const [activeTab, setActiveTab] = useState<ModalTab>("overview");

  // Log Form State
  const [weightUsed, setWeightUsed] = useState<string>("");
  const [jobRef, setJobRef] = useState<string>("");
  const [jobType, setJobType] = useState<string>("service");
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
    setWeightUsed("");
    setJobRef("");
    setLogSuccess(false);
    setLogError(null);
    setMoveSuccess(false);
    setMoveError(null);
  }, [initialBottle, isOpen]);

  if (!isOpen || !bottle) return null;

  const isReclaim = bottle.category === "reclaim";
  const isRecycled = bottle.category === "recycled";
  const isNitrogen = bottle.category === "nitrogen";
  const cap = bottle.initialWeight || 0;
  const cur = bottle.currentWeight || 0;

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

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);
    const weightNum = parseFloat(weightUsed);
    if (isNaN(weightNum) || weightNum <= 0) {
      setLogError("Please enter a valid weight greater than 0 kg.");
      return;
    }
    if (!jobRef.trim()) {
      setLogError("Please enter a job or site reference (e.g. J12345).");
      return;
    }

    setIsSubmittingLog(true);
    try {
      const engName = activeVehicleOwner || user?.name || "Engineer";
      await db.logUsage(
        bottle.serial,
        jobType,
        weightNum,
        isReclaim,
        undefined,
        bottle.gasType,
        engName,
        jobRef.trim().toUpperCase()
      );

      // Optimistically adjust displayed weight
      const updatedWeight = isReclaim ? cur + weightNum : Math.max(0, cur - weightNum);
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

    let finalLocId = moveLocId.trim().toUpperCase();
    if (moveDest === "site" && !finalLocId) {
      setMoveError("Please enter a job site reference (e.g. J12345).");
      return;
    }
    if (moveDest === "van") {
      finalLocId = `${activeVehicleOwner || user?.name || "Engineer"} - Van`;
    }
    if (moveDest === "office") {
      finalLocId = "HQ-Stores / Office";
    }

    setIsSubmittingMove(true);
    try {
      const engName = activeVehicleOwner || user?.name || "Engineer";
      const targetVanReg = moveDest === "van" ? (activeVehicleReg || user?.vehicleReg) : undefined;

      await db.updateBottleLocation(
        bottle.serial,
        moveDest,
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
        locationType: moveDest,
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
              {isReclaim ? "Record Refrigerant Recovery" : "Record Gas Usage"}
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
                <div>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    {isReclaim ? "Weight Recovered into Cylinder (kg)" : "Weight Dispensed / Used (kg)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={weightUsed}
                    onChange={(e) => setWeightUsed(e.target.value)}
                    placeholder="e.g. 1.25"
                    required
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Job / Site Reference (e.g. J12345)
                  </label>
                  <input
                    type="text"
                    value={jobRef}
                    onChange={(e) => setJobRef(e.target.value)}
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
                      outline: "none",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      display: "block",
                      marginBottom: "0.4rem",
                    }}
                  >
                    Job Type
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.85rem",
                      background: "#161f2c",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "0.95rem",
                      outline: "none",
                    }}
                  >
                    <option value="service">Service</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="install">Installation</option>
                    <option value="recovery">Recovery</option>
                    <option value="leak_test">Leak Test</option>
                  </select>
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
            <h3 style={{ margin: "0", fontSize: "1.05rem", fontWeight: 700 }}>Move Bottle Location</h3>

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

                {moveDest === "site" && (
                  <div>
                    <label
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        display: "block",
                        marginBottom: "0.4rem",
                      }}
                    >
                      Site Job Number (e.g. J12345)
                    </label>
                    <input
                      type="text"
                      value={moveLocId}
                      onChange={(e) => setMoveLocId(e.target.value)}
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
                        outline: "none",
                      }}
                    />
                  </div>
                )}

                {moveDest === "van" && (
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

                {moveDest === "office" && (
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
