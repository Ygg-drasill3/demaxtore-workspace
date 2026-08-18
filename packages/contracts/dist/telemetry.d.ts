import { z } from "zod";
export declare const TelemetryEventName: z.ZodEnum<["workspace.viewed", "quotation.viewed", "clarification.opened", "document.downloaded", "next_action.clicked", "academy.opened", "academy.search_used", "academy.article_viewed", "academy.process_overview_started", "academy.process_overview_completed", "academy.welcome_viewed", "academy.welcome_completed", "academy.welcome_dismissed", "academy.guide_started", "academy.guide_step_viewed", "academy.guide_completed", "academy.guide_skipped", "academy.guide_dismissed", "academy.guide_restarted", "academy.checklist_opened", "academy.checklist_minimized", "academy.checklist_dismissed", "academy.checklist_task_completed", "academy.help_center_opened", "academy.contextual_help_opened", "academy.empty_state_action_used", "academy.persist_failed"]>;
export type TelemetryEventName = z.infer<typeof TelemetryEventName>;
export declare const TelemetryEventInput: z.ZodObject<{
    event: z.ZodEnum<["workspace.viewed", "quotation.viewed", "clarification.opened", "document.downloaded", "next_action.clicked", "academy.opened", "academy.search_used", "academy.article_viewed", "academy.process_overview_started", "academy.process_overview_completed", "academy.welcome_viewed", "academy.welcome_completed", "academy.welcome_dismissed", "academy.guide_started", "academy.guide_step_viewed", "academy.guide_completed", "academy.guide_skipped", "academy.guide_dismissed", "academy.guide_restarted", "academy.checklist_opened", "academy.checklist_minimized", "academy.checklist_dismissed", "academy.checklist_task_completed", "academy.help_center_opened", "academy.contextual_help_opened", "academy.empty_state_action_used", "academy.persist_failed"]>;
    workspaceId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Optional sub-target id — quotation id, document id, action id. */
    targetId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    /** Bag of small primitives — kept loose; nothing PII. */
    meta: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnion<[z.ZodString, z.ZodNumber, z.ZodBoolean, z.ZodNull]>>>;
    /** Client wall-clock at emission. Server records its own occurredAt too. */
    clientAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    event: "workspace.viewed" | "quotation.viewed" | "clarification.opened" | "document.downloaded" | "next_action.clicked" | "academy.opened" | "academy.search_used" | "academy.article_viewed" | "academy.process_overview_started" | "academy.process_overview_completed" | "academy.welcome_viewed" | "academy.welcome_completed" | "academy.welcome_dismissed" | "academy.guide_started" | "academy.guide_step_viewed" | "academy.guide_completed" | "academy.guide_skipped" | "academy.guide_dismissed" | "academy.guide_restarted" | "academy.checklist_opened" | "academy.checklist_minimized" | "academy.checklist_dismissed" | "academy.checklist_task_completed" | "academy.help_center_opened" | "academy.contextual_help_opened" | "academy.empty_state_action_used" | "academy.persist_failed";
    clientAt: string;
    workspaceId?: string | null | undefined;
    targetId?: string | null | undefined;
    meta?: Record<string, string | number | boolean | null> | undefined;
}, {
    event: "workspace.viewed" | "quotation.viewed" | "clarification.opened" | "document.downloaded" | "next_action.clicked" | "academy.opened" | "academy.search_used" | "academy.article_viewed" | "academy.process_overview_started" | "academy.process_overview_completed" | "academy.welcome_viewed" | "academy.welcome_completed" | "academy.welcome_dismissed" | "academy.guide_started" | "academy.guide_step_viewed" | "academy.guide_completed" | "academy.guide_skipped" | "academy.guide_dismissed" | "academy.guide_restarted" | "academy.checklist_opened" | "academy.checklist_minimized" | "academy.checklist_dismissed" | "academy.checklist_task_completed" | "academy.help_center_opened" | "academy.contextual_help_opened" | "academy.empty_state_action_used" | "academy.persist_failed";
    clientAt: string;
    workspaceId?: string | null | undefined;
    targetId?: string | null | undefined;
    meta?: Record<string, string | number | boolean | null> | undefined;
}>;
export type TelemetryEventInput = z.infer<typeof TelemetryEventInput>;
