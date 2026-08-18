import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { catalogApi, mixedContainerApi } from "../lib/mixed-container.api";
import { useContainerSession } from "../lib/useContainerSession";
import { Button } from "@/components/ui/Button";
import { toast } from "@/store/toast.store";
import { useT } from "@/i18n/useT";

export default function CatalogProductDetailPage() {
  const { slug, productRef } = useParams<{ slug: string; productRef: string }>();
  const { containerId, ensureContainer, withContainerId } = useContainerSession();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { t } = useT();

  const { data: product, isLoading } = useQuery({
    queryKey: ["mc-product", productRef],
    queryFn: () => catalogApi.productByRef(productRef!),
    enabled: !!productRef,
  });

  const { data: mc } = useQuery({
    queryKey: ["mc-container", containerId],
    queryFn: () => mixedContainerApi.get(containerId!),
    enabled: !!containerId,
  });

  const remainingPallets = mc?.remainingPallets ?? null;
  const atCapacity = remainingPallets !== null && remainingPallets <= 0;

  const defaultPkg = product?.packagingOptions.find((p) => p.isDefault) ?? product?.packagingOptions[0];
  const [packagingId, setPackagingId] = useState("");
  const [pallets, setPallets] = useState(1);

  useEffect(() => {
    if (!product) return;
    const def = product.packagingOptions.find((p) => p.isDefault) ?? product.packagingOptions[0];
    if (def) {
      setPackagingId(def.id);
      const moq = def.moqPallets;
      setPallets(remainingPallets != null ? Math.min(moq, remainingPallets) : moq);
    }
  }, [product?.id, product, remainingPallets]);

  const selectedPkg = product?.packagingOptions.find((p) => p.id === (packagingId || defaultPkg?.id)) ?? defaultPkg;
  const activePackagingId = packagingId || defaultPkg?.id || "";
  const moq = selectedPkg?.moqPallets ?? product?.moqPallets ?? 1;

  const addToContainer = async () => {
    if (!product || !activePackagingId) return;
    if (atCapacity || (remainingPallets != null && pallets > remainingPallets)) {
      toast.warning(
        t("mc.capacity.full"),
        t("mc.capacity.fullDetail", undefined, { max: mc?.maxPalletCapacity ?? 24 }),
      );
      return;
    }
    setAdding(true);
    try {
      const targetId = containerId ?? (await ensureContainer());
      await mixedContainerApi.addLine(targetId, product.id, activePackagingId, pallets);
      await qc.invalidateQueries({ queryKey: ["mc-container", targetId] });
      toast.success(`${product.name} added to SmartContainer`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: { code?: string } } } };
      if (err.response?.data?.error?.code === "CONTAINER_CAPACITY_FULL") {
        toast.warning(
          t("mc.capacity.full"),
          t("mc.capacity.fullDetail", undefined, { max: mc?.maxPalletCapacity ?? 24 }),
        );
      } else {
        toast.error("Could not add product. Please try again.");
      }
    } finally {
      setAdding(false);
    }
  };

  if (isLoading) {
    return <div className="dmx-card p-8 animate-pulse h-64" />;
  }

  if (!product) {
    return <p className="text-sm text-zinc-500">Product not found.</p>;
  }

  const packagingNames = product.packagingOptions.map((p) => p.name).join(", ");

  return (
    <div data-testid="mc-product-detail" data-guide="mc-product-detail" className="space-y-6">
      <header>
        <Link
          to={withContainerId(`/buyer/mixed-container/catalog/${slug ?? product.categorySlug}`)}
          className="text-xs text-zinc-500 hover:underline"
        >
          ← {product.category}
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight mt-2">{product.name}</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square bg-paper-100 rounded-xl overflow-hidden flex items-center justify-center">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-zinc-400">No image</span>
          )}
        </div>

        <div className="space-y-6">
          {product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.description}</p>
          )}
          {product.shortDescription && !product.description && (
            <p className="text-sm text-zinc-600 leading-relaxed">{product.shortDescription}</p>
          )}

          <div>
            <p className="text-xs uppercase text-zinc-500">Country of origin</p>
            <p className="text-sm mt-1">{product.originCountry ?? "Turkey"}</p>
          </div>

          <div>
            <p className="text-xs uppercase text-zinc-500 mb-2">Available packaging</p>
            <p className="text-sm text-zinc-600 mb-3">{packagingNames}</p>
            <div data-testid="mc-packaging-selector" className="space-y-2">
              {product.packagingOptions.map((pkg) => (
                <label
                  key={pkg.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer text-sm ${
                    activePackagingId === pkg.id ? "border-accent-900 bg-accent-50" : "border-zinc-200"
                  }`}
                  data-testid={`mc-packaging-option-${pkg.slug}`}
                >
                  <input
                    type="radio"
                    name="packaging"
                    checked={activePackagingId === pkg.id}
                    onChange={() => {
                      setPackagingId(pkg.id);
                      setPallets(pkg.moqPallets);
                    }}
                  />
                  <span className="font-medium">{pkg.name}</span>
                  <span className="text-xs text-zinc-400 ml-auto">{pkg.unitsPerPallet} units/pallet</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase text-zinc-500 mb-2">Quantity (pallets)</p>
            {atCapacity && (
              <p
                className="text-sm font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3"
                data-testid="mc-capacity-full-warning"
                role="alert"
              >
                {t("mc.capacity.full")}
              </p>
            )}
            {remainingPallets != null && remainingPallets > 0 && (
              <p className="text-xs text-zinc-500 mb-2">
                {t("mc.capacity.remaining", undefined, { remaining: remainingPallets })}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="h-10 w-10 rounded-lg border"
                data-testid="mc-pallet-decrease"
                onClick={() => setPallets((n) => Math.max(moq, n - 1))}
              >
                −
              </button>
              <span data-testid="mc-pallet-count" className="font-medium w-10 text-center text-lg">
                {pallets}
              </span>
              <button
                type="button"
                className="h-10 w-10 rounded-lg border disabled:opacity-40"
                data-testid="mc-pallet-increase"
                disabled={atCapacity || (remainingPallets != null && pallets >= remainingPallets)}
                onClick={() => {
                  if (atCapacity || (remainingPallets != null && pallets >= remainingPallets)) {
                    toast.warning(
                      t("mc.capacity.full"),
                      t("mc.capacity.fullDetail", undefined, { max: mc?.maxPalletCapacity ?? 24 }),
                    );
                    return;
                  }
                  setPallets((n) =>
                    remainingPallets != null ? Math.min(n + 1, remainingPallets) : n + 1,
                  );
                }}
              >
                +
              </button>
            </div>
            <p className="text-xs text-zinc-400 mt-2">
              Minimum {moq} pallet(s)
            </p>
          </div>

          <Button
            data-testid="mc-add-confirm"
            className="w-full"
            size="lg"
            disabled={!activePackagingId || adding || atCapacity}
            onClick={() => void addToContainer()}
          >
            {adding ? "Adding…" : "Add to SmartContainer"}
          </Button>
        </div>
      </div>
    </div>
  );
}
