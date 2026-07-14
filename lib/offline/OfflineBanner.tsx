"use client";

// Amber bar shown across the engineer app whenever the device is offline, so an
// engineer in a plantroom knows they are viewing a saved snapshot (and, from
// Phase 2, that their actions are being queued).
import { CloudOff } from "lucide-react";
import { useOffline } from "./OfflineContext";

function timeAgo(iso: string | null): string {
  if (!iso) return "not yet synced";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

export function OfflineBanner() {
  const { isOnline, lastUpdated } = useOffline();
  if (isOnline) return null;
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
      <CloudOff size={18} />
      <span>Offline — showing saved data from {timeAgo(lastUpdated)}. Changes will sync when you&apos;re back in signal.</span>
    </div>
  );
}
