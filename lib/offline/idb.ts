// Minimal promise-based IndexedDB wrapper for offline support — no external deps.
// Used to cache the engineer's van/site bottle snapshot for offline reads, and
// (from Phase 2) to hold the queued offline action mutations.

const DB_NAME = "fgas-offline";
const DB_VERSION = 1;

export const STORES = {
  bottles: "bottles", // cached Bottle snapshots, keyed by serial
  meta: "meta", // key/value metadata (e.g. last-updated timestamp)
  mutations: "mutations", // queued offline actions, keyed by id (Phase 2)
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORES.bottles)) {
          db.createObjectStore(STORES.bottles, { keyPath: "serial" });
        }
        if (!db.objectStoreNames.contains(STORES.meta)) {
          db.createObjectStore(STORES.meta);
        }
        if (!db.objectStoreNames.contains(STORES.mutations)) {
          db.createObjectStore(STORES.mutations, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function request<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

export function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  return request(store, "readonly", (s) => s.get(key) as IDBRequest<T>);
}

export function idbGetAll<T>(store: string): Promise<T[]> {
  return request(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);
}

export function idbPut(store: string, value: unknown, key?: IDBValidKey): Promise<IDBValidKey> {
  return request(store, "readwrite", (s) =>
    key !== undefined ? s.put(value, key) : s.put(value),
  );
}

export function idbDelete(store: string, key: IDBValidKey): Promise<undefined> {
  return request(store, "readwrite", (s) => s.delete(key) as IDBRequest<undefined>);
}

export function idbClear(store: string): Promise<undefined> {
  return request(store, "readwrite", (s) => s.clear() as IDBRequest<undefined>);
}

// Bulk upsert in a single transaction — used to write a whole bottle snapshot.
export async function idbPutMany(store: string, values: unknown[]): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, "readwrite");
    const os = t.objectStore(store);
    values.forEach((v) => os.put(v));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
