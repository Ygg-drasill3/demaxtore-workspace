// apps/frontend/src/routes/navigation.ts — Sprint 10A.1 Trade OS navigation
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, FileText, Package, Bell, Workflow, Mail, Radar, GraduationCap, Route,
  ClipboardList, Ship, FileCheck, MessageSquare, Plus, Gavel, Inbox, Activity, AlertTriangle, Container, Scale, UserPlus, Users,
} from "lucide-react";
import type { Role } from "@dmx/contracts/auth";

export interface NavItem {
  to:      string;
  label:   string;
  icon:    LucideIcon;
  testId:  string;
  badge?:  number;
  end?:    boolean;
}

export interface NavGroup {
  id:     string;
  label:  string;
  testId: string;
  items:  NavItem[];
}

export interface QuickAction {
  label:  string;
  to:     string;
  testId: string;
  icon:   LucideIcon;
}

function flat(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

// ─── Buyer — Trade Operating System IA ───────────────────────────────────────

export const BUYER_NAV_GROUPS: NavGroup[] = [
  {
    id: "home", label: "Home", testId: "nav-group-home",
    items: [
      { to: "/messages", label: "Workspace Inbox", icon: Inbox, testId: "buyer-inbox", end: true },
      { to: "/buyer/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "buyer-dashboard" },
    ],
  },
  {
    id: "sourcing", label: "Sourcing", testId: "nav-group-sourcing",
    items: [
      { to: "/buyer/rfq",          label: "RFQs",           icon: FileText, testId: "buyer-rfq" },
      { to: "/buyer/commoditybid", label: "Commodity Bids", icon: Workflow, testId: "buyer-commoditybid" },
      { to: "/buyer/commoditybid/list", label: "CB Workspaces", icon: Gavel, testId: "buyer-commoditybid-list" },
      { to: "/buyer/mixed-container", label: "Mixed Container", icon: Container, testId: "buyer-mixed-container" },
      { to: "/buyer/bulk-container", label: "Bulk Container", icon: Scale, testId: "buyer-bulk-container" },
    ],
  },
  {
    id: "execution", label: "Execution", testId: "nav-group-execution",
    items: [
      { to: "/buyer/purchase-orders", label: "Purchase Orders", icon: ClipboardList, testId: "buyer-purchase-orders" },
      { to: "/buyer/orders",          label: "Orders",          icon: Package,       testId: "buyer-orders" },
      { to: "/buyer/freightiq",       label: "FreightIQ",       icon: Route,         testId: "buyer-freightiq" },
      { to: "/buyer/shipments",      label: "My Shipments",    icon: Ship,          testId: "buyer-shipments" },
      { to: "/buyer/control-tower",  label: "Import Control Tower", icon: Radar,    testId: "buyer-control-tower" },
      { to: "/exceptions",           label: "Exceptions",      icon: AlertTriangle, testId: "buyer-exceptions" },
    ],
  },
  {
    id: "collaboration", label: "Collaboration", testId: "nav-group-collaboration",
    items: [
      { to: "/messages",  label: "Messages",      icon: MessageSquare, testId: "buyer-messages" },
      { to: "/notifications",   label: "Notifications", icon: Bell,          testId: "buyer-notifications" },
    ],
  },
  {
    id: "documents", label: "Documents", testId: "nav-group-documents",
    items: [
      { to: "/documents",            label: "Documents",       icon: FileCheck, testId: "buyer-documents" },
      { to: "/buyer/trade-documents", label: "Compliance",      icon: FileCheck, testId: "buyer-trade-documents" },
    ],
  },
  {
    id: "knowledge", label: "Knowledge", testId: "nav-group-knowledge",
    items: [
      { to: "/learning", label: "Learning Center", icon: GraduationCap, testId: "buyer-learning" },
    ],
  },
];

export const BUYER_QUICK_ACTIONS: QuickAction[] = [
  { label: "Create Bid",         to: "/buyer/commoditybid/new",   testId: "qa-create-cb",        icon: Gavel },
  { label: "New RFQ",            to: "/buyer/rfq/new",           testId: "qa-new-rfq",          icon: Plus },
  { label: "Mixed Container",    to: "/buyer/mixed-container",   testId: "qa-mixed-container",  icon: Container },
  { label: "Open Messages",      to: "/messages",            testId: "qa-open-messages",    icon: MessageSquare },
  { label: "My Shipments",       to: "/shipments/portfolio",       testId: "qa-view-shipments",   icon: Ship },
  { label: "Open Documents",     to: "/documents",                 testId: "qa-open-documents",   icon: FileCheck },
];

// ─── Supplier — Trade OS navigation (Sprint 10B) ───────────────────────────

export const SUPPLIER_NAV_GROUPS: NavGroup[] = [
  {
    id: "home", label: "Home", testId: "nav-group-home",
    items: [
      { to: "/supplier/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "supplier-dashboard", end: true },
    ],
  },
  {
    id: "opportunities", label: "Opportunities", testId: "nav-group-opportunities",
    items: [
      { to: "/supplier/rfq",          label: "RFQ Invitations",     icon: FileText, testId: "supplier-rfq" },
      { to: "/supplier/commoditybid", label: "CommodityBid Auctions", icon: Workflow, testId: "supplier-commoditybid" },
    ],
  },
  {
    id: "execution", label: "Execution", testId: "nav-group-execution",
    items: [
      { to: "/supplier/purchase-orders", label: "Purchase Orders", icon: ClipboardList, testId: "supplier-purchase-orders" },
      { to: "/supplier/orders",          label: "Orders",          icon: Package,       testId: "supplier-orders" },
      { to: "/supplier/freightiq",       label: "FreightIQ",       icon: Route,         testId: "supplier-freightiq" },
      { to: "/shipments/portfolio",  label: "My Shipments",    icon: Ship,          testId: "supplier-shipments" },
    ],
  },
  {
    id: "collaboration", label: "Collaboration", testId: "nav-group-collaboration",
    items: [
      { to: "/messages", label: "Messages",      icon: MessageSquare, testId: "supplier-messages" },
      { to: "/notifications",     label: "Notifications", icon: Bell,          testId: "supplier-notifications" },
    ],
  },
  {
    id: "documents", label: "Documents", testId: "nav-group-documents",
    items: [
      { to: "/supplier/trade-documents", label: "Trade Documents", icon: FileCheck, testId: "supplier-trade-documents" },
    ],
  },
  {
    id: "knowledge", label: "Knowledge", testId: "nav-group-knowledge",
    items: [
      { to: "/learning", label: "Learning Center", icon: GraduationCap, testId: "supplier-learning" },
    ],
  },
];

export const SUPPLIER_QUICK_ACTIONS: QuickAction[] = [
  { label: "Open RFQs",      to: "/supplier/rfq",            testId: "sqa-open-rfqs",      icon: Inbox },
  { label: "Join Auction",   to: "/supplier/commoditybid",   testId: "sqa-join-auction",   icon: Gavel },
  { label: "View Orders",    to: "/supplier/orders",         testId: "sqa-view-orders",    icon: Package },
  { label: "Open Messages",  to: "/messages",       testId: "sqa-open-messages",  icon: MessageSquare },
  { label: "Upload Docs",    to: "/supplier/trade-documents", testId: "sqa-upload-docs",    icon: FileCheck },
];

// ─── Admin — operations-first grouping ─────────────────────────────────────

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "home", label: "Home", testId: "nav-group-home",
    items: [
      { to: "/admin/dashboard", label: "Command Center", icon: LayoutDashboard, testId: "admin-dashboard", end: true },
      { to: "/sales/dashboard", label: "Sales Control", icon: Users, testId: "admin-sales-control" },
    ],
  },
  {
    id: "operations", label: "Operations", testId: "nav-group-operations",
    items: [
      { to: "/operations",                       label: "Operations center",  icon: Radar,           testId: "admin-operations" },
      { to: "/operations/freight",               label: "Freight ops",        icon: Package,         testId: "admin-freight-ops" },
      { to: "/operations/reference-freight",      label: "Reference freight",  icon: Ship,            testId: "admin-reference-freight" },
      { to: "/operations/freight-commercial",    label: "Freight commercial", icon: Package,         testId: "admin-freight-commercial" },
      { to: "/operations/executive",             label: "Executive",          icon: LayoutDashboard, testId: "admin-executive" },
      { to: "/operations/growth",                label: "Growth",             icon: Workflow,        testId: "admin-growth" },
      { to: "/operations/market-intelligence",   label: "Market intel",       icon: Radar,           testId: "admin-market-intelligence" },
      { to: "/operations/system",                label: "System",             icon: LayoutDashboard, testId: "admin-system-ops" },
      { to: "/onboarding",                       label: "Onboarding",         icon: Route,           testId: "admin-onboarding" },
      { to: "/operations/forwarders",            label: "Forwarders",         icon: Mail,            testId: "admin-forwarders" },
      { to: "/operations/shippers",              label: "Shippers",           icon: Ship,            testId: "admin-shippers" },
    ],
  },
  {
    id: "workspaces", label: "Workspaces", testId: "nav-group-workspaces",
    items: [
      { to: "/admin/rfq",          label: "RFQs",           icon: FileText,        testId: "admin-rfq" },
      { to: "/admin/commoditybid", label: "Commodity Bids", icon: Workflow,        testId: "admin-commoditybid" },
      { to: "/admin/freightiq",         label: "FreightIQ", icon: Route, testId: "admin-freightiq" },
      { to: "/admin/conversations",     label: "All Conversations", icon: MessageSquare, testId: "admin-conversations" },
      { to: "/messages?channel=WHATSAPP",    label: "WhatsApp Inbox",    icon: MessageSquare, testId: "admin-whatsapp-inbox" },
      { to: "/operations/freight-intake", label: "Freight operations (ops)", icon: Route, testId: "admin-freight-intake" },
      { to: "/admin/orders",       label: "Orders",         icon: Package,         testId: "admin-orders" },
      { to: "/admin/mixed-container", label: "Mixed Containers", icon: Container, testId: "admin-mixed-container" },
      { to: "/admin/mixed-container/allocations", label: "MC Allocations", icon: Container, testId: "admin-mixed-container-allocations" },
      { to: "/admin/mixed-container/catalog", label: "MC Catalog", icon: Container, testId: "admin-mixed-container-catalog" },
      { to: "/admin/bulk-container", label: "Bulk Containers", icon: Scale, testId: "admin-bulk-container" },
      { to: "/admin/bulk-container/allocations", label: "BC Allocations", icon: Scale, testId: "admin-bulk-container-allocations" },
      { to: "/admin/bulk-container/catalog", label: "BC Catalog", icon: Scale, testId: "admin-bulk-container-catalog" },
    ],
  },
  {
    id: "collaboration", label: "Collaboration", testId: "nav-group-collaboration",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell, testId: "admin-notifications" },
      { to: "/learning",      label: "Learning Center", icon: GraduationCap, testId: "admin-learning" },
    ],
  },
];

