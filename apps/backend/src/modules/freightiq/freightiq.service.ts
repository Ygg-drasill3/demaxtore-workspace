import type { Prisma, PrismaClient } from "@prisma/client";
import type { FreightAction, FreightPortfolio, FreightSummary } from "@dmx/contracts/freightiq";
import {
  CreateFreightRequestPayload,
  SubmitFreightOfferPayload,
  ReviseFreightOfferPayload,
  WithdrawFreightOfferPayload,
  SelectFreightOfferPayload,
  CancelFreightRequestPayload,
} from "@dmx/contracts/freightiq.zod";
import {
  deriveFreightIqExecutionState,
  nextFreightIqExecutionAction,
  type FreightIqExecutionSummary,
} from "@dmx/contracts/freightiq-execution";
import { SocketEvents } from "@dmx/contracts/socket-events";
import { socketBus } from "../../realtime/socket-bus.js";
import { AppError } from "../../utils/httpErrors.js";
import {
  assertFreightActionRole,
  canAccessFreightForOrder,
  isOrderEligibleForFreight,
  type AuthUser,
} from "./freightiq.policy.js";
import { notifyFreightEvent } from "./freightiq.notifications.js";
import { FreightCommercialService } from "./commercial/freight-commercial.service.js";
import { displayPriceForOffer } from "./commercial/freight-commercial.util.js";
import { spawnShipmentFromOrder, enrichFromFreightOffer } from "../shipment/shipment.spawn.js";
import { ShipmentWorkspaceOps } from "../shipment/shipment-workspace.ops.js";

const TERMINAL = ["CANCELLED", "EXPIRED", "CONVERTED_TO_SHIPMENT"] as const;

export class FreightIqService {
  private readonly commercial: FreightCommercialService;

  constructor(private readonly db: PrismaClient) {
    this.commercial = new FreightCommercialService(db);
  }

