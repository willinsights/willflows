/**
 * Utility to register and verify the COOP/COEP Service Worker
 * Required for SharedArrayBuffer (used by FFmpeg.wasm)
 */

const SW_PATH = "/coop-coep-worker.js";
const RELOAD_FLAG_KEY = "coop-coep-reload-pending";

/**
 * Check if the current context is cross-origin isolated
 */
export function isCrossOriginIsolated(): boolean {
  return typeof window !== "undefined" && window.crossOriginIsolated === true;
}

/**
 * Check if Service Workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return typeof navigator !== "undefined" && "serviceWorker" in navigator;
}

/**
 * Check if we're in a context where SW might not work (private browsing, etc.)
 */
export function isRestrictedContext(): boolean {
  // Check for private browsing indicators
  try {
    // In private mode, localStorage might throw or be restricted
    localStorage.setItem("__test__", "1");
    localStorage.removeItem("__test__");
    return false;
  } catch {
    return true;
  }
}

/**
 * Register the COOP/COEP Service Worker and reload if needed
 * Returns true if already isolated or successfully registered
 * Returns false if registration failed or not supported
 */
export async function ensureCrossOriginIsolated(): Promise<boolean> {
  console.log("[COOP-COEP] Checking cross-origin isolation...");
  console.log("[COOP-COEP] crossOriginIsolated:", window.crossOriginIsolated);

  // Already isolated - we're good
  if (isCrossOriginIsolated()) {
    console.log("[COOP-COEP] ✓ Already cross-origin isolated");
    // Clear any pending reload flag
    try {
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
    } catch {}
    return true;
  }

  // Check if we just reloaded and still not isolated - don't loop
  try {
    if (sessionStorage.getItem(RELOAD_FLAG_KEY)) {
      console.warn("[COOP-COEP] Already reloaded once, isolation still not working");
      sessionStorage.removeItem(RELOAD_FLAG_KEY);
      return false;
    }
  } catch {}

  // Check if SW is supported
  if (!isServiceWorkerSupported()) {
    console.warn("[COOP-COEP] Service Workers not supported");
    return false;
  }

  // Check for restricted context
  if (isRestrictedContext()) {
    console.warn("[COOP-COEP] Restricted context (private browsing?)");
    return false;
  }

  try {
    console.log("[COOP-COEP] Registering Service Worker...");
    
    // Register the SW
    const registration = await navigator.serviceWorker.register(SW_PATH);
    console.log("[COOP-COEP] SW registered, scope:", registration.scope);

    // Wait for the SW to be ready
    await navigator.serviceWorker.ready;
    console.log("[COOP-COEP] SW ready");

    // If there's an active worker, we need to reload to apply headers
    if (registration.active || registration.installing || registration.waiting) {
      console.log("[COOP-COEP] SW active, setting reload flag and reloading...");
      
      // Set flag to prevent infinite reload loop
      try {
        sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
      } catch {}
      
      // Reload to apply the new headers
      window.location.reload();
      
      // This won't return, but for TypeScript
      return true;
    }

    // Wait for SW to activate if still installing
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("SW activation timeout"));
      }, 10000);

      const checkActive = () => {
        if (registration.active) {
          clearTimeout(timeout);
          resolve();
        }
      };

      checkActive();

      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "activated") {
              checkActive();
            }
          });
        }
      });
    });

    // Set reload flag and reload
    try {
      sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
    } catch {}
    
    console.log("[COOP-COEP] Reloading to apply headers...");
    window.location.reload();
    
    return true;
  } catch (err) {
    console.error("[COOP-COEP] Error registering SW:", err);
    return false;
  }
}

/**
 * Unregister the COOP/COEP Service Worker
 */
export async function unregisterCoopCoepWorker(): Promise<boolean> {
  if (!isServiceWorkerSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    if (registration) {
      await registration.unregister();
      console.log("[COOP-COEP] SW unregistered");
      return true;
    }
    return false;
  } catch (err) {
    console.error("[COOP-COEP] Error unregistering SW:", err);
    return false;
  }
}
