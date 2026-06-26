/** Stable UUIDs for idempotent customer demo seed (ABC Foods Germany scenario). */
export const DEMO_IDS = {
  orgBuyer:  "00000000-0000-0000-0000-00000000ab01",
  orgPasta:  "00000000-0000-0000-0000-00000000ab10",
  orgTomato: "00000000-0000-0000-0000-00000000ab11",
  orgFlour:  "00000000-0000-0000-0000-00000000ab12",
  orgJuice:  "00000000-0000-0000-0000-00000000ab13",

  userBuyer:  "00000000-0000-0000-0000-00000000db01",
  userPasta:  "00000000-0000-0000-0000-00000000db10",
  userTomato: "00000000-0000-0000-0000-00000000db11",
  userFlour:  "00000000-0000-0000-0000-00000000db12",
  userJuice:  "00000000-0000-0000-0000-00000000db13",

  wsRfqOpen:  "00000000-0000-0000-0000-00000000d001",
  wsRfqPo:    "00000000-0000-0000-0000-00000000d002",
  wsCb:       "00000000-0000-0000-0000-00000000d003",
  wsMc:       "00000000-0000-0000-0000-00000000d004",
  wsBc:       "00000000-0000-0000-0000-00000000d005",
  wsOrder:    "00000000-0000-0000-0000-00000000d006",
  wsShipment: "00000000-0000-0000-0000-00000000d007",

  mcDetails: "00000000-0000-0000-0000-00000000d008",
  bcDetails: "00000000-0000-0000-0000-00000000d009",
  cbLot:     "00000000-0000-0000-0000-00000000d010",
  po:        "00000000-0000-0000-0000-00000000d020",

  mcLinePasta:  "00000000-0000-0000-0000-00000000d021",
  mcLineTomato: "00000000-0000-0000-0000-00000000d022",
  bcLineFlour:  "00000000-0000-0000-0000-00000000d023",
} as const;

export const DEMO_REFS = {
  rfqOpen:    "DEMO-RFQ-ABC-001",
  rfqPo:      "DEMO-RFQ-ABC-002",
  cb:         "DEMO-CB-ABC-001",
  mc:         "DEMO-MC-ABC-001",
  bc:         "DEMO-BC-ABC-001",
  order:      "ORD-DEMO-RFQ-ABC-002-00000000",
  shipment:   "SHP-ORD-DEMO-RFQ-ABC-002-00000000",
  poNumber:   "DEMO-PO-ABC-001",
} as const;

export const DEMO_EMAILS = {
  buyer:  "demo.buyer@demaxtore.com",
  pasta:  "demo.pasta@demaxtore.com",
  tomato: "demo.tomato@demaxtore.com",
  flour:  "demo.flour@demaxtore.com",
  juice:  "demo.juice@demaxtore.com",
} as const;

export const DEMO_PASSWORD = "Passw0rd!";
