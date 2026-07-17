import type { Prisma, PrismaClient } from "@prisma/client";
import type { FreightSummary } from "@dmx/contracts/freightiq";
import type {
  FreightRequestCommunication,
  FreightRequestEmailTemplate,
} from "@dmx/contracts/freight-communications";
import {
  SendFreightCommunicationsPayload,
  IntakeFreightOfferPayload,
  MarkCommunicationRespondedPayload,
} from "@dmx/contracts/freight-communications.zod";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import { buildFreightRequestEmailTemplate } from "./freight-email-template.js";
import { FreightIqService } from "./freightiq.service.js";
import { FreightCommercialService } from "./commercial/freight-commercial.service.js";
import { FreightMarginPolicyService } from "./commercial/freight-margin-policy.service.js";
import type { AuthUser } from "./freightiq.policy.js";
import { canAccessFreightForOrder } from "./freightiq.policy.js";
import { getMessagingWriteBridge } from "../unified-messaging/messaging-write.bridge.js";
import { registerWiredSurface } from "../unified-messaging/messaging-write.registry.js";

const TERMINAL = ["CANCELLED", "EXPIRED", "CONVERTED_TO_SHIPMENT"] as const;

export class FreightCommunicationsService {
  private readonly freightIq: FreightIqService;
  private readonly commercial: FreightCommercialService;
  private readonly marginPolicies: FreightMarginPolicyService;

  constructor(private readonly db: PrismaClient) {
    this.freightIq = new FreightIqService(db);
    this.commercial = new FreightCommercialService(db);
    this.marginPolicies = new FreightMarginPolicyService(db);
  }

  async enrichSummary(orderId: string, base: FreightSummary, actor: AuthUser): Promise<FreightSummary> {
    if (!base.request) return { ...base, communications: [], emailTemplate: null };

    const comms = await this.db.freightRequestCommunication.findMany({
      where: { freightRequestId: base.request.id },
      include: { forwarderContact: true },
      orderBy: { createdAt: "desc" },
    });

    const ow = await this.db.orderWorkspace.findUnique({
      where: { workspaceId: orderId },
      select: { incoterms: true },
    });

    const emailTemplate = buildFreightRequestEmailTemplate({
      pol: base.request.pol,
      pod: base.request.pod,
      commodity: base.request.cargoDescription,
      containerType: base.request.containerType,
      readyDate: base.request.readyDate,
      incoterm: ow?.incoterms ?? null,
      requestedReplyDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
    });

    const dbOffers = await this.db.freightOffer.findMany({
      where: { freightRequestId: base.request.id },
      include: { forwarderContact: true },
      orderBy: { price: "asc" },
    });
    const display = dbOffers.filter((o) =>
      o.status === "ACTIVE" || o.status === "REVISED" || o.status === "SELECTED",
    );
    const comparable = dbOffers.filter((o) => o.status === "ACTIVE" || o.status === "REVISED");
    const offers = display.map((o) => this.commercial.mapDbOfferForRole(o, actor));
    const baseHints = base.comparisonHints;
    const ext = extendedComparisonHints(offers);
    const hints = {
      lowestPriceOfferId: baseHints.lowestPriceOfferId,
      fastestTransitOfferId: baseHints.fastestTransitOfferId,
      expiringSoonOfferIds: (ext.expiringSoonOfferIds?.length
        ? ext.expiringSoonOfferIds
        : baseHints.expiringSoonOfferIds) ?? [],
      earliestEtdOfferId: ext.earliestEtdOfferId,
      closestCutOffOfferId: ext.closestCutOffOfferId,
    };

    const merged: FreightSummary = {
      ...base,
      offers,
      communications: comms.map(mapCommunication),
      emailTemplate,
      comparisonHints: { ...base.comparisonHints, ...hints },
    };
    merged.commercialSummary = await this.commercial.buildCommercialSummary(orderId, merged);
    if (actor.role === "ADMIN" && merged.request) {
      merged.marginIntakeHint = await this.marginPolicies.suggestMargin(
        merged.request.pol,
        merged.request.pod,
      );
    }
    return this.commercial.applyRoleToSummary(merged, actor);
  }

