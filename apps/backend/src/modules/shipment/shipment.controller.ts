import type { Request, Response } from "express";
import type { Role } from "@prisma/client";
import { z } from "zod";
import {
  ConfirmBookingPayload, AssignContainerPayload, PickupCargoPayload,
  ArriveOriginPortPayload, LoadVesselPayload, DepartVesselPayload,
  ArriveDestinationPayload, StartCustomsPayload, CompleteCustomsPayload,
  ReadyDeliveryPayload, ConfirmDeliveryPayload, ConfirmPartialDeliveryPayload, RejectShipmentPayload,
  CompleteShipmentPayload,
  ReportExceptionPayload, ResolveExceptionPayload, CancelShipmentPayload,
  UploadShipmentDocumentPayload,
} from "@dmx/contracts/shipment.zod";
import { computeShipmentNextActions } from "@dmx/contracts/shipment.next-actions";
import type { ShipmentAction, ShipmentState } from "@dmx/contracts/shipment.fsm";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";
import { ShipmentService } from "./shipment.service.js";
import { TradeActionGateway } from "../orchestration/trade-action.gateway.js";
import { canAccessShipment } from "./shipment.policy.js";
import { LinkTrackingPayload } from "@dmx/contracts/shipment-tracking.zod";
import { ShipmentPortfolioQuery } from "@dmx/contracts/shipment-portfolio";
import {
  CancelShipmentBookingSchema,
  CompleteShipmentMilestoneSchema,
  CreateShipmentContainerSchema,
  CreateShipmentMilestoneSchema,
  ListDelayedShipmentsQuerySchema,
  ListUpcomingMilestonesQuerySchema,
  PatchShipmentContainerSchema,
  PatchShipmentMilestoneSchema,
  PatchShipmentStatusAliasSchema,
  PatchShipmentWorkspaceSchema,
  TransitionShipmentBookingSchema,
  UpsertShipmentBookingSchema,
} from "@dmx/contracts/shipment-workspace.zod";
import { ShipmentWorkspaceOps } from "./shipment-workspace.ops.js";
import { ShipmentMilestoneService } from "./shipment-milestone.service.js";
import { prisma } from "../../db.js";
import { AppError } from "../../utils/httpErrors.js";
import { TrackingService } from "../tracking/tracking.service.js";
import { ShipmentPortfolioService } from "./shipment-portfolio.service.js";
import { documentCenterController } from "../document-center/document-center.controller.js";
import { exceptionHubController } from "../exception-hub/exception-hub.controller.js";
import { env } from "../../config/env.js";

const service = new ShipmentService(prisma);
const tradeGateway = new TradeActionGateway(prisma);
const trackingService = new TrackingService(prisma);
const portfolioService = new ShipmentPortfolioService(prisma);
const ops = new ShipmentWorkspaceOps(prisma);
const milestones = new ShipmentMilestoneService(prisma);

const ActionEnvelope = z.object({ payload: z.record(z.unknown()).optional(), reason: z.string().optional() });

const PAYLOAD_SCHEMAS: Partial<Record<ShipmentAction, z.ZodTypeAny>> = {
  confirm_booking: ConfirmBookingPayload,
  assign_container: AssignContainerPayload,
  pickup_cargo: PickupCargoPayload,
  arrive_origin_port: ArriveOriginPortPayload,
  load_vessel: LoadVesselPayload,
  depart_vessel: DepartVesselPayload,
  arrive_destination: ArriveDestinationPayload,
  start_customs: StartCustomsPayload,
  complete_customs: CompleteCustomsPayload,
  ready_delivery: ReadyDeliveryPayload,
  confirm_partial_delivery: ConfirmPartialDeliveryPayload,
  confirm_delivery: ConfirmDeliveryPayload,
  reject_shipment: RejectShipmentPayload,
  complete_shipment: CompleteShipmentPayload,
  report_exception: ReportExceptionPayload,
  resolve_exception: ResolveExceptionPayload,
  cancel_shipment: CancelShipmentPayload,
  upload_document: UploadShipmentDocumentPayload,
};

async function loadAccessible(req: Request) {
  const ws = await prisma.workspace.findUnique({
    where: { id: req.params.id },
    include: { shipmentWorkspace: true, participants: true, shipmentExceptions: { where: { status: "OPEN" }, take: 1 } },
  });
  if (!ws || ws.type !== "SHIPMENT") throw new AppError(404, "SHIPMENT_NOT_FOUND");
  if (!(await canAccessShipment(prisma, req.user!, ws.id))) throw new AppError(403, "FORBIDDEN");
  return ws;
}

function actorOf(req: Request) {
  const user = req.user!;
  return { id: user.id, email: user.email, role: user.role as Role };
}

function buildContext(ws: Awaited<ReturnType<typeof loadAccessible>>, user: { id: string; role: string }) {
  return {
    state: ws.state as ShipmentState,
    actorRole: user.role as ActorRole,
    isOwner: ws.participants.some((p) => p.userId === user.id && p.participantRole === "OWNER"),
    isCounterparty: ws.participants.some((p) => p.userId === user.id && p.participantRole === "COUNTERPARTY"),
    hasOpenException: ws.shipmentExceptions.length > 0,
  };
}

