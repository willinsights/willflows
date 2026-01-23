import { useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import logger from "@/lib/logger";

/**
 * Registers the PWA service worker manually and prevents any implicit reloads.
 * When an update is available, we show a toast with an explicit "Atualizar" action.
 * 
 * Kill switch: Set localStorage "wf_disable_sw" = "true" to disable SW registration.
 */
export function PWAUpdateListener() {
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    // Only register in production builds
    if (import.meta.env.DEV) return;

    // Kill switch: allow disabling SW for debugging
    const isKillSwitchActive = localStorage.getItem("wf_disable_sw") === "true";
    if (isKillSwitchActive) {
      logger.info("[PWA] Service Worker registration DISABLED by kill switch (wf_disable_sw)");
      return;
    }

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (hasNotifiedRef.current) return;
        hasNotifiedRef.current = true;

        logger.info("[PWA] Update available, showing toast");

        toast({
          title: "Atualização disponível",
          description: "Existe uma nova versão. Clique em Atualizar para aplicar.",
          action: (
            <ToastAction
              altText="Atualizar"
              onClick={() => {
                logger.info("[PWA] User clicked update, reloading...");
                updateSWRef.current?.(true);
              }}
            >
              Atualizar
            </ToastAction>
          ),
        });
      },
      onOfflineReady() {
        logger.info("[PWA] App ready for offline use");
      },
      onRegisteredSW(swUrl, registration) {
        logger.info("[PWA] SW registered:", swUrl);
        if (registration) {
          logger.info("[PWA] Registration state:", registration.active?.state);
        }
      },
    });

    updateSWRef.current = updateSW;
    logger.info("[PWA] Service Worker registration initiated");
  }, []);

  return null;
}
