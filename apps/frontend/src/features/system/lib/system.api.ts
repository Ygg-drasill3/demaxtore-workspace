import { api } from "@/lib/api";
import type { SystemDashboardInsight } from "@dmx/contracts/enterprise-readiness";

export const systemApi = {
  insights: () => api.get<SystemDashboardInsight>("/system/insights").then((r) => r.data),
  health: () => api.get("/system/health").then((r) => r.data),
  jobs: () => api.get("/system/jobs").then((r) => r.data),
  jobHistory: () => api.get("/system/jobs/history").then((r) => r.data),
  failedJobs: () => api.get("/system/jobs/failed").then((r) => r.data),
};
