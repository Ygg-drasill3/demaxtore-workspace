import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { onboardingApi } from "../lib/onboarding.api";
import { useAuth } from "@/store/auth.store";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { getSocket, isSocketConnected } from "@/lib/socket";
import { STALE } from "@/lib/queryClient";

/** App-level onboarding socket subscription (single listener). */
export function useOnboardingRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const s = getSocket();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const invalidate = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!isSocketConnected()) return;
        void qc.invalidateQueries({ queryKey: ["onboarding", "progress"] });
      }, 800);
    };
    s.on(SocketEvents.ONBOARDING_UPDATED, invalidate);
    s.on(SocketEvents.FIRST_TRADE_COMPLETED, invalidate);
    return () => {
      clearTimeout(timer);
      s.off(SocketEvents.ONBOARDING_UPDATED, invalidate);
      s.off(SocketEvents.FIRST_TRADE_COMPLETED, invalidate);
    };
  }, [qc]);
}

export function useOnboardingProgress() {
  const user = useAuth((s) => s.user);

  return useQuery({
    queryKey: ["onboarding", "progress", user?.id],
    queryFn: onboardingApi.progress,
    enabled: !!user,
    staleTime: 2 * 60_000,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401 || status === 403) return false;
      return failureCount < 2;
    },
    retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
  });
}

export function useOnboardingTour() {
  return useQuery({
    queryKey: ["onboarding", "tour"],
    queryFn: onboardingApi.tour,
  });
}

export function useCompleteTour() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: onboardingApi.completeTour,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
  });
}

export function useWorkspaceGuidance(workspaceType: string, workspaceId: string) {
  return useQuery({
    queryKey: ["onboarding", "guidance", workspaceType, workspaceId],
    queryFn: () => onboardingApi.guidance(workspaceType, workspaceId),
    enabled: !!workspaceId,
  });
}

export function useOnboardingDashboard() {
  return useQuery({
    queryKey: ["onboarding", "dashboard"],
    queryFn: onboardingApi.dashboard,
    staleTime: STALE.growth,
  });
}

export function useLearningCenter() {
  return useQuery({
    queryKey: ["onboarding", "learning"],
    queryFn: onboardingApi.learning,
  });
}
