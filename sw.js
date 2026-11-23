const CACHE_NAME = "research-workbench-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./research-pilot.html",
  "./research-pilot.css",
  "./fonts.css",
  "./styles.css",
  "./app.js",
  "./extract.js",
  "./stats.js",
  "./practice-data.csv",
  "./manifest.webmanifest",
  "./favicon.svg",
  "./assets/system.css",
  "./assets/system.js",
  "./assets/ui/cards.css",
  "./assets/motion/motion.css",
  "./assets/motion/motion.js",
  "./assets/backgrounds/backgrounds.css",
  "./assets/backgrounds/backgrounds.js",
  "./assets/layout/layout.css",
  "./assets/layout/layout.js",
  "./assets/icons/icon.css",
  "./assets/fonts/ibm-plex-sans-latin.woff2",
  "./assets/fonts/ibm-plex-mono-400-latin.woff2",
  "./assets/fonts/ibm-plex-mono-500-latin.woff2",
  "./assets/moments/moments.js",
  "./assets/moments/lib.js",
  "./assets/moments/word-highlight/moment.js",
  "./assets/moments/word-highlight/moment.css"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === "opaque") return response;
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});
