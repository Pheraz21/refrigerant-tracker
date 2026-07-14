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

// Rebuild a response as a plain 200 with a fresh body. CRITICAL: a response whose
// `redirected` flag is set (e.g. one stored by install-time fetch warming) is
// REJECTED by the browser when returned for a page navigation — surfacing as the
// generic "page couldn't load" error even though the cache clearly holds the page.
// Rebuilding strips that flag (and any other internal taint) so the cached copy is
// always usable for navigations.
async function sanitizeResponse(res: Response): Promise<Response> {
  const body = await res.blob();
  return new Response(body, {
    status: 200,
    statusText: "OK",
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "text/html; charset=utf-8",
    },
  });
}

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
          cache.put(url.pathname, await sanitizeResponse(fresh.clone()));
        }
        return fresh;
      } catch {
        // Prefer our own cache (refreshed every deploy, so fresh JS refs). Fall back
        // to any cache so we still serve something rather than fail outright. ignoreVary
        // is required because Next responses carry Vary: RSC headers.
        const opts = { ignoreVary: true, ignoreSearch: true } as CacheQueryOptions;
        const cache = await caches.open(OFFLINE_PAGES_CACHE);
        const cached =
          (await cache.match(url.pathname, opts)) ||
          (await caches.match(url.pathname, opts)) ||
          (await caches.match(req, opts));
        // Sanitize on the way out too — fallback matches from Workbox caches may
        // carry the redirected flag, which navigations reject.
        if (cached) return sanitizeResponse(cached);
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
              if (res.ok) await cache.put(path, await sanitizeResponse(res));
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
