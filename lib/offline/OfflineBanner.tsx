"use client";

// Amber bar shown across the engineer app whenever the device is offline, so an
// engineer in a plantroom knows work is being saved locally and will sync later.
import { CloudOff, RefreshCw } from "lucide-react";
import { useOffline } from "./OfflineContext";

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOffline();

  if (!isOnline) {
    return (
      <div
        className="no-print"
        style={{
          background: "var(--warning)",
          color: "#000",
          padding: "0.6rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          zIndex: 100,
          position: "relative",
        }}
      >
        <CloudOff size={18} style={{ flexShrink: 0 }} />
        <span>
          Offline — You can use the app in offline mode for bottle usage and moves on
          site. The updates are saved locally on your device. Once you return to signal
          and open the app, the usage and moves will sync with the server.
        </span>
      </div>
    );
  }

  // Back online with work still to upload.
  if (pendingCount > 0) {
    return (
      <div
        className="no-print"
        style={{
          background: "var(--primary)",
          color: "#000",
          padding: "0.6rem 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          zIndex: 100,
          position: "relative",
        }}
      >
        <RefreshCw size={16} style={{ flexShrink: 0 }} />
        <span>
          Syncing {pendingCount} offline {pendingCount === 1 ? "change" : "changes"} to
          the server…
        </span>
      </div>
    );
  }

  return null;
}
