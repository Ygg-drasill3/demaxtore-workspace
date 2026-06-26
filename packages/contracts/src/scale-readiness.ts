// Sprint 7A — Commercial scale readiness (portfolio, pipeline, forecast, workload)

export interface AccountOwner {
  organisationId: string;
  organisationName: string;
  operationsUserId: string | null;
  operationsUserName: string | null;
  salesUserId: string | null;
  salesUserName: string | null;
}

export interface AccountActivity {
  lastActivityAt: string | null;
  daysSinceActivity: number;
  lastEventType: string | null;
}

export interface BuyerHealth {
  organisationId: string;
  organisationName: string;
  buyerUserIds: string[];
  rfqCount: number;
  orderCount: number;
  shipmentCount: number;
  freightVolume: number;
  revenueGeneratedUsd: number;
  commercialScore: number;
  activity: AccountActivity;
  accountOwner: AccountOwner | null;
}

export interface SupplierHealth {
  organisationId: string;
  organisationName: string;
  supplierUserIds: string[];
  rfqInvitations: number;
  orderCount: number;
  shipmentCount: number;
  revenueAttributedUsd: number;
  commercialScore: number;
  activity: AccountActivity;
  accountOwner: AccountOwner | null;
}

export interface PipelineHealthItem {
  workspaceId: string;
  workspaceType: string;
  workspaceRef: string;
  state: string;
  healthScore: number;
  issues: string[];
  stalled: boolean;
}

export interface PipelineHealthSummary {
  items: PipelineHealthItem[];
  averageHealthScore: number;
  stalledCount: number;
}

export interface CommercialForecast {
  horizonDays: 30 | 60 | 90;
  expectedFreightiqRevenueUsd: number;
  expectedContainerCount: number;
  expectedOrders: number;
  expectedShipments: number;
  expectedMarginUsd: number;
  generatedAt: string;
}

export interface OperatorWorkload {
  userId: string;
  displayName: string;
  email: string;
  activeRfqs: number;
  activeOrders: number;
  activeShipments: number;
  openAlerts: number;
  openDocuments: number;
  totalLoad: number;
  overloaded: boolean;
}

export interface ExecutiveDashboard {
  activeBuyers: number;
  activeSuppliers: number;
  openRfqs: number;
  openOrders: number;
  openShipments: number;
  revenueForecast30d: CommercialForecast;
  revenueForecast60d: CommercialForecast;
  revenueForecast90d: CommercialForecast;
  topCustomers: BuyerHealth[];
  topSuppliers: SupplierHealth[];
  topRoutes: Array<{ route: string; marginUsd: number }>;
  topForwarders: Array<{ forwarder: string; revenueUsd: number }>;
}
