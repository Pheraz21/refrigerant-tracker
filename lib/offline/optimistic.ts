// Provisional updates to the cached bottle snapshot so the UI reflects an offline
// action immediately. Authoritative recompute occurs when the mutation replays to Supabase.
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
  
  let next = current;
  if (jobType === "leak_test") {
    next = current;
  } else if (ADDING_JOB_TYPES.includes(jobType)) {
    next = current + weightChange;
  } else {
    // service, install, maintenance, recycled_charge
    next = Math.max(0, current - weightChange);
  }

  await cacheBottle({
    ...b,
    currentWeight: next,
    status: next === 0 && (b.category === "new" || b.category === "nitrogen" || b.category === "recycled") ? "empty" : b.status,
  });
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
