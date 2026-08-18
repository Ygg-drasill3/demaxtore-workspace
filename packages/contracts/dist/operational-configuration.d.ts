export declare const OPS_AUTOMATION_RULE_KEYS: readonly ["inspection.requested", "inspection.failed", "shipment.booked", "po.revised", "order.approved_for_shipment", "milestone.activate_next"];
export type OpsAutomationRuleKey = (typeof OPS_AUTOMATION_RULE_KEYS)[number];
export declare const OPS_TASK_TEMPLATE_CATEGORIES: readonly ["INSPECTION", "SHIPMENT", "DOCUMENT", "QUALITY", "GENERAL"];
export type OpsTaskTemplateCategory = (typeof OPS_TASK_TEMPLATE_CATEGORIES)[number];
export interface OpsRiskThresholdsDto {
    atRiskMinutes: number;
    delayedMinutes: number;
}
export interface OpsDefaultsDto {
    etaBufferHours: number;
    issueSeverity: string;
    taskPriority: string;
    completionDocsRequired: boolean;
}
export interface OpsAutomationRuleDto {
    id: string;
    key: string;
    name: string;
    description: string | null;
    enabled: boolean;
    priority: number;
    updatedAt: string;
}
export interface OpsTaskTemplateDto {
    id: string;
    name: string;
    category: string;
    priority: string;
    defaultAssigneeRole: string | null;
    dueOffsetDays: number;
    automationTrigger: string | null;
    description: string | null;
    enabled: boolean;
    version: number;
    updatedAt: string;
}
export interface OpsMilestoneTemplateDto {
    id: string;
    type: string;
    name: string;
    sequence: number;
    defaultOffsetDays: number;
    enabled: boolean;
    required: boolean;
    skipByDefault: boolean;
    version: number;
    updatedAt: string;
}
export interface OpsConfigAuditDto {
    id: string;
    action: string;
    actorEmail: string | null;
    actorRole: string | null;
    entityType: string | null;
    entityId: string | null;
    payload: Record<string, unknown>;
    createdAt: string;
}
export interface OperationalConfigurationDto {
    version: number;
    risk: OpsRiskThresholdsDto;
    defaults: OpsDefaultsDto;
    automation: OpsAutomationRuleDto[];
    updatedAt: string;
    permissions: {
        canView: boolean;
        canManageTemplates: boolean;
        canManageAll: boolean;
    };
}
export interface OpsConfigPermissions {
    canView: boolean;
    canManageTemplates: boolean;
    canManageAll: boolean;
}
