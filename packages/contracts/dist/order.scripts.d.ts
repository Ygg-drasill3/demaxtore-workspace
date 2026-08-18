import type { OrderState } from "./order.fsm";
import type { WorkspaceScript, WorkspaceScriptRole } from "./workspace-scripts";
export declare const ORDER_SCRIPTS: Partial<Record<OrderState, WorkspaceScript>>;
export declare function orderScriptFor(state: OrderState, role: WorkspaceScriptRole): WorkspaceScript | undefined;
export declare function orderMilestones(state: OrderState): Array<{
    key: string;
    label: string;
    status: "done" | "current" | "pending";
}>;
