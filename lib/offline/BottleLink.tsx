"use client";

// Links a bottle card to its detail view.
// Online → dynamic detail page via client-side navigation (/engineer/bottle/[serial]).
// Offline → static precached screen via a hard navigation (<a>, /engineer/bottle-view?serial=)
// so the service worker serves the precached document with no RSC network request.
import React from "react";
import Link from "next/link";
import { useOffline } from "./OfflineContext";

export function BottleLink({
  serial,
  className,
  style,
  children,
}: {
  serial: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const { isOnline } = useOffline();

  const handleClick = (e: React.MouseEvent) => {
    // If the device just lost connectivity before state updated, hard route to offline view
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      e.preventDefault();
      window.location.href = `/engineer/bottle-view?serial=${encodeURIComponent(serial)}`;
    }
  };

  if (!isOnline) {
    return (
      <a
        href={`/engineer/bottle-view?serial=${encodeURIComponent(serial)}`}
        className={className}
        style={style}
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      href={`/engineer/bottle/${serial}`}
      className={className}
      style={style}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
