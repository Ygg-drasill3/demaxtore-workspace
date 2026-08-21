// apps/frontend/src/routes/index.tsx
import { Suspense } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { ROLE_DASHBOARD, OPERATIONS_PLATFORM_ROLES } from "@dmx/contracts/auth";
import { PageSkeleton } from "@/components/ui/SkeletonLoader";
import { useAuthGate } from "@/hooks/useAuthGate";
import { AuthLoadingScreen } from "@/components/ui/AuthLoadingScreen";

import AuthLayout from "@/layouts/AuthLayout";
import AppLayout  from "@/layouts/AppLayout";
import EmbedShellLayout from "@/layouts/EmbedShellLayout";
import PasswordlessLayout from "@/layouts/PasswordlessLayout";
import { RequireAuth } from "./guards/RequireAuth";
import { RequireRole } from "./guards/RequireRole";
import {
  RequireTurkeyFreightOrOrderScope,
  RequireTurkeyImporter,
} from "./guards/RequireBuyerOperatingModel";

const AdminMixedContainerInboxPage = lazy(() => import("@/features/mixed-container/pages/AdminMixedContainerInboxPage"));
const AdminMixedContainerProcurementPage = lazy(() => import("@/features/mixed-container/pages/AdminMixedContainerProcurementPage"));
const AdminMixedContainerAllocationsPage = lazy(() => import("@/features/mixed-container/pages/AdminMixedContainerAllocationsPage"));
const MixedContainerCoordinationPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerCoordinationPage"));
const MixedContainerExecutionPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerExecutionPage"));
const MixedContainerOrganizationPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerOrganizationPage"));
const AdminMixedContainerOrganizationPage = lazy(() => import("@/features/mixed-container/pages/AdminMixedContainerOrganizationPage"));
const MixedContainerOfferPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerOfferPage"));
const MixedContainerHomePage = lazy(() => import("@/features/mixed-container/pages/MixedContainerHomePage"));
const CatalogCategoriesPage = lazy(() => import("@/features/mixed-container/pages/CatalogCategoriesPage"));
const CatalogProductsPage = lazy(() => import("@/features/mixed-container/pages/CatalogProductsPage"));
const CatalogProductDetailPage = lazy(() => import("@/features/mixed-container/pages/CatalogProductDetailPage"));
const CatalogSearchPage = lazy(() => import("@/features/mixed-container/pages/CatalogSearchPage"));
const SmartContainerDiscoveryLayout = lazy(() => import("@/features/mixed-container/layouts/SmartContainerDiscoveryLayout"));
const MixedContainerRequestsPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerRequestsPage"));
const MixedContainerBuilderPage = lazy(() => import("@/features/mixed-container/pages/MixedContainerBuilderPage"));
const CatalogAdminPage = lazy(() => import("@/features/mixed-container/pages/CatalogAdminPage"));
const BulkContainerHomePage = lazy(() => import("@/features/bulk-container/pages/BulkContainerHomePage"));
const BulkCatalogCategoriesPage = lazy(() => import("@/features/bulk-container/pages/BulkCatalogCategoriesPage"));
const BulkCatalogProductsPage = lazy(() => import("@/features/bulk-container/pages/BulkCatalogProductsPage"));
const BulkContainerRequestsPage = lazy(() => import("@/features/bulk-container/pages/BulkContainerRequestsPage"));
const BulkContainerBuilderPage = lazy(() => import("@/features/bulk-container/pages/BulkContainerBuilderPage"));
const BulkCatalogAdminPage = lazy(() => import("@/features/bulk-container/pages/BulkCatalogAdminPage"));
const AdminBulkContainerInboxPage = lazy(() => import("@/features/bulk-container/pages/AdminBulkContainerInboxPage"));
const AdminBulkContainerProcurementPage = lazy(() => import("@/features/bulk-container/pages/AdminBulkContainerProcurementPage"));
const BulkContainerOfferPage = lazy(() => import("@/features/bulk-container/pages/BulkContainerOfferPage"));
const AdminBulkContainerAllocationsPage = lazy(() => import("@/features/bulk-container/pages/AdminBulkContainerAllocationsPage"));
const BulkContainerCoordinationPage = lazy(() => import("@/features/bulk-container/pages/BulkContainerCoordinationPage"));
const BulkContainerExecutionPage = lazy(() => import("@/features/bulk-container/pages/BulkContainerExecutionPage"));
const PackingTypesAdminPage = lazy(() => import("@/features/packing-type/pages/PackingTypesAdminPage"));

