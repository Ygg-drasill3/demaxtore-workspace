export const MIXED_CONTAINER_EXECUTION_LEARNING = {
  summary:
    "After you approve a SmartContainer offer and complete supplier payments, DeMaxtore creates one SmartContainer Order " +
    "and coordinates execution through the standard Trade OS — Orders, FreightIQ, and Shipments. You see one unified dashboard; " +
    "the platform handles multiple supplier orders behind the scenes.",
  topics: [
    "Allocation — operations assigns each product to a supplier after offer approval",
    "Payments — you pay suppliers directly; DeMaxtore tracks confirmation",
    "Order Creation — one master SmartContainer Order (e.g. SC-2026-00001) with supplier orders per allocation",
    "FreightIQ — each supplier order becomes eligible for the existing FreightIQ workflow",
    "Shipment — standard shipment workspaces spawn from orders after freight coordination",
    "Delivery — execution completes when all linked shipments are delivered",
  ],
} as const;
