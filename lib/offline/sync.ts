// Drains the offline mutation queue by replaying each action in FIFO order against Supabase.
// Halts on unrecoverable network failure so ordering is strictly preserved.
import { db } from "@/lib/db";
import { getQueuedMutations, removeMutation, updateMutation } from "./queue";

let isSyncing = false;

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    const mutations = await getQueuedMutations();
    for (const m of mutations) {
      try {
        if (m.type === "usage") {
          // Positional args: serial, jobType, weightChange, isWaste, producerSite, gasType, engineerName, siteRef, equipmentDetails, supervisingEngineer, supervisingCertificate, occurredAt
          await (db.replayOfflineUsage as (...a: any[]) => Promise<void>)(...m.args, m.occurredAt);
        } else if (m.type === "move") {
          // Positional args: serial, locationType, locationId, intendedDestination, intendedLocationType, activeHWCN, engineerName, occurredAt
          await (db.updateBottleLocation as (...a: any[]) => Promise<void>)(...m.args, m.occurredAt);
        } else if (m.type === "decommission") {
          await (db.logDecommission as (...a: any[]) => Promise<any>)(...m.args);
        }

        await removeMutation(m.id);
        synced++;
      } catch (err: any) {
        console.error(`[offline sync] Error replaying mutation ${m.id} (${m.label}):`, err);
        failed++;
        await updateMutation(m.id, { error: err?.message || String(err) });
        // Stop processing subsequent mutations to preserve strict chronological ordering
        break;
      }
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}
