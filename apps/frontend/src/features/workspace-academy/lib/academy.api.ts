// apps/frontend/src/features/workspace-academy/lib/academy.api.ts
import { api } from "@/lib/api";
import type { AcademyStateDTO } from "@dmx/contracts/workspace-academy";

export const academyApi = {
  state: () =>
    api.get<AcademyStateDTO>("/workspace-academy/state").then((r) => r.data),

  completeWelcome: (language?: string) =>
    api.post("/workspace-academy/welcome/complete", { language }).then((r) => r.data),
  dismissWelcome: () =>
    api.post("/workspace-academy/welcome/dismiss").then((r) => r.data),
  completeProcessOverview: () =>
    api.post("/workspace-academy/process-overview/complete").then((r) => r.data),

  startGuide: (guideId: string, automatic: boolean, guideVersion = 1) =>
    api.post(`/workspace-academy/guides/${guideId}/start`, { automatic, guideVersion }).then((r) => r.data),
  progressGuide: (guideId: string, stepIndex: number) =>
    api.post(`/workspace-academy/guides/${guideId}/progress`, { stepIndex }).then((r) => r.data),
  completeGuide: (guideId: string, guideVersion = 1) =>
    api.post(`/workspace-academy/guides/${guideId}/complete`, { guideVersion }).then((r) => r.data),
  dismissGuide: (guideId: string, guideVersion = 1) =>
    api.post(`/workspace-academy/guides/${guideId}/dismiss`, { guideVersion }).then((r) => r.data),

  completeTask: (taskId: string, event?: string) =>
    api.post(`/workspace-academy/tasks/${taskId}/complete`, { event }).then((r) => r.data),
  dismissTask: (taskId: string) =>
    api.post(`/workspace-academy/tasks/${taskId}/dismiss`).then((r) => r.data),
  dismissChecklist: () =>
    api.post("/workspace-academy/checklist/dismiss").then((r) => r.data),

  viewArticle: (articleId: string) =>
    api.post(`/workspace-academy/articles/${articleId}/view`).then((r) => r.data),

  reset: () => api.post("/workspace-academy/reset").then((r) => r.data),
};
