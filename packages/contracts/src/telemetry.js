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
//# sourceMappingURL=telemetry.js.map