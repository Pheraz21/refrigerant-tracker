"use client";

// STATIC offline bottle screen. Unlike /engineer/bottle/[serial] (a dynamic route
// that can't be precached), this route is fixed and takes the serial as a ?serial=
// query, so the service worker precaches it and it opens with no signal. Engineers
// are routed here instead of the detail page while offline; it reads the bottle from
// the offline cache and links to the offline-capable Log and Move actions.
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, PackageSearch, Wrench, Truck, AlertTriangle } from "lucide-react";
import { db, type Bottle } from "@/lib/db";
import { getCachedBottle, cacheBottle } from "@/lib/offline/bottleCache";
import { useOffline } from "@/lib/offline/OfflineContext";

export default function OfflineBottleView() {
  const searchParams = useSearchParams();
  const serial = searchParams.get("serial") || "";
  const { isOnline } = useOffline();
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
          b = await db.getBottle(serial);
          if (b) cacheBottle(b);
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
  const cap = bottle?.initialWeight || 0;
  const cur = bottle?.currentWeight || 0;

  const stat = (label: string, value: string, color = "#fff") => (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "0.35rem 0" }}>
      <span style={{ color: "var(--text-muted)" }}>{label}</span>
      <strong style={{ color }}>{value}</strong>
    </div>
  );

  return (
    <div style={{ padding: "1rem", maxWidth: "600px", margin: "0 auto" }}>
      <Link
        href="/engineer/inventory"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "var(--text-muted)", textDecoration: "none", marginBottom: "1rem", fontSize: "0.9rem" }}
      >
        <ArrowLeft size={18} /> Back to My Van
      </Link>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>Loading…</p>
      ) : !bottle ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
          <PackageSearch size={48} style={{ marginBottom: "1rem", opacity: 0.4 }} />
          <p>Bottle {serial ? `“${serial}” ` : ""}isn&apos;t available offline.</p>
          <p style={{ fontSize: "0.85rem" }}>Open it once while you have signal so it&apos;s saved to this device.</p>
        </div>
      ) : (
        <>
          <div
            className="glass-panel"
            style={{
              padding: "1.25rem",
              borderRadius: "12px",
              borderLeft: `4px solid ${isReclaim ? "var(--warning)" : bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)"}`,
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 700, color: isReclaim ? "var(--warning)" : bottle.category === "nitrogen" ? "#22c55e" : "var(--primary)" }}>
                {isReclaim ? "Reclaim / Haz" : bottle.category === "nitrogen" ? "Nitrogen" : "New Refrigerant"}
              </span>
              <span style={{ fontFamily: "var(--font-geist-mono, monospace)", fontWeight: 700 }}>{bottle.serial}</span>
            </div>
            {stat("Gas Type", bottle.gasType || "—")}
            {stat("Location", bottle.locationId || bottle.locationType || "—")}
            {isReclaim
              ? stat("Filled", `${cur.toFixed(2)} kg`, "var(--warning)")
              : stat("Current Weight", `${cur.toFixed(2)} kg`, "var(--success)")}
            {stat(isReclaim ? "Max Fill" : "Full Weight", `${cap.toFixed(2)} kg`)}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <Link href={`/engineer/log?serial=${encodeURIComponent(bottle.serial)}`} style={{ textDecoration: "none" }}>
              <button className="glass-panel" style={{ width: "100%", padding: "1rem", borderRadius: "10px", border: "1px solid var(--primary)", background: "rgba(0,229,255,0.06)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
                <Wrench size={18} /> {isReclaim ? "Log Recovery" : "Log Gas Usage"}
              </button>
            </Link>
            {isOnline ? (
              <Link href={`/engineer/move?serial=${encodeURIComponent(bottle.serial)}`} style={{ textDecoration: "none" }}>
                <button className="glass-panel" style={{ width: "100%", padding: "1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.03)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
                  <Truck size={18} /> Move Bottle
                </button>
              </Link>
            ) : (
              <button
                disabled
                title="Moving a bottle needs a signal for now"
                style={{ width: "100%", padding: "1rem", borderRadius: "10px", border: "1px solid var(--border)", background: "rgba(255,255,255,0.02)", color: "var(--text-muted)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "1rem", fontWeight: 600, cursor: "not-allowed", opacity: 0.6 }}
              >
                <Truck size={18} /> Move Bottle (needs signal)
              </button>
            )}
          </div>

          <p style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", marginTop: "1.25rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "0.15rem" }} />
            This is the offline view. The full bottle history and consignment-note actions are available when you&apos;re back in signal.
          </p>
        </>
      )}
    </div>
  );
}
