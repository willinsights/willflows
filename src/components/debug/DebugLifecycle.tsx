import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LifecycleEvent {
  type: string;
  timestamp: string;
  details?: string;
}

/**
 * Debug component to track page lifecycle events and diagnose
 * unwanted reloads/remounts when returning to the browser tab.
 * 
 * Enabled via query param: ?debugLifecycle=1
 */
export function DebugLifecycle() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [bootCount, setBootCount] = useState(0);
  const [navType, setNavType] = useState<string>("-");
  const [events, setEvents] = useState<LifecycleEvent[]>([]);
  const [swStatus, setSwStatus] = useState<string>("checking...");
  const [swDisabled, setSwDisabled] = useState(false);
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    // Check if debug is enabled via query param
    const params = new URLSearchParams(window.location.search);
    const enabled = params.get("debugLifecycle") === "1";
    setIsEnabled(enabled);
    
    if (!enabled) return;

    // Check SW kill switch
    const swKillSwitch = localStorage.getItem("wf_disable_sw") === "true";
    setSwDisabled(swKillSwitch);

    // Increment boot count
    const currentCount = parseInt(sessionStorage.getItem("wf_boot_count") || "0", 10) + 1;
    sessionStorage.setItem("wf_boot_count", String(currentCount));
    setBootCount(currentCount);

    // Get navigation type
    const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    const navigationType = navEntries[0]?.type || "unknown";
    setNavType(navigationType);

    // Log initial mount
    addEvent("mount", `Boot #${currentCount}, nav: ${navigationType}`);

    // Check SW status
    if ("serviceWorker" in navigator) {
      const controller = navigator.serviceWorker.controller;
      setSwStatus(controller ? `active (scope: ${controller.scriptURL.split("/").pop()})` : "no controller");

      // Listen for controller changes
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        addEvent("sw:controllerchange", "Service Worker controller changed!");
      });

      // Listen for messages from SW
      navigator.serviceWorker.addEventListener("message", (e) => {
        addEvent("sw:message", JSON.stringify(e.data).slice(0, 100));
      });
    } else {
      setSwStatus("not supported");
    }

    // Lifecycle event listeners
    const handleVisibilityChange = () => {
      const state = document.visibilityState;
      addEvent("visibilitychange", state);
    };

    const handleFocus = () => {
      const elapsed = Date.now() - mountTimeRef.current;
      addEvent("focus", `elapsed since mount: ${elapsed}ms`);
    };

    const handleBlur = () => {
      addEvent("blur", "window lost focus");
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      addEvent("pageshow", e.persisted ? "from bfcache" : "fresh load");
    };

    const handleBeforeUnload = () => {
      addEvent("beforeunload", "page is unloading!");
      // Store in sessionStorage so we can see it after reload
      sessionStorage.setItem("wf_last_unload", new Date().toISOString());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Check if there was a recent unload
    const lastUnload = sessionStorage.getItem("wf_last_unload");
    if (lastUnload) {
      addEvent("previous_unload", `Last unload at: ${lastUnload}`);
      sessionStorage.removeItem("wf_last_unload");
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const addEvent = (type: string, details?: string) => {
    const timestamp = new Date().toISOString().slice(11, 23);
    setEvents((prev) => [...prev.slice(-19), { type, timestamp, details }]);
  };

  const toggleSwKillSwitch = () => {
    const newValue = !swDisabled;
    if (newValue) {
      localStorage.setItem("wf_disable_sw", "true");
    } else {
      localStorage.removeItem("wf_disable_sw");
    }
    setSwDisabled(newValue);
    addEvent("sw:killswitch", newValue ? "DISABLED" : "ENABLED");
  };

  if (!isEnabled || !panelOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] w-[380px] max-h-[500px] rounded-lg border bg-card text-card-foreground shadow-lg overflow-hidden">
      <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/50">
        <div className="text-xs font-semibold">🔍 Lifecycle Debug</div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setPanelOpen(false)}
          type="button"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 py-2 text-xs space-y-2 max-h-[400px] overflow-y-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 p-2 bg-muted/30 rounded">
          <div>
            <span className="text-muted-foreground">Boot count:</span>{" "}
            <span className="font-mono font-bold">{bootCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Nav type:</span>{" "}
            <span className="font-mono font-bold">{navType}</span>
          </div>
        </div>

        {/* SW Status */}
        <div className="p-2 bg-muted/30 rounded">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-muted-foreground">SW:</span>{" "}
              <span className="font-mono">{swDisabled ? "⛔ DISABLED" : swStatus}</span>
            </div>
            <Button
              variant={swDisabled ? "destructive" : "outline"}
              size="sm"
              className="h-6 text-xs"
              onClick={toggleSwKillSwitch}
            >
              {swDisabled ? "Enable SW" : "Disable SW"}
            </Button>
          </div>
        </div>

        {/* Events log */}
        <div className="space-y-1">
          <div className="text-muted-foreground font-semibold">Events:</div>
          {events.length === 0 ? (
            <div className="text-muted-foreground italic">No events yet...</div>
          ) : (
            events.map((event, i) => (
              <div
                key={i}
                className={`font-mono text-[10px] p-1 rounded ${
                  event.type.includes("unload") || event.type.includes("controllerchange")
                    ? "bg-destructive/20 text-destructive"
                    : event.type === "mount"
                    ? "bg-primary/20"
                    : "bg-muted/50"
                }`}
              >
                <span className="text-muted-foreground">[{event.timestamp}]</span>{" "}
                <span className="font-semibold">{event.type}</span>
                {event.details && <span className="text-muted-foreground"> — {event.details}</span>}
              </div>
            ))
          )}
        </div>

        {/* Instructions */}
        <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2">
          <strong>Teste:</strong> Abra um modal, troque de aba, volte. Se boot count incrementar = reload real.
          Se não incrementar mas modal fechou = remount/redirect.
        </div>
      </div>
    </div>
  );
}
