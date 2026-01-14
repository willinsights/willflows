import { QueryClient } from "@tanstack/react-query";

// Shared QueryClient instance - exported so it can be cleared on logout
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});
