"use client";

// Links a bottle card to its detail action drawer.
// Native inline action drawer (0ms delay, zero browser navigation, no offline error screen).
import React from "react";
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
  const { openOfflineBottleModal } = useOffline();

  const handleClick = async (e: React.MouseEvent) => {
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
