import { type CommodityBidState, type CommodityBidAction, type ActorRole } from "./commoditybid.fsm";
export interface CommodityBidNextActionContext {
    state: CommodityBidState;
    actorRole: ActorRole;
    isOwner: boolean;
    isCounterparty: boolean;
    hasActiveBidOnAnyLot?: boolean;
    hasWinnerAward?: boolean;
}
export interface NextAction {
    action: CommodityBidAction;
    label: string;
    description: string;
    variant: "primary" | "secondary" | "destructive";
    requiresReason: boolean;
    requiresConfirmation: boolean;
    confirmation?: string;
}
export declare function computeCommodityBidNextActions(ctx: CommodityBidNextActionContext): NextAction[];
