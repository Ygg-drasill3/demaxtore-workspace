import { OrderService } from "../order/order.service.js";
import { ShipmentService } from "../shipment/shipment.service.js";
/**
 * Unified FSM entrypoint for UI/API actions.
 * Delegates to Order/Shipment services which post-notify the orchestrator when enabled.
 */
export class TradeActionGateway {
    orders;
    shipments;
    constructor(db) {
        this.orders = new OrderService(db);
        this.shipments = new ShipmentService(db);
    }
    applyOrderAction(input) {
        return this.orders.applyTransition({
            ...input,
            actor: input.actor,
        });
    }
    applyShipmentAction(input) {
        return this.shipments.applyTransition({
            ...input,
            actor: input.actor,
        });
    }
}
//# sourceMappingURL=trade-action.gateway.js.map