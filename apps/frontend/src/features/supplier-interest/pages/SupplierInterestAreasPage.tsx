import { useAuth } from "@/store/auth.store";
import { AdminSupplierInterestManager } from "../components/AdminSupplierInterestManager";
import { SupplierInterestAreasPanel } from "../components/SupplierInterestAreasPanel";

export default function SupplierInterestAreasPage() {
  const { user } = useAuth();
  const isSupplier = user?.role === "SUPPLIER";
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div
      className={`mx-auto px-4 py-8 animate-fade-in ${isAdmin ? "max-w-3xl" : "max-w-2xl"}`}
      data-testid="supplier-interest-areas-page"
    >
      <header className="mb-8">
        <span className="dmx-eyebrow text-zinc-500">{isAdmin ? "Admin" : "Supplier"}</span>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-zinc-900 mt-1">
          Interest areas
        </h1>
        <p className="text-sm text-zinc-500 mt-2">
          {isAdmin
            ? "Review and set product categories for every supplier organisation."
            : "Tell us which product categories you sell so we can match you with the right RFQs."}
        </p>
      </header>

      {isSupplier && <SupplierInterestAreasPanel />}
      {isAdmin && <AdminSupplierInterestManager />}
    </div>
  );
}
