import type { Prisma, PrismaClient } from "@prisma/client";
import type { MarginPolicy, MarginPolicySuggestion } from "@dmx/contracts/freight-analytics";
import {
  CreateMarginPolicyPayload,
  UpdateMarginPolicyPayload,
} from "@dmx/contracts/freight-analytics.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../../realtime/socket-bus.js";
import { AppError } from "../../../utils/httpErrors.js";
import type { AuthUser } from "../freightiq.policy.js";
import { resolveFreightRoute } from "./freight-route.util.js";

function mapPolicy(row: {
  id: string;
  name: string;
  routePattern: string | null;
  countryFrom: string | null;
  countryTo: string | null;
  defaultMarginUsd: Prisma.Decimal;
  minMarginUsd: Prisma.Decimal;
  maxMarginUsd: Prisma.Decimal;
  isActive: boolean;
  createdAt: Date;
}): MarginPolicy {
  return {
    id: row.id,
    name: row.name,
    routePattern: row.routePattern,
    countryFrom: row.countryFrom,
    countryTo: row.countryTo,
    defaultMarginUsd: Number(row.defaultMarginUsd),
    minMarginUsd: Number(row.minMarginUsd),
    maxMarginUsd: Number(row.maxMarginUsd),
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
  };
}

export class FreightMarginPolicyService {
  constructor(private readonly db: PrismaClient) {}

  private async opsAuditWorkspace(): Promise<{ id: string; state: string }> {
    const ws = await this.db.workspace.findFirst({
      where: { type: "ORDER" },
      orderBy: { createdAt: "asc" },
      select: { id: true, state: true },
    });
    if (!ws) throw new AppError(500, "NO_AUDIT_WORKSPACE");
    return ws;
  }

  async listPolicies(): Promise<MarginPolicy[]> {
    const rows = await this.db.freightMarginPolicy.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(mapPolicy);
  }

  async createPolicy(actor: AuthUser, raw: Record<string, unknown>, ctx?: { ip?: string; userAgent?: string }) {
    const input = CreateMarginPolicyPayload.parse(raw);
    const anchor = await this.opsAuditWorkspace();
    const row = await this.db.$transaction(async (tx) => {
      const created = await tx.freightMarginPolicy.create({
        data: {
          name: input.name,
          routePattern: input.routePattern ?? null,
          countryFrom: input.countryFrom ?? null,
          countryTo: input.countryTo ?? null,
          defaultMarginUsd: input.defaultMarginUsd,
          minMarginUsd: input.minMarginUsd,
          maxMarginUsd: input.maxMarginUsd,
          isActive: input.isActive,
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: anchor.id,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: "margin_policy.created",
          fromState: anchor.state,
          toState: anchor.state,
          payload: { policyId: created.id, name: input.name } as Prisma.InputJsonValue,
          ipAddress: ctx?.ip,
          userAgent: ctx?.userAgent,
        },
      });
      return created;
    });
    socketBus.scheduleEmit(() => {
      socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_COMMERCIAL_METRIC_UPDATED, { kind: "policy" });
    });
    return mapPolicy(row);
  }

  async updatePolicy(
    policyId: string,
    actor: AuthUser,
    raw: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const input = UpdateMarginPolicyPayload.parse(raw);
    const existing = await this.db.freightMarginPolicy.findUnique({ where: { id: policyId } });
    if (!existing) throw new AppError(404, "POLICY_NOT_FOUND");
    const anchor = await this.opsAuditWorkspace();
    const row = await this.db.$transaction(async (tx) => {
      const updated = await tx.freightMarginPolicy.update({
        where: { id: policyId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.routePattern !== undefined ? { routePattern: input.routePattern } : {}),
          ...(input.countryFrom !== undefined ? { countryFrom: input.countryFrom } : {}),
          ...(input.countryTo !== undefined ? { countryTo: input.countryTo } : {}),
          ...(input.defaultMarginUsd !== undefined ? { defaultMarginUsd: input.defaultMarginUsd } : {}),
          ...(input.minMarginUsd !== undefined ? { minMarginUsd: input.minMarginUsd } : {}),
          ...(input.maxMarginUsd !== undefined ? { maxMarginUsd: input.maxMarginUsd } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          workspaceId: anchor.id,
          actorUserId: actor.id,
          actorEmail: actor.email,
          actorRole: actor.role,
          action: "margin_policy.updated",
          fromState: anchor.state,
          toState: anchor.state,
          payload: { policyId, changes: input } as Prisma.InputJsonValue,
          ipAddress: ctx?.ip,
          userAgent: ctx?.userAgent,
        },
      });
      return updated;
    });
    socketBus.scheduleEmit(() => {
      socketBus.emitToRole("ADMIN", SocketEvents.FREIGHT_COMMERCIAL_METRIC_UPDATED, { kind: "policy" });
    });
    return mapPolicy(row);
  }

  async suggestMargin(pol: string, pod: string): Promise<MarginPolicySuggestion> {
    const resolved = resolveFreightRoute(pol, pod);
    const policies = await this.db.freightMarginPolicy.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    let match: (typeof policies)[number] | null = null;
    for (const p of policies) {
      if (p.routePattern && p.routePattern === resolved.lane) {
        match = p;
        break;
      }
    }
    if (!match) {
      for (const p of policies) {
        if (
          p.countryFrom &&
          p.countryTo &&
          p.countryFrom === resolved.countryFrom &&
          p.countryTo === resolved.countryTo
        ) {
          match = p;
          break;
        }
      }
    }

    const defaultUsd = match ? Number(match.defaultMarginUsd) : 0;
    const minUsd = match ? Number(match.minMarginUsd) : 0;
    const maxUsd = match ? Number(match.maxMarginUsd) : 10_000;

    return {
      pol: resolved.pol,
      pod: resolved.pod,
      lane: resolved.lane,
      route: resolved.route,
      countryFrom: resolved.countryFrom,
      countryTo: resolved.countryTo,
      suggestedMarginUsd: defaultUsd,
      minMarginUsd: minUsd,
      maxMarginUsd: maxUsd,
      policyId: match?.id ?? null,
      policyName: match?.name ?? null,
    };
  }

  async recordMarginOverride(
    tx: Prisma.TransactionClient,
    params: {
      orderId: string;
      actor: AuthUser;
      offerId: string;
      suggestedUsd: number;
      appliedUsd: number;
      policyName: string | null;
    },
    ctx?: { ip?: string; userAgent?: string },
  ) {
    if (params.appliedUsd === params.suggestedUsd) return;
    const ws = await tx.workspace.findUnique({ where: { id: params.orderId }, select: { state: true } });
    await tx.auditLog.create({
      data: {
        workspaceId: params.orderId,
        actorUserId: params.actor.id,
        actorEmail: params.actor.email,
        actorRole: params.actor.role,
        action: "margin_override.used",
        fromState: ws?.state ?? undefined,
        toState: ws?.state ?? "UNKNOWN",
        payload: {
          offerId: params.offerId,
          suggestedMarginUsd: params.suggestedUsd,
          appliedMarginUsd: params.appliedUsd,
          policyName: params.policyName,
        } as Prisma.InputJsonValue,
        ipAddress: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
  }
}
