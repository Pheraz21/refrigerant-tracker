// Provisional updates to the cached bottle so the UI reflects an offline action
// immediately. Intentionally lightweight — the AUTHORITATIVE recompute (status,
// producer sites, gas-type resolution, etc.) happens on sync when the mutation is
// replayed through db.ts against live server state. This only needs to look right
// on the engineer's screen until then.
import type { Bottle } from "@/lib/db";
import { cacheBottle, getCachedBottle } from "./bottleCache";

const ADDING_JOB_TYPES = ["recovery", "retrofit", "waste"];

export async function applyUsageOptimistic(
  serial: string,
  jobType: string,
  weightChange: number,
): Promise<void> {
  const b = await getCachedBottle(serial);
  if (!b) return;
  const current = b.currentWeight || 0;
  const next = ADDING_JOB_TYPES.includes(jobType)
    ? current + weightChange
    : Math.max(0, current - weightChange);
  await cacheBottle({ ...b, currentWeight: next });
}

export async function applyMoveOptimistic(
  serial: string,
  locationType: Bottle["locationType"],
  locationId: string,
): Promise<void> {
  const b = await getCachedBottle(serial);
  if (!b) return;
  await cacheBottle({
    ...b,
    locationType,
    locationId,
    locationChangedAt: new Date().toISOString(),
  });
}
