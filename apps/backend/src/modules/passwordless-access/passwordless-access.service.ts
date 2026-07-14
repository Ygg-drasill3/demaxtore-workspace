import crypto from "node:crypto";
import type { CommWorkspaceType } from "@dmx/contracts/workspace-communication";
import type {
  ConsumePasswordlessAccessResponse,
  CreatePasswordlessLinkInput,
  CreatePasswordlessLinkResponse,
  PasswordlessAccessTtl,
} from "@dmx/contracts/passwordless-access";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { Forbidden, Validation } from "../../lib/errors.js";
import { hashToken, signPasswordlessSessionToken, newJti } from "../auth/jwt.js";
import { toUserDTO } from "../auth/auth.service.js";
import type { AuthUser } from "../../types/auth-user.js";
import {
  canAccessCommWorkspace,
  resolveWorkspace,
} from "../workspace-communication/communication.policy.js";
import { bootstrapWorkspaceConversation } from "../conversation-hub/conversation-bootstrap.js";
import {
  signPasswordlessAccessToken,
  ttlMinutesToExpiry,
  verifySignedPasswordlessToken,
} from "./passwordless-access.token.js";
import { logger } from "../../config/logger.js";
import { detectLinkScannerUserAgent } from "./passwordless-access.scanners.js";

export interface IssuePasswordlessLinkInternalInput extends CreatePasswordlessLinkInput {
  /** Binds token to an Email Notification Bridge delivery for supersession on retry. */
  emailDeliveryId?: string;
}

interface RequestMeta {
  ip?: string;
  userAgent?: string;
  secure?: boolean;
}

