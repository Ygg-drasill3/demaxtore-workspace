// =============================================================================
// @dmx/contracts — Telemetry event names + payload schemas
// Captured client-side, persisted server-side. No analytics dashboard yet —
// just event capture (Sprint 2.5 requirement).
// =============================================================================
import { z } from "zod";
export const TelemetryEventName = z.enum([
    "workspace.viewed",
    "quotation.viewed",
    "clarification.opened",
    "document.downloaded",
    "next_action.clicked",
    // ── Workspace Academy (educational layer — payloads never contain
    //    commercial data; only guide/article/task ids, role, locale, route). ──
    "academy.opened",
    "academy.search_used",
    "academy.article_viewed",
    "academy.process_overview_started",
    "academy.process_overview_completed",
    "academy.welcome_viewed",
    "academy.welcome_completed",
    "academy.welcome_dismissed",
    "academy.guide_started",
    "academy.guide_step_viewed",
    "academy.guide_completed",
    "academy.guide_skipped",
    "academy.guide_dismissed",
    "academy.guide_restarted",
    "academy.checklist_opened",
    "academy.checklist_minimized",
    "academy.checklist_dismissed",
    "academy.checklist_task_completed",
    "academy.help_center_opened",
    "academy.contextual_help_opened",
    "academy.empty_state_action_used",
    // Academy progress failed to persist. Emitted instead of discarding the rejection,
    // so a broken academy endpoint is observable rather than silently degrading.
    "academy.persist_failed",
]);
export const TelemetryEventInput = z.object({
    event: TelemetryEventName,
    workspaceId: z.string().uuid().nullable().optional(),
    /** Optional sub-target id — quotation id, document id, action id. */
    targetId: z.string().max(120).nullable().optional(),
    /** Bag of small primitives — kept loose; nothing PII. */
    meta: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    /** Client wall-clock at emission. Server records its own occurredAt too. */
    clientAt: z.string().datetime(),
});
