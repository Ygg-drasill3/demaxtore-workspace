import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { COMMODITYBID_GUIDED_ACTIONS } from "@dmx/contracts/commoditybid-learning";
import { Button } from "@/components/ui/Button";

/** Guided onboarding card — CommodityBid reverse-auction path (content only). */
export function CommodityBidOnboardingCard() {
  return (
    <section
      data-testid="commoditybid-onboarding-card"
      className="rounded-2xl border border-paper-200 bg-white p-6"
    >
      <div className="dmx-eyebrow text-zinc-500">CommodityBid</div>
      <h2 className="font-display text-xl font-semibold mt-1">Reverse auction guide</h2>
      <p className="text-sm text-zinc-600 mt-2">
        Schedule an auction, monitor live supplier competition, and approve the automatically identified winning bid.
      </p>
      <ul data-testid="cb-onboarding-steps" className="mt-4 space-y-2">
        {COMMODITYBID_GUIDED_ACTIONS.map((action) => (
          <li key={action.label} className="text-sm">
            <span className="font-medium text-ink-900">{action.label}</span>
            <span className="text-zinc-500"> — {action.detail}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3 mt-5">
        <Link to="/buyer/commoditybid/new">
          <Button data-testid="cb-onboarding-create" size="sm">
            Create auction <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </Link>
        <Link to="/learning" className="text-sm font-medium text-accent-900 hover:underline self-center">
          Learning Center →
        </Link>
      </div>
    </section>
  );
}
