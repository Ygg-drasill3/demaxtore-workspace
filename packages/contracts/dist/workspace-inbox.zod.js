import { z } from "zod";
import { InboxFilter } from "./workspace-inbox.js";
export const WorkspaceInboxQuerySchema = z.object({
    q: z.string().optional(),
    // Casting to `[string, ...string[]]` collapsed the inferred type to plain `string` for
    // every consumer of WorkspaceInboxQueryInput, not just one service.
    filter: z.enum(InboxFilter).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
});
