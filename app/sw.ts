/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
  interface ExtendableEvent extends Event {
    waitUntil(fn: Promise<any>): void;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  disableDevLogs: true,
  precacheOptions: {
    cleanupOutdatedCaches: true,
    ignoreURLParametersMatching: [/.*/],
  },
  
  // Fallback pages for offline
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
  
  runtimeCaching: defaultCache,
});

// Precache critical routes
const criticalRoutes = [
  "/",
  "/login",
  "/dashboard",
  "/dashboard/kasir",
  "/offline",
] as const;

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all(
      criticalRoutes.map((route) =>
        serwist.handleRequest({
          request: new Request(route),
          event,
        })
      )
    )
  );
});

serwist.addEventListeners();
