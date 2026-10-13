"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackageSearch, Wrench, Truck, AlertTriangle, Recycle } from "lucide-react";
import { db, type Bottle } from "@/lib/db";
import { getCachedBottle, cacheBottle } from "@/lib/offline/bottleCache";
import { withTimeout } from "@/lib/offline/withTimeout";
import { useOffline } from "@/lib/offline/OfflineContext";

function BottleViewContent() {
  const { openOfflineBottleModal } = useOffline();
  const searchParams = useSearchParams();
  const serial = searchParams.get("serial") || "";
  const [bottle, setBottle] = useState<Bottle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serial) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const online = typeof navigator === "undefined" ? true : navigator.onLine;

    async function load() {
      let b: Bottle | null = null;
      if (online) {
        try {
          b = await withTimeout(db.getBottle(serial), 3500);
          if (b) cacheBottle(b).catch(() => {});
        } catch {
          b = await getCachedBottle(serial);
        }
      } else {
        b = await getCachedBottle(serial);
      }
      if (cancelled) return;
      setBottle(b);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [serial]);

  const isReclaim = bottle?.category === "reclaim";
  const isRecycled = bottle?.category === "recycled";
  const isNitrogen = bottle?.category === "nitrogen";
  const cap = bottle?.initialWeight || 0;
  const cur = bottle?.currentWeight || 0;

  const getBorderColor = () => {
    if (isRecycled) return "#10b981";
    if (isReclaim) return "var(--warning)";
    if (isNitrogen) return "#22c55e";
    return "var(--primary)";
  };

  const getCategoryLabel = () => {
    if (isRecycled) return `Recycled (${bottle?.gasType || "Refrigerant"})`;
    if (isReclaim) return "Reclaim / Haz";
    if (isNitrogen) return "Nitrogen";
    return bottle?.gasType || "New Refrigerant";
  };

  const stat = (label: string, value: string, color = "#fff") => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "0.35rem 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <Link
        href="/engineer/history"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          color: "var(--text-muted)",
          textDecoration: "none",
          marginBottom: "1rem",
          fontSize: "0.9rem",
        }}
      >
        <ArrowLeft size={18} /> Back to My Bottles
      </Link>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading bottle details…</p>
      ) : !bottle ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
          <PackageSearch size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          <p style={{ color: "#fff", fontSize: "1.05rem", fontWeight: 700, margin: "0 0 0.5rem" }}>
            Cylinder {serial ? `“${serial}” ` : ""}is not in your local cache. Connect to signal to view company history.
          </p>
          <p style={{ fontSize: "0.85rem" }}>
            Cylinders assigned to your van or recently accessed are automatically stored locally.
          </p>
        </div>
      ) : (
        <>
          <div
            className="glass-panel"
            style={{
              padding: "1.25rem",
              borderRadius: "12px",
              borderLeft: `4px solid ${getBorderColor()}`,
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {isRecycled ? (
                  <Recycle size={18} color="#10b981" />
                ) : isReclaim ? (
                  <AlertTriangle size={18} color="var(--warning)" />
                ) : (
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      background: isNitrogen ? "#22c55e" : "var(--primary)",
                    }}
                  />
                )}
                <span style={{ fontWeight: 700, color: getBorderColor() }}>
                  {getCategoryLabel()}
                </span>
              </div>
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700 }}>{bottle.serial}</span>
            </div>

            {stat("Gas Type", bottle.gasType || "—")}
            {stat("Location", bottle.locationId || bottle.locationType || "—")}
            {bottle.intendedDestination && stat("Intended Destination", bottle.intendedDestination, "var(--warning)")}
            {isReclaim
              ? stat("Filled", `${cur.toFixed(2)} kg`, "var(--warning)")
              : stat("Current Weight", `${cur.toFixed(2)} kg`, "var(--success)")}
            {stat(isReclaim ? "Max Fill" : "Full Weight", `${cap.toFixed(2)} kg`)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={() => openOfflineBottleModal(bottle)}
              className="glass-panel"
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "10px",
                border: "1px solid var(--primary)",
                background: "rgba(0,229,255,0.06)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Wrench size={18} /> {isReclaim ? "Log Recovery" : "Log Gas Usage"}
            </button>
            <button
              onClick={() => openOfflineBottleModal(bottle)}
              className="glass-panel"
              style={{
                width: "100%",
                padding: "1rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,0.03)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Truck size={18} /> Move Bottle
            </button>
          </div>

          <p
            style={{
              display: "flex",
              gap: "0.4rem",
              alignItems: "flex-start",
              marginTop: "1.25rem",
              fontSize: "0.8rem",
              color: "var(--text-muted)",
              lineHeight: 1.4,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "0.15rem" }} />
            Offline Mode: Gas usage and bottle moves are queued safely on this device and will automatically sync once a signal is detected. Full history and online documents resume when connected.
          </p>
        </>
      )}
    </div>
  );
}

export default function OfflineBottleView() {
  return (
    <Suspense fallback={<p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading…</p>}>
      <BottleViewContent />
    </Suspense>
  );
}
