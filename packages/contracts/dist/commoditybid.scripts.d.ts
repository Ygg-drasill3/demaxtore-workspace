import type { CommodityBidState } from "./commoditybid.fsm";
import type { WorkspaceScript, WorkspaceScriptRole } from "./workspace-scripts";
export declare const COMMODITYBID_BUYER_SCRIPTS: Partial<Record<CommodityBidState, WorkspaceScript>>;
export declare function commoditybidScriptFor(state: CommodityBidState, role: WorkspaceScriptRole): WorkspaceScript | undefined;
