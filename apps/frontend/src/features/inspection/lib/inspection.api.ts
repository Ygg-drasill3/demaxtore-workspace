import { api } from "@/lib/api";
import type { InspectionWorkspaceDto } from "@dmx/contracts/inspection-workspace";

const base = (id: string) => `/inspections/${id}`;

export const inspectionApi = {
  get: (id: string) => api.get(base(id)).then((r) => r.data as InspectionWorkspaceDto),
  listForOrder: (orderId: string) =>
    api.get(`/orders/${orderId}/inspections`).then(
      (r) =>
        r.data as Array<{
          id: string;
          inspectionNumber: string;
          status: string;
          decision: string | null;
          decisionLocked: boolean;
          plannedDate: string | null;
          createdAt: string;
        }>,
    ),
  patch: (id: string, body: Record<string, unknown>) =>
    api.patch(base(id), body).then((r) => r.data as InspectionWorkspaceDto),
  cancel: (id: string) => api.post(`${base(id)}/cancel`).then((r) => r.data as InspectionWorkspaceDto),
  assign: (id: string, body: { inspectorName: string; inspectorOrg?: string | null; inspectorContact?: string | null }) =>
    api.post(`${base(id)}/assign`, body).then((r) => r.data as InspectionWorkspaceDto),
  removeAssignment: (id: string) =>
    api.delete(`${base(id)}/assign`).then((r) => r.data as InspectionWorkspaceDto),
  schedule: (id: string, body: Record<string, unknown>) =>
    api.post(`${base(id)}/schedule`, body).then((r) => r.data as InspectionWorkspaceDto),
  addFinding: (id: string, body: Record<string, unknown>) =>
    api.post(`${base(id)}/findings`, body).then((r) => r.data as InspectionWorkspaceDto),
  patchFinding: (id: string, findingId: string, body: Record<string, unknown>) =>
    api.patch(`${base(id)}/findings/${findingId}`, body).then((r) => r.data as InspectionWorkspaceDto),
  deleteFinding: (id: string, findingId: string) =>
    api.delete(`${base(id)}/findings/${findingId}`).then((r) => r.data as InspectionWorkspaceDto),
  addDefect: (id: string, body: Record<string, unknown>) =>
    api.post(`${base(id)}/defects`, body).then((r) => r.data as InspectionWorkspaceDto),
  addNcr: (id: string, body: Record<string, unknown>) =>
    api.post(`${base(id)}/ncrs`, body).then((r) => r.data as InspectionWorkspaceDto),
  patchNcr: (id: string, ncrId: string, body: Record<string, unknown>) =>
    api.patch(`${base(id)}/ncrs/${ncrId}`, body).then((r) => r.data as InspectionWorkspaceDto),
  decision: (id: string, body: { decision: string; notes?: string | null; approve?: boolean }) =>
    api.post(`${base(id)}/decision`, body).then((r) => r.data as InspectionWorkspaceDto),
  timeline: (id: string) =>
    api.get(`${base(id)}/timeline`).then(
      (r) =>
        r.data as Array<{
          id: string;
          eventType: string;
          actorUserId: string | null;
          createdAt: string;
          payload: unknown;
        }>,
    ),
};
