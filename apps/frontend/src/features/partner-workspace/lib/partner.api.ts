import { api } from "@/lib/api";
import type {
  AssignPartnerInput,
  PartnerAssignableUserDto,
  PartnerAssignmentDto,
  PartnerHomeDto,
  PartnerTransactionDetailDto,
  PartnerTransactionSummaryDto,
} from "@dmx/contracts/partner-workspace";

export const partnerApi = {
  home: () => api.get("/partner/home").then((r) => r.data as PartnerHomeDto),
  listTransactions: () =>
    api.get("/partner/transactions").then((r) => r.data as { items: PartnerTransactionSummaryDto[] }),
  getTransaction: (workspaceId: string) =>
    api.get(`/partner/transactions/${workspaceId}`).then((r) => r.data as PartnerTransactionDetailDto),
  listAssignable: (role: string) =>
    api.get("/partner/assignable", { params: { role } }).then((r) => r.data as { items: PartnerAssignableUserDto[] }),
  assign: (body: AssignPartnerInput) =>
    api.post("/partner/assignments", body).then((r) => r.data as PartnerAssignmentDto),
  listAssignments: (workspaceId: string) =>
    api
      .get("/partner/assignments", { params: { workspaceId } })
      .then((r) => r.data as { items: PartnerAssignmentDto[] }),
  revoke: (assignmentId: string) =>
    api
      .post(`/partner/assignments/${assignmentId}/revoke`)
      .then((r) => r.data as { id: string; revoked: boolean; idempotent: boolean }),
  completeTask: (taskId: string) =>
    api.post(`/partner/tasks/${taskId}/complete`).then((r) => r.data as { id: string; status: string; idempotent: boolean }),
  confirmCargoReady: (orderId: string, body?: { cargoReadyDate?: string; note?: string }) =>
    api.post(`/partner/orders/${orderId}/confirm-cargo-ready`, body ?? {}).then((r) => r.data),
  confirmGateIn: (shipmentId: string, body?: { gateInAt?: string; note?: string }) =>
    api.post(`/partner/shipments/${shipmentId}/confirm-gate-in`, body ?? {}).then((r) => r.data),
};
