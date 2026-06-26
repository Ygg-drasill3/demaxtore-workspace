import type { ActorRole } from "./rfq.fsm";
import {
  SHIPMENT_TRANSITIONS,
  isShipmentTerminal,
  isShipmentActive,
  type ShipmentState,
  type ShipmentAction,
  type ShipmentTransition,
} from "./shipment.fsm";

export interface ShipmentNextActionContext {
  state: ShipmentState;
  actorRole: ActorRole;
  isOwner: boolean;
  isCounterparty: boolean;
  hasOpenException?: boolean;
}

export interface ShipmentNextAction {
  action: ShipmentAction;
  label: string;
  description: string;
  variant: "primary" | "secondary" | "destructive";
  requiresReason: boolean;
  requiresConfirmation: boolean;
  confirmation?: string;
}

const LABELS: Partial<Record<ShipmentAction, { label: string; description: string; variant: ShipmentNextAction["variant"]; confirm?: string }>> = {
  confirm_booking:      { label: "Confirm Booking", description: "Advance freight booking", variant: "primary" },
  assign_container:     { label: "Assign Container", description: "Record container number", variant: "primary" },
  pickup_cargo:         { label: "Pickup Cargo", description: "Mark pickup milestone", variant: "primary" },
  arrive_origin_port:   { label: "At Origin Port", description: "Cargo arrived at origin port", variant: "primary" },
  load_vessel:          { label: "Load on Vessel", description: "Cargo loaded on vessel", variant: "primary" },
  depart_vessel:        { label: "Depart Vessel", description: "Vessel departed origin", variant: "primary" },
  arrive_destination:   { label: "Arrive Destination", description: "Vessel at destination port", variant: "primary" },
  start_customs:        { label: "Start Customs", description: "Begin customs clearance", variant: "primary" },
  complete_customs:     { label: "Complete Customs", description: "Customs cleared", variant: "primary" },
  ready_delivery:       { label: "Ready for Delivery", description: "Confirm delivery readiness", variant: "secondary" },
  confirm_partial_delivery: { label: "Partial Delivery", description: "Confirm partial delivery received", variant: "primary" },
  confirm_delivery:     { label: "Confirm Delivery", description: "Buyer confirms delivery", variant: "primary" },
  reject_shipment:      { label: "Reject Shipment", description: "Reject shipment with reason", variant: "destructive", confirm: "Reject this shipment?" },
  complete_shipment:    { label: "Complete Shipment", description: "Close shipment workspace", variant: "primary" },
  report_exception:     { label: "Report Exception", description: "Log operational exception", variant: "destructive" },
  resolve_exception:    { label: "Resolve Exception", description: "Resume operations after exception", variant: "primary" },
  cancel_shipment:      { label: "Cancel Shipment", description: "Cancel with reason", variant: "destructive", confirm: "Cancel this shipment?" },
  upload_document:      { label: "Upload Document", description: "Add B/L, customs, or delivery proof", variant: "secondary" },
};

function satisfiesParticipant(t: ShipmentTransition, ctx: ShipmentNextActionContext): boolean {
  if (!t.requiredParticipant) return true;
  if (ctx.actorRole === "ADMIN" || ctx.actorRole === "SYSTEM") return true;
  if (t.requiredParticipant === "OWNER") return ctx.isOwner;
  if (t.requiredParticipant === "COUNTERPARTY") return ctx.isCounterparty;
  return true;
}

function toNextAction(t: ShipmentTransition): ShipmentNextAction {
  const meta = LABELS[t.action] ?? { label: t.action, description: "", variant: "secondary" as const };
  return {
    action: t.action,
    label: meta.label,
    description: meta.description,
    variant: meta.variant,
    requiresReason: !!t.requiresReason,
    requiresConfirmation: !!meta.confirm,
    confirmation: meta.confirm,
  };
}

export function computeShipmentNextActions(ctx: ShipmentNextActionContext): ShipmentNextAction[] {
  if (isShipmentTerminal(ctx.state)) return [];
  if (ctx.state === "EXCEPTION" && !ctx.hasOpenException) return [];

  const seen = new Set<string>();
  const out: ShipmentNextAction[] = [];

  for (const t of SHIPMENT_TRANSITIONS) {
    if (t.action === "create_shipment") continue;
    if (t.from === "ANY_ACTIVE" && !isShipmentActive(ctx.state)) continue;
    if (t.from !== "ANY_ACTIVE" && t.from !== "*" && t.from !== ctx.state) continue;
    if (!t.allowedRoles.includes(ctx.actorRole)) continue;
    if (!satisfiesParticipant(t, ctx)) continue;
    if (ctx.state === "EXCEPTION" && t.action !== "resolve_exception" && t.action !== "cancel_shipment" && t.action !== "upload_document") continue;
    if (ctx.hasOpenException && t.action !== "resolve_exception" && t.action !== "upload_document") continue;

    const key = `${t.action}:${t.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toNextAction(t));
  }
  return out;
}