export const SALES_CONTROL_NAV_GROUPS: NavGroup[] = [
  {
    id: "home", label: "Sales Control Center", testId: "nav-group-sales-control",
    items: [
      { to: "/sales/dashboard", label: "Customer accounts", icon: UserPlus, testId: "sales-control-dashboard", end: true },
      { to: "/sales/rfq", label: "Customer RFQs", icon: FileText, testId: "sales-control-rfq" },
      { to: "/sales/control-tower", label: "Import Control Tower", icon: Radar, testId: "sales-control-tower" },
    ],
  },
  {
    id: "oversight", label: "Portfolio oversight", testId: "nav-group-sales-oversight",
    items: [
      { to: "/shipments/portfolio", label: "All shipments", icon: Ship, testId: "sales-shipments" },
      { to: "/exceptions", label: "Exceptions", icon: AlertTriangle, testId: "sales-exceptions" },
      { to: "/documents", label: "Documents", icon: FileCheck, testId: "sales-documents" },
    ],
  },
  {
    id: "collaboration", label: "Help", testId: "nav-group-sales-help",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell, testId: "sales-notifications" },
      { to: "/learning", label: "Learning Center", icon: GraduationCap, testId: "sales-learning" },
    ],
  },
];

export const NAV_GROUPS_BY_ROLE: Record<Role, NavGroup[]> = {
  BUYER:              BUYER_NAV_GROUPS,
  SUPPLIER:           SUPPLIER_NAV_GROUPS,
  ADMIN:              ADMIN_NAV_GROUPS,
  SALES_CONTROL:      SALES_CONTROL_NAV_GROUPS,
  SUPER_ADMIN:        ADMIN_NAV_GROUPS,
  OPS_MANAGER:        ADMIN_NAV_GROUPS,
  LOGISTICS_OPERATOR: ADMIN_NAV_GROUPS,
  FINANCE_OPERATOR:   ADMIN_NAV_GROUPS,
  DOCUMENT_CONTROLLER: ADMIN_NAV_GROUPS,
  FORWARDER:          [{ id: "forwarder", label: "Portal", testId: "nav-group-forwarder", items: [
    { to: "/forwarder/dashboard", label: "Shipments", icon: Ship, testId: "forwarder-shipments" },
    { to: "/notifications", label: "Notifications", icon: Bell, testId: "forwarder-notifications" },
  ]}],
};

