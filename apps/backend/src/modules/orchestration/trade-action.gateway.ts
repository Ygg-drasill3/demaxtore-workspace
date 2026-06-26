import type { PrismaClient } from "@prisma/client";
import type { OrderAction } from "@dmx/contracts/order.fsm";
import type { ShipmentAction } from "@dmx/contracts/shipment.fsm";
import type { ActorRole } from "@dmx/contracts/rfq.fsm";
import { OrderService } from "../order/order.service.js";
import { ShipmentService } from "../shipment/shipment.service.js";

export type TransitionActor = { id: string; email: string; role: ActorRole | "SYSTEM" };

/**
 * Unified FSM entrypoint for UI/API actions.
 * Delegates to Order/Shipment services which post-notify the orchestrator when enabled.
 */
export class TradeActionGateway {
  private readonly orders: OrderService;
  private readonly shipments: ShipmentService;

  constructor(db: PrismaClient) {
    this.orders = new OrderService(db);
    this.shipments = new ShipmentService(db);
  }

  applyOrderAction(input: {
    workspaceId: string;
    action: OrderAction;
    actor: TransitionActor;
    payload?: Record<string, unknown>;
    reason?: string;
    idempotencyKey?: string;
    requestContext?: { ip?: string; userAgent?: string };
  }) {
    return this.orders.applyTransition({
      ...input,
      actor: input.actor as { id: string; email: string; role: ActorRole },
    });
  }

  applyShipmentAction(input: {
    workspaceId: string;
    action: ShipmentAction;
    actor: TransitionActor;
    payload?: Record<string, unknown>;
    reason?: string;
    idempotencyKey?: string;
    requestContext?: { ip?: string; userAgent?: string };
  }) {
    return this.shipments.applyTransition({
      ...input,
      actor: input.actor as { id: string; email: string; role: ActorRole },
    });
  }
}
