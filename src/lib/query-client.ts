import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance - exported so it can be cleared on logout
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 10, // 10 minutes (increased from 5 for better performance)
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/** Window event fired whenever project data changes; non-react-query hooks (Kanban, useProjects) listen to it. */
export const PROJECTS_CHANGED_EVENT = 'willflow:projects-changed';

// Bridge: invalidating any ['projects', ...] query also notifies hooks that are not on react-query.
const QUERY_CACHE_SOURCE = 'query-cache';
let bridgeTimer: ReturnType<typeof setTimeout> | null = null;
queryClient.getQueryCache().subscribe((event) => {
  if (typeof window === 'undefined') return;
  if (event.type !== 'updated' || event.action.type !== 'invalidate') return;
  if (event.query.queryKey[0] !== 'projects') return;
  if (bridgeTimer) clearTimeout(bridgeTimer);
  bridgeTimer = setTimeout(
    () => window.dispatchEvent(new CustomEvent(PROJECTS_CHANGED_EVENT, { detail: QUERY_CACHE_SOURCE })),
    150,
  );
});

/** True when the event was emitted by the bridge above, i.e. react-query already refetched the active ['projects', ...] queries. */
export function isQueryCacheProjectsEvent(event: Event): boolean {
  return (event as CustomEvent).detail === QUERY_CACHE_SOURCE;
}
