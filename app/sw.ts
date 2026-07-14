// Service worker source, compiled by @serwist/next into public/sw.js at build time.
// This provides the offline app shell so the engineer PWA loads in low/no-signal
// areas. Offline DATA caching and the action sync queue are handled separately in
// the app (lib/offline/*), not here.
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Injected by Serwist at build time — the list of app-shell assets to precache.
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Engineer action pages that take the bottle serial as a ?serial= query. They are
// static routes, but page navigations are cached by FULL url — so a never-before-
// seen serial would miss offline and fail with "site can't be reached". We cache
// these under a key normalised to the pathname (query stripped), so caching one
// serial makes every serial of that page work offline. The app warms this cache
// while online (see lib/offline/OfflineContext). RSC (_rsc) requests are excluded
// so they don't collide with the HTML document under the same key.
export const OFFLINE_QUERY_PAGES = ["/engineer/bottle-view", "/engineer/log", "/engineer/move"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url, request }) =>
        request.method === "GET" &&
        OFFLINE_QUERY_PAGES.includes(url.pathname) &&
        !url.searchParams.has("_rsc"),
      handler: new NetworkFirst({
        cacheName: "engineer-offline-pages",
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request }) => new URL(request.url).pathname,
          },
        ],
      }),
    },
    ...defaultCache,
  ],
});

serwist.addEventListeners();