export const SALES_CONTROL_QUICK_ACTIONS: QuickAction[] = [
  { label: "New customer", to: "/sales/dashboard", icon: UserPlus, testId: "scqa-new-customer" },
  { label: "Customer RFQs", to: "/sales/rfq", icon: FileText, testId: "scqa-rfqs" },
  { label: "Control Tower", to: "/sales/control-tower", icon: Radar, testId: "scqa-control-tower" },
  { label: "Exceptions", to: "/exceptions", icon: AlertTriangle, testId: "scqa-exceptions" },
  { label: "Shipments", to: "/shipments/portfolio", icon: Ship, testId: "scqa-shipments" },
];

export const ADMIN_QUICK_ACTIONS: QuickAction[] = [
  { label: "Action Inbox",    to: "/admin/dashboard#oc-action-inbox", icon: AlertTriangle, testId: "aqa-action-inbox" },
  { label: "Control Tower",   to: "/operations",                      icon: Radar,         testId: "aqa-control-tower" },
  { label: "RFQ Triage",      to: "/admin/rfq",                       icon: Inbox,         testId: "aqa-rfq-triage" },
  { label: "Freight Ops",     to: "/operations/freight",              icon: Ship,          testId: "aqa-freight-ops" },
  { label: "Trade Board",     to: "/admin/dashboard#oc-trade-board",  icon: Activity,      testId: "aqa-trade-board" },
];

