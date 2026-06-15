import { useEffect, useRef } from 'react';

/**
 * Hook utilitário que dispara `onResync` quando:
 *  - o tab volta a estar visível (`visibilitychange`)
 *  - a janela ganha foco (`focus`)
 *  - a conexão de rede regressa (`online`)
 *  - a cada `heartbeatMs` (default 60s) se o tab estiver visível
 *
 * Centraliza o padrão de "stale-while-realtime" para qualquer subscriber
 * Realtime (Kanban, Chat, Notifications, Calendar, etc.), evitando que
 * cada hook reimplemente a mesma lógica de resync.
 *
 * Uso:
 * ```ts
 * useRealtimeResync(silentRefresh, { heartbeatMs: 60_000 });
 * ```
 */
export function useRealtimeResync(
  onResync: () => void,
  options: { heartbeatMs?: number; enabled?: boolean } = {}
) {
  const { heartbeatMs = 60_000, enabled = true } = options;
  const onResyncRef = useRef(onResync);

  useEffect(() => {
    onResyncRef.current = onResync;
  }, [onResync]);

  useEffect(() => {
    if (!enabled) return;

    const trigger = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      try {
        onResyncRef.current();
      } catch {
        // engolido — resync é best-effort
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') trigger();
    };

    window.addEventListener('focus', trigger);
    window.addEventListener('online', trigger);
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = window.setInterval(trigger, heartbeatMs);

    return () => {
      window.removeEventListener('focus', trigger);
      window.removeEventListener('online', trigger);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [enabled, heartbeatMs]);
}
