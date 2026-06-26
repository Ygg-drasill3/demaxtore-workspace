import type { OrderState } from "@dmx/contracts/order.fsm";
import { useT } from "@/i18n/useT";
import { cn } from "@/lib/utils";

const STEPS = [
  "order.guide.step.rfq",
  "order.guide.step.confirm",
  "order.guide.step.production",
  "order.guide.step.inspection",
  "order.guide.step.freight",
  "order.guide.step.delivery",
] as const;

function stepIndex(state: OrderState): number {
  if (state === "DISPUTED" || state === "CANCELLED") return -1;
  if (state === "ORDER_CREATED") return 0;
  if (state === "SUPPLIER_CONFIRMED") return 1;
  if (["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS", "PRODUCTION_COMPLETED"].includes(state)) return 2;
  if (["INSPECTION_REQUESTED", "INSPECTION_COMPLETED"].includes(state)) return 3;
  if (["FREIGHT_REQUESTED", "SHIPMENT_BOOKED", "DEPARTED", "IN_TRANSIT", "ETA_UPDATED", "ARRIVED_PORT"].includes(state)) return 4;
  if (["DELIVERED", "CLOSED"].includes(state)) return 5;
  return 0;
}

type Props = {
  state: OrderState;
  actorRole?: string;
};

export default function OrderProcessGuide({ state, actorRole }: Props) {
  const { t } = useT();
  const current = stepIndex(state);
  const hint =
    ["PRODUCTION_STARTED", "PRODUCTION_IN_PROGRESS"].includes(state) && actorRole === "BUYER"
      ? t("order.guide.waitSupplier")
      : state === "PRODUCTION_COMPLETED" && actorRole === "BUYER"
        ? t("order.guide.yourTurn")
        : null;

  if (current < 0) return null;

  return (
    <section data-testid="order-process-guide" className="dmx-card p-4">
      <h2 className="font-medium text-sm text-ink-900 mb-3">{t("order.guide.title")}</h2>
      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((stepKey, i) => (
          <li
            key={stepKey}
            className={cn(
              "px-2.5 py-1 rounded-full border",
              i === current
                ? "bg-accent-900 text-white border-accent-900 font-medium"
                : i < current
                  ? "bg-paper-100 text-zinc-600 border-paper-200"
                  : "bg-white text-zinc-400 border-paper-200",
            )}
          >
            {i === current ? `${t("order.guide.youAreHere")}: ` : ""}
            {t(stepKey)}
          </li>
        ))}
      </ol>
      {hint && <p className="mt-3 text-sm text-zinc-600">{hint}</p>}
    </section>
  );
}
