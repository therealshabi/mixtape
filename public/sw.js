const CACHE = "mixtape-shell-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/favicon.svg",
        "/assets/cassette-case.png",
        "/assets/cassette-tape.png",
        "/assets/note-paper.png",
        "/assets/themes/birthday.svg",
        "/assets/themes/anniversary.svg",
        "/assets/themes/travel.svg",
        "/assets/themes/good-day.svg",
      ]),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/.netlify/functions/")) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const fetched = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      if (request.mode === "navigate") {
        return fetched.then((response) => response || caches.match("/index.html")).then((response) => response || cached);
      }
      return cached || fetched;
    }),
  );
});