  async getSummary(orderId: string): Promise<FreightSummary> {
    const request = await this.db.freightRequest.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: {
        offers: { orderBy: { price: "asc" } },
        selection: true,
        order: { select: { externalRef: true } },
      },
    });
    if (!request) {
      return {
        orderId,
        request: null,
        offers: [],
        selection: null,
        comparisonHints: { lowestPriceOfferId: null, fastestTransitOfferId: null, expiringSoonOfferIds: [] },
      };
    }
    const comparable = request.offers.filter((o) =>
      o.status === "ACTIVE" || o.status === "REVISED",
    );
    const displayOffers = request.offers.filter((o) =>
      o.status === "ACTIVE" || o.status === "REVISED" || o.status === "SELECTED",
    );
    const hints = this.comparisonHints(comparable);
    const selection = request.selection ? mapSelection(request.selection) : null;
    const base: FreightSummary = {
      orderId,
      request: mapRequest(request, request.order.externalRef),
      offers: displayOffers.map(mapOffer),
      selection,
      comparisonHints: hints,
    };
    base.execution = await this.buildExecution(base);
    return base;
  }

  async applyFreightAction(
    orderId: string,
    action: FreightAction,
    actor: AuthUser,
    payload: Record<string, unknown> = {},
    ctx?: { ip?: string; userAgent?: string },
  ): Promise<FreightSummary> {
    if (!(await canAccessFreightForOrder(this.db, actor, orderId))) {
      throw new AppError(403, "FORBIDDEN");
    }
    try {
      assertFreightActionRole(action, actor.role);
    } catch {
      throw new AppError(403, "FORBIDDEN_ROLE");
    }

    switch (action) {
      case "create_request":
        await this.createRequest(orderId, actor, CreateFreightRequestPayload.parse(payload), ctx);
        break;
      case "submit_offer":
        await this.submitOffer(orderId, actor, SubmitFreightOfferPayload.parse(payload), ctx);
        break;
      case "revise_offer":
        await this.reviseOffer(orderId, actor, ReviseFreightOfferPayload.parse(payload), ctx);
        break;
      case "withdraw_offer":
        await this.withdrawOffer(orderId, actor, WithdrawFreightOfferPayload.parse(payload), ctx);
        break;
      case "select_offer":
        await this.selectOffer(orderId, actor, SelectFreightOfferPayload.parse(payload), ctx);
        break;
      case "cancel_request":
        await this.cancelRequest(orderId, actor, CancelFreightRequestPayload.parse(payload), ctx);
        break;
      case "proceed_to_booking":
        await this.proceedToBooking(orderId, actor, ctx);
        break;
      default:
        throw new AppError(400, "UNKNOWN_ACTION");
    }
    return this.getSummary(orderId);
  }

  /**
   * Account-scoped freight hub: freight requests + offers for orders the actor participates in.
   */
  async getMyPortfolio(actor: AuthUser): Promise<FreightPortfolio> {
    const memberships = await this.db.workspaceParticipant.findMany({
      where: { userId: actor.id, workspace: { type: "ORDER" } },
      select: { workspaceId: true },
      take: 500,
    });
    const orderIds = memberships.map((m) => m.workspaceId);
    if (orderIds.length === 0) return { items: [] };

    // Hub only lists freight requests that already have at least one offer.
    const requests = await this.db.freightRequest.findMany({
      where: {
        orderId: { in: orderIds },
        status: { in: ["QUOTED", "SELECTED", "CONVERTED_TO_SHIPMENT"] },
        offers: { some: { status: { in: ["ACTIVE", "REVISED", "SELECTED"] } } },
      },
      include: {
        offers: {
          where: { status: { in: ["ACTIVE", "REVISED", "SELECTED"] } },
          orderBy: { price: "asc" },
        },
        selection: true,
        order: { select: { externalRef: true, state: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const items = await Promise.all(
      requests
        .filter((r) => r.offers.length > 0)
        .map(async (r) => {
          const comparable = r.offers.filter((o) => o.status === "ACTIVE" || o.status === "REVISED");
          const item = {
            orderId: r.orderId,
            orderRef: r.order.externalRef,
            orderState: r.order.state,
            request: mapRequest(r, r.order.externalRef),
            offers: r.offers.map(mapOffer),
            selection: r.selection ? mapSelection(r.selection) : null,
            comparisonHints: this.comparisonHints(comparable),
            execution: null as FreightIqExecutionSummary | null,
          };
          item.execution = await this.buildExecution(item);
          return item;
        }),
    );
    return { items };
  }

  async getOpsOverview() {
    const openRequests = await this.db.freightRequest.findMany({
      where: { status: { in: ["REQUESTED", "QUOTING", "QUOTED"] } },
      include: {
        offers: { where: { status: { in: ["ACTIVE", "REVISED"] } } },
        order: { select: { externalRef: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const pendingOffers = await this.db.freightOffer.findMany({
      where: { status: { in: ["ACTIVE", "REVISED"] }, validUntil: { gt: new Date() } },
      include: {
        freightRequest: { include: { order: { select: { externalRef: true, id: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const expiredOffers = await this.db.freightOffer.findMany({
      where: { status: "EXPIRED" },
      include: {
        freightRequest: { include: { order: { select: { externalRef: true, id: true } } } },
      },
      orderBy: { validUntil: "desc" },
      take: 50,
    });
    const selected = await this.db.freightRequest.findMany({
      where: { status: { in: ["SELECTED", "CONVERTED_TO_SHIPMENT"] } },
      include: { selection: true, order: { select: { externalRef: true } } },
      take: 50,
    });

    const selectedWithShip = selected.filter((r) => r.selection?.shipmentWorkspaceId);
    const shipIds = selectedWithShip
      .map((r) => r.selection!.shipmentWorkspaceId!)
      .filter(Boolean);
    const shipRows = shipIds.length
      ? await this.db.shipmentWorkspace.findMany({
          where: { workspaceId: { in: shipIds } },
          include: {
            containers: { select: { id: true } },
            workspace: { select: { state: true } },
          },
        })
      : [];
    const shipById = new Map(shipRows.map((s) => [s.workspaceId, s]));

    type QueueRow = {
      orderId: string;
      orderRef: string | null;
      shipmentWorkspaceId: string | null;
      bookingStatus: string | null;
    };
    const offerSelectedAwaitingBooking: QueueRow[] = [];
    const bookingAwaitingConfirmation: QueueRow[] = [];
    const confirmedAwaitingContainer: QueueRow[] = [];
    const shipmentAwaitingTracking: QueueRow[] = [];

    for (const r of selectedWithShip) {
      const sid = r.selection!.shipmentWorkspaceId!;
      const sw = shipById.get(sid);
      const row = {
        orderId: r.orderId,
        orderRef: r.order.externalRef,
        shipmentWorkspaceId: sid,
        bookingStatus: sw?.bookingStatus ?? null,
      };
      const booking = sw?.bookingStatus ?? null;
      if (!booking || booking === "DRAFT" || booking === "REQUESTED") {
        if (!booking || booking === "DRAFT") offerSelectedAwaitingBooking.push(row);
        else bookingAwaitingConfirmation.push(row);
      } else if (booking === "PENDING") {
        bookingAwaitingConfirmation.push(row);
      } else if (booking === "CONFIRMED" || booking === "AMENDED") {
        if ((sw?.containers.length ?? 0) === 0) confirmedAwaitingContainer.push(row);
        if (!sw?.trackingLinkedAt) shipmentAwaitingTracking.push(row);
      }
    }

    return {
      openRequests: openRequests.map((r) => ({
        ...mapRequest(r, r.order.externalRef),
        offerCount: r.offers.length,
      })),
      pendingOffers: pendingOffers.map((o) => ({
        ...mapOffer(o),
        orderId: o.freightRequest.order.id,
        orderRef: o.freightRequest.order.externalRef,
      })),
      expiredOffers: expiredOffers.map((o) => ({
        ...mapOffer(o),
        orderId: o.freightRequest.order.id,
        orderRef: o.freightRequest.order.externalRef,
      })),
      selectedFreight: selected
        .filter((r) => r.selection)
        .map((r) => ({
          ...mapRequest(r, r.order.externalRef),
          selection: mapSelection(r.selection!),
        })),
      executionQueues: {
        offerSelectedAwaitingBooking,
        bookingAwaitingConfirmation,
        confirmedAwaitingContainer,
        shipmentAwaitingTracking,
      },
    };
  }

  private async loadOrder(orderId: string) {
    const ws = await this.db.workspace.findUnique({
      where: { id: orderId },
      include: {
        orderWorkspace: true,
        participants: true,
      },
    });
    if (!ws || ws.type !== "ORDER") throw new AppError(404, "ORDER_NOT_FOUND");
    return ws;
  }

  private async activeRequest(orderId: string) {
    return this.db.freightRequest.findFirst({
      where: { orderId, status: { notIn: [...TERMINAL] } },
      orderBy: { createdAt: "desc" },
      include: { offers: true, selection: true },
    });
  }

  private async createRequest(
    orderId: string,
    actor: AuthUser,
    input: CreateFreightRequestPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const ws = await this.loadOrder(orderId);
    if (!isOrderEligibleForFreight(ws.state, actor.role)) {
      throw new AppError(409, "ORDER_NOT_READY_FOR_FREIGHT", { state: ws.state });
    }
    const existing = await this.activeRequest(orderId);
    if (existing) throw new AppError(409, "FREIGHT_REQUEST_ALREADY_OPEN");

    const ow = ws.orderWorkspace!;
    const buyer = ws.participants.find((p) => p.participantRole === "OWNER");
    const supplier = ws.participants.find((p) => p.participantRole === "COUNTERPARTY");
    if (!buyer || !supplier) throw new AppError(409, "ORDER_PARTICIPANTS_INCOMPLETE");

    await this.db.$transaction(async (tx) => {
      const orgId = await import("../mixed-container/mc-organization-sync.service.js").then((m) =>
        m.resolveOrganizationWorkspaceId(tx, { orderId }),
      );

      const req = await tx.freightRequest.create({
        data: {
          orderId,
          organizationWorkspaceId: orgId,
          buyerId: buyer.userId,
          supplierId: supplier.userId,
          mode: input.mode,
          pol: input.pol,
          pod: input.pod,
          cargoDescription: input.cargoDescription,
          containerType: input.containerType,
          readyDate: input.readyDate ? new Date(input.readyDate) : null,
          status: "REQUESTED",
        },
      });
      await this.recordAudit(tx, orderId, actor, "freight.request.created", {}, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.request.created", { requestId: req.id });
      if (orgId) {
        const { bridgeModuleEventToOrganization, bindOrganizationToFreightRequest } = await import(
          "../mixed-container/mc-organization-sync.service.js"
        );
        await bindOrganizationToFreightRequest(tx, req.id, orgId);
        await bridgeModuleEventToOrganization(tx, {
          organizationWorkspaceId: orgId,
          orderId,
          sourceModule: "FREIGHTIQ",
          sourceEventType: "freight.request.created",
          sourceEntityId: req.id,
          actorUserId: actor.id,
          payload: { requestId: req.id },
        });
      }
      const notifyIds = ws.participants.map((p) => p.userId).filter((id) => id !== actor.id);
      await notifyFreightEvent(tx, {
        orderId,
        orderRef: ws.externalRef,
        userIds: notifyIds,
        title: `Freight request · ${ws.externalRef}`,
        message: `Freight request created for ${input.pol} → ${input.pod}`,
      });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_REQUEST_CREATED, {
          orderId,
          requestId: req.id,
        });
      });
    });
  }

  private async submitOffer(
    orderId: string,
    actor: AuthUser,
    input: SubmitFreightOfferPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const fr = await this.requireOpenRequest(orderId);
    const offer = await this.db.$transaction(async (tx) => {
      const row = await tx.freightOffer.create({
        data: {
          freightRequestId: fr.id,
          providerName: input.providerName,
          carrierName: input.carrierName,
          price: input.price,
          internalCostUsd: input.price,
          freightiqMarginUsd: 0,
          displayPriceUsd: input.price,
          currency: input.currency,
          transitDays: input.transitDays,
          validUntil: new Date(input.validUntil),
          remarks: input.remarks,
          vesselName: input.vesselName ?? null,
          etd: input.etd ? new Date(input.etd) : null,
          eta: input.eta ? new Date(input.eta) : null,
          cutOff: input.cutOff ? new Date(input.cutOff) : null,
          offerSource: "MANUAL_ENTRY",
          status: "ACTIVE",
        },
      });
      const offerCount = await tx.freightOffer.count({
        where: { freightRequestId: fr.id, status: { in: ["ACTIVE", "REVISED"] } },
      });
      await tx.freightRequest.update({
        where: { id: fr.id },
        data: { status: offerCount > 0 ? "QUOTED" : "QUOTING", updatedAt: new Date() },
      });
      await this.recordAudit(tx, orderId, actor, "freight.offer.submitted", { offerId: row.id }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.offer.submitted", { offerId: row.id });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_SUBMITTED, {
          orderId,
          requestId: fr.id,
          offerId: row.id,
        });
      });
      return row;
    });
    return offer;
  }

  private async reviseOffer(
    orderId: string,
    actor: AuthUser,
    input: ReviseFreightOfferPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const fr = await this.requireOpenRequest(orderId);
    const offer = await this.db.freightOffer.findUnique({ where: { id: input.offerId } });
    if (!offer || offer.freightRequestId !== fr.id) throw new AppError(404, "OFFER_NOT_FOUND");
    if (offer.status !== "ACTIVE" && offer.status !== "REVISED") {
      throw new AppError(409, "OFFER_NOT_ACTIVE");
    }
    if (offer.validUntil <= new Date()) throw new AppError(409, "OFFER_EXPIRED");

    await this.db.$transaction(async (tx) => {
      await tx.freightOffer.update({
        where: { id: input.offerId },
        data: {
          providerName: input.providerName,
          carrierName: input.carrierName,
          price: input.price,
          internalCostUsd: input.price,
          freightiqMarginUsd: 0,
          displayPriceUsd: input.price,
          currency: input.currency,
          transitDays: input.transitDays,
          validUntil: new Date(input.validUntil),
          remarks: input.remarks,
          vesselName: input.vesselName ?? null,
          etd: input.etd ? new Date(input.etd) : null,
          eta: input.eta ? new Date(input.eta) : null,
          cutOff: input.cutOff ? new Date(input.cutOff) : null,
          status: "REVISED",
        },
      });
      await this.recordAudit(tx, orderId, actor, "freight.offer.revised", { offerId: input.offerId }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.offer.revised", { offerId: input.offerId });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_REVISED, {
          orderId,
          offerId: input.offerId,
        });
      });
    });
  }

  private async withdrawOffer(
    orderId: string,
    actor: AuthUser,
    input: WithdrawFreightOfferPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const fr = await this.requireOpenRequest(orderId);
    const offer = await this.db.freightOffer.findUnique({ where: { id: input.offerId } });
    if (!offer || offer.freightRequestId !== fr.id) throw new AppError(404, "OFFER_NOT_FOUND");

    await this.db.$transaction(async (tx) => {
      await tx.freightOffer.update({
        where: { id: input.offerId },
        data: { status: "WITHDRAWN" },
      });
      await this.recordAudit(tx, orderId, actor, "freight.offer.withdrawn", { offerId: input.offerId, reason: input.reason }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.offer.withdrawn", { offerId: input.offerId });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_WITHDRAWN, {
          orderId,
          offerId: input.offerId,
        });
      });
    });
  }

  private async selectOffer(
    orderId: string,
    actor: AuthUser,
    input: SelectFreightOfferPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    // Allow idempotent re-select of the same offer after conversion (retries / double-click).
    const existingConverted = await this.db.freightRequest.findFirst({
      where: { orderId, status: { in: ["SELECTED", "CONVERTED_TO_SHIPMENT"] } },
      orderBy: { createdAt: "desc" },
      include: { selection: true },
    });
    if (existingConverted?.selection) {
      if (existingConverted.selection.offerId === input.offerId) return; // idempotent
      throw new AppError(409, "ALREADY_SELECTED");
    }

    const fr = await this.requireOpenRequest(orderId);
    if (fr.selection) {
      if (fr.selection.offerId === input.offerId) return;
      throw new AppError(409, "ALREADY_SELECTED");
    }

    const offer = await this.db.freightOffer.findUnique({
      where: { id: input.offerId },
      include: { freightRequest: true },
    });
    if (!offer || offer.freightRequestId !== fr.id) throw new AppError(404, "OFFER_NOT_FOUND");
    if (offer.status !== "ACTIVE" && offer.status !== "REVISED") {
      throw new AppError(409, "OFFER_NOT_ACTIVE");
    }
    if (offer.validUntil <= new Date()) throw new AppError(409, "OFFER_EXPIRED");

    const ws = await this.loadOrder(orderId);
    const ow = ws.orderWorkspace!;

    await this.db.$transaction(async (tx) => {
      let shipmentWorkspaceId: string;
      const existingShipment = await tx.workspace.findFirst({
        where: { spawnedFromId: orderId, type: "SHIPMENT" },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (existingShipment) {
        shipmentWorkspaceId = existingShipment.id;
      } else {
        const spawned = await spawnShipmentFromOrder(tx, {
          orderWorkspaceId: orderId,
          orderExternalRef: ws.externalRef,
          contractRef: ow.contractRef,
          poRef: ow.contractRef,
          currency: ws.currency ?? "USD",
          buyerUserId: ow.buyerUserId,
          supplierUserId: ow.supplierUserId,
          originPort: offer.freightRequest.pol || ow.originPort,
          destinationPort: offer.freightRequest.pod || ow.destinationPort,
          actorUserId: actor.id,
        });
        shipmentWorkspaceId = spawned.shipmentWorkspaceId;
      }

      await enrichFromFreightOffer(tx, shipmentWorkspaceId, offer);

      await tx.freightSelection.create({
        data: {
          freightRequestId: fr.id,
          offerId: offer.id,
          selectedById: actor.id,
          shipmentWorkspaceId,
        },
      });
      await tx.freightOffer.update({ where: { id: offer.id }, data: { status: "SELECTED" } });
      await tx.freightRequest.update({
        where: { id: fr.id },
        data: {
          status: "CONVERTED_TO_SHIPMENT",
          updatedAt: new Date(),
        },
      });
      const ledgerId = await this.commercial.createLedgerOnSelection(tx, {
        orderId,
        offerId: offer.id,
        shipmentWorkspaceId,
        actor,
      });
      await this.recordAudit(tx, orderId, actor, "freight.offer.selected", {
        offerId: offer.id,
        shipmentWorkspaceId,
        ledgerId,
      }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.offer.selected", {
        offerId: offer.id,
        shipmentWorkspaceId,
        ledgerId,
      });
      const orgId = await import("../mixed-container/mc-organization-sync.service.js").then((m) =>
        m.resolveOrganizationWorkspaceId(tx, { orderId }),
      );
      if (orgId) {
        const { bridgeModuleEventToOrganization } = await import(
          "../mixed-container/mc-organization-sync.service.js"
        );
        await bridgeModuleEventToOrganization(tx, {
          organizationWorkspaceId: orgId,
          orderId,
          sourceModule: "FREIGHTIQ",
          sourceEventType: "freight.offer.selected",
          sourceEntityId: offer.id,
          actorUserId: actor.id,
          payload: { offerId: offer.id, shipmentWorkspaceId },
        });
      }
      const notifyIds = ws.participants.map((p) => p.userId).filter((id) => id !== actor.id);
      await notifyFreightEvent(tx, {
        orderId,
        orderRef: ws.externalRef,
        userIds: notifyIds,
        title: `Freight selected · ${ws.externalRef}`,
        message: `${offer.providerName} / ${offer.carrierName} selected`,
      });
      socketBus.scheduleEmit(() => {
        socketBus.emitToWorkspace(orderId, SocketEvents.FREIGHT_OFFER_SELECTED, {
          orderId,
          requestId: fr.id,
          offerId: offer.id,
          shipmentWorkspaceId,
        });
      });
    });
  }

  private async cancelRequest(
    orderId: string,
    actor: AuthUser,
    input: CancelFreightRequestPayload,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const fr = await this.requireOpenRequest(orderId);
    await this.db.$transaction(async (tx) => {
      await tx.freightRequest.update({
        where: { id: fr.id },
        data: { status: "CANCELLED" },
      });
      await this.recordAudit(tx, orderId, actor, "freight.request.cancelled", { reason: input.reason }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "freight.request.cancelled", { reason: input.reason });
    });
  }

  /**
   * Sprint 33 — Selected Offer → Booking (Sprint 32 lifecycle). Idempotent.
   * Ensures shipment booking is at least REQUESTED; does not create a second booking/shipment.
   */
  private async proceedToBooking(
    orderId: string,
    actor: AuthUser,
    ctx?: { ip?: string; userAgent?: string },
  ) {
    const fr = await this.db.freightRequest.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: {
        selection: true,
        offers: { where: { status: "SELECTED" }, take: 1 },
      },
    });
    if (!fr) throw new AppError(404, "FREIGHT_REQUEST_NOT_FOUND");
    if (!fr.selection) throw new AppError(409, "NO_SELECTION");
    const shipmentWorkspaceId = fr.selection.shipmentWorkspaceId;
    if (!shipmentWorkspaceId) throw new AppError(409, "SHIPMENT_NOT_LINKED");

    const sw = await this.db.shipmentWorkspace.findUnique({
      where: { workspaceId: shipmentWorkspaceId },
      select: {
        bookingStatus: true,
        freightOfferId: true,
        freightRequestId: true,
        bookingRef: true,
        carrierName: true,
      },
    });
    if (!sw) throw new AppError(404, "SHIPMENT_NOT_FOUND");

    // Soft-link offer/request if missing (historical-safe, non-destructive)
    if (!sw.freightOfferId || !sw.freightRequestId) {
      await this.db.shipmentWorkspace.update({
        where: { workspaceId: shipmentWorkspaceId },
        data: {
          freightOfferId: sw.freightOfferId ?? fr.selection.offerId,
          freightRequestId: sw.freightRequestId ?? fr.id,
        },
      });
    }

    const status = sw.bookingStatus;
    if (!status || status === "DRAFT") {
      const ops = new ShipmentWorkspaceOps(this.db);
      const role =
        actor.role === "SYSTEM" || actor.role === "SUPER_ADMIN" || actor.role === "SALES_CONTROL"
          ? ("ADMIN" as const)
          : (actor.role as import("@prisma/client").Role);
      await ops.transitionBooking(
        shipmentWorkspaceId,
        { id: actor.id, email: actor.email, role },
        { toStatus: "REQUESTED", reason: "FreightIQ proceed_to_booking" },
      );
    }
    // REQUESTED / PENDING / CONFIRMED / AMENDED / CANCELLED → no duplicate initiation

    await this.db.$transaction(async (tx) => {
      await this.recordAudit(tx, orderId, actor, "freight.booking.proceeded", {
        shipmentWorkspaceId,
        bookingStatusBefore: status,
        offerId: fr.selection!.offerId,
      }, ctx);
      await this.recordTimeline(tx, orderId, actor.id, "BOOKING_REQUESTED", {
        shipmentWorkspaceId,
        source: "freightiq.proceed_to_booking",
      });
    });
  }

  private async buildExecution(summary: {
    orderId: string;
    request: FreightSummary["request"];
    offers: FreightSummary["offers"];
    selection: FreightSummary["selection"];
  }): Promise<FreightIqExecutionSummary | null> {
    if (!summary.request) return null;

    const shipmentWorkspaceId = summary.selection?.shipmentWorkspaceId ?? null;
    let bookingStatus: string | null = null;
    let bookingReference: string | null = null;
    let bookingEtd: string | null = null;
    let bookingEta: string | null = null;
    let maritimeEta: string | null = null;
    let trackingLinked = false;
    let trackingStatus: string | null = null;
    let shipmentState: string | null = null;
    let shipmentRef: string | null = null;
    let containerCount = 0;

    if (shipmentWorkspaceId) {
      const sw = await this.db.shipmentWorkspace.findUnique({
        where: { workspaceId: shipmentWorkspaceId },
        include: {
          workspace: { select: { state: true, externalRef: true } },
          containers: { select: { id: true } },
        },
      });
      if (sw) {
        bookingStatus = sw.bookingStatus;
        bookingReference = sw.bookingRef ?? sw.bookingNumber;
        bookingEtd = sw.etd?.toISOString() ?? null;
        bookingEta = sw.eta?.toISOString() ?? null;
        trackingLinked = !!sw.trackingLinkedAt;
        shipmentState = sw.workspace.state;
        shipmentRef = sw.workspace.externalRef;
        containerCount = sw.containers.length;
      }
      const snap = await this.db.shipmentTrackingSnapshot.findFirst({
        where: { shipmentId: shipmentWorkspaceId },
        orderBy: { syncedAt: "desc" },
        select: { eta: true, trackingStatus: true },
      });
      maritimeEta = snap?.eta?.toISOString() ?? null;
      trackingStatus = snap?.trackingStatus ?? null;
    }

    const selectedOffer = summary.selection
      ? summary.offers.find((o) => o.id === summary.selection!.offerId) ?? null
      : null;
    const hasActiveOffers = summary.offers.some((o) => o.status === "ACTIVE" || o.status === "REVISED");
    const state = deriveFreightIqExecutionState({
      freightRequestStatus: summary.request.status,
      hasActiveOffers,
      hasSelection: !!summary.selection,
      bookingStatus,
      shipmentState,
      trackingLinked,
      containerCount,
    });
    const next = nextFreightIqExecutionAction(state, shipmentWorkspaceId);

    return {
      state,
      freightRequestId: summary.request.id,
      selectedOfferId: summary.selection?.offerId ?? null,
      selectedOfferPrice: selectedOffer?.price ?? null,
      selectedOfferCurrency: selectedOffer?.currency ?? null,
      selectedCarrier: selectedOffer?.carrierName ?? null,
      shipmentWorkspaceId,
      shipmentRef,
      shipmentState,
      bookingStatus,
      bookingReference,
      bookingEtd,
      bookingEta,
      maritimeEta,
      trackingLinked,
      trackingStatus,
      containerCount,
      ...next,
    };
  }

  private async requireOpenRequest(orderId: string) {
    const fr = await this.activeRequest(orderId);
    if (!fr) throw new AppError(404, "FREIGHT_REQUEST_NOT_FOUND");
    return fr;
  }

  private comparisonHints(offers: Array<{ id: string; price: Prisma.Decimal; displayPriceUsd?: Prisma.Decimal | null; transitDays: number; validUntil: Date }>) {
    if (offers.length === 0) {
      return { lowestPriceOfferId: null, fastestTransitOfferId: null, expiringSoonOfferIds: [] as string[] };
    }
    const sortedPrice = [...offers].sort(
      (a, b) => displayPriceForOffer(a) - displayPriceForOffer(b),
    );
    const sortedTransit = [...offers].sort((a, b) => a.transitDays - b.transitDays);
    const soon = new Date(Date.now() + 48 * 3_600_000);
    return {
      lowestPriceOfferId: sortedPrice[0].id,
      fastestTransitOfferId: sortedTransit[0].id,
      expiringSoonOfferIds: offers.filter((o) => o.validUntil <= soon).map((o) => o.id),
    };
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

function mapRequest(
  r: {
    id: string;
    orderId: string;
    buyerId: string;
    supplierId: string;
    mode: string;
    pol: string;
    pod: string;
    cargoDescription: string;
    containerType: string | null;
    readyDate: Date | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  },
  orderRef: string | null,
) {
  return {
    id: r.id,
    orderId: r.orderId,
    orderRef,
    buyerId: r.buyerId,
    supplierId: r.supplierId,
    mode: r.mode as FreightSummary["request"] extends null ? never : NonNullable<FreightSummary["request"]>["mode"],
    pol: r.pol,
    pod: r.pod,
    cargoDescription: r.cargoDescription,
    containerType: r.containerType,
    readyDate: r.readyDate?.toISOString() ?? null,
    status: r.status as FreightSummary["request"] extends null ? never : NonNullable<FreightSummary["request"]>["status"],
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function mapOffer(o: {
  id: string;
  freightRequestId: string;
  providerName: string;
  carrierName: string;
  price: Prisma.Decimal;
  displayPriceUsd?: Prisma.Decimal | null;
  currency: string;
  transitDays: number;
  validUntil: Date;
  remarks: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: o.id,
    freightRequestId: o.freightRequestId,
    providerName: o.providerName,
    carrierName: o.carrierName,
    price: displayPriceForOffer(o),
    currency: o.currency,
    transitDays: o.transitDays,
    validUntil: o.validUntil.toISOString(),
    remarks: o.remarks,
    status: o.status as import("@dmx/contracts/freightiq").FreightOfferStatus,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  };
}

function mapSelection(s: {
  id: string;
  freightRequestId: string;
  offerId: string;
  selectedById: string;
  selectedAt: Date;
  shipmentWorkspaceId: string | null;
}) {
  return {
    id: s.id,
    freightRequestId: s.freightRequestId,
    offerId: s.offerId,
    selectedById: s.selectedById,
    selectedAt: s.selectedAt.toISOString(),
    shipmentWorkspaceId: s.shipmentWorkspaceId,
  };
}
