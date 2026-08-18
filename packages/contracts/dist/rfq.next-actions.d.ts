import { type RfqState, type RfqAction, type ActorRole } from "./rfq.fsm";
export type ParticipantRole = "OWNER" | "COUNTERPARTY" | "OPERATOR" | "OBSERVER";
export interface NextActionContext {
    state: RfqState;
    actorRole: ActorRole;
    isOwner: boolean;
    isCounterparty: boolean;
    isSelectedSupplier?: boolean;
    hasQuotationFromUser?: boolean;
}
export interface NextAction {
    action: RfqAction;
    label: string;
    description: string;
    variant: "primary" | "secondary" | "destructive";
    requiresReason: boolean;
    requiresConfirmation: boolean;
    /** Optional helper text shown in confirmation dialog. */
    confirmation?: string;
}
export declare function computeRfqNextActions(ctx: NextActionContext): NextAction[];
