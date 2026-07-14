// Service worker source, compiled by @serwist/next into public/sw.js at build time.
// This provides the offline app shell so the engineer PWA loads in low/no-signal
// areas. Offline DATA caching and the action sync queue are handled separately in
// the app (lib/offline/*), not here.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by Serwist at build time — the list of app-shell assets to precache.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Engineer pages that must work offline. Includes the ?serial= action pages (served
// by pathname so any serial works) and the list/home pages engineers navigate
// between offline. We serve all of these ourselves so offline navigation never
// depends on Workbox's navigation strategy.
export const OFFLINE_PAGES = [
  "/engineer",
  "/engineer/history",
  "/engineer/inventory",
  "/engineer/bottle-view",
  "/engineer/log",
  "/engineer/move",
];
const OFFLINE_PAGES_CACHE = "engineer-offline-pages";

// Hand-rolled handler registered BEFORE Serwist so it wins event.respondWith for
// these pages. Network-first, falling back to the pathname-normalised cached
// document. This is deterministic — Workbox's navigation strategy + navigationPreload
// was holding the cached response back offline even though it was present.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url: URL;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (!OFFLINE_PAGES.includes(url.pathname)) return;
  if (url.searchParams.has("_rsc")) return; // let RSC data requests go to Serwist

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(OFFLINE_PAGES_CACHE);
          cache.put(url.pathname, fresh.clone());
        }
        return fresh;
      } catch {
        // Serve ONLY from our own cache (refreshed every deploy) so we never hand back
        // a stale copy left in a Workbox cache from an earlier build. ignoreVary is
        // required because Next responses carry Vary: RSC headers that would otherwise
        // block the match.
        const cache = await caches.open(OFFLINE_PAGES_CACHE);
        const cached = await cache.match(url.pathname, { ignoreVary: true, ignoreSearch: true });
        if (cached) return cached;
        return Response.error();
      }
    })(),
  );
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  // Off: our fetch handler manages the offline pages; navigation preload was
  // interfering with serving them from cache offline.
  navigationPreload: false,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

// Warm the offline action pages into the cache during install (online, as the SW
// updates) so they open offline regardless of client-side warming. Keyed by pathname
// to match how the fetch handler above looks them up.
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Drop any documents from an earlier build so we never serve stale JS refs,
        // then re-warm with fresh copies matching this deploy's precached chunks.
        await caches.delete(OFFLINE_PAGES_CACHE);
        const cache = await caches.open(OFFLINE_PAGES_CACHE);
        await Promise.all(
          OFFLINE_PAGES.map(async (path) => {
            try {
              const res = await fetch(path, { cache: "no-store", credentials: "same-origin" });
              if (res.ok) await cache.put(path, res.clone());
            } catch {
              /* offline or blocked — client warming will retry later */
            }
          }),
        );
      } catch {
        /* cache unavailable — non-fatal */
      }
    })(),
  );
});
