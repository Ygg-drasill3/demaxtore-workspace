import { Link } from "react-router-dom";
import { DirectPurchaseOrderWizard } from "../components/DirectPurchaseOrderWizard";

export default function CreatePurchaseOrderPage() {
  return (
    <div
      data-testid="create-purchase-order-page"
      className="max-w-[1200px] mx-auto space-y-5 animate-fade-in pb-8"
    >
      <header>
        <Link
          to="/buyer/purchase-orders"
          className="text-xs text-zinc-500 hover:text-ink-900 hover:underline"
        >
          ← Purchase Orders
        </Link>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-2">
          Create Purchase Order
        </h1>
        <p className="text-sm text-zinc-500 mt-2 max-w-2xl">
          Already have a supplier? Create and issue a Purchase Order directly without creating an RFQ.
        </p>
      </header>

      <DirectPurchaseOrderWizard />
    </div>
  );
}
