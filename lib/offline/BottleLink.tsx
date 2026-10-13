"use client";

// Links a bottle card to its detail view.
// Online → dynamic detail page via client-side navigation (/engineer/bottle/[serial]).
// Offline → native inline action drawer (0ms delay, zero browser navigation, no dinosaur screen).
import React from "react";
import Link from "next/link";
import { Bottle } from "@/lib/db";
import { useOffline } from "./OfflineContext";
import { getCachedBottle } from "./bottleCache";

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
  const { isOnline, openOfflineBottleModal } = useOffline();

  const handleOpenOffline = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

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

  const isActuallyOffline = !isOnline || (typeof navigator !== "undefined" && !navigator.onLine);

  if (isActuallyOffline) {
    return (
      <div
        className={className}
        style={{ ...style, cursor: "pointer" }}
        onClick={handleOpenOffline}
        role="button"
        tabIndex={0}
      >
        {children}
      </div>
    );
  }

  return (
    <Link
      href={`/engineer/bottle/${serial}`}
      className={className}
      style={style}
      onClick={(e) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          handleOpenOffline(e);
        }
      }}
    >
      {children}
    </Link>
  );
}
