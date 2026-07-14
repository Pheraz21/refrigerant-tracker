// Offline snapshot of the engineer's van/site bottles. Best-effort: every failure
// is swallowed so a caching problem can never break the online path. The server is
// always the source of truth — this cache is disposable.
import type { Bottle } from "@/lib/db";
import { STORES, idbGetAll, idbGet, idbPut, idbPutMany } from "./idb";

const META_LAST_UPDATED = "bottles:lastUpdated";

// Upsert a set of bottles fetched while online into the cache, and stamp the
// last-updated time. We upsert (not replace) so individually-viewed bottles are
// retained; readers filter by van/location so stale entries are ignored anyway.
export async function cacheBottles(bottles: Bottle[]): Promise<void> {
  try {
    if (bottles.length > 0) await idbPutMany(STORES.bottles, bottles);
    await idbPut(STORES.meta, new Date().toISOString(), META_LAST_UPDATED);
  } catch {
    /* best-effort cache */
  }
}

export async function cacheBottle(bottle: Bottle): Promise<void> {
  try {
    await idbPut(STORES.bottles, bottle);
    await idbPut(STORES.meta, new Date().toISOString(), META_LAST_UPDATED);
  } catch {
    /* best-effort cache */
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
