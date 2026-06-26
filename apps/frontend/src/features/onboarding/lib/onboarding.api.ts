import { api } from "@/lib/api";
import type { OnboardingProgressDTO, OnboardingDashboardMetrics } from "@dmx/contracts/onboarding";
import type { WorkspaceGuidanceDTO } from "@dmx/contracts/onboarding";
import type { LearningCard } from "@dmx/contracts/onboarding";

export const onboardingApi = {
  progress: () => api.get<OnboardingProgressDTO>("/onboarding/progress").then((r) => r.data),
  tour: () => api.get<{ steps: { id: string; title: string; body: string; route: string }[] }>("/onboarding/tour").then((r) => r.data),
  completeTour: () => api.post("/onboarding/tour/complete", {}).then((r) => r.data),
  learning: () => api.get<{ cards: LearningCard[] }>("/onboarding/learning").then((r) => r.data),
  openLearning: (contentId: string) => api.post("/onboarding/learning/open", { contentId }).then((r) => r.data),
  guidance: (workspaceType: string, workspaceId: string) =>
    api.get<WorkspaceGuidanceDTO>(`/onboarding/guidance/${workspaceType}/${workspaceId}`).then((r) => r.data),
  dashboard: () => api.get<OnboardingDashboardMetrics>("/onboarding/dashboard").then((r) => r.data),
  users: () => api.get<OnboardingProgressDTO[]>("/onboarding/users").then((r) => r.data),
};
