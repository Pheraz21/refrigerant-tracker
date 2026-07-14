import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// PWA / service worker via Serwist. next-pwa was a webpack plugin that never ran
// under Next 16's default Turbopack build, so no service worker was generated and
// the app had no offline capability. Serwist also needs webpack, so the production
// build runs with `next build --webpack` (see package.json). Dev stays on Turbopack
// with the SW disabled — test offline behaviour against a production build.
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  // Cache pages as the engineer navigates so the shell is available offline.
  cacheOnNavigation: true,
  // We drive sync ourselves (lib/offline) — don't auto-reload the app on reconnect
  // and risk interrupting an engineer mid-task.
  reloadOnOnline: false,
});

const nextConfig: NextConfig = {
  turbopack: {},
};

export default withSerwist(nextConfig);