  async sendCommunications(
    orderId: string,
    actor: AuthUser,
    raw: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<FreightSummary> {
    registerWiredSurface("freightiq_message_send");
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessFreightForOrder(this.db, actor, orderId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const input = SendFreightCommunicationsPayload.parse(raw);
    const fr = await this.requireOpenRequest(orderId);
    const forwarders = await this.db.forwarderContact.findMany({
      where: { id: { in: input.forwarderContactIds }, active: true },
    });
    if (forwarders.length !== input.forwarderContactIds.length) {
      throw new AppError(404, "FORWARDER_NOT_FOUND");
    }

    const ow = await this.db.orderWorkspace.findUnique({
      where: { workspaceId: orderId },
      select: { incoterms: true },
    });
    const template = buildFreightRequestEmailTemplate({
      pol: fr.pol,
      pod: fr.pod,
      commodity: fr.cargoDescription,
      containerType: fr.containerType,
      readyDate: fr.readyDate?.toISOString() ?? null,
      incoterm: input.incoterm ?? ow?.incoterms ?? null,
      requestedReplyDate: input.requestedReplyDate,
    });

    const now = new Date();
    const ids: string[] = [];

    await this.db.$transaction(async (tx) => {
      for (const f of forwarders) {
        const comm = await tx.freightRequestCommunication.create({
          data: {
            freightRequestId: fr.id,
            forwarderContactId: f.id,
            status: "SENT",
            channel: input.channel,
            sentAt: now,
            notes: `To: ${f.email}\nSubject: ${template.subject}\n\n${template.body}`,
          },
        });
        ids.push(comm.id);
        await this.recordAudit(tx, orderId, actor, "freight.communication.created", {
          communicationId: comm.id,
          forwarderId: f.id,
        }, ctx);
      }
      await tx.freightRequest.update({
        where: { id: fr.id },
        data: { status: fr.status === "REQUESTED" ? "QUOTING" : fr.status },
      });
      await this.recordAudit(tx, orderId, actor, "freight.communication.sent", {
        communicationIds: ids,
        channel: input.channel,
        template,
      }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.communication.sent", {
        communicationIds: ids,
      });
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_COMMUNICATION_SENT, {
        orderId,
        requestId: fr.id,
        communicationIds: ids,
      });
    });

    void getMessagingWriteBridge(this.db)
      .onConversationUpdated({ conversationId: orderId, reason: "freightiq_communication_sent" })
      .catch(() => undefined);

    return this.enrichSummary(orderId, await this.freightIq.getSummary(orderId), actor);
  }