async function auditLog(input: {
  tokenId?: string;
  userId?: string;
  workspaceType: string;
  workspaceId: string;
  conversationId: string;
  success: boolean;
  failureReason?: string;
  ip?: string;
  userAgent?: string;
}) {
  await prisma.passwordlessAccessLog.create({
    data: {
      tokenId: input.tokenId ?? null,
      userId: input.userId ?? null,
      workspaceType: input.workspaceType,
      workspaceId: input.workspaceId,
      conversationId: input.conversationId,
      success: input.success,
      failureReason: input.failureReason ?? null,
      ipAddress: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
}

async function resolveConversationId(
  workspaceType: CommWorkspaceType,
  workspaceId: string,
): Promise<string> {
  await bootstrapWorkspaceConversation(prisma, workspaceType, workspaceId);
  const conv = await prisma.workspaceConversation.findUniqueOrThrow({
    where: { workspaceType_workspaceId: { workspaceType, workspaceId } },
    select: { id: true, status: true },
  });
  if (conv.status !== "ACTIVE") {
    throw Validation("Conversation is not available");
  }
  return conv.id;
}

async function assertParticipant(userId: string, auditWorkspaceId: string): Promise<void> {
  const row = await prisma.workspaceParticipant.findFirst({
    where: { workspaceId: auditWorkspaceId, userId, leftAt: null },
    select: { id: true },
  });
  if (!row) throw Forbidden("User is not a workspace participant");
}

async function assertWorkspaceActive(auditWorkspaceId: string): Promise<void> {
  const ws = await prisma.workspace.findUnique({
    where: { id: auditWorkspaceId },
    select: { trashedAt: true, state: true },
  });
  if (!ws) throw Validation("Workspace not found");
  if (ws.trashedAt) throw Forbidden("Workspace is archived");
}

export async function createPasswordlessLink(
  actor: AuthUser,
  input: CreatePasswordlessLinkInput,
): Promise<CreatePasswordlessLinkResponse> {
  const resolved = await resolveWorkspace(prisma, input.workspaceType, input.workspaceId);
  if (!resolved) throw Validation("Workspace not found");

  const canIssue = await canAccessCommWorkspace(prisma, actor, input.workspaceType, input.workspaceId);
  if (!canIssue) throw Forbidden("Cannot issue access link for this workspace");

  return issuePasswordlessLinkInternal(input);
}

function buildSignedUrlFromTokenRow(row: {
  jti: string;
  userId: string;
  workspaceType: string;
  workspaceId: string;
  conversationId: string;
  expiresAt: Date;
}): string {
  const exp = Math.floor(row.expiresAt.getTime() / 1000);
  const signed = signPasswordlessAccessToken({
    jti: row.jti,
    uid: row.userId,
    wt: row.workspaceType,
    wid: row.workspaceId,
    cid: row.conversationId,
    exp,
  });
  return buildPasswordlessAccessUrl(signed);
}

/** Revoke unconsumed delivery-bound tokens before issuing a replacement. */
export async function revokeSupersededDeliveryTokens(emailDeliveryId: string): Promise<void> {
  const now = new Date();
  await prisma.passwordlessAccessToken.updateMany({
    where: {
      emailDeliveryId,
      consumedAt: null,
      revokedAt: null,
    },
    data: { revokedAt: now },
  });
}

/** Re-sign an active delivery-bound token without creating a duplicate. */
export async function reuseDeliveryPasswordlessLink(
  tokenId: string,
): Promise<CreatePasswordlessLinkResponse | null> {
  const row = await prisma.passwordlessAccessToken.findUnique({ where: { id: tokenId } });
  if (!row || row.consumedAt || row.revokedAt || row.expiresAt < new Date()) return null;
  return {
    accessUrl: buildSignedUrlFromTokenRow(row),
    expiresAt: row.expiresAt.toISOString(),
    conversationId: row.conversationId,
    tokenId: row.id,
  };
}

/** Internal issuance for delivery bridges (WhatsApp, Email) — no actor, validates participant access. */
export async function issuePasswordlessLinkInternal(
  input: IssuePasswordlessLinkInternalInput,
): Promise<CreatePasswordlessLinkResponse> {
  const resolved = await resolveWorkspace(prisma, input.workspaceType, input.workspaceId);
  if (!resolved) throw Validation("Workspace not found");

  const targetUser = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!targetUser) throw Validation("Target user not found");

  const targetCanAccess = await canAccessCommWorkspace(
    prisma,
    { id: targetUser.id, email: targetUser.email, role: targetUser.role },
    input.workspaceType,
    input.workspaceId,
  );
  if (!targetCanAccess) throw Forbidden("Target user cannot access this workspace");

  await assertWorkspaceActive(resolved.auditWorkspaceId);
  await assertParticipant(targetUser.id, resolved.auditWorkspaceId);

  const conversationId = await resolveConversationId(input.workspaceType, input.workspaceId);
  const expiresAt = ttlMinutesToExpiry(input.ttl);
  const jti = newJti();
  const exp = Math.floor(expiresAt.getTime() / 1000);

  const signed = signPasswordlessAccessToken({
    jti,
    uid: targetUser.id,
    wt: input.workspaceType,
    wid: input.workspaceId,
    cid: conversationId,
    exp,
  });

  const row = await prisma.passwordlessAccessToken.create({
    data: {
      jti,
      tokenHash: hashToken(signed),
      userId: targetUser.id,
      workspaceType: input.workspaceType,
      workspaceId: input.workspaceId,
      conversationId,
      auditWorkspaceId: resolved.auditWorkspaceId,
      expiresAt,
      singleUse: input.singleUse,
      emailDeliveryId: input.emailDeliveryId ?? null,
    },
  });

  const accessUrl = `${env.APP_BASE_URL}/access/conversation?token=${encodeURIComponent(signed)}`;

  return {
    accessUrl,
    expiresAt: expiresAt.toISOString(),
    conversationId,
    tokenId: row.id,
  };
}

export async function consumePasswordlessAccess(
  rawToken: string,
  meta: RequestMeta,
): Promise<ConsumePasswordlessAccessResponse> {
  if (detectLinkScannerUserAgent(meta.userAgent)) {
    logger.warn(
      { userAgent: meta.userAgent?.slice(0, 200) },
      "[Passwordless] possible link-scanner user agent on consume",
    );
  }

  if (env.NODE_ENV === "production" && meta.secure === false) {
    throw Forbidden("HTTPS is required for passwordless access");
  }

  let payload;
  try {
    payload = verifySignedPasswordlessToken(rawToken);
  } catch (e) {
    const reason = e instanceof Error ? e.message : "INVALID_TOKEN";
    await auditLog({
      workspaceType: "UNKNOWN",
      workspaceId: "00000000-0000-0000-0000-000000000000",
      conversationId: "00000000-0000-0000-0000-000000000000",
      success: false,
      failureReason: reason,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw Validation("Invalid or expired access link");
  }

  const tokenHash = hashToken(rawToken);
  const row = await prisma.passwordlessAccessToken.findUnique({ where: { tokenHash } });

  const fail = async (reason: string) => {
    await auditLog({
      tokenId: row?.id,
      userId: payload.uid,
      workspaceType: payload.wt,
      workspaceId: payload.wid,
      conversationId: payload.cid,
      success: false,
      failureReason: reason,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    throw Validation("Invalid or expired access link");
  };

  if (!row || row.jti !== payload.jti) return fail("TOKEN_NOT_FOUND");
  if (row.revokedAt) return fail("TOKEN_REVOKED");
  if (row.expiresAt < new Date()) return fail("DB_EXPIRED");
  if (row.singleUse && row.consumedAt) return fail("ALREADY_CONSUMED");

  if (
    row.userId !== payload.uid
    || row.workspaceType !== payload.wt
    || row.workspaceId !== payload.wid
    || row.conversationId !== payload.cid
  ) {
    return fail("PAYLOAD_MISMATCH");
  }

  const user = await prisma.user.findUnique({
    where: { id: row.userId },
    include: { organisation: { select: { name: true } } },
  });
  if (!user) return fail("USER_NOT_FOUND");

  const authUser: AuthUser = { id: user.id, email: user.email, role: user.role };
  const workspaceType = row.workspaceType as CommWorkspaceType;
  const canAccess = await canAccessCommWorkspace(prisma, authUser, workspaceType, row.workspaceId);
  if (!canAccess) return fail("ACCESS_DENIED");

  await assertWorkspaceActive(row.auditWorkspaceId);
  await assertParticipant(user.id, row.auditWorkspaceId);

  const conv = await prisma.workspaceConversation.findUnique({
    where: { id: row.conversationId },
    select: { status: true, workspaceType: true, workspaceId: true },
  });
  if (!conv || conv.status !== "ACTIVE") return fail("CONVERSATION_INACTIVE");
  if (conv.workspaceType !== row.workspaceType || conv.workspaceId !== row.workspaceId) {
    return fail("CONVERSATION_MISMATCH");
  }

  const remainingSec = Math.max(
    60,
    Math.min(
      env.ACCESS_TOKEN_TTL_SEC,
      Math.floor((row.expiresAt.getTime() - Date.now()) / 1000),
    ),
  );

  await prisma.$transaction(async (tx) => {
    if (row.singleUse) {
      await tx.passwordlessAccessToken.update({
        where: { id: row.id },
        data: { consumedAt: new Date() },
      });
    }
    await tx.passwordlessAccessLog.create({
      data: {
        tokenId: row.id,
        userId: user.id,
        workspaceType: row.workspaceType,
        workspaceId: row.workspaceId,
        conversationId: row.conversationId,
        success: true,
        ipAddress: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  });

  const accessToken = signPasswordlessSessionToken(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      pwa: {
        workspaceType: row.workspaceType,
        workspaceId: row.workspaceId,
        conversationId: row.conversationId,
        tokenJti: row.jti,
      },
    },
    remainingSec,
  );

  return {
    user: toUserDTO(user),
    accessToken,
    expiresInSec: remainingSec,
    accessMode: "passwordless",
    scope: {
      workspaceType,
      workspaceId: row.workspaceId,
      conversationId: row.conversationId,
    },
  };
}

export function buildPasswordlessAccessUrl(rawToken: string): string {
  return `${env.APP_BASE_URL}/access/conversation?token=${encodeURIComponent(rawToken)}`;
}
