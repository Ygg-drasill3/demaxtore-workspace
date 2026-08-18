// Role-aware navigation configuration. Sprint 1: real routes for Dashboard,
// Notifications, and the workspace placeholders. Other links route to a generic
// "Coming in Sprint 2" placeholder page so the menu items exist as required.

import {
  LayoutDashboard,
  FileSearch,
  Gavel,
  PackageCheck,
  FolderOpenDot,
  Bell,
  ShieldCheck,
  Building2,
  Settings,
  Inbox,
  ListChecks,
} from "lucide-react";

export const ROLES = { BUYER: "buyer", SUPPLIER: "supplier", ADMIN: "admin" };

export const dashboardPathFor = (role) => {
  if (role === ROLES.BUYER) return "/buyer/dashboard";
  if (role === ROLES.SUPPLIER) return "/supplier/dashboard";
  if (role === ROLES.ADMIN) return "/admin/dashboard";
  return "/login";
};

export const NAV_BY_ROLE = {
  buyer: [
    { label: "Dashboard", to: "/buyer/dashboard", icon: LayoutDashboard, key: "buyer-dashboard" },
    { label: "RFQ Workspaces", to: "/buyer/rfq", icon: FileSearch, key: "buyer-rfq" },
    { label: "CommodityBid", to: "/buyer/commoditybid", icon: Gavel, key: "buyer-cb" },
    { label: "Orders", to: "/buyer/orders", icon: PackageCheck, key: "buyer-orders" },
    { label: "Documents", to: "/buyer/documents", icon: FolderOpenDot, key: "buyer-docs" },
    { label: "Notifications", to: "/notifications", icon: Bell, key: "buyer-notifs" },
  ],
  supplier: [
    { label: "Dashboard", to: "/supplier/dashboard", icon: LayoutDashboard, key: "sup-dashboard" },
    { label: "Assigned RFQs", to: "/supplier/rfq", icon: Inbox, key: "sup-rfq" },
    { label: "CommodityBid Invites", to: "/supplier/commoditybid", icon: Gavel, key: "sup-cb" },
    { label: "Orders", to: "/supplier/orders", icon: PackageCheck, key: "sup-orders" },
    { label: "Documents", to: "/supplier/documents", icon: FolderOpenDot, key: "sup-docs" },
    { label: "Notifications", to: "/notifications", icon: Bell, key: "sup-notifs" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin/dashboard", icon: LayoutDashboard, key: "adm-dashboard" },
    { label: "RFQs", to: "/admin/rfq", icon: FileSearch, key: "adm-rfq" },
    { label: "CommodityBids", to: "/admin/commoditybid", icon: Gavel, key: "adm-cb" },
    { label: "Orders", to: "/admin/orders", icon: PackageCheck, key: "adm-orders" },
    { label: "Suppliers", to: "/admin/suppliers", icon: Building2, key: "adm-suppliers" },
    { label: "Documents", to: "/admin/documents", icon: FolderOpenDot, key: "adm-docs" },
    { label: "Notifications", to: "/notifications", icon: Bell, key: "adm-notifs" },
    { label: "Settings", to: "/admin/settings", icon: Settings, key: "adm-settings" },
  ],
};

export const ROLE_LABEL = {
  buyer: "Buyer",
  supplier: "Supplier",
  admin: "Administrator",
};

export const ROLE_ICON = {
  buyer: ShieldCheck,
  supplier: ListChecks,
  admin: Building2,
};
