import { api } from "@/lib/api";
import type { WorkspaceInbox } from "@dmx/contracts/workspace-inbox";
import type { InboxFilter } from "@dmx/contracts/workspace-inbox";

export const workspaceInboxApi = {
  get: (params?: { q?: string; filter?: InboxFilter; limit?: number; offset?: number }) =>
    api.get<WorkspaceInbox>("/workspace-inbox", { params }).then((r) => r.data),
};
