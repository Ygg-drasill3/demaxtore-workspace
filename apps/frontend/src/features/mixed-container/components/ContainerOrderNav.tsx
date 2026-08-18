import { Link } from "react-router-dom";
import type { MixedContainerDTO } from "@dmx/contracts/mixed-container.zod";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { useT } from "@/i18n/useT";

type Props = {
  mc: MixedContainerDTO;
  activeContainerId: string;
  linkBase?: string;
  onAddContainer?: () => void;
  onSelectContainer?: (id: string) => void;
  adding?: boolean;
  compact?: boolean;
};

export function ContainerOrderNav({
  mc,
  activeContainerId,
  linkBase = "/buyer/mixed-container/requests",
  onAddContainer,
  onSelectContainer,
  adding,
  compact,
}: Props) {
  const { t } = useT();
  const slots = mc.orderContainers ?? [];

  if (slots.length <= 1 && !mc.canAddContainer) return null;

  const renderSlot = (slot: (typeof slots)[number]) => {
    const active = slot.id === activeContainerId;
    const className = `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium border transition ${
      active
        ? "bg-accent-900 text-white border-accent-900 shadow-sm"
        : "bg-white text-ink-900 border-paper-200 hover:border-accent-900/30"
    }`;

    if (onSelectContainer) {
      return (
        <button
          key={slot.id}
          type="button"
          data-testid={`mc-order-slot-${slot.containerSequence}`}
          className={className}
          onClick={() => onSelectContainer(slot.id)}
        >
          <span>{t("mc.order.containerN", undefined, { n: slot.containerSequence })}</span>
          <span className={`text-xs ${active ? "text-white/80" : "text-zinc-500"}`}>
            {slot.currentPalletCount}/{slot.maxPalletCapacity}
          </span>
        </button>
      );
    }

    return (
      <Link
        key={slot.id}
        to={`${linkBase}/${slot.id}`}
        data-testid={`mc-order-slot-${slot.containerSequence}`}
        className={className}
      >
        <span>{t("mc.order.containerN", undefined, { n: slot.containerSequence })}</span>
        <span className={`text-xs ${active ? "text-white/80" : "text-zinc-500"}`}>
          {slot.currentPalletCount}/{slot.maxPalletCapacity}
        </span>
      </Link>
    );
  };

  return (
    <div
      className={`rounded-xl border border-paper-200 bg-paper-50/80 ${compact ? "p-2.5" : "p-4"} space-y-3`}
      data-testid="mc-order-nav"
    >
      {!compact && slots.length > 1 && (
        <p className="text-xs text-zinc-600">
          {t("mc.order.switchHint", undefined, { count: slots.length })}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {slots.map(renderSlot)}
        {mc.canAddContainer && onAddContainer && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-testid="mc-add-next-container"
            disabled={adding}
            onClick={onAddContainer}
            className="inline-flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            {t("mc.order.addNext", undefined, { n: mc.orderContainerCount + 1 })}
          </Button>
        )}
      </div>
      {!mc.canAddContainer && mc.orderContainerCount >= mc.maxOrderContainers && (
        <p className="text-xs text-zinc-500" data-testid="mc-order-max-reached">
          {t("mc.order.maxReached", undefined, { max: mc.maxOrderContainers })}
        </p>
      )}
    </div>
  );
}
