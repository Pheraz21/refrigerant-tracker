"use client";

// Links a bottle card to its detail view. Online → the full dynamic detail page via
// client-side navigation. Offline → the static offline screen via a HARD navigation
// (<a>, not next/link) so it loads straight from the cached document with no
// client-side data fetch that could hang/fail with no signal.
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

  if (isOnline) {
    return (
      <Link href={`/engineer/bottle/${serial}`} className={className} style={style}>
        {children}
      </Link>
    );
  }

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
