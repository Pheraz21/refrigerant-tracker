"use client";

// Links a bottle card to its detail view.
// Online  → dynamic detail page via router (/engineer/bottle/[serial]).
// Offline → native inline action drawer (0ms delay, zero browser navigation, no offline error screen).
import React from "react";
import { useRouter } from "next/navigation";
import { Bottle } from "@/lib/db";
import { useOffline } from "./OfflineContext";
import { getCachedBottle } from "./bottleCache";
import { withTimeout } from "./withTimeout";

export function BottleLink({
  bottle,
  serial,
  className,
  style,
  children,
}: {
  bottle?: Bottle;
  serial: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isOnline, openOfflineBottleModal, markOffline } = useOffline();

  const openModal = async () => {
    if (bottle) {
      openOfflineBottleModal(bottle);
      return;
    }

    const cached = await getCachedBottle(serial);
    if (cached) {
      openOfflineBottleModal(cached);
    } else {
      // Fallback object so engineer is never stranded
      openOfflineBottleModal({
        serial,
        gasType: "Refrigerant",
        category: "new",
        locationType: "van",
        locationId: "My Van",
        currentWeight: 0,
        initialWeight: 0,
        status: "active",
      } as Bottle);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Direct offline check from React state or navigator
    if (!isOnline || (typeof navigator !== "undefined" && !navigator.onLine)) {
      await openModal();
      return;
    }

    // 2. Active network probe to catch Airplane Mode when navigator.onLine is a false-positive on mobile OS
    // In airplane mode, uncached ping fails in 0-1ms with TypeError: Failed to fetch
    try {
      const probe = await withTimeout(
        fetch(`/_ping?t=${Date.now()}`, { method: "HEAD", cache: "no-store" }),
        350
      );
      if (probe.ok || probe.status === 304 || probe.status === 404) {
        // If we received any HTTP response from the server, the network is genuinely reachable
        router.push(`/engineer/bottle/${encodeURIComponent(serial)}`);
        return;
      }
    } catch {
      // Network unreachable! We are actually in airplane mode / offline
      markOffline();
      await openModal();
      return;
    }

    router.push(`/engineer/bottle/${encodeURIComponent(serial)}`);
  };

  return (
    <div
      className={className}
      style={{ ...style, cursor: "pointer" }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
    >
      {children}
    </div>
  );
}
