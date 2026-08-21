import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAuth } from "@/store/auth.store";
import { isTurkeyImporterOperatingModel } from "@dmx/contracts/buyer-operating-model";
import { RedirectToLogin } from "@/components/RedirectToLogin";

/**
 * Standalone Freight hub (/buyer/freightiq) is Turkey Importer primary entry.
 * International buyers only reach freight through an order after RFQ → PO
 * (order workspace panel, or hub with ?orderId=).
 */
export function RequireTurkeyFreightOrOrderScope() {
  const { status, user } = useAuth();
  const [params] = useSearchParams();

  if (status !== "authenticated" || !user) {
    return <RedirectToLogin />;
  }

  const turkey = isTurkeyImporterOperatingModel(user.buyerOperatingModel);
  const orderScoped = Boolean(params.get("orderId")?.trim());

  if (!turkey && !orderScoped) {
    return <Navigate to="/buyer/dashboard" replace />;
  }

  return <Outlet />;
}

/** Freight-first quote request without an order — Turkey Importer only. */
export function RequireTurkeyImporter() {
  const { status, user } = useAuth();

  if (status !== "authenticated" || !user) {
    return <RedirectToLogin />;
  }

  if (!isTurkeyImporterOperatingModel(user.buyerOperatingModel)) {
    return <Navigate to="/buyer/dashboard" replace />;
  }

  return <Outlet />;
}
