// Lightweight bus for post-action educational transition modals.
// Never mutates commercial state — display only.
import { create } from "zustand";

export type EducationalSuccessKind = "po_issued" | "shipment_booked" | "rfq_submitted";

export interface EducationalSuccessAction {
  labelKey: string;
  href: string;
  primary?: boolean;
}

export interface EducationalSuccessPayload {
  kind: EducationalSuccessKind;
  titleKey: string;
  bodyKey: string;
  actions: EducationalSuccessAction[];
}

interface EducationalSuccessState {
  payload: EducationalSuccessPayload | null;
  show: (payload: EducationalSuccessPayload) => void;
  dismiss: () => void;
}

export const useEducationalSuccess = create<EducationalSuccessState>((set) => ({
  payload: null,
  show: (payload) => set({ payload }),
  dismiss: () => set({ payload: null }),
}));

export function showPoIssuedSuccess(opts: {
  poWorkspaceId?: string | null;
  orderWorkspaceId?: string | null;
  rfqWorkspacePath?: string | null;
}) {
  const actions: EducationalSuccessAction[] = [];
  if (opts.poWorkspaceId) {
    actions.push({
      labelKey: "wa.success.po.openPo",
      href: `/workspace/po/${opts.poWorkspaceId}`,
      primary: true,
    });
  }
  if (opts.orderWorkspaceId) {
    actions.push({
      labelKey: "wa.success.po.openOrder",
      href: `/workspace/order/${opts.orderWorkspaceId}`,
      primary: !opts.poWorkspaceId,
    });
  }
  if (opts.rfqWorkspacePath) {
    actions.push({ labelKey: "wa.success.po.backRfq", href: opts.rfqWorkspacePath });
  }
  if (actions.length === 0) return;
  useEducationalSuccess.getState().show({
    kind: "po_issued",
    titleKey: "wa.success.po.title",
    bodyKey: "wa.success.po.body",
    actions,
  });
}

export function showShipmentBookedSuccess(opts: {
  shipmentWorkspaceId?: string | null;
  orderWorkspaceId?: string | null;
}) {
  const actions: EducationalSuccessAction[] = [];
  if (opts.shipmentWorkspaceId) {
    actions.push({
      labelKey: "wa.success.ship.openShipment",
      href: `/workspace/shipment/${opts.shipmentWorkspaceId}`,
      primary: true,
    });
  }
  if (opts.orderWorkspaceId) {
    actions.push({
      labelKey: "wa.success.ship.backOrder",
      href: `/workspace/order/${opts.orderWorkspaceId}`,
      primary: !opts.shipmentWorkspaceId,
    });
  }
  if (actions.length === 0) return;
  useEducationalSuccess.getState().show({
    kind: "shipment_booked",
    titleKey: "wa.success.ship.title",
    bodyKey: "wa.success.ship.body",
    actions,
  });
}

export function showRfqSubmittedSuccess(opts: {
  rfqWorkspacePath: string;
  strategyPath?: string | null;
  listPath?: string | null;
}) {
  const actions: EducationalSuccessAction[] = [
    {
      labelKey: "wa.success.rfq.openStrategy",
      href: opts.strategyPath ?? `${opts.rfqWorkspacePath}/procurement-strategy`,
      primary: true,
    },
    { labelKey: "wa.success.rfq.openWorkspace", href: opts.rfqWorkspacePath },
  ];
  if (opts.listPath) {
    actions.push({ labelKey: "wa.success.rfq.backList", href: opts.listPath });
  }
  useEducationalSuccess.getState().show({
    kind: "rfq_submitted",
    titleKey: "wa.success.rfq.title",
    bodyKey: "wa.success.rfq.body",
    actions,
  });
}
