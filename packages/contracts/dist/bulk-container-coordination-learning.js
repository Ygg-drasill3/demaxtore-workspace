export const BULK_PAYMENTS_LEARNING = {
    summary: "BulkContainer payments are direct buyer-to-supplier. DeMaxtore coordinates allocation, proforma collection, and payment confirmation — no payment gateway on the platform.",
    topics: [
        "After offer approval, operations assigns anonymous allocations (Allocation 1, 2, 3)",
        "Operations uploads supplier proformas — buyers download PDF/Excel documents",
        "Buyers pay suppliers directly via bank transfer using proforma details",
        "Operations marks payments confirmed once proof is received offline",
        "All allocations confirmed → workspace reaches Execution Ready (Sprint 13E spawns orders)",
    ],
};
export const BULK_SUPPLIER_HIDDEN_LEARNING = {
    summary: "Supplier identities are never shown to buyers in BulkContainer. Operations uses internal codes; buyers see allocation references only.",
    topics: [
        "Operations sees SUP-001, SUP-002 — mapped to offline supplier relationships",
        "Buyer coordination page shows Allocation 1, Allocation 2 — no supplier names",
        "Proformas and payments are linked to allocation references, not supplier codes",
        "This protects supplier relationships and keeps the platform coordination-only",
        "Execution in Sprint 13E continues without exposing supplier portal access",
    ],
};
export const BULK_PRE_EXECUTION_LEARNING = {
    summary: "Before execution, every approved BulkContainer must complete allocation, proforma, and payment gates. Execution Ready means all coordination is complete.",
    topics: [
        "BC_APPROVED → allocation → proforma collection → payment tracking → execution ready",
        "Every product line must be fully allocated across suppliers (MT quantities)",
        "Every allocation needs an uploaded proforma before payment tracking begins",
        "Every payment must be PAYMENT_CONFIRMED before BC_EXECUTION_READY",
        "Orders, freight, and shipments are spawned in Sprint 13E — not before execution ready",
    ],
};
