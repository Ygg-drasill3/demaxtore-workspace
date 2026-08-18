import type { ActorRole } from "./rfq.fsm";
import { type ShipmentState, type ShipmentAction } from "./shipment.fsm";
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
export declare function computeShipmentNextActions(ctx: ShipmentNextActionContext): ShipmentNextAction[];
