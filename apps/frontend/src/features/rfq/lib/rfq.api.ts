// apps/frontend/src/features/rfq/lib/rfq.api.ts
import { api } from "@/lib/api";
import type {
  CreateRfqDraftInput, EditRfqDraftInput,
  RfqDTO, ListRfqQuery,
  SelectProcurementStrategyInput, SpawnCommodityBidFromRfqInput,
} from "@dmx/contracts/rfq.zod";
import type { RfqAction } from "@dmx/contracts/rfq.fsm";
import { normalizeQuotationList } from "./quotations.normalize";
import { normalizeSupplierLookup } from "./suppliers.normalize";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";

export const rfqApi = {
  list:        (q: Partial<ListRfqQuery>) => api.get("/rfq",                { params: q }).then(r => r.data),
  get:         (id: string)                => api.get<RfqDTO>(`/rfq/${id}`).then(r => r.data),
  timeline:    (id: string, params?: { cursor?: string; limit?: number }) =>
                                              api.get(`/rfq/${id}/timeline`, { params }).then(r => r.data),
  clarifs:     (id: string)                => api.get(`/rfq/${id}/clarifications`).then(r => r.data),
  attach:      (id: string)                => api.get(`/rfq/${id}/attachments`).then(r => r.data),
  quotations:  async (id: string) => {
    const r = await api.get(`/rfq/${id}/quotations`);
    return normalizeQuotationList(r.data) as QuotationRowDTO[];
  },
  nextActions: (id: string)                => api.get(`/rfq/${id}/next-actions`).then(r => r.data),
  spawnedOrders: (id: string)              => api.get(`/rfq/${id}/spawned-orders`).then(r => r.data),

  createDraft: (input: CreateRfqDraftInput) => api.post<RfqDTO>("/rfq", input).then(r => r.data),
  editDraft:   (id: string, input: EditRfqDraftInput) => api.patch<RfqDTO>(`/rfq/${id}/draft`, input).then(r => r.data),
  moveToTrash: (id: string) => api.post(`/rfq/${id}/trash`).then(() => undefined),
  restore:     (id: string) => api.post(`/rfq/${id}/restore`).then(() => undefined),

  /** Generic FSM action invoker — all 18 RFQ actions go through here. */
  action: (id: string, action: RfqAction, body?: { payload?: any; reason?: string; idempotencyKey?: string }) =>
    api.post(`/rfq/${id}/actions/${actionPath(action)}`, body ?? {}).then(r => r.data),

  postClarification: (
    id: string,
    body: {
      message: string;
      replyToMessageId?: string;
      visibility?: "ALL" | "ADMIN_ONLY";
      mentionedUserIds?: string[];
      attachmentIds?: string[];
    },
  ) => api.post(`/rfq/${id}/clarifications`, body).then((r) => r.data),

  uploadAttachment: (workspaceId: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post<{ id: string; fileName: string; fileSizeBytes: number }>(
      `/rfq/${workspaceId}/attachments`,
      form,
      { headers: { "Content-Type": "multipart/form-data" } },
    ).then((r) => r.data);
  },

  deleteAttachment: (workspaceId: string, attachmentId: string) =>
    api.delete(`/rfq/${workspaceId}/attachments/${attachmentId}`).then(() => undefined),

  adminQueue:      ()  => api.get("/admin/rfq/queue").then(r => r.data),
  lookupSuppliers: (q: string) =>
    api.get("/admin/rfq/suppliers", { params: { q, limit: 50 } }).then((r) => normalizeSupplierLookup(r.data)),
  getSupplierQuoteScope: (workspaceId: string, supplierUserId: string) =>
    api.get<{
      supplierUserId: string;
      allowedQuoteLineItemIds: string[] | null;
      remainingQuoteLineItemIds: string[] | null;
      quotedLineItemIds: string[];
      existingQuotationId: string | null;
    }>(`/rfq/${workspaceId}/quotations/admin/scope/${supplierUserId}`).then((r) => r.data),

  selectProcurementStrategy: (id: string, input: SelectProcurementStrategyInput) =>
    api.post<RfqDTO>(`/rfq/${id}/procurement-strategy`, input).then((r) => r.data),

  spawnCommodityBidFromRfq: (id: string, input: SpawnCommodityBidFromRfqInput) =>
    api.post<{ rfq: RfqDTO; commodityBid: { id: string } }>(`/rfq/${id}/spawn-commoditybid`, input).then((r) => r.data),
};

/** Absolute URL required by SubmitProformaPayload (Zod .url()). */
export function rfqAttachmentUrl(workspaceId: string, attachmentId: string): string {
  const apiBase = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");
  if (apiBase.startsWith("http")) {
    return `${apiBase}/rfq/${workspaceId}/attachments/${attachmentId}`;
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const prefix = apiBase.startsWith("/") ? apiBase : `/${apiBase}`;
  return `${origin}${prefix}/rfq/${workspaceId}/attachments/${attachmentId}`;
}

function actionPath(a: RfqAction): string {
  return ACTION_PATHS[a] ?? a.replace(/_/g, "-");
}
const ACTION_PATHS: Partial<Record<RfqAction, string>> = {
  create_rfq: "create", edit_rfq_draft: "edit-draft",
  submit_rfq: "submit", withdraw_rfq: "withdraw", cancel_rfq: "cancel",
  revise_rejected_rfq: "revise-rejected",
  assign_suppliers: "assign-suppliers", add_more_suppliers: "add-suppliers",
  remove_supplier: "remove-supplier", reject_rfq: "reject", publish_rfq: "publish",
  reopen_quotations: "reopen-quotations",
  submit_quotation: "submit-quotation", revise_quotation: "revise-quotation", withdraw_quotation: "withdraw-quotation",
  post_clarification: "post-clarification",
  extend_deadline: "extend-deadline",
  close_quotations_early: "close-quotations",
  deadline_reached: "deadline-reached", deadline_reached_no_bids: "deadline-reached-no-bids",
  start_evaluation: "start-evaluation",
  select_supplier: "select-supplier", revert_selection: "revert-selection",
  close_without_award: "close-without-award",
  request_proforma: "request-proforma", submit_proforma: "submit-proforma",
  decline_proforma: "decline-proforma", proforma_sla_expired: "proforma-sla-expired",
  approve_proforma: "approve-proforma", reject_proforma: "reject-proforma",
  issue_po: "issue-po",
  sync_order_closed: "sync-order-closed",
  add_observer: "add-observer", remove_observer: "remove-observer",
  // These two do not follow the kebab-case fallback: the backend mounts them as
  // `unpublish` and `set-state`, so omitting them here sends a 404.
  unpublish_rfq: "unpublish", admin_set_state: "set-state",
};
