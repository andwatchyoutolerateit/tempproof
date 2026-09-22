self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Temperature pages are intentionally not cached: a revoked QR must never look
// active because of stale HTML. The in-page local queue owns offline submissions.
