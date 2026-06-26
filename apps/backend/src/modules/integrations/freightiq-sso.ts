import jwt from "jsonwebtoken";
import { requireAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";
import { fetchWithTimeout } from "../../lib/fetch-with-timeout.js";
import {
  listWorkspaceRfqsForEmbed,
  signFreightiqEmbedListToken,
} from "./freightiq-workspace-rfqs.js";
import { ConversationLinkService } from "../chat/conversation-link.service.js";
import type { RequestHandler } from "express";

const BRIDGE_TIMEOUT_MS = 8000;

const BRIDGE_SECRET = env.WORKSPACE_BRIDGE_SECRET ?? "";
const PANEL_BASE = env.FREIGHTIQ_PANEL_URL.replace(/\/$/, "");
const API_BASE = env.FREIGHTIQ_API_URL.replace(/\/$/, "");

function buildPanelEmbedUrl(
  next: string,
  token: string,
  opts: { embed: string | null; compact: string | null; wsListToken?: string },
): string {
  const qIdx = next.indexOf("?");
  const path = qIdx >= 0 ? next.slice(0, qIdx) : next;
  const destParams = new URLSearchParams(qIdx >= 0 ? next.slice(qIdx + 1) : "");
  if (opts.embed) destParams.set("embed", opts.embed);
  if (opts.compact) destParams.set("compact", opts.compact);
  // Query param — cross-origin iframe src often drops URL hash fragments.
  destParams.set("fi_t", token);
  if (opts.wsListToken) destParams.set("ws_t", opts.wsListToken);
  const qs = destParams.toString();
  return `${PANEL_BASE}${path}?${qs}`;
}

const DEFAULT_NEXT_BY_ROLE: Record<string, string> = {
  BUYER: "/dashboard",
  SUPPLIER: "/dashboard",
  ADMIN: "/admin",
};

function sanitizeNext(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw.replace(/\/$/, "") || null;
}

function rewriteNextForSyncedRfq(next: string, freightiqRfqId: string): string {
  const qIdx = next.indexOf("?");
  const path = qIdx >= 0 ? next.slice(0, qIdx) : next;
  const params = new URLSearchParams(qIdx >= 0 ? next.slice(qIdx + 1) : "");
  if (path.startsWith("/messages") || params.has("rfqId")) {
    params.set("rfqId", freightiqRfqId);
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  }
  if (path === "/admin" || path.startsWith("/admin/") || path === "/rfqs" || path.startsWith("/rfqs/")) {
    return `/rfqs/${freightiqRfqId}`;
  }
  return next;
}

function workspaceRfqAccessWhere(workspaceRfqId: string, actorUserId: string, role: string) {
  return {
    id: workspaceRfqId,
    type: "RFQ" as const,
    ...(role === "BUYER" ? { createdById: actorUserId } : {}),
  };
}

async function syncWorkspaceRfqToFreightIq(
  freightToken: string,
  workspaceRfqId: string,
  actorUserId: string,
  actorRole: string,
): Promise<string | null> {
  const ws = await prisma.workspace.findFirst({
    where: workspaceRfqAccessWhere(workspaceRfqId, actorUserId, actorRole),
    include: { rfqDetails: { select: { title: true, productCategory: true, targetMarket: true } } },
  });
  if (!ws?.externalRef) return null;

  const spawnedOrder = await prisma.workspace.findFirst({
    where: { spawnedFromId: workspaceRfqId, type: "ORDER" },
    include: { orderWorkspace: { select: { originPort: true, destinationPort: true } } },
  });

  try {
    const res = await fetch(`${API_BASE}/workspace/rfqs/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freightToken}`,
      },
      body: JSON.stringify({
        workspaceRfqId,
        workspaceExternalRef: ws.externalRef,
        title: ws.rfqDetails?.title ?? ws.externalRef,
        originPort: spawnedOrder?.orderWorkspace?.originPort ?? "CNSHA",
        destinationPort: spawnedOrder?.orderWorkspace?.destinationPort ?? "NLRTM",
        cargoType: ws.rfqDetails?.productCategory ?? "General Cargo",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn(
        { workspaceRfqId, status: res.status, body: body.slice(0, 500), apiBase: API_BASE },
        "FreightIQ workspace RFQ sync failed",
      );
      return null;
    }
    const data = (await res.json()) as { rfqId?: string };
    const freightIqRfqId = data.rfqId ?? null;
    if (freightIqRfqId) {
      const link = new ConversationLinkService(prisma);
      await link.linkFreightIqRfqId(workspaceRfqId, freightIqRfqId);
    }
    return freightIqRfqId;
  } catch (err) {
    logger.warn({ err, workspaceRfqId, apiBase: API_BASE }, "FreightIQ workspace RFQ sync request failed");
    return null;
  }
}

async function syncWorkspaceOrderToFreightIq(
  freightToken: string,
  orderWorkspaceId: string,
  actorUserId: string,
  actorRole: string,
): Promise<void> {
  const ws = await prisma.workspace.findFirst({
    where: {
      id: orderWorkspaceId,
      type: "ORDER",
      ...(actorRole === "BUYER" ? { createdById: actorUserId } : {}),
    },
    include: {
      orderWorkspace: { select: { originPort: true, destinationPort: true } },
    },
  });
  if (!ws?.orderWorkspace) return;

  const shipments = await prisma.workspace.findMany({
    where: { spawnedFromId: orderWorkspaceId, type: "SHIPMENT" },
    select: { externalRef: true, state: true },
    orderBy: { createdAt: "asc" },
  });

  try {
    const res = await fetch(`${API_BASE}/workspace/orders/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${freightToken}`,
      },
      body: JSON.stringify({
        workspaceOrderId: orderWorkspaceId,
        orderExternalRef: ws.externalRef,
        originPort: ws.orderWorkspace.originPort,
        destinationPort: ws.orderWorkspace.destinationPort,
        shipments: shipments.map((s) => ({ externalRef: s.externalRef, state: s.state })),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn(
        { orderWorkspaceId, status: res.status, body: body.slice(0, 500), apiBase: API_BASE },
        "FreightIQ workspace order sync failed",
      );
    }
  } catch (err) {
    logger.warn(
      { err, orderWorkspaceId, apiBase: API_BASE },
      "FreightIQ workspace order sync request failed",
    );
  }
}

/** Workspace oturumu → FreightIQ iframe SSO token */
export const freightiqSso: RequestHandler[] = [
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!BRIDGE_SECRET) {
      res.status(503).json({ message: "FreightIQ SSO not configured" });
      return;
    }

    const authUser = req.user!;
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { email: true, role: true, displayName: true },
    });
    if (!dbUser) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const sso = jwt.sign(
      {
        email: dbUser.email,
        role: dbUser.role,
        name: dbUser.displayName,
        sub: authUser.id,
      },
      BRIDGE_SECRET,
      {
        algorithm: "HS256",
        expiresIn: "300s",
        issuer: "workspace.demaxtore.com",
        audience: "freightiq.demaxtore.com",
      },
    );

    const next =
      sanitizeNext(req.query.next) ??
      sanitizeNext(req.query.redirect) ??
      DEFAULT_NEXT_BY_ROLE[dbUser.role] ??
      "/dashboard";
    const embed = req.query.embed === "workspace" ? "workspace" : null;
    const compact = req.query.compact === "1" ? "1" : null;
    const bridgeParams = new URLSearchParams({ sso, next });
    if (embed) bridgeParams.set("embed", embed);
    if (compact) bridgeParams.set("compact", compact);

    const orderId = typeof req.query.orderId === "string" ? req.query.orderId : null;
    const workspaceRfqId = typeof req.query.workspaceRfqId === "string" ? req.query.workspaceRfqId : null;
    const bridgeUrl = `${PANEL_BASE}/auth/bridge?${bridgeParams.toString()}`;

    let workspaceRfqs =
      embed === "workspace" ? await listWorkspaceRfqsForEmbed(authUser.id, dbUser.role) : [];
    const wsListToken =
      embed === "workspace" ? signFreightiqEmbedListToken(authUser.id, dbUser.role) : "";

    // Exchange SSO server-side so the iframe loads the panel directly (#fi_t=…) instead of
    // hanging on the client-side /auth/bridge hop inside a third-party iframe context.
    let embedUrl: string | null = null;
    try {
      const bridgeRes = await fetchWithTimeout(`${API_BASE}/auth/bridge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sso }),
        timeoutMs: BRIDGE_TIMEOUT_MS,
      });
      if (bridgeRes.ok) {
        const bridged = (await bridgeRes.json()) as { token?: string };
        if (bridged.token) {
          let resolvedNext = next;
          if (orderId) {
            await syncWorkspaceOrderToFreightIq(bridged.token, orderId, authUser.id, dbUser.role);
          }
          if (workspaceRfqId) {
            const fiRfqId = await syncWorkspaceRfqToFreightIq(
              bridged.token,
              workspaceRfqId,
              authUser.id,
              dbUser.role,
            );
            if (fiRfqId) resolvedNext = rewriteNextForSyncedRfq(next, fiRfqId);
          }
          if (embed === "workspace" && (workspaceRfqId || orderId)) {
            workspaceRfqs = await listWorkspaceRfqsForEmbed(authUser.id, dbUser.role);
          }
          embedUrl = buildPanelEmbedUrl(resolvedNext, bridged.token, {
            embed,
            compact,
            wsListToken,
          });
        }
      } else {
        logger.warn(
          { status: bridgeRes.status, apiBase: API_BASE },
          "FreightIQ auth bridge returned non-OK status",
        );
      }
    } catch (err) {
      logger.warn({ err, apiBase: API_BASE }, "FreightIQ auth bridge request failed or timed out");
    }

    res.json({
      sso,
      next,
      bridgeUrl,
      embedUrl,
      workspaceRfqs,
    });
  }),
];
