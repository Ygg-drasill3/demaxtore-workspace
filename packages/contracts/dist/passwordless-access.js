// =============================================================================
// Passwordless Workspace Access™ contracts
// =============================================================================
import { z } from "zod";
import { CommWorkspaceType } from "./workspace-communication.js";
import { UserDTO } from "./auth.js";
export const PasswordlessAccessTtl = z.enum([
    "FIFTEEN_MINUTES",
    "THIRTY_MINUTES",
    "ONE_HOUR",
    "TWENTY_FOUR_HOURS",
]);
export const CreatePasswordlessLinkInput = z.object({
    userId: z.string().uuid(),
    workspaceType: z.enum(CommWorkspaceType),
    workspaceId: z.string().uuid(),
    ttl: PasswordlessAccessTtl.default("THIRTY_MINUTES"),
    singleUse: z.boolean().default(true),
});
export const CreatePasswordlessLinkResponse = z.object({
    accessUrl: z.string().url(),
    expiresAt: z.string().datetime(),
    conversationId: z.string().uuid(),
    tokenId: z.string().uuid(),
});
export const ConsumePasswordlessAccessInput = z.object({
    token: z.string().min(20).max(4096),
});
export const PasswordlessScope = z.object({
    workspaceType: z.enum(CommWorkspaceType),
    workspaceId: z.string().uuid(),
    conversationId: z.string().uuid(),
});
export const ConsumePasswordlessAccessResponse = z.object({
    user: UserDTO,
    accessToken: z.string(),
    expiresInSec: z.number().int().positive(),
    accessMode: z.literal("passwordless"),
    scope: PasswordlessScope,
});
