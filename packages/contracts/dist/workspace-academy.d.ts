import { z } from "zod";
import { RoleEnum } from "./auth.js";
export type AcademyRole = z.infer<typeof RoleEnum>;
export declare const AcademyGuideStatus: z.ZodEnum<["NOT_STARTED", "STARTED", "COMPLETED", "DISMISSED"]>;
export type AcademyGuideStatus = z.infer<typeof AcademyGuideStatus>;
export declare const AcademyTaskStatus: z.ZodEnum<["LOCKED", "AVAILABLE", "COMPLETED", "DISMISSED"]>;
export type AcademyTaskStatus = z.infer<typeof AcademyTaskStatus>;
export declare const ACADEMY_GUIDE_IDS: readonly ["buyer-dashboard-v1", "buyer-inbox-v1", "buyer-rfq-list-v1", "buyer-rfq-create-v1", "buyer-procurement-strategy-v1", "buyer-rfq-workspace-v1", "buyer-quotation-comparison-v1", "buyer-split-award-v1", "buyer-proforma-v1", "buyer-po-workspace-v1", "buyer-order-workspace-v1", "buyer-freightiq-v1", "buyer-shipment-workspace-v1", "buyer-documents-v1", "buyer-messages-v1", "buyer-alerts-v1", "buyer-trade-workspace-v1", "buyer-control-tower-v1", "buyer-commoditybid-v1", "buyer-commoditybid-list-v1", "buyer-mixed-container-v1", "buyer-bulk-container-v1", "buyer-po-list-v1", "buyer-orders-list-v1", "buyer-freightiq-hub-v1", "buyer-shipments-list-v1", "buyer-notifications-v1", "buyer-compliance-v1", "buyer-learning-v1", "buyer-account-v1", "buyer-commoditybid-panel-v1", "buyer-commoditybid-create-v1", "buyer-mc-catalog-v1", "buyer-mc-catalog-search-v1", "buyer-mc-catalog-products-v1", "buyer-mc-catalog-product-v1", "buyer-mc-requests-v1", "buyer-mc-builder-v1", "buyer-mc-offer-v1", "buyer-mc-organization-v1", "buyer-mc-coordination-v1", "buyer-bc-catalog-v1", "buyer-bc-catalog-products-v1", "buyer-bc-requests-v1", "buyer-bc-builder-v1", "buyer-bc-offer-v1", "buyer-bc-coordination-v1", "buyer-bc-execution-v1", "buyer-shipment-portfolio-v1", "buyer-document-detail-v1", "buyer-alert-detail-v1", "buyer-account-whatsapp-v1", "buyer-trade-documents-panel-v1", "buyer-messages-thread-v1", "supplier-rfq-list-v1", "supplier-quotation-v1", "supplier-po-v1", "supplier-order-v1", "supplier-messages-v1", "ops-rfq-triage-v1", "ops-order-v1", "ops-shipment-v1", "ops-control-tower-v1", "forwarder-dashboard-v1", "forwarder-shipment-v1", "sales-dashboard-v1", "sales-control-tower-v1"];
export type AcademyGuideId = (typeof ACADEMY_GUIDE_IDS)[number];
export declare const AcademyGuideIdSchema: z.ZodEnum<["buyer-dashboard-v1", "buyer-inbox-v1", "buyer-rfq-list-v1", "buyer-rfq-create-v1", "buyer-procurement-strategy-v1", "buyer-rfq-workspace-v1", "buyer-quotation-comparison-v1", "buyer-split-award-v1", "buyer-proforma-v1", "buyer-po-workspace-v1", "buyer-order-workspace-v1", "buyer-freightiq-v1", "buyer-shipment-workspace-v1", "buyer-documents-v1", "buyer-messages-v1", "buyer-alerts-v1", "buyer-trade-workspace-v1", "buyer-control-tower-v1", "buyer-commoditybid-v1", "buyer-commoditybid-list-v1", "buyer-mixed-container-v1", "buyer-bulk-container-v1", "buyer-po-list-v1", "buyer-orders-list-v1", "buyer-freightiq-hub-v1", "buyer-shipments-list-v1", "buyer-notifications-v1", "buyer-compliance-v1", "buyer-learning-v1", "buyer-account-v1", "buyer-commoditybid-panel-v1", "buyer-commoditybid-create-v1", "buyer-mc-catalog-v1", "buyer-mc-catalog-search-v1", "buyer-mc-catalog-products-v1", "buyer-mc-catalog-product-v1", "buyer-mc-requests-v1", "buyer-mc-builder-v1", "buyer-mc-offer-v1", "buyer-mc-organization-v1", "buyer-mc-coordination-v1", "buyer-bc-catalog-v1", "buyer-bc-catalog-products-v1", "buyer-bc-requests-v1", "buyer-bc-builder-v1", "buyer-bc-offer-v1", "buyer-bc-coordination-v1", "buyer-bc-execution-v1", "buyer-shipment-portfolio-v1", "buyer-document-detail-v1", "buyer-alert-detail-v1", "buyer-account-whatsapp-v1", "buyer-trade-documents-panel-v1", "buyer-messages-thread-v1", "supplier-rfq-list-v1", "supplier-quotation-v1", "supplier-po-v1", "supplier-order-v1", "supplier-messages-v1", "ops-rfq-triage-v1", "ops-order-v1", "ops-shipment-v1", "ops-control-tower-v1", "forwarder-dashboard-v1", "forwarder-shipment-v1", "sales-dashboard-v1", "sales-control-tower-v1"]>;
export interface AcademyTaskDefinition {
    id: string;
    roles: readonly AcademyRole[];
    verification: "VIEW" | "DOMAIN";
    /** Task ids that must be COMPLETED before this one unlocks (UI-level). */
    prerequisites?: readonly string[];
}
export declare const ACADEMY_TASKS: readonly AcademyTaskDefinition[];
export declare const ACADEMY_TASK_IDS: string[];
export declare const AcademyTaskIdSchema: z.ZodEffects<z.ZodString, string, string>;
export declare function academyTasksForRole(role: AcademyRole): AcademyTaskDefinition[];
export declare function academyTaskById(id: string): AcademyTaskDefinition | undefined;
export declare const AcademyArticleIdSchema: z.ZodString;
export declare const AcademyGuideProgressDTO: z.ZodObject<{
    guideId: z.ZodString;
    guideVersion: z.ZodNumber;
    status: z.ZodEnum<["NOT_STARTED", "STARTED", "COMPLETED", "DISMISSED"]>;
    lastStepIndex: z.ZodNumber;
    displayCount: z.ZodNumber;
    startedAt: z.ZodNullable<z.ZodString>;
    completedAt: z.ZodNullable<z.ZodString>;
    dismissedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
    completedAt: string | null;
    guideId: string;
    guideVersion: number;
    lastStepIndex: number;
    displayCount: number;
    startedAt: string | null;
    dismissedAt: string | null;
}, {
    status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
    completedAt: string | null;
    guideId: string;
    guideVersion: number;
    lastStepIndex: number;
    displayCount: number;
    startedAt: string | null;
    dismissedAt: string | null;
}>;
export type AcademyGuideProgressDTO = z.infer<typeof AcademyGuideProgressDTO>;
export declare const AcademyTaskProgressDTO: z.ZodObject<{
    taskId: z.ZodString;
    status: z.ZodEnum<["LOCKED", "AVAILABLE", "COMPLETED", "DISMISSED"]>;
    completedAt: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
    completedAt: string | null;
    taskId: string;
}, {
    status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
    completedAt: string | null;
    taskId: string;
}>;
export type AcademyTaskProgressDTO = z.infer<typeof AcademyTaskProgressDTO>;
export declare const AcademyStateDTO: z.ZodObject<{
    welcomeCompletedAt: z.ZodNullable<z.ZodString>;
    welcomeDismissedAt: z.ZodNullable<z.ZodString>;
    processOverviewCompletedAt: z.ZodNullable<z.ZodString>;
    checklistDismissedAt: z.ZodNullable<z.ZodString>;
    lastAutomaticGuideId: z.ZodNullable<z.ZodString>;
    lastAutomaticGuideAt: z.ZodNullable<z.ZodString>;
    guides: z.ZodArray<z.ZodObject<{
        guideId: z.ZodString;
        guideVersion: z.ZodNumber;
        status: z.ZodEnum<["NOT_STARTED", "STARTED", "COMPLETED", "DISMISSED"]>;
        lastStepIndex: z.ZodNumber;
        displayCount: z.ZodNumber;
        startedAt: z.ZodNullable<z.ZodString>;
        completedAt: z.ZodNullable<z.ZodString>;
        dismissedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
        completedAt: string | null;
        guideId: string;
        guideVersion: number;
        lastStepIndex: number;
        displayCount: number;
        startedAt: string | null;
        dismissedAt: string | null;
    }, {
        status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
        completedAt: string | null;
        guideId: string;
        guideVersion: number;
        lastStepIndex: number;
        displayCount: number;
        startedAt: string | null;
        dismissedAt: string | null;
    }>, "many">;
    tasks: z.ZodArray<z.ZodObject<{
        taskId: z.ZodString;
        status: z.ZodEnum<["LOCKED", "AVAILABLE", "COMPLETED", "DISMISSED"]>;
        completedAt: z.ZodNullable<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
        completedAt: string | null;
        taskId: string;
    }, {
        status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
        completedAt: string | null;
        taskId: string;
    }>, "many">;
    recentArticleIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    tasks: {
        status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
        completedAt: string | null;
        taskId: string;
    }[];
    welcomeCompletedAt: string | null;
    welcomeDismissedAt: string | null;
    processOverviewCompletedAt: string | null;
    checklistDismissedAt: string | null;
    lastAutomaticGuideId: string | null;
    lastAutomaticGuideAt: string | null;
    guides: {
        status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
        completedAt: string | null;
        guideId: string;
        guideVersion: number;
        lastStepIndex: number;
        displayCount: number;
        startedAt: string | null;
        dismissedAt: string | null;
    }[];
    recentArticleIds: string[];
}, {
    tasks: {
        status: "AVAILABLE" | "COMPLETED" | "DISMISSED" | "LOCKED";
        completedAt: string | null;
        taskId: string;
    }[];
    welcomeCompletedAt: string | null;
    welcomeDismissedAt: string | null;
    processOverviewCompletedAt: string | null;
    checklistDismissedAt: string | null;
    lastAutomaticGuideId: string | null;
    lastAutomaticGuideAt: string | null;
    guides: {
        status: "COMPLETED" | "NOT_STARTED" | "STARTED" | "DISMISSED";
        completedAt: string | null;
        guideId: string;
        guideVersion: number;
        lastStepIndex: number;
        displayCount: number;
        startedAt: string | null;
        dismissedAt: string | null;
    }[];
    recentArticleIds: string[];
}>;
export type AcademyStateDTO = z.infer<typeof AcademyStateDTO>;
export declare const GuideProgressBody: z.ZodObject<{
    stepIndex: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    stepIndex: number;
}, {
    stepIndex: number;
}>;
export type GuideProgressBody = z.infer<typeof GuideProgressBody>;
