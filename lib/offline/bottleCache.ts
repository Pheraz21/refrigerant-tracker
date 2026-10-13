// Offline snapshot of cylinders assigned to the engineer or fetched while online.
// Server is the ultimate source of truth; this cache is resilient and non-blocking.
import type { Bottle } from "@/lib/db";
import { STORES, idbGetAll, idbGet, idbPut, idbPutMany } from "./idb";

const META_LAST_UPDATED = "bottles:lastUpdated";

export async function cacheBottles(bottles: Bottle[]): Promise<void> {
  try {
    if (bottles && bottles.length > 0) {
      await idbPutMany(STORES.bottles, bottles);
    }
    await idbPut(STORES.meta, new Date().toISOString(), META_LAST_UPDATED);
  } catch (err) {
    console.warn("[offline cache] best-effort cacheBottles failed:", err);
  }
}

export async function cacheBottle(bottle: Bottle): Promise<void> {
  try {
    if (!bottle || !bottle.serial) return;
    await idbPut(STORES.bottles, bottle);
    await idbPut(STORES.meta, new Date().toISOString(), META_LAST_UPDATED);
  } catch (err) {
    console.warn("[offline cache] best-effort cacheBottle failed:", err);
  }
}

export async function getCachedBottles(): Promise<Bottle[]> {
  try {
    return await idbGetAll<Bottle>(STORES.bottles);
  } catch {
    return [];
  }
}

export async function getCachedBottle(serial: string): Promise<Bottle | null> {
  try {
    return (await idbGet<Bottle>(STORES.bottles, serial)) ?? null;
  } catch {
    return null;
  }
}

export async function getCacheLastUpdated(): Promise<string | null> {
  try {
    return (await idbGet<string>(STORES.meta, META_LAST_UPDATED)) ?? null;
  } catch {
    return null;
  }
}
