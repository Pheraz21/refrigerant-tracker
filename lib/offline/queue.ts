// FIFO queue of actions performed offline, persisted in IndexedDB.
// Each mutation stores its positional arguments to replay against Supabase once online,
// along with the client-captured occurredAt timestamp to preserve audit compliance.
import { STORES, idbGetAll, idbPut, idbDelete } from "./idb";

export type MutationType = "usage" | "move" | "decommission";

export interface QueuedMutation {
  id: string;
  type: MutationType;
  serial: string;
  label: string; // human-readable summary (e.g. "service · 1.5kg")
  occurredAt: string; // client timestamp when the engineer performed the action
  createdAt: string; // enqueue time for FIFO ordering
  args: any[]; // positional arguments for db.ts replay
  result?: string;
  error?: string;
}

export const QUEUE_CHANGED_EVENT = "fgas-offline-queue-changed";

function emitQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_CHANGED_EVENT));
  }
}

export async function enqueueMutation(
  m: Omit<QueuedMutation, "id" | "createdAt">,
): Promise<string> {
  const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `mut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const full: QueuedMutation = {
    ...m,
    id,
    createdAt: new Date().toISOString(),
  };
  await idbPut(STORES.mutations, full);
  emitQueueChanged();
  return id;
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  const all = await idbGetAll<QueuedMutation>(STORES.mutations);
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function removeMutation(id: string): Promise<void> {
  await idbDelete(STORES.mutations, id);
  emitQueueChanged();
}

export async function updateMutation(id: string, patch: Partial<QueuedMutation>): Promise<void> {
  const all = await getQueuedMutations();
  const found = all.find((m) => m.id === id);
  if (!found) return;
  await idbPut(STORES.mutations, { ...found, ...patch });
  emitQueueChanged();
}

export async function getQueueCount(): Promise<number> {
  try {
    return (await getQueuedMutations()).length;
  } catch {
    return 0;
  }
}
