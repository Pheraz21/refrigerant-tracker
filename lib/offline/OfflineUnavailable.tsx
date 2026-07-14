"use client";

// Placeholder shown in place of screens that can't work without a signal (registering
// new bottles, bulk receive, notifications, profile, HWCN detail). Keeps engineers
// oriented instead of hitting a broken/hanging screen, and points them at what does
// work offline.
import { CloudOff } from "lucide-react";
import Link from "next/link";

export function OfflineUnavailable({
  title = "Not available offline",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      style={{
        padding: "2rem 1.5rem",
        maxWidth: 560,
        margin: "0 auto",
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "rgba(255,170,0,0.1)",
          border: "2px solid var(--warning)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CloudOff size={40} color="var(--warning)" />
      </div>
      <h2 style={{ color: "var(--warning)", margin: 0 }}>{title}</h2>
      <p style={{ color: "var(--text-main)", fontSize: "0.95rem", lineHeight: 1.5, margin: 0 }}>
        {message ||
          "This screen needs a signal. You'll be able to use it again once you're back online."}
      </p>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
        Offline, use <strong>My Bottles</strong> to find your van &amp; site cylinders and
        log usage, recovery, decommission, and moves.
      </p>
      <Link href="/engineer/history" style={{ marginTop: "0.5rem", textDecoration: "none" }}>
        <span
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            borderRadius: 10,
            background: "var(--primary)",
            color: "#000",
            fontWeight: 700,
          }}
        >
          Go to My Bottles
        </span>
      </Link>
    </div>
  );
}
