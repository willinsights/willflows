// Service Worker para adicionar headers COOP/COEP
// Necessário para SharedArrayBuffer funcionar (usado pelo FFmpeg.wasm)
// Baseado em: https://github.com/nicololongo/sw-coep

self.addEventListener("install", () => {
  console.log("[COOP-COEP SW] Installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[COOP-COEP SW] Activating...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") {
    return;
  }

  // Skip cache-only requests with wrong mode
  if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't modify opaque responses
        if (response.status === 0) {
          return response;
        }

        // Clone the response to modify headers
        const newHeaders = new Headers(response.headers);
        
        // Add COOP/COEP headers for cross-origin isolation
        // Using 'credentialless' instead of 'require-corp' to avoid breaking external resources
        newHeaders.set("Cross-Origin-Embedder-Policy", "credentialless");
        newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      })
      .catch((error) => {
        console.error("[COOP-COEP SW] Fetch error:", error);
        throw error;
      })
  );
});