export const QUICK_ACTIONS_BY_ROLE: Partial<Record<Role, QuickAction[]>> = {
  BUYER:         BUYER_QUICK_ACTIONS,
  SUPPLIER:      SUPPLIER_QUICK_ACTIONS,
  ADMIN:         ADMIN_QUICK_ACTIONS,
  SALES_CONTROL: SALES_CONTROL_QUICK_ACTIONS,
};

/** Flat nav for backward-compatible consumers (E2E, tests). */
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  BUYER:              flat(BUYER_NAV_GROUPS),
  SUPPLIER:           flat(SUPPLIER_NAV_GROUPS),
  ADMIN:              flat(ADMIN_NAV_GROUPS),
  SALES_CONTROL:      flat(SALES_CONTROL_NAV_GROUPS),
  SUPER_ADMIN:        flat(ADMIN_NAV_GROUPS),
  OPS_MANAGER:        flat(ADMIN_NAV_GROUPS),
  LOGISTICS_OPERATOR: flat(ADMIN_NAV_GROUPS),
  FINANCE_OPERATOR:   flat(ADMIN_NAV_GROUPS),
  DOCUMENT_CONTROLLER: flat(ADMIN_NAV_GROUPS),
  FORWARDER:          flat(NAV_GROUPS_BY_ROLE.FORWARDER),
};
