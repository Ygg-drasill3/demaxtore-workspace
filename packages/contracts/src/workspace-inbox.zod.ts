import { z } from "zod";
import { InboxFilter } from "./workspace-inbox.js";

export const WorkspaceInboxQuerySchema = z.object({
  q: z.string().optional(),
  filter: z.enum(InboxFilter).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

export type WorkspaceInboxQueryInput = z.infer<typeof WorkspaceInboxQuerySchema>;
