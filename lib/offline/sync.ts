// Drains the offline mutation queue by replaying each action through db.ts against
// live server state. Runs FIFO; stops on the first failure to preserve ordering and
// avoid cascading errors (the failed item stays queued and is retried next time).
// Full conflict detection/flagging is Phase 3 — for now a persistent failure keeps
// the item queued and surfaces via the pending count.
import { db } from "@/lib/db";
import { getQueuedMutations, removeMutation } from "./queue";

let syncing = false;

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const mutations = await getQueuedMutations();
    for (const m of mutations) {
      try {
        if (m.type === "usage") {
          await (db.logUsage as (...a: unknown[]) => Promise<void>)(...m.args);
        } else if (m.type === "move") {
          await (db.updateBottleLocation as (...a: unknown[]) => Promise<void>)(...m.args);
        } else if (m.type === "decommission") {
          await (db.logDecommission as (...a: unknown[]) => Promise<unknown>)(...m.args);
        }
        await removeMutation(m.id);
        synced++;
      } catch (e) {
        console.error("[offline sync] failed to replay mutation", m.id, e);
        failed++;
        break; // keep FIFO; retry this item on the next sync
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}
