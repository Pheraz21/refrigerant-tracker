"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getCacheLastUpdated } from "./bottleCache";
import { getQueueCount, QUEUE_CHANGED_EVENT } from "./queue";
import { syncQueue } from "./sync";

interface OfflineContextType {
  isOnline: boolean;
  pendingCount: number;
  lastUpdated: string | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
  refreshMeta: () => void;
}

const OfflineContext = createContext<OfflineContextType>({
  isOnline: true,
  pendingCount: 0,
  lastUpdated: null,
  isSyncing: false,
  syncNow: async () => {},
  refreshMeta: () => {},
});

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const refreshMeta = useCallback(() => {
    getCacheLastUpdated().then(setLastUpdated).catch(() => {});
  }, []);

  const refreshPending = useCallback(() => {
    getQueueCount().then(setPendingCount).catch(() => {});
  }, []);

  const syncNow = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    setIsSyncing(true);
    try {
      await syncQueue();
    } finally {
      setIsSyncing(false);
      refreshPending();
      refreshMeta();
    }
  }, [refreshPending, refreshMeta]);

  useEffect(() => {
    setIsOnline(typeof navigator !== "undefined" ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncNow();
      }
    };

    const handleFocus = () => {
      syncNow();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener(QUEUE_CHANGED_EVENT, refreshPending);

    refreshMeta();
    refreshPending();
    syncNow();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener(QUEUE_CHANGED_EVENT, refreshPending);
    };
  }, [syncNow, refreshPending, refreshMeta]);

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        pendingCount,
        lastUpdated,
        isSyncing,
        syncNow,
        refreshMeta,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}