export const shipmentController = {
  async portfolio(req: Request, res: Response) {
    const query = ShipmentPortfolioQuery.parse(req.query);
    res.json(await portfolioService.getPortfolio(req.user!, query));
  },

  shipmentDocuments: documentCenterController.shipmentDocuments,
  shipmentExceptions: exceptionHubController.shipmentExceptions,

  async get(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.fetchDTO(req.params.id, req.user!));
  },

  async timeline(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.timeline(req.params.id));
  },

  async documents(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.listDocuments(req.params.id));
  },

  async exceptions(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await service.exceptions(req.params.id));
  },

  async nextActions(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json(computeShipmentNextActions(buildContext(ws, req.user!)));
  },

  async trackingConfig(_req: Request, res: Response) {
    const provider = env.TRACKING_PROVIDER;
    res.json({
      provider,
      liveApi: provider === "maritime_api" || provider === "mock_live",
      label:
        provider === "maritime_api" ? "Live maritime API"
        : provider === "mock_live" ? "Mock live tracking"
        : "Simulated (demo mode)",
    });
  },

  async tracking(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await trackingService.getTracking(req.params.id));
  },

  async trackingEvents(req: Request, res: Response) {
    await loadAccessible(req);
    const dto = await trackingService.getTracking(req.params.id);
    res.json(dto.events);
  },

  async linkTracking(req: Request, res: Response) {
    await loadAccessible(req);
    const body = LinkTrackingPayload.parse(req.body);
    res.status(201).json(
      await trackingService.linkTracking(req.params.id, body, req.user!),
    );
  },

  async syncTracking(req: Request, res: Response) {
    await loadAccessible(req);
    res.json(await trackingService.syncShipment(req.params.id));
  },

  async patch(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    await ops.patchWorkspace(ws.id, actorOf(req), PatchShipmentWorkspaceSchema.parse(req.body));
    res.json(await service.fetchDTO(ws.id, req.user!));
  },

  async upsertBooking(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    await ops.upsertBooking(ws.id, actorOf(req), UpsertShipmentBookingSchema.parse(req.body));
    res.json(await service.fetchDTO(ws.id, req.user!));
  },

  async cancelBooking(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    await ops.cancelBooking(ws.id, actorOf(req), CancelShipmentBookingSchema.parse(req.body ?? {}));
    res.json(await service.fetchDTO(ws.id, req.user!));
  },

  async transitionBooking(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    await ops.transitionBooking(
      ws.id,
      actorOf(req),
      TransitionShipmentBookingSchema.parse(req.body),
    );
    res.json(await service.fetchDTO(ws.id, req.user!));
  },

  /** Alias endpoint: a coarse status maps onto the shipment FSM action. */
  async patchStatus(req: Request, res: Response) {
    const body = PatchShipmentStatusAliasSchema.parse(req.body);
    return shipmentController.action(ops.statusAliasAction(body.status))(req, res);
  },

  async listContainers(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json({ items: await ops.listContainers(ws.id) });
  },

  async addContainer(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.status(201).json(
      await ops.addContainer(ws.id, actorOf(req), CreateShipmentContainerSchema.parse(req.body)),
    );
  },

  async patchContainer(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    res.json(
      await ops.patchContainer(
        ws.id,
        req.params.containerId,
        actorOf(req),
        PatchShipmentContainerSchema.parse(req.body),
      ),
    );
  },

  async removeContainer(req: Request, res: Response) {
    const ws = await loadAccessible(req);
    await ops.removeContainer(ws.id, req.params.containerId, actorOf(req));
    res.status(204).end();
  },

  async listMilestones(req: Request, res: Response) {
    res.json(await milestones.list(req.user!, req.params.id));
  },

  async createMilestone(req: Request, res: Response) {
    res.status(201).json(
      await milestones.create(req.user!, req.params.id, CreateShipmentMilestoneSchema.parse(req.body)),
    );
  },

  async patchMilestone(req: Request, res: Response) {
    res.json(
      await milestones.patch(
        req.user!,
        req.params.id,
        req.params.milestoneId,
        PatchShipmentMilestoneSchema.parse(req.body),
      ),
    );
  },

  async completeMilestone(req: Request, res: Response) {
    res.json(
      await milestones.complete(
        req.user!,
        req.params.id,
        req.params.milestoneId,
        CompleteShipmentMilestoneSchema.parse(req.body ?? {}),
      ),
    );
  },

  async delayedShipments(req: Request, res: Response) {
    res.json(await milestones.delayed(req.user!, ListDelayedShipmentsQuerySchema.parse(req.query)));
  },

  async upcomingMilestones(req: Request, res: Response) {
    res.json(
      await milestones.upcoming(req.user!, ListUpcomingMilestonesQuerySchema.parse(req.query)),
    );
  },

  async milestoneDashboardSummary(req: Request, res: Response) {
    res.json(await milestones.dashboardSummary(req.user!));
  },

  action(action: ShipmentAction) {
    return async (req: Request, res: Response) => {
      const ws = await loadAccessible(req);
      const env = ActionEnvelope.parse(req.body);
      const schema = PAYLOAD_SCHEMAS[action];
      const payload = schema
        ? schema.parse(env.payload ?? req.body?.payload ?? req.body ?? {})
        : (env.payload ?? {});
      const effectiveReason = env.reason ?? (payload as { reason?: string }).reason;
      const result = await tradeGateway.applyShipmentAction({
        workspaceId: ws.id,
        action,
        actor: { id: req.user!.id, email: req.user!.email, role: req.user!.role as ActorRole },
        payload: payload as Record<string, unknown>,
        reason: effectiveReason,
        idempotencyKey: req.headers["idempotency-key"] as string | undefined,
        requestContext: { ip: req.ip, userAgent: req.headers["user-agent"] },
      });
      res.json({ ok: true, ...result, workspace: await service.fetchDTO(ws.id, req.user!) });
    };
  },
};
