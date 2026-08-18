import type { ActorRole } from "./rfq.fsm";
import { type OrderState, type OrderAction } from "./order.fsm";
export interface OrderNextActionContext {
    state: OrderState;
    actorRole: ActorRole;
    isOwner: boolean;
    isCounterparty: boolean;
    inspectionResult?: string | null;
    /** Latest reported production % (0 if none). */
    productionPercent?: number;
    /** Open freight request has a selected offer (or none open). */
    freightOfferSelected?: boolean;
}
export interface NextAction {
    action: OrderAction;
    label: string;
    description: string;
    variant: "primary" | "secondary" | "destructive";
    requiresReason: boolean;
    requiresConfirmation: boolean;
    confirmation?: string;
}
export declare function computeOrderNextActions(ctx: OrderNextActionContext): NextAction[];
