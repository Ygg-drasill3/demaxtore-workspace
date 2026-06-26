import jwt from "jsonwebtoken";
import cors from "cors";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { ConversationLinkService } from "../chat/conversation-link.service.js";
import type { RequestHandler } from "express";

const BRIDGE_SECRET = env.WORKSPACE_BRIDGE_SECRET ?? "";
const PANEL_BASE = env.FREIGHTIQ_PANEL_URL.replace(/\/$/, "");
const BRIDGE_ISSUER = "workspace.demaxtore.com";
const BRIDGE_AUDIENCE = "freightiq.demaxtore.com";

export type WorkspaceRfqEmbedItem = {
  workspaceRfqId: string;
  externalRef: string;
  title: string;
  state: string;
  originPort: string;
  destinationPort: string;
  cargoType: string;
  freightIqRfqId: string | null;
};

export async function listWorkspaceRfqsForEmbed(
  actorUserId: string,
  role: string,
): Promise<WorkspaceRfqEmbedItem[]> {
  const rows = await prisma.workspace.findMany({
    where: {
      type: "RFQ",
      trashedAt: null,
      state: { not: "RFQ_DRAFT" },
      ...(role === "BUYER" ? { createdById: actorUserId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      rfqDetails: { select: { title: true, productCategory: true } },
    },
  });

  const orderByRfq = new Map<string, { originPort: string; destinationPort: string }>();
  const rfqIds = rows.map((r) => r.id);
  const linkByRfq = new Map<string, string>();
  if (rfqIds.length) {
    const links = await prisma.directConversation.findMany({
      where: { workspaceRfqId: { in: rfqIds }, freightIqRfqId: { not: null } },
      select: { workspaceRfqId: true, freightIqRfqId: true },
    });
    for (const l of links) {
      if (l.workspaceRfqId && l.freightIqRfqId && !linkByRfq.has(l.workspaceRfqId)) {
        linkByRfq.set(l.workspaceRfqId, l.freightIqRfqId);
      }
    }

    const orders = await prisma.workspace.findMany({
      where: { spawnedFromId: { in: rfqIds }, type: "ORDER" },
      include: { orderWorkspace: { select: { originPort: true, destinationPort: true } } },
      orderBy: { createdAt: "asc" },
    });
    for (const o of orders) {
      if (!o.spawnedFromId || !o.orderWorkspace || orderByRfq.has(o.spawnedFromId)) continue;
      orderByRfq.set(o.spawnedFromId, {
        originPort: o.orderWorkspace.originPort,
        destinationPort: o.orderWorkspace.destinationPort,
      });
    }
  }

  return rows
    .filter((r) => r.externalRef)
    .map((r) => {
      const ports = orderByRfq.get(r.id);
      return {
        workspaceRfqId: r.id,
        externalRef: r.externalRef!,
        title: r.rfqDetails?.title ?? r.externalRef!,
        state: r.state,
        originPort: ports?.originPort ?? "CNSHA",
        destinationPort: ports?.destinationPort ?? "NLRTM",
        cargoType: r.rfqDetails?.productCategory ?? "General Cargo",
        freightIqRfqId: linkByRfq.get(r.id) ?? null,
      };
    });
}

export function signFreightiqEmbedListToken(userId: string, role: string): string {
  if (!BRIDGE_SECRET) return "";
  return jwt.sign(
    { sub: userId, role, purpose: "freightiq-rfq-list" },
    BRIDGE_SECRET,
    {
      algorithm: "HS256",
      expiresIn: "300s",
      issuer: BRIDGE_ISSUER,
      audience: BRIDGE_AUDIENCE,
    },
  );
}

export function verifyFreightiqEmbedListToken(token: string): { sub: string; role: string } {
  if (!BRIDGE_SECRET) throw new Error("not configured");
  const payload = jwt.verify(token, BRIDGE_SECRET, {
    algorithms: ["HS256"],
    issuer: BRIDGE_ISSUER,
    audience: BRIDGE_AUDIENCE,
  }) as jwt.JwtPayload;
  if (payload.purpose !== "freightiq-rfq-list" || typeof payload.sub !== "string") {
    throw new Error("invalid token purpose");
  }
  return { sub: payload.sub, role: String(payload.role ?? "ADMIN") };
}

export const embedCors = cors({
  origin: PANEL_BASE,
  methods: ["GET", "POST"],
  allowedHeaders: ["Authorization", "Content-Type"],
});

export function readEmbedToken(req: { headers: { authorization?: string }; query: Record<string, unknown> }): string {
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  const queryToken = typeof req.query.ws_t === "string" ? req.query.ws_t : "";
  return header || queryToken;
}

/** FreightIQ iframe — fetch workspace RFQ list with short-lived bridge token (ws_t). */
export const freightiqWorkspaceRfqs: RequestHandler[] = [
  embedCors,
  asyncHandler(async (req, res) => {
    const token = readEmbedToken(req);
    if (!token) {
      res.status(401).json({ message: "Missing ws_t token" });
      return;
    }
    let actor: { sub: string; role: string };
    try {
      actor = verifyFreightiqEmbedListToken(token);
    } catch {
      res.status(401).json({ message: "Invalid or expired ws_t token" });
      return;
    }
    const rfqs = await listWorkspaceRfqsForEmbed(actor.sub, actor.role);
    res.json(rfqs);
  }),
];

/** Persist workspaceRfqId ↔ freightIqRfqId after FreightIQ sync/offer from embed. */
export const freightiqWorkspaceRfqLink: RequestHandler[] = [
  embedCors,
  asyncHandler(async (req, res) => {
    const token = readEmbedToken(req);
    if (!token) {
      res.status(401).json({ message: "Missing ws_t token" });
      return;
    }
    let actor: { sub: string; role: string };
    try {
      actor = verifyFreightiqEmbedListToken(token);
    } catch {
      res.status(401).json({ message: "Invalid or expired ws_t token" });
      return;
    }
    const workspaceRfqId = typeof req.body?.workspaceRfqId === "string" ? req.body.workspaceRfqId : "";
    const freightIqRfqId = typeof req.body?.freightIqRfqId === "string" ? req.body.freightIqRfqId : "";
    if (!workspaceRfqId || !freightIqRfqId) {
      res.status(400).json({ message: "workspaceRfqId and freightIqRfqId required" });
      return;
    }
    const ws = await prisma.workspace.findFirst({
      where: {
        id: workspaceRfqId,
        type: "RFQ",
        ...(actor.role === "BUYER" ? { createdById: actor.sub } : {}),
      },
      select: { id: true },
    });
    if (!ws) {
      res.status(404).json({ message: "Workspace RFQ not found" });
      return;
    }
    const link = new ConversationLinkService(prisma);
    await link.linkFreightIqRfqId(workspaceRfqId, freightIqRfqId);
    res.json({ workspaceRfqId, freightIqRfqId, linked: true });
  }),
];
