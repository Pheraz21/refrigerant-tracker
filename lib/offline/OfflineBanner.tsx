"use client";

import React from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOffline } from "./OfflineContext";

export function OfflineBanner() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOffline();

  if (!isOnline) {
    return (
      <div
        className="no-print"
        style={{
          background: "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)",
          color: "#000",
          padding: "0.6rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          fontSize: "0.85rem",
          fontWeight: 700,
          zIndex: 95,
          position: "relative",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        <CloudOff size={18} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
          <span>Offline Mode Active</span>
          <span style={{ fontWeight: 500, marginLeft: "0.4rem", opacity: 0.9 }}>
            — Logs and bottle moves are saved locally on this device and will auto-sync when signal returns.
          </span>
          {pendingCount > 0 && (
            <span
              style={{
                marginLeft: "0.5rem",
                background: "rgba(0,0,0,0.25)",
                color: "#fff",
                padding: "0.15rem 0.5rem",
                borderRadius: "10px",
                fontSize: "0.75rem",
                fontWeight: 800,
              }}
            >
              {pendingCount} pending
            </span>
          )}
          <span
            style={{
              marginLeft: "0.5rem",
              background: "rgba(0,0,0,0.15)",
              color: "#000",
              padding: "0.1rem 0.4rem",
              borderRadius: "4px",
              fontSize: "0.7rem",
              fontWeight: 800,
            }}
          >
            v3.2
          </span>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div
        className="no-print"
        style={{
          background: "linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)",
          color: "#fff",
          padding: "0.55rem 1rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          zIndex: 95,
          position: "relative",
          boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <RefreshCw
            size={16}
            style={{
              flexShrink: 0,
              animation: isSyncing ? "spin 1s linear infinite" : "none",
            }}
          />
          <span>
            {isSyncing
              ? `Syncing ${pendingCount} offline record${pendingCount > 1 ? "s" : ""} to HQ...`
              : `${pendingCount} offline record${pendingCount > 1 ? "s" : ""} waiting to sync to HQ.`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => syncNow()}
          disabled={isSyncing}
          style={{
            background: "#fff",
            color: "#0284c7",
            border: "none",
            padding: "0.25rem 0.65rem",
            borderRadius: "6px",
            fontSize: "0.75rem",
            fontWeight: 800,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    );
  }

  return null;
}
