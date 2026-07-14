"use client";

// Connectivity + sync state for the engineer app. `isOnline` is driven by the
// browser's online/offline events. `pendingCount` reflects the offline mutation
// queue. The queue is drained (synced) whenever we regain connectivity, when the
// app is refocused/reopened (the universal trigger — iOS has no background sync),
// and once on mount.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCacheLastUpdated } from "./bottleCache";
import { getQueueCount, QUEUE_CHANGED_EVENT } from "./queue";
import { syncQueue } from "./sync";

interface OfflineState {
  isOnline: boolean;
  lastUpdated: string | null;
  pendingCount: number;
  refreshMeta: () => void;
}

const OfflineContext = createContext<OfflineState>({
  isOnline: true,
  lastUpdated: null,
  pendingCount: 0,
  refreshMeta: () => {},
});

// Static engineer pages that take ?serial=. Fetching them while online populates
// the service worker's normalised (pathname-keyed) cache so ANY serial opens
// offline — not just ones visited before. Must match OFFLINE_QUERY_PAGES in sw.ts.
const OFFLINE_QUERY_PAGES = [
  "/engineer",
  "/engineer/history",
  "/engineer/inventory",
  "/engineer/bottle-view",
  "/engineer/log",
  "/engineer/move",
];

function warmOfflinePages() {
  if (typeof navigator === "undefined" || !navigator.onLine) return;
  OFFLINE_QUERY_PAGES.forEach(p => {
    fetch(p, { cache: "no-store" }).catch(() => {});
  });
}

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  // Initialise synchronously from the browser so the very first client render already
  // knows we're offline — otherwise links/guards briefly assume "online" and route to
  // pages that can't load with no signal.
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshMeta = useCallback(() => {
    getCacheLastUpdated().then(setLastUpdated);
  }, []);

  const refreshPending = useCallback(() => {
    getQueueCount().then(setPendingCount);
  }, []);

  const attemptSync = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    syncQueue().then(() => {
      refreshPending();
      refreshMeta();
    });
  }, [refreshPending, refreshMeta]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const goOnline = () => {
      setIsOnline(true);
      attemptSync();
      warmOfflinePages();
    };
    const goOffline = () => setIsOnline(false);
    const onFocus = () => attemptSync();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshPending);

    refreshMeta();
    refreshPending();
    attemptSync(); // flush anything left from a previous offline session
    warmOfflinePages(); // ensure ?serial= pages open offline for any bottle

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshPending);
    };
  }, [attemptSync, refreshMeta, refreshPending]);

  return (
    <OfflineContext.Provider value={{ isOnline, lastUpdated, pendingCount, refreshMeta }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
