export const PACKING_TYPE_LEARNING = {
  summary:
    "Packing Type is a mandatory product attribute that defines the commercial SKU format — " +
    "the exact package size or weight you are sourcing. Every request, offer, and shipment line must specify one.",
  topics: [
    "Product ≠ Commercial SKU — Pasta 500g and Pasta 1kg are different commercial products",
    "Pricing — unit economics and pallet/MT calculations depend on packing format",
    "Logistics — container fill planning uses packing dimensions and weights",
    "Container planning — SmartContainer pallets and BulkContainer MT both require packing context",
    "Supplier selection — suppliers quote and allocate against specific packing types",
  ],
} as const;
