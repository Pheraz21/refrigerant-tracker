// FIFO queue of engineer actions performed offline, persisted in IndexedDB. Each
// mutation stores the positional args to replay through the matching db.ts function
// once back online (plus a client-captured occurredAt so the audit trail records
// when the work actually happened, not when it synced). Idempotent by unique id.
import { STORES, idbGetAll, idbPut, idbDelete } from "./idb";

export type MutationType = "usage" | "move" | "decommission";

export interface QueuedMutation {
  id: string;
  type: MutationType;
  serial: string;
  label: string; // human-readable summary
  occurredAt: string; // when the engineer performed it (client time)
  createdAt: string; // enqueue time, used for FIFO ordering
  args: unknown[]; // positional args replayed through db.ts, occurredAt appended last
}

export const QUEUE_CHANGED_EVENT = "fgas-queue-changed";

function emitChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
}

export async function enqueueMutation(
  m: Omit<QueuedMutation, "id" | "createdAt">,
): Promise<void> {
  const full: QueuedMutation = {
    ...m,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  await idbPut(STORES.mutations, full);
  emitChanged();
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const all = await idbGetAll<QueuedMutation>(STORES.mutations);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeMutation(id: string): Promise<void> {
  await idbDelete(STORES.mutations, id);
  emitChanged();
}

export async function getQueueCount(): Promise<number> {
  try {
    return (await getQueuedMutations()).length;
  } catch {
    return 0;
  }
}
