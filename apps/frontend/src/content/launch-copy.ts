/**
 * Launch Readiness — customer-facing copy (no business logic).
 * Source of truth for onboarding panels and welcome messaging.
 */

export const BUYER_ONBOARDING = {
  sectionTitle: "Your first import trade",
  sectionSubtitle: {
    firstTrade: "We'll walk you through RFQ → award → PO → shipment in one auditable workspace.",
    experienced: "Guided checklist — expand when onboarding a new category or team member.",
  },
  welcomeTitle: "Welcome to your sourcing command center",
  welcomeBody:
    "DeMaxtore replaces email threads and spreadsheets with structured RFQs, sealed CommodityBid auctions, and container programmes — all tied to purchase orders and live shipment tracking.",
  steps: [
    { key: "create_rfq", label: "Create RFQ", hint: "Define products, quantities, and incoterms in a workspace." },
    { key: "receive_quotation", label: "Receive quotations", hint: "Invited suppliers submit comparable bids in one place." },
    { key: "select_supplier", label: "Award supplier", hint: "Compare price, lead time, and terms with a full audit trail." },
    { key: "issue_po", label: "Issue purchase order", hint: "PO spawns automatically — no re-keying into ERP." },
    { key: "track_shipment", label: "Track shipment", hint: "Freight selection links to maritime tracking and exceptions." },
    { key: "complete_trade", label: "Close the trade", hint: "Documents approved, delivery confirmed, trade archived." },
  ],
  ctaLearning: "Open Learning Center",
  ctaRfq: "Create your first RFQ",
} as const;

export const TURKEY_BUYER_ONBOARDING = {
  sectionTitle: "Your import journey",
  sectionSubtitle: {
    firstTrade: "Start with freight and customs, then follow the shipment through delivery and landed cost.",
    experienced: "A short reminder of how import operations work in this workspace.",
  },
  welcomeTitle: "What do I do here?",
  welcomeBody:
    "DeMaxtore manages your freight and customs operations while you follow your import journey in one operating system. DeMaxtore Operations prepares some steps; you review, select, and track them here.",
  steps: [
    { key: "create_rfq", label: "Start your import", hint: "Add your purchase or import context, or request a freight quote." },
    { key: "receive_quotation", label: "Get your freight quote", hint: "DeMaxtore Ops prepares the freight offer; review and select it in your workspace." },
    { key: "select_supplier", label: "Follow booking and shipment", hint: "Track booking, shipment and container progress from the same import journey." },
    { key: "issue_po", label: "Manage customs", hint: "Request DeMaxtore customs handling and follow broker, document and clearance progress." },
    { key: "track_shipment", label: "Follow delivery", hint: "Continue from customs clearance into inland delivery and POD." },
    { key: "complete_trade", label: "See landed cost", hint: "Review available goods, freight, customs/tax and inland cost information. Unknown values are not treated as zero." },
  ],
  ctaLearning: "Open Learning Center",
  ctaRfq: "Start import",
} as const;

export const SUPPLIER_ONBOARDING = {
  sectionTitle: "Supplier workspace guide",
  sectionSubtitle: {
    newSupplier: "You've been invited to quote — here's how to win and execute on DeMaxtore.",
    active: "Quick reference for invitations, PO acknowledgement, and document uploads.",
  },
  welcomeTitle: "Respond faster. Execute with clarity.",
  welcomeBody:
    "Buyers run structured RFQs and sealed auctions on DeMaxtore. You see only workspaces you're invited to — submit quotations, acknowledge POs, and upload compliance documents in one hub.",
  steps: [
    { key: "receive_invitation", label: "Receive invitation", hint: "RFQ or CommodityBid invite appears in your dashboard." },
    { key: "submit_offer", label: "Submit your offer", hint: "Quote line items or bid lots before the deadline." },
    { key: "accept_order", label: "Acknowledge PO", hint: "Confirm acceptance or flag issues within SLA." },
    { key: "upload_documents", label: "Upload documents", hint: "Proforma, certificates, and shipping docs per checklist." },
    { key: "complete_shipment", label: "Complete shipment", hint: "Coordinate production and hand-off to freight." },
  ],
  ctaLearning: "Supplier learning guides",
  ctaRfq: "View open opportunities",
} as const;

export const LANDING_COPY = {
  eyebrow: "B2B sourcing & import operations",
  headline: "Import operations for companies sourcing from Turkey.",
  subhead:
    "Manage quote requests, supplier offers, purchase orders, inspections, freight and shipment tracking in one place.",
  pillars: [
    {
      title: "Structured sourcing",
      body: "RFQs, Commodity Bids, Mixed Container and Bulk Container with clear supplier handoffs.",
    },
    {
      title: "Award to execution",
      body: "PO issuance, freight offers, booking and shipment visibility without spreadsheet handoffs.",
    },
    {
      title: "Operations control",
      body: "Alerts for late acknowledgements, ETA changes and document gaps — before customers escalate.",
    },
  ],
  proof: "Trusted workflow for importers, distributors, and DeMaxtore operations teams.",
  ctaPrimary: "Sign in",
  ctaSecondary: "See demo environment",
  demoNote: "Sandbox accounts available — ask your DeMaxtore contact or use seeded demo logins.",
} as const;
