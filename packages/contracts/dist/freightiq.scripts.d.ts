import type { FreightStatus } from "./freightiq";
import type { WorkspaceScript, WorkspaceScriptRole } from "./workspace-scripts";
export type FreightIqScriptPhase = "not_eligible" | "empty" | "REQUESTED" | "QUOTING" | "QUOTED" | "SELECTED" | "CONVERTED_TO_SHIPMENT" | "CANCELLED" | "EXPIRED";
export declare function freightPhase(eligible: boolean, status: FreightStatus | null): FreightIqScriptPhase;
export declare const FREIGHTIQ_SCRIPTS: Record<FreightIqScriptPhase, WorkspaceScript>;
export declare function freightiqScriptFor(phase: FreightIqScriptPhase, _role: WorkspaceScriptRole): WorkspaceScript;
export declare function freightMilestones(phase: FreightIqScriptPhase): Array<{
    key: string;
    label: string;
    status: "done" | "current" | "pending";
}>;
