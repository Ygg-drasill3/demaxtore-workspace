// Sprint 1: mock dashboard data. Replaced by real APIs in future sprints.

export const buyerWidgets = {
  activeRfqs: { count: 7, delta: "+2 this week" },
  pendingQuotations: { count: 3, delta: "2 awaiting review" },
  activeOrders: { count: 4, delta: "1 in-transit" },
  documents: { count: 18, delta: "5 pending sign-off" },
  recentActivity: [
    { id: "a1", actor: "You", action: "created RFQ-2026-014", time: "2h ago", type: "INFO" },
    { id: "a2", actor: "Supplier — Hanwa Pacific", action: "submitted quotation Q-22-009", time: "5h ago", type: "SUCCESS" },
    { id: "a3", actor: "DeMaxtore Ops", action: "assigned 3 suppliers to RFQ-2026-013", time: "1d ago", type: "INFO" },
    { id: "a4", actor: "You", action: "approved PO-2025-0044", time: "2d ago", type: "SUCCESS" },
  ],
};

export const supplierWidgets = {
  assignedRfqs: { count: 11, delta: "+4 new this week" },
  pendingQuotations: { count: 5, delta: "2 due tomorrow" },
  activeOrders: { count: 6, delta: "3 ready to ship" },
  recentActivity: [
    { id: "s1", actor: "Buyer — Lumina Foods", action: "invited you to RFQ-2026-022", time: "1h ago", type: "INFO" },
    { id: "s2", actor: "You", action: "submitted draft quotation Q-22-031", time: "4h ago", type: "INFO" },
    { id: "s3", actor: "DeMaxtore Ops", action: "verified your KYC documents", time: "1d ago", type: "SUCCESS" },
    { id: "s4", actor: "Buyer — Verde Trading", action: "rejected quotation Q-22-027", time: "2d ago", type: "ERROR" },
  ],
};

export const adminWidgets = {
  newRfqs: { count: 14, delta: "+9 last 24h" },
  supplierAssignments: { count: 22, delta: "6 awaiting assignment" },
  openWorkspaces: { count: 41, delta: "12 in negotiation" },
  recentActivity: [
    { id: "x1", actor: "Buyer — Cobalt Imports", action: "opened RFQ-2026-028", time: "10m ago", type: "INFO" },
    { id: "x2", actor: "Ops — Priya N.", action: "assigned 4 suppliers to RFQ-2026-027", time: "1h ago", type: "INFO" },
    { id: "x3", actor: "Supplier — Hanwa Pacific", action: "completed onboarding", time: "5h ago", type: "SUCCESS" },
    { id: "x4", actor: "System", action: "flagged 2 documents for review", time: "1d ago", type: "WARNING" },
  ],
};

export const workspaceMockMeta = {
  rfq: { type: "RFQ", state: "AWAITING_QUOTATIONS", nextActionLabel: "Review supplier list" },
  commoditybid: { type: "CommodityBid", state: "OPEN_FOR_BIDS", nextActionLabel: "Invite suppliers" },
  order: { type: "Order", state: "PO_ISSUED", nextActionLabel: "Confirm shipping schedule" },
};
