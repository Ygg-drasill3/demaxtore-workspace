import type { ShipmentState } from "./shipment.fsm";
import type { WorkspaceScript, WorkspaceScriptRole } from "./workspace-scripts";
export declare const SHIPMENT_SCRIPTS: Partial<Record<ShipmentState, WorkspaceScript>>;
export declare function shipmentScriptFor(state: ShipmentState, role: WorkspaceScriptRole): WorkspaceScript | undefined;
export declare function shipmentMilestones(state: ShipmentState): Array<{
    key: string;
    label: string;
    status: "done" | "current" | "pending";
}>;
export declare function shipmentProgressPercent(state: ShipmentState): number;
