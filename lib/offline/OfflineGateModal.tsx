"use client";

import React from "react";
import { CloudOff, X, Info } from "lucide-react";

interface OfflineGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  reason: string;
}

export function OfflineGateModal({
  isOpen,
  onClose,
  title = "Signal Required",
  reason,
}: OfflineGateModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1100,
        background: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "440px",
          background: "#0c131c",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          borderRadius: "16px",
          padding: "1.5rem",
          boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7)",
          position: "relative",
          animation: "fadeIn 0.2s ease-out",
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            cursor: "pointer",
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", marginBottom: "1rem" }}>
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid rgba(245, 158, 11, 0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CloudOff size={22} color="var(--warning, #f59e0b)" />
          </div>
          <div>
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--warning, #f59e0b)",
              }}
            >
              Online Only
            </span>
            <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#fff" }}>
              {title}
            </h3>
          </div>
        </div>

        {/* Reason Explanation */}
        <p
          style={{
            fontSize: "0.92rem",
            color: "#e2e8f0",
            lineHeight: 1.55,
            margin: "0 0 1.25rem 0",
          }}
        >
          {reason}
        </p>

        {/* Guidance Box */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: "10px",
            padding: "0.85rem",
            marginBottom: "1.25rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
          }}
        >
          <Info size={16} color="var(--primary, #00e5ff)" style={{ flexShrink: 0, marginTop: "0.15rem" }} />
          <div style={{ fontSize: "0.8rem", color: "#94a3b8", lineHeight: 1.45 }}>
            <strong style={{ color: "#fff", display: "block", marginBottom: "0.15rem" }}>
              Available Offline:
            </strong>
            Viewing cached cylinders, recording gas usage/reclaim, and moving bottles to your van or job sites work completely offline.
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "0.85rem",
            borderRadius: "10px",
            background: "var(--primary, #00e5ff)",
            border: "none",
            color: "#000",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer",
          }}
        >
          Understood
        </button>
      </div>
    </div>
  );
}
