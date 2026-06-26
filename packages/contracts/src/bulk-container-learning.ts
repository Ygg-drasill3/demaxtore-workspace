export const BULK_CONTAINER_LEARNING = {
  summary:
    "BulkContainer is DeMaxtore's multi-supplier bulk procurement workspace for horeca, industrial, and wholesale food buyers. " +
    "Plan a 25 MT container by metric ton and technical specification — not retail pallets.",
  topics: [
    "Who is it for — horeca distributors, bakeries, manufacturers, wholesale importers",
    "Specification cards — protein, moisture, packing, origin per product type",
    "25 MT planning — add lines in metric tons with fill meter and capacity warnings",
    "Indicative pricing — USD/MT market ranges are planning guides only",
    "Submit procurement request — operations sources suppliers in future sprints",
  ],
} as const;

export const BULK_CONTAINER_PROCUREMENT_LEARNING = {
  summary:
    "BulkContainer follows operations-led managed sourcing: you build and submit, operations procures, you approve the offer, then execution begins.",
  topics: [
    "Discover bulk categories — flour, semolina, pasta, bulgur, pulses, salt",
    "Fill specification templates before adding lines",
    "Build your 25 MT container — warnings below 20 MT or above 25 MT",
    "Submit Bulk Procurement Request — status becomes Submitted",
    "No auction — use CommodityBid separately for competitive auction sourcing",
  ],
} as const;