const LoginPage          = lazy(() => import("@/features/auth/pages/LoginPage"));
const RegisterPage       = lazy(() => import("@/features/auth/pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage  = lazy(() => import("@/features/auth/pages/ResetPasswordPage"));
const LandingPage        = lazy(() => import("@/features/marketing/pages/LandingPage"));

const BuyerDashboardPage    = lazy(() => import("@/features/dashboard/pages/BuyerDashboardPage"));
const SupplierDashboardPage = lazy(() => import("@/features/dashboard/pages/SupplierDashboardPage"));
const AdminDashboardPage    = lazy(() => import("@/features/dashboard/pages/AdminDashboardPage"));
const PhoneVerificationQueuePage = lazy(() => import("@/features/phone-verification/pages/PhoneVerificationQueuePage"));

const NotificationsPage  = lazy(() => import("@/features/notifications/pages/NotificationsPage"));
const NotFoundPage       = lazy(() => import("@/features/system/NotFoundPage"));

const RfqListPage      = lazy(() => import("@/features/rfq/pages/RfqListPage"));
const RfqCreatePage    = lazy(() => import("@/features/rfq/pages/RfqCreatePage"));
const RfqWorkspacePage = lazy(() => import("@/features/rfq/pages/RfqWorkspacePage"));
const ProcurementStrategyPage = lazy(() => import("@/features/rfq/pages/ProcurementStrategyPage"));
const CommodityBidListPage = lazy(() => import("@/features/commoditybid/pages/CommodityBidListPage"));
const CommodityBidEmbedPage = lazy(() => import("@/features/commoditybid/pages/CommodityBidEmbedPage"));
const CommodityBidCreateEmbedPage = lazy(() =>
  import("@/features/commoditybid/pages/CommodityBidEmbedPage").then((m) => ({
    default: m.CommodityBidCreateEmbedPage,
  })),
);
const CommodityBidWorkspacePage = lazy(() => import("@/features/commoditybid/pages/CommodityBidWorkspacePage"));
const OrderWorkspacePage = lazy(() => import("@/features/order/pages/OrderWorkspacePage"));
const OrdersListPage = lazy(() => import("@/features/order/pages/OrdersListPage"));
const ShipmentWorkspacePage = lazy(() => import("@/features/shipment/pages/ShipmentWorkspacePage"));
const OperationsPage = lazy(() => import("@/features/control-tower/pages/OperationsPage"));
const PoWorkspacePage = lazy(() => import("@/features/purchase-order/pages/PoWorkspacePage"));
const PoListPage = lazy(() => import("@/features/purchase-order/pages/PoListPage"));
const ProductListPage = lazy(() => import("@/features/product-master/pages/ProductListPage"));
const ProductDetailPage = lazy(() => import("@/features/product-master/pages/ProductDetailPage"));
const CreatePurchaseOrderPage = lazy(() => import("@/features/purchase-order/pages/CreatePurchaseOrderPage"));
const ShipmentsListPage = lazy(() => import("@/features/shipment/pages/ShipmentsListPage"));
const ShipmentPortfolioPage = lazy(() => import("@/features/shipment/pages/ShipmentPortfolioPage"));
const TradeDocumentsListPage = lazy(() => import("@/features/trade-documents/pages/TradeDocumentsListPage"));
const UnifiedMessagesPage = lazy(() => import("@/features/unified-messages/pages/UnifiedMessagesPage"));
const FreightIqEmbedPage = lazy(() => import("@/features/freightiq/pages/FreightIqEmbedPage"));
const FreightOpsPage = lazy(() => import("@/features/freightiq/pages/FreightOpsPage"));
const FreightCommercialPage = lazy(() => import("@/features/freightiq/pages/FreightCommercialPage"));
const ForwardersPage = lazy(() => import("@/features/freightiq/pages/ForwardersPage"));
const FreightRfqIntakePage = lazy(() => import("@/features/freightiq/pages/FreightOpsPage"));
const ShippersPage = lazy(() => import("@/features/freightiq/pages/ShippersPage"));
const ExecutivePage = lazy(() => import("@/features/scale/pages/ExecutivePage"));
const GrowthPage = lazy(() => import("@/features/growth/pages/GrowthPage"));
const MarketIntelligencePage = lazy(() => import("@/features/market/pages/MarketIntelligencePage"));
const SystemOperationsPage = lazy(() => import("@/features/system/pages/SystemOperationsPage"));
const AdminReferenceFreightRatesPage = lazy(() => import("@/features/reference-freight/pages/AdminReferenceFreightRatesPage"));
const TradeWorkspacePage = lazy(() => import("@/features/trade/pages/TradeWorkspacePage"));
const DocumentCenterPage = lazy(() => import("@/features/document-center/pages/DocumentCenterPage"));
const DocumentDetailPage = lazy(() => import("@/features/document-center/pages/DocumentDetailPage"));
const TradeDocumentsPanelPage = lazy(() => import("@/features/document-center/pages/TradeDocumentsPanelPage"));
const ExceptionHubPage = lazy(() => import("@/features/exception-hub/pages/ExceptionHubPage"));
const ExceptionDetailPage = lazy(() => import("@/features/exception-hub/pages/ExceptionDetailPage"));
const LearningCenterPage = lazy(() => import("@/features/onboarding/pages/LearningCenterPage"));
const OnboardingDashboardPage = lazy(() => import("@/features/onboarding/pages/OnboardingDashboardPage"));
const SalesControlDashboardPage = lazy(() => import("@/features/sales-control/pages/SalesControlDashboardPage"));
const ControlTowerDashboardPage = lazy(() => import("@/features/import-control-tower/pages/ControlTowerDashboard"));
const ForwarderDashboardPage = lazy(() => import("@/features/forwarder/pages/ForwarderDashboardPage"));
const ForwarderShipmentPage = lazy(() => import("@/features/forwarder/pages/ForwarderShipmentPage"));
const PartnerHomePage = lazy(() => import("@/features/partner-workspace/pages/PartnerHomePage"));
const PartnerTransactionsPage = lazy(() => import("@/features/partner-workspace/pages/PartnerTransactionsPage"));
const PartnerTransactionDetailPage = lazy(() => import("@/features/partner-workspace/pages/PartnerTransactionDetailPage"));
const PartnerCustomsCasesPage = lazy(() => import("@/features/partner-workspace/pages/PartnerCustomsCasesPage"));
const PartnerInlandDeliveriesPage = lazy(() => import("@/features/partner-workspace/pages/PartnerInlandDeliveriesPage"));
const CustomsListPage = lazy(() => import("@/features/customs/pages/CustomsListPage"));
const CustomsCasePage = lazy(() => import("@/features/customs/pages/CustomsCasePage"));
const InlandListPage = lazy(() => import("@/features/inland/pages/InlandListPage"));
const InlandDeliveryPage = lazy(() => import("@/features/inland/pages/InlandDeliveryPage"));
const LandedCostListPage = lazy(() => import("@/features/landed-cost/pages/LandedCostListPage"));
const LandedCostDetailPage = lazy(() => import("@/features/landed-cost/pages/LandedCostDetailPage"));
const StartImportPage = lazy(() => import("@/features/import-ops/pages/StartImportPage"));
const FreightQuoteRequestPage = lazy(() => import("@/features/import-ops/pages/FreightQuoteRequestPage"));
const ActiveImportsPage = lazy(() => import("@/features/import-ops/pages/ActiveImportsPage"));
const ImportWorkspacePage = lazy(() => import("@/features/import-ops/pages/ImportWorkspacePage"));
const PasswordlessConversationPage = lazy(() =>
  import("@/features/passwordless-access/pages/PasswordlessConversationPage"),
);

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}

function LegacyConversationRedirect({ query = "" }: { query?: string }) {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const dest = conversationId ? `/messages/${conversationId}` : `/messages${query ? `?${query}` : ""}`;
  return <Navigate to={dest} replace />;
}

/**
 * Bounces "/" to the right dashboard for the current role.
 * Unauth: -> /login. Auth: -> ROLE_DASHBOARD[user.role].
 */
function RootRedirect() {
  const { loading, timedOut, retry, isAuthenticated, user } = useAuthGate();
  const location = useLocation();
  if (loading) {
    return <AuthLoadingScreen timedOut={timedOut} onRetry={retry} />;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/welcome" replace state={{ from: location }} />;
  }
  return <Navigate to={ROLE_DASHBOARD[user.role]} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* ─── Public ─────────────────────────────────────── */}
      <Route path="/welcome" element={<LazyPage><LandingPage /></LazyPage>} />
      <Route element={<AuthLayout />}>
        <Route path="/login"           element={<LazyPage><LoginPage /></LazyPage>} />
        <Route path="/register"        element={<LazyPage><RegisterPage /></LazyPage>} />
        <Route path="/forgot-password" element={<LazyPage><ForgotPasswordPage /></LazyPage>} />
        <Route path="/reset-password"  element={<LazyPage><ResetPasswordPage /></LazyPage>} />
      </Route>

      <Route element={<PasswordlessLayout />}>
        <Route path="/access/conversation" element={<LazyPage><PasswordlessConversationPage /></LazyPage>} />
      </Route>

      {/* ─── Authenticated shell ────────────────────────── */}
      <Route element={<RequireAuth />}>
        {/* Tam ekran harici panel embed (FreightIQ dashboard) */}
        <Route element={<EmbedShellLayout />}>
          <Route element={<RequireRole allow={["BUYER"]} />}>
            <Route element={<RequireTurkeyFreightOrOrderScope />}>
              <Route path="/buyer/freightiq" element={<LazyPage><FreightIqEmbedPage /></LazyPage>} />
            </Route>
            <Route path="/buyer/commoditybid/new" element={<LazyPage><CommodityBidCreateEmbedPage /></LazyPage>} />
          </Route>
          <Route element={<RequireRole allow={["SUPPLIER"]} />}>
            <Route path="/supplier/freightiq" element={<LazyPage><FreightIqEmbedPage /></LazyPage>} />
          </Route>
          <Route element={<RequireRole allow={["ADMIN"]} />}>
            <Route path="/admin/freightiq" element={<LazyPage><FreightIqEmbedPage /></LazyPage>} />
            <Route path="/admin/freight-ops" element={<LazyPage><FreightRfqIntakePage /></LazyPage>} />
            <Route path="/admin/conversations" element={<Navigate to="/messages" replace />} />
            <Route path="/admin/conversations/:conversationId" element={<LegacyConversationRedirect />} />
            <Route path="/admin/whatsapp-inbox" element={<Navigate to="/messages?channel=WHATSAPP" replace />} />
            <Route path="/admin/whatsapp-inbox/:conversationId" element={<LegacyConversationRedirect />} />
            <Route path="/operations/freight-intake" element={<LazyPage><FreightRfqIntakePage /></LazyPage>} />
          </Route>
        </Route>

        <Route element={<AppLayout />}>
          <Route path="/" element={<RootRedirect />} />

          {/* Legacy / mistyped paths (BUG-011, BUG-012, BUG-015) */}
          <Route path="/workspace" element={<RootRedirect />} />
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/users" element={<Navigate to="/sales/dashboard" replace />} />
          <Route path="/admin/shipments" element={<Navigate to="/shipments/portfolio" replace />} />
          <Route path="/admin/notifications" element={<Navigate to="/notifications" replace />} />
          <Route path="/admin/analytics" element={<Navigate to="/operations/executive" replace />} />
          <Route path="/admin/settings" element={<Navigate to="/operations/system" replace />} />
          <Route path="/supplier" element={<Navigate to="/supplier/dashboard" replace />} />
          <Route path="/buyer/documents" element={<Navigate to="/documents" replace />} />
          <Route path="/buyer/notifications" element={<Navigate to="/notifications" replace />} />
          <Route path="/buyer/payments" element={<Navigate to="/buyer/orders" replace />} />

          {/* Unified Messages — canonical route */}
          <Route path="/messages" element={<LazyPage><UnifiedMessagesPage /></LazyPage>} />
          <Route path="/messages/:conversationId" element={<LazyPage><UnifiedMessagesPage /></LazyPage>} />

          {/* Legacy message routes → /messages */}
          <Route path="/buyer/inbox" element={<Navigate to="/messages?view=INBOX" replace />} />
          <Route path="/buyer/messages" element={<Navigate to="/messages" replace />} />
          <Route path="/buyer/messages/workspaces" element={<Navigate to="/messages?source=WORKSPACE" replace />} />
          <Route path="/buyer/messages/:conversationId" element={<LegacyConversationRedirect />} />
          <Route path="/buyer/freightiq/messages" element={<Navigate to="/messages?contextType=FREIGHT" replace />} />
          <Route path="/supplier/messages" element={<Navigate to="/messages" replace />} />
          <Route path="/supplier/messages/:conversationId" element={<LegacyConversationRedirect />} />
          <Route path="/admin/conversations" element={<Navigate to="/messages" replace />} />
          <Route path="/admin/conversations/:conversationId" element={<LegacyConversationRedirect />} />
          <Route path="/admin/whatsapp-inbox" element={<Navigate to="/messages?channel=WHATSAPP" replace />} />
          <Route path="/admin/whatsapp-inbox/:conversationId" element={<LegacyConversationRedirect />} />
          <Route path="/sales/whatsapp" element={<Navigate to="/messages?channel=WHATSAPP" replace />} />
          <Route path="/sales/whatsapp/:conversationId" element={<LegacyConversationRedirect />} />

          {/* Buyer */}
          <Route element={<RequireRole allow={["BUYER"]} />}>
            <Route path="/buyer/dashboard"          element={<LazyPage><BuyerDashboardPage /></LazyPage>} />
            <Route element={<RequireTurkeyImporter />}>
              <Route path="/buyer/imports"            element={<LazyPage><ActiveImportsPage /></LazyPage>} />
              <Route path="/buyer/imports/new"        element={<LazyPage><StartImportPage /></LazyPage>} />
              <Route path="/buyer/imports/:id"        element={<LazyPage><ImportWorkspacePage /></LazyPage>} />
              <Route path="/buyer/freightiq/request"  element={<LazyPage><FreightQuoteRequestPage /></LazyPage>} />
              <Route path="/buyer/customs" element={<LazyPage><CustomsListPage /></LazyPage>} />
              <Route path="/buyer/customs/:id" element={<LazyPage><CustomsCasePage /></LazyPage>} />
              <Route path="/buyer/inland" element={<LazyPage><InlandListPage /></LazyPage>} />
              <Route path="/buyer/inland/:id" element={<LazyPage><InlandDeliveryPage /></LazyPage>} />
              <Route path="/buyer/landed-cost" element={<LazyPage><LandedCostListPage /></LazyPage>} />
              <Route path="/buyer/landed-cost/:id" element={<LazyPage><LandedCostDetailPage /></LazyPage>} />
            </Route>
            <Route path="/buyer/control-tower"       element={<LazyPage><ControlTowerDashboardPage /></LazyPage>} />
            <Route path="/buyer/rfq"                element={<LazyPage><RfqListPage /></LazyPage>} />
            <Route path="/buyer/rfq/new"            element={<LazyPage><RfqCreatePage /></LazyPage>} />
            <Route path="/buyer/commoditybid"       element={<LazyPage><CommodityBidListPage /></LazyPage>} />
            <Route path="/buyer/commoditybid/list"  element={<Navigate to="/buyer/commoditybid" replace />} />
            <Route path="/buyer/commoditybid/panel" element={<LazyPage><CommodityBidEmbedPage /></LazyPage>} />
            <Route path="/buyer/orders"             element={<LazyPage><OrdersListPage /></LazyPage>} />
            <Route path="/buyer/purchase-orders"    element={<LazyPage><PoListPage /></LazyPage>} />
            <Route path="/buyer/purchase-orders/create" element={<LazyPage><CreatePurchaseOrderPage /></LazyPage>} />
            <Route path="/buyer/products"           element={<LazyPage><ProductListPage /></LazyPage>} />
            <Route path="/buyer/products/:id"       element={<LazyPage><ProductDetailPage /></LazyPage>} />
            <Route path="/buyer/shipments"          element={<LazyPage><ShipmentsListPage /></LazyPage>} />
            <Route path="/buyer/trade-documents"    element={<LazyPage><TradeDocumentsListPage /></LazyPage>} />
            <Route path="/buyer/mixed-container" element={<LazyPage><MixedContainerHomePage /></LazyPage>} />
            <Route path="/buyer/mixed-container/catalog" element={<LazyPage><SmartContainerDiscoveryLayout /></LazyPage>}>
              <Route index element={<LazyPage><CatalogCategoriesPage /></LazyPage>} />
              <Route path="search" element={<LazyPage><CatalogSearchPage /></LazyPage>} />
              <Route path=":slug" element={<LazyPage><CatalogProductsPage /></LazyPage>} />
              <Route path=":slug/:productRef" element={<LazyPage><CatalogProductDetailPage /></LazyPage>} />
            </Route>
            <Route path="/buyer/mixed-container/requests" element={<LazyPage><MixedContainerRequestsPage /></LazyPage>} />
            <Route path="/buyer/mixed-container/requests/:id" element={<LazyPage><MixedContainerBuilderPage /></LazyPage>} />
            <Route path="/buyer/mixed-container/offers/:id" element={<LazyPage><MixedContainerOfferPage /></LazyPage>} />
            <Route path="/buyer/mixed-container/organization/:id" element={<LazyPage><MixedContainerOrganizationPage /></LazyPage>} />
            <Route path="/buyer/mixed-container/coordination/:id" element={<LazyPage><MixedContainerCoordinationPage /></LazyPage>} />
            <Route path="/buyer/mixed-container/execution/:id" element={<LazyPage><MixedContainerExecutionPage /></LazyPage>} />
            <Route path="/buyer/bulk-container" element={<LazyPage><BulkContainerHomePage /></LazyPage>} />
            <Route path="/buyer/bulk-container/catalog" element={<LazyPage><BulkCatalogCategoriesPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/catalog/:category" element={<LazyPage><BulkCatalogProductsPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/requests" element={<LazyPage><BulkContainerRequestsPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/requests/:id" element={<LazyPage><BulkContainerBuilderPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/offers/:id" element={<LazyPage><BulkContainerOfferPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/coordination/:id" element={<LazyPage><BulkContainerCoordinationPage /></LazyPage>} />
            <Route path="/buyer/bulk-container/execution/:id" element={<LazyPage><BulkContainerExecutionPage /></LazyPage>} />
          </Route>

          {/* Supplier */}
          <Route element={<RequireRole allow={["SUPPLIER"]} />}>
            <Route path="/supplier/dashboard"       element={<LazyPage><SupplierDashboardPage /></LazyPage>} />
            <Route path="/supplier/rfq"             element={<LazyPage><RfqListPage /></LazyPage>} />
            <Route path="/supplier/commoditybid"        element={<LazyPage><CommodityBidListPage /></LazyPage>} />
            <Route path="/supplier/commoditybid/panel" element={<LazyPage><CommodityBidEmbedPage /></LazyPage>} />
            <Route path="/supplier/purchase-orders" element={<LazyPage><PoListPage /></LazyPage>} />
            <Route path="/supplier/orders"          element={<LazyPage><OrdersListPage /></LazyPage>} />
            <Route path="/supplier/shipments"       element={<LazyPage><ShipmentsListPage /></LazyPage>} />
            <Route path="/supplier/trade-documents" element={<LazyPage><TradeDocumentsListPage /></LazyPage>} />
          </Route>

          {/* Partner workspace (supplier / broker / trucker) */}
          <Route
            element={
              <RequireRole
                allow={["SUPPLIER", "ORIGIN_AGENT", "CUSTOMS_BROKER", "TRUCKER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"]}
              />
            }
          >
            <Route path="/partner" element={<LazyPage><PartnerHomePage /></LazyPage>} />
            <Route path="/partner/transactions" element={<LazyPage><PartnerTransactionsPage /></LazyPage>} />
            <Route path="/partner/transactions/:workspaceId" element={<LazyPage><PartnerTransactionDetailPage /></LazyPage>} />
          </Route>

          <Route element={<RequireRole allow={["CUSTOMS_BROKER"]} />}>
            <Route path="/partner/customs" element={<LazyPage><PartnerCustomsCasesPage /></LazyPage>} />
          </Route>

          <Route element={<RequireRole allow={["CUSTOMS_BROKER", "ADMIN", "SUPER_ADMIN"]} />}>
            <Route path="/partner/customs/:id" element={<LazyPage><CustomsCasePage /></LazyPage>} />
          </Route>

          <Route element={<RequireRole allow={["TRUCKER"]} />}>
            <Route path="/partner/inland" element={<LazyPage><PartnerInlandDeliveriesPage /></LazyPage>} />
          </Route>

          <Route element={<RequireRole allow={["TRUCKER", "ADMIN", "SUPER_ADMIN", "OPS_MANAGER"]} />}>
            <Route path="/partner/inland/:id" element={<LazyPage><InlandDeliveryPage /></LazyPage>} />
          </Route>

          {/* Forwarder portal */}
          <Route element={<RequireRole allow={["FORWARDER", "ADMIN"]} />}>
            <Route path="/forwarder/dashboard" element={<LazyPage><ForwarderDashboardPage /></LazyPage>} />
            <Route path="/forwarder/shipments/:id" element={<LazyPage><ForwarderShipmentPage /></LazyPage>} />
          </Route>

          {/* Sales Control Center */}
          <Route element={<RequireRole allow={["SALES_CONTROL", "ADMIN"]} />}>
            <Route path="/sales/dashboard" element={<LazyPage><SalesControlDashboardPage /></LazyPage>} />
            <Route path="/sales/rfq" element={<LazyPage><RfqListPage /></LazyPage>} />
            <Route path="/sales/control-tower" element={<LazyPage><ControlTowerDashboardPage /></LazyPage>} />
          </Route>

          {/* Admin / operations platform */}
          <Route element={<RequireRole allow={[...OPERATIONS_PLATFORM_ROLES]} />}>
            <Route path="/operations"               element={<LazyPage><OperationsPage /></LazyPage>} />
            <Route path="/operations/freight"              element={<LazyPage><FreightOpsPage /></LazyPage>} />
            <Route path="/operations/freight-commercial"  element={<LazyPage><FreightCommercialPage /></LazyPage>} />
            <Route path="/operations/forwarders"            element={<LazyPage><ForwardersPage /></LazyPage>} />
            <Route path="/operations/shippers"              element={<LazyPage><ShippersPage /></LazyPage>} />
            <Route path="/operations/reference-freight"    element={<LazyPage><AdminReferenceFreightRatesPage /></LazyPage>} />
            <Route path="/operations/executive"             element={<LazyPage><ExecutivePage /></LazyPage>} />
            <Route path="/operations/growth"               element={<LazyPage><GrowthPage /></LazyPage>} />
            <Route path="/operations/market-intelligence" element={<LazyPage><MarketIntelligencePage /></LazyPage>} />
            <Route path="/operations/system"               element={<LazyPage><SystemOperationsPage /></LazyPage>} />
            <Route path="/admin/dashboard"          element={<LazyPage><AdminDashboardPage /></LazyPage>} />
            <Route path="/admin/phone-verifications" element={<LazyPage><PhoneVerificationQueuePage /></LazyPage>} />
            <Route path="/admin/control-tower"       element={<LazyPage><ControlTowerDashboardPage /></LazyPage>} />
            <Route path="/admin/rfq"                element={<LazyPage><RfqListPage /></LazyPage>} />
            <Route path="/admin/commoditybid"         element={<LazyPage><CommodityBidListPage /></LazyPage>} />
            <Route path="/admin/commoditybid/panel"  element={<LazyPage><CommodityBidEmbedPage /></LazyPage>} />
            <Route path="/admin/orders"             element={<LazyPage><OrdersListPage /></LazyPage>} />
            <Route path="/admin/mixed-container/catalog" element={<LazyPage><CatalogAdminPage /></LazyPage>} />
            <Route path="/admin/bulk-container/catalog" element={<LazyPage><BulkCatalogAdminPage /></LazyPage>} />
            <Route path="/admin/bulk-container/allocations/:id" element={<LazyPage><AdminBulkContainerAllocationsPage /></LazyPage>} />
            <Route path="/admin/bulk-container/allocations" element={<LazyPage><AdminBulkContainerAllocationsPage /></LazyPage>} />
            <Route path="/admin/bulk-container/procurement/:id" element={<LazyPage><AdminBulkContainerProcurementPage /></LazyPage>} />
            <Route path="/admin/bulk-container" element={<LazyPage><AdminBulkContainerInboxPage /></LazyPage>} />
            <Route path="/admin/packing-types" element={<LazyPage><PackingTypesAdminPage /></LazyPage>} />
            <Route path="/admin/mixed-container/organization/:id" element={<LazyPage><AdminMixedContainerOrganizationPage /></LazyPage>} />
            <Route path="/admin/mixed-container/allocations/:id" element={<LazyPage><AdminMixedContainerAllocationsPage /></LazyPage>} />
            <Route path="/admin/mixed-container/allocations" element={<LazyPage><AdminMixedContainerAllocationsPage /></LazyPage>} />
            <Route path="/admin/mixed-container" element={<LazyPage><AdminMixedContainerInboxPage /></LazyPage>} />
            <Route path="/admin/mixed-container/:id" element={<LazyPage><AdminMixedContainerProcurementPage /></LazyPage>} />
          </Route>

          {/* Shared (all roles) */}
          <Route path="/notifications"              element={<LazyPage><NotificationsPage /></LazyPage>} />
          <Route path="/learning"                  element={<LazyPage><LearningCenterPage /></LazyPage>} />
          <Route path="/shipments/portfolio"       element={<LazyPage><ShipmentPortfolioPage /></LazyPage>} />
          <Route path="/documents"                 element={<LazyPage><DocumentCenterPage /></LazyPage>} />
          <Route path="/documents/:id"             element={<LazyPage><DocumentDetailPage /></LazyPage>} />
          <Route path="/exceptions"                element={<LazyPage><ExceptionHubPage /></LazyPage>} />
          <Route path="/exceptions/:id"           element={<LazyPage><ExceptionDetailPage /></LazyPage>} />

          {/* Admin onboarding dashboard */}
          <Route element={<RequireRole allow={["ADMIN"]} />}>
            <Route path="/onboarding"              element={<LazyPage><OnboardingDashboardPage /></LazyPage>} />
          </Route>

          {/* Workspace routes — accessible to participants regardless of role */}
          <Route path="/workspace/trade/:id/documents" element={<LazyPage><TradeDocumentsPanelPage /></LazyPage>} />
          <Route path="/workspace/trade/:id" element={<LazyPage><TradeWorkspacePage /></LazyPage>} />
          <Route path="/workspace/rfq/:id/procurement-strategy" element={<LazyPage><ProcurementStrategyPage /></LazyPage>} />
          <Route path="/workspace/rfq/:id"          element={<LazyPage><RfqWorkspacePage /></LazyPage>} />
          <Route path="/workspace/commoditybid/:id" element={<LazyPage><CommodityBidWorkspacePage /></LazyPage>} />
          <Route path="/workspace/order/:id"        element={<LazyPage><OrderWorkspacePage /></LazyPage>} />
          <Route path="/workspace/po/:id"           element={<LazyPage><PoWorkspacePage /></LazyPage>} />
          <Route path="/workspace/shipment/:id"     element={<LazyPage><ShipmentWorkspacePage /></LazyPage>} />

          <Route path="*" element={<LazyPage><NotFoundPage /></LazyPage>} />
        </Route>
      </Route>
    </Routes>
  );
}
