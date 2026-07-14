"use client";

// Connectivity state for the engineer app. `isOnline` is driven by the browser's
// online/offline events (a hint, not gospel, but good enough to switch to the
// cached snapshot). `pendingCount` is wired to the sync queue in Phase 2.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getCacheLastUpdated } from "./bottleCache";

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
  // Placeholder until the Phase 2 sync queue lands.
  const [pendingCount] = useState(0);

  const refreshMeta = useCallback(() => {
    getCacheLastUpdated().then(setLastUpdated);
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    refreshMeta();
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [refreshMeta]);

  return (
    <OfflineContext.Provider value={{ isOnline, lastUpdated, pendingCount, refreshMeta }}>
      {children}
    </OfflineContext.Provider>
  );
}

export const useOffline = () => useContext(OfflineContext);
