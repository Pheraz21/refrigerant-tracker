"use client";

// Amber bar shown across the engineer app whenever the device is offline, so an
// engineer in a plantroom knows work is being saved locally and will sync later.
import { useEffect, useState } from "react";
import { CloudOff, RefreshCw } from "lucide-react";
import { useOffline } from "./OfflineContext";

const DIAG_PAGES = ["/engineer/bottle-view", "/engineer/log", "/engineer/move"];

// Bump on every deploy — proves which build of the PAGE code the device is running.
const APP_BUILD = "app-14";

export function OfflineBanner() {
  const { isOnline, pendingCount } = useOffline();
  const [diag, setDiag] = useState<string>("checking…");

  // TEMP diagnostic: report which offline pages are in OUR cache (o) vs any cache (a),
  // plus which service worker build is in control.
  useEffect(() => {
    if (isOnline || typeof caches === "undefined") return;
    const opts = { ignoreVary: true, ignoreSearch: true } as CacheQueryOptions;
    (async () => {
      let swv = "sw:none";
      try {
        const ctrl = navigator.serviceWorker?.controller;
        if (ctrl) {
          swv = await new Promise<string>((resolve) => {
            const ch = new MessageChannel();
            const t = setTimeout(() => resolve("sw:old(no-reply)"), 1500);
            ch.port1.onmessage = (e) => {
              clearTimeout(t);
              resolve(String(e.data));
            };
            ctrl.postMessage("GET_SW_VERSION", [ch.port2]);
          });
        }
      } catch {
        swv = "sw:err";
      }
      const own = await caches.open("engineer-offline-pages");
      const parts = await Promise.all(
        DIAG_PAGES.map(async (p) => {
          const inOwn = await own.match(p, opts);
          const inAny = await caches.match(p, opts);
          return `${p.split("/").pop()}:o${inOwn ? "✓" : "✗"}a${inAny ? "✓" : "✗"}`;
        }),
      );
      // Probe: fetch the offline page THROUGH the service worker while offline.
      // 200 = the SW handler serves it fine (problem is navigation-specific);
      // ERR = the handler itself fails (its error message tells us why).
      let probe = "";
      try {
        const r = await fetch("/engineer/bottle-view", { cache: "no-store" });
        probe = `probe:${r.status}${r.redirected ? "R" : ""}`;
      } catch (e) {
        probe = `probe:ERR(${String(e).slice(0, 60)})`;
      }
      setDiag(`${APP_BUILD} ${swv} | ${parts.join(" ")} | ${probe}`);
    })();
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div
        className="no-print"
        style={{
          background: "var(--warning)",
          color: "#000",
          padding: "0.6rem 1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.25rem",
          fontSize: "0.85rem",
          fontWeight: 600,
          zIndex: 100,
          position: "relative",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CloudOff size={18} style={{ flexShrink: 0 }} />
          Offline — You can use the app in offline mode for bottle usage and moves on
          site. The updates are saved locally on your device. Once you return to signal
          and open the app, the usage and moves will sync with the server.
        </span>
        <span style={{ fontSize: "0.7rem", fontWeight: 400, opacity: 0.8 }}>
          offline cache → {diag}
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
