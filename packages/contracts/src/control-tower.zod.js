import { z } from "zod";
import { AlertCategory, AlertSeverity } from "./control-tower";
export const ListAlertsQuery = z.object({
    severity: z.enum(AlertSeverity).optional(),
    category: z.enum(AlertCategory).optional(),
    workspaceId: z.string().uuid().optional(),
    alertKey: z.string().min(1).max(128).optional(),
    resolved: z.enum(["true", "false"]).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    offset: z.coerce.number().int().min(0).default(0),
});
export const ResolveAlertBody = z.object({
    note: z.string().max(2000).optional(),
});
//# sourceMappingURL=control-tower.zod.js.map