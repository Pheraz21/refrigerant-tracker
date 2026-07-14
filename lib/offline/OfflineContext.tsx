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

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
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
