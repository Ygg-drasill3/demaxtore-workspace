// apps/frontend/src/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const ax = error as { response?: { status?: number }; code?: string };
        const status = ax.response?.status;
        if (status === 401 || status === 403) return false;
        if (status === 429) return failureCount < 3;
        // Network / timeout blips — retry once more than the default.
        if (!status || ax.code === "ECONNABORTED" || ax.code === "ERR_NETWORK") {
          return failureCount < 2;
        }
        return failureCount < 1;
      },
      retryDelay: (attempt) => Math.min(1_500 * 2 ** attempt, 12_000),
    },
    mutations: { retry: 0 },
  },
});

/** Domain-specific stale times for React Query hooks. */
export const STALE = {
  workspace: 25_000,
  controlTower: 3 * 60_000,
  growth: 5 * 60_000,
  notifications: 30_000,
} as const;
