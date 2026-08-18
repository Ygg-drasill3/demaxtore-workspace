import { api } from "@/lib/api";
import type {
  OperationalIssueDto,
  OperationalIssueListResponse,
  OperationalIssueSummaryCounts,
} from "@dmx/contracts/operational-issue";
import type {
  CreateOperationalIssueInput,
  PatchOperationalIssueInput,
  ResolveOperationalIssueInput,
} from "@dmx/contracts/operational-issue.zod";

export const issueApi = {
  list: (params?: Record<string, unknown>) =>
    api.get("/issues", { params }).then((r) => r.data as OperationalIssueListResponse),
  summary: () => api.get("/issues/summary").then((r) => r.data as OperationalIssueSummaryCounts),
  get: (id: string) => api.get(`/issues/${id}`).then((r) => r.data as OperationalIssueDto),
  create: (body: CreateOperationalIssueInput) =>
    api.post("/issues", body).then((r) => r.data as OperationalIssueDto),
  patch: (id: string, body: PatchOperationalIssueInput) =>
    api.patch(`/issues/${id}`, body).then((r) => r.data as OperationalIssueDto),
  resolve: (id: string, body?: ResolveOperationalIssueInput) =>
    api.post(`/issues/${id}/resolve`, body ?? {}).then((r) => r.data as OperationalIssueDto),
  reopen: (id: string) => api.post(`/issues/${id}/reopen`).then((r) => r.data as OperationalIssueDto),
  forOrder: (orderId: string) =>
    api.get(`/orders/${orderId}/issues`).then((r) => r.data as OperationalIssueListResponse),
};
