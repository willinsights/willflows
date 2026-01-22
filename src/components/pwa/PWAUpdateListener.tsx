import { useEffect, useRef } from "react";
import { registerSW } from "virtual:pwa-register";
import { toast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

/**
 * Registers the PWA service worker manually and prevents any implicit reloads.
 * When an update is available, we show a toast with an explicit “Atualizar” action.
 */
export function PWAUpdateListener() {
  const updateSWRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    // Only register in production builds
    if (import.meta.env.DEV) return;

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (hasNotifiedRef.current) return;
        hasNotifiedRef.current = true;

        toast({
          title: "Atualização disponível",
          description: "Existe uma nova versão. Clique em Atualizar para aplicar.",
          action: (
            <ToastAction
              altText="Atualizar"
              onClick={() => updateSWRef.current?.(true)}
            >
              Atualizar
            </ToastAction>
          ),
        });
      },
      onOfflineReady() {
        // Silent (avoid extra UI noise)
      },
    });

    updateSWRef.current = updateSW;
  }, []);

  return null;
}