  async intakeOffer(
    orderId: string,
    actor: AuthUser,
    raw: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<FreightSummary> {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
    if (!(await canAccessFreightForOrder(this.db, actor, orderId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    const input = IntakeFreightOfferPayload.parse(raw);
    const fr = await this.requireOpenRequest(orderId);
    const marginSuggestion = await this.marginPolicies.suggestMargin(fr.pol, fr.pod);
    const appliedMargin =
      input.freightiqMarginUsd ??
      (marginSuggestion.suggestedMarginUsd > 0 ? marginSuggestion.suggestedMarginUsd : 0);
    const commercialFields = this.commercial.resolveIntakeCommercial({
      internalCostUsd: input.internalCostUsd,
      oceanFreight: input.oceanFreight,
      freightiqMarginUsd: appliedMargin,
    });
    const forwarder = await this.db.forwarderContact.findUnique({
      where: { id: input.forwarderContactId },
    });
    if (!forwarder || !forwarder.active) throw new AppError(404, "FORWARDER_NOT_FOUND");

    if (new Date(input.validUntil) <= new Date()) {
      throw new AppError(400, "VALIDITY_REQUIRED");
    }

    let offerId = "";

    await this.db.$transaction(async (tx) => {
      const offer = await tx.freightOffer.create({
        data: {
          freightRequestId: fr.id,
          providerName: forwarder.companyName,
          carrierName: input.carrierName,
          price: commercialFields.displayPriceUsd,
          internalCostUsd: commercialFields.internalCostUsd,
          freightiqMarginUsd: commercialFields.freightiqMarginUsd,
          displayPriceUsd: commercialFields.displayPriceUsd,
          currency: input.currency,
          transitDays: input.transitDays,
          validUntil: new Date(input.validUntil),
          remarks: input.remarks,
          status: "ACTIVE",
          forwarderContactId: forwarder.id,
          offerSource: input.offerSource,
          vesselName: input.vesselName,
          etd: new Date(input.etd),
          eta: new Date(input.eta),
          cutOff: new Date(input.cutOff),
          communicationId: input.communicationId,
        },
      });
      offerId = offer.id;

      if (input.communicationId) {
        await tx.freightRequestCommunication.update({
          where: { id: input.communicationId },
          data: { status: "RESPONDED", respondedAt: new Date() },
        });
      }

      const activeCount = await tx.freightOffer.count({
        where: {
          freightRequestId: fr.id,
          status: { in: ["ACTIVE", "REVISED"] },
        },
      });
      await tx.freightRequest.update({
        where: { id: fr.id },
        data: { status: activeCount > 0 ? "QUOTED" : fr.status },
      });

      await this.marginPolicies.recordMarginOverride(
        tx,
        {
          orderId,
          actor,
          offerId,
          suggestedUsd: marginSuggestion.suggestedMarginUsd,
          appliedUsd: commercialFields.freightiqMarginUsd,
          policyName: marginSuggestion.policyName,
        },
        ctx,
      );
      await this.recordAudit(tx, orderId, actor, "freight.margin.set", {
        offerId,
        internalCostUsd: commercialFields.internalCostUsd,
        freightiqMarginUsd: commercialFields.freightiqMarginUsd,
        displayPriceUsd: commercialFields.displayPriceUsd,
        suggestedMarginUsd: marginSuggestion.suggestedMarginUsd,
      }, ctx);
      await this.recordAudit(tx, orderId, actor, "freight.offer.intake.created", {
        offerId,
        offerSource: input.offerSource,
        forwarderContactId: forwarder.id,
      }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.offer.intake.created", { offerId });
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_INTAKE_CREATED, {
        orderId,
        offerId,
      });
      socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_SUBMITTED, {
        orderId,
        requestId: fr.id,
        offerId,
      });
    });

    return this.enrichSummary(orderId, await this.freightIq.getSummary(orderId), actor);
  }

  async markCommunicationResponded(
    orderId: string,
    actor: AuthUser,
    raw: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<FreightSummary> {
    if (actor.role !== "ADMIN") throw new AppError(403, "FORBIDDEN_ROLE");
    const input = MarkCommunicationRespondedPayload.parse(raw);
    const fr = await this.requireOpenRequest(orderId);
    const comm = await this.db.freightRequestCommunication.findUnique({
      where: { id: input.communicationId },
    });
    if (!comm || comm.freightRequestId !== fr.id) throw new AppError(404, "COMMUNICATION_NOT_FOUND");

    await this.db.$transaction(async (tx) => {
      await tx.freightRequestCommunication.update({
        where: { id: comm.id },
        data: {
          status: "RESPONDED",
          respondedAt: new Date(),
          notes: input.notes ? `${comm.notes ?? ""}\n---\n${input.notes}` : comm.notes,
        },
      });
      await this.recordAudit(tx, orderId, actor, "freight.communication.responded", {
        communicationId: comm.id,
      }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.communication.responded", {
        communicationId: comm.id,
      });
    });

    socketBus.scheduleEmit(() => {
      socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_COMMUNICATION_RESPONDED, {
        orderId,
        communicationId: comm.id,
      });
    });

    return this.enrichSummary(orderId, await this.freightIq.getSummary(orderId), actor);
  }

  async enrichOpsOverview(base: Awaited<ReturnType<FreightIqService["getOpsOverview"]>>) {
    const pendingCommunications = await this.db.freightRequestCommunication.findMany({
      where: { status: "PENDING" },
      include: { forwarderContact: true },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const waitingResponses = await this.db.freightRequestCommunication.findMany({
      where: { status: "SENT", respondedAt: null },
      include: { forwarderContact: true },
      orderBy: { sentAt: "asc" },
      take: 30,
    });
    const commercialMetrics = await this.commercial.getMetrics();
    return {
      ...base,
      pendingCommunications: pendingCommunications.map(mapCommunication),
      waitingResponses: waitingResponses.map(mapCommunication),
      commercialMetrics,
    };
  }

  async previewTemplate(
    orderId: string,
    requestedReplyDate: string,
    incoterm?: string,
  ): Promise<FreightRequestEmailTemplate> {
    return this.buildTemplateForOrder(orderId, requestedReplyDate, incoterm);
  }

  private async buildTemplateForOrder(
    orderId: string,
    requestedReplyDate: string,
    incoterm?: string,
  ): Promise<FreightRequestEmailTemplate> {
    const fr = await this.db.freightRequest.findFirst({
      where: { orderId, status: { notIn: [...TERMINAL] } },
      orderBy: { createdAt: "desc" },
    });
    if (!fr) throw new AppError(404, "FREIGHT_REQUEST_NOT_FOUND");
    const ow = await this.db.orderWorkspace.findUnique({
      where: { workspaceId: orderId },
      select: { incoterms: true },
    });
    return buildFreightRequestEmailTemplate({
      pol: fr.pol,
      pod: fr.pod,
      commodity: fr.cargoDescription,
      containerType: fr.containerType,
      readyDate: fr.readyDate?.toISOString() ?? null,
      incoterm: incoterm ?? ow?.incoterms ?? null,
      requestedReplyDate,
    });
  }

  private async requireOpenRequest(orderId: string) {
    const fr = await this.db.freightRequest.findFirst({
      where: { orderId, status: { notIn: [...TERMINAL] } },
      orderBy: { createdAt: "desc" },
    });
    if (!fr) throw new AppError(404, "FREIGHT_REQUEST_NOT_FOUND");
    return fr;
  }

  private async recordAudit(
    tx: Prisma.TransactionClient,
    orderId: string,
    actor: AuthUser,
    action: string,
    payload: Record<string, unknown>,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const ws = await tx.workspace.findUniqueOrThrow({ where: { id: orderId }, select: { state: true } });
    await tx.auditLog.create({
      data: {
        workspaceId: orderId,
        actorUserId: actor.id,
        actorEmail: actor.email,
        actorRole: actor.role,
        action,
        fromState: ws.state,
        toState: ws.state,
        payload: payload as Prisma.InputJsonValue,
        ipAddress: ctx?.ip,
        userAgent: ctx?.userAgent,
      },
    });
  }

  private async recordTimeline(
    tx: Prisma.TransactionClient,
    orderId: string,
    actorUserId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ) {
    await tx.timelineEvent.create({
      data: {
        workspaceId: orderId,
        eventType,
        actorUserId,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  }
}

function mapCommunication(c: {
  id: string;
  freightRequestId: string;
  forwarderContactId: string;
  status: string;
  channel: string;
  sentAt: Date | null;
  respondedAt: Date | null;
  notes: string | null;
  createdAt: Date;
  forwarderContact: { companyName: string; email: string };
}): FreightRequestCommunication {
  return {
    id: c.id,
    freightRequestId: c.freightRequestId,
    forwarderContactId: c.forwarderContactId,
    forwarderCompanyName: c.forwarderContact.companyName,
    forwarderEmail: c.forwarderContact.email,
    status: c.status as FreightRequestCommunication["status"],
    channel: c.channel as FreightRequestCommunication["channel"],
    sentAt: c.sentAt?.toISOString() ?? null,
    respondedAt: c.respondedAt?.toISOString() ?? null,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  };
}

function mapDbOffer(o: {
  id: string;
  freightRequestId: string;
  providerName: string;
  carrierName: string;
  price: Prisma.Decimal;
  currency: string;
  transitDays: number;
  validUntil: Date;
  remarks: string | null;
  status: string;
  forwarderContactId: string | null;
  offerSource: string | null;
  vesselName: string | null;
  etd: Date | null;
  eta: Date | null;
  cutOff: Date | null;
  createdAt: Date;
  updatedAt: Date;
  forwarderContact?: { companyName: string } | null;
}) {
  return {
    id: o.id,
    freightRequestId: o.freightRequestId,
    providerName: o.providerName,
    carrierName: o.carrierName,
    price: Number(o.price),
    currency: o.currency,
    transitDays: o.transitDays,
    validUntil: o.validUntil.toISOString(),
    remarks: o.remarks,
    status: o.status as FreightSummary["offers"][number]["status"],
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
    forwarderContactId: o.forwarderContactId,
    forwarderCompanyName: o.forwarderContact?.companyName ?? o.providerName,
    offerSource: o.offerSource,
    vesselName: o.vesselName,
    etd: o.etd?.toISOString() ?? null,
    eta: o.eta?.toISOString() ?? null,
    cutOff: o.cutOff?.toISOString() ?? null,
  };
}

function extendedComparisonHints(
  offers: Array<{
    id: string;
    price: number;
    transitDays: number;
    validUntil: string;
    etd?: string | null;
    cutOff?: string | null;
  }>,
) {
  if (offers.length === 0) {
    return {
      earliestEtdOfferId: null as string | null,
      closestCutOffOfferId: null as string | null,
    };
  }
  const withEtd = offers.filter((o) => o.etd);
  const withCut = offers.filter((o) => o.cutOff);
  const soon = new Date(Date.now() + 48 * 3_600_000);
  const earliestEtd = withEtd.length
    ? [...withEtd].sort((a, b) => new Date(a.etd!).getTime() - new Date(b.etd!).getTime())[0]
    : null;
  const closestCut = withCut.length
    ? [...withCut].sort((a, b) => new Date(a.cutOff!).getTime() - new Date(b.cutOff!).getTime())[0]
    : null;
  return {
    earliestEtdOfferId: earliestEtd?.id ?? null,
    closestCutOffOfferId: closestCut?.id ?? null,
    expiringSoonOfferIds: offers.filter((o) => new Date(o.validUntil) <= soon).map((o) => o.id),
  };
}
