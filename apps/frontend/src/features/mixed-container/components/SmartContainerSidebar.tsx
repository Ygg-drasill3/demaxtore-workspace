import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { mixedContainerApi } from "../lib/mixed-container.api";
import { FillMeter } from "./FillMeter";
import { ContainerOrderNav } from "./ContainerOrderNav";
import { Button } from "@/components/ui/Button";
import { Package } from "lucide-react";
import { useState } from "react";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";
import { useContainerSession } from "../lib/useContainerSession";
import { displayRef } from "@/features/dashboard/lib/display-ref";

export function SmartContainerSidebar({ containerId }: { containerId?: string }) {
  const { setContainerId } = useContainerSession();
  const qc = useQueryClient();
  const { t } = useT();
  const [addingContainer, setAddingContainer] = useState(false);
  const { data: mc, isLoading } = useQuery({
    queryKey: ["mc-container", containerId],
    queryFn: () => mixedContainerApi.get(containerId!),
    enabled: !!containerId,
  });

  if (!containerId) {
    return (
      <div
        data-testid="mc-sidebar-empty"
        className="dmx-card p-5 space-y-3 lg:sticky lg:top-6"
      >
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-accent-900" />
          <h2 className="font-medium">Your container</h2>
        </div>
        <p className="text-sm text-zinc-500">
          Browse products and add them to start building.
        </p>
      </div>
    );
  }

  if (isLoading || !mc) {
    return <div className="dmx-card p-5 animate-pulse h-48 lg:sticky lg:top-6" />;
  }

  const editable = ["MC_DRAFT", "MC_BUILDING"].includes(mc.state);

  const addNextContainer = async () => {
    if (!containerId || !mc.canAddContainer) return;
    setAddingContainer(true);
    try {
      const next = await mixedContainerApi.addSiblingContainer(containerId);
      await qc.invalidateQueries({ queryKey: ["mc-container"] });
      setContainerId(next.id);
      toast.success(t("mc.order.addNext", undefined, { n: next.containerSequence }));
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (err.response?.data?.error?.code === "MAX_ORDER_CONTAINERS_REACHED") {
        toast.warning(t("mc.order.maxReached", undefined, { max: mc.maxOrderContainers }));
      } else {
        toast.error(err.response?.data?.error?.message ?? t("mc.builder.updateFailed"));
      }
    } finally {
      setAddingContainer(false);
    }
  };

  return (
    <div data-testid="mc-sidebar" className="dmx-card p-5 space-y-4 lg:sticky lg:top-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">Your container</h2>
        <span className="text-xs text-zinc-400">{displayRef(mc.externalRef)}</span>
      </div>

      <ContainerOrderNav
        mc={mc}
        activeContainerId={containerId}
        compact
        onSelectContainer={setContainerId}
        onAddContainer={() => void addNextContainer()}
        adding={addingContainer}
      />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase text-zinc-500">Products</p>
          <p className="font-semibold" data-testid="mc-sidebar-product-count">{mc.productCount}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-zinc-500">Total pallets</p>
          <p className="font-semibold" data-testid="mc-sidebar-pallet-count">{mc.currentPalletCount}</p>
        </div>
      </div>

      <FillMeter used={mc.currentPalletCount} max={mc.maxPalletCapacity} percent={mc.fillPercent} />

      {mc.lines.length > 0 && (
        <ul className="space-y-2 max-h-48 overflow-y-auto text-sm" data-testid="mc-sidebar-lines">
          {mc.lines.map((line) => (
            <li key={line.id} className="flex justify-between gap-2 border-b border-zinc-50 pb-2">
              <span className="truncate">{line.name}</span>
              <span className="text-zinc-500 shrink-0">{line.palletCount} plts</span>
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <Link to={`/buyer/mixed-container/requests/${mc.id}`}>
          <Button className="w-full" data-testid="mc-sidebar-review">
            Review container
          </Button>
        </Link>
      )}
    </div>
  );
}
