import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Ship, ExternalLink } from "lucide-react";
import { rfqApi } from "@/features/rfq/lib/rfq.api";
import { orderApi } from "@/features/order/lib/order.api";
import { freightiqApi } from "../lib/freightiq.api";
import { FreightAdminOfferForm, type AdminOfferFormValues } from "../components/FreightAdminOfferForm";
import { FreightOfferList } from "../components/FreightOfferList";
import { buildSubmitOfferPayload } from "../lib/freight-offer-submit";
import { freightiqErrorMessage } from "../lib/freightiq.errors";
import { isFreightIntakeEligible } from "@dmx/contracts/freightiq";
import { useT } from "@/i18n/useT";
import { toast } from "@/store/toast.store";
import { cn } from "@/lib/utils";

interface RfqRow {
  id: string;
  externalRef: string;
  title?: string;
  state: string;
}

interface SpawnedOrder {
  id: string;
  externalRef: string;
  state: string;
}

const INTAKE_RFQ_STATES = new Set(["PO_ISSUED", "CLOSED"]);

export default function FreightRfqIntakePage() {
  const { t } = useT();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [selectedRfqId, setSelectedRfqId] = useState<string | null>(searchParams.get("rfqId"));
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: rfqList, isLoading: rfqsLoading } = useQuery({
    queryKey: ["rfq", "intake-list", q],
    queryFn: () => rfqApi.list({ q: q || undefined, limit: 80, sort: "newest" }),
  });

  const rfqRows = useMemo(() => {
    const items = (rfqList as { items?: RfqRow[] } | undefined)?.items ?? (rfqList as RfqRow[] | undefined) ?? [];
    return items.filter((r) => INTAKE_RFQ_STATES.has(r.state));
  }, [rfqList]);

  const { data: spawnedOrders } = useQuery({
    queryKey: ["rfq", selectedRfqId, "spawned-orders"],
    queryFn: () => rfqApi.spawnedOrders(selectedRfqId!) as Promise<SpawnedOrder[]>,
    enabled: !!selectedRfqId,
  });

  const orders = spawnedOrders ?? [];

  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      setSelectedOrderId(orders[0].id);
    }
    if (orders.length === 0) setSelectedOrderId(null);
  }, [orders, selectedOrderId]);

  const { data: order } = useQuery({
    queryKey: ["order", selectedOrderId],
    queryFn: () => orderApi.get(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["freightiq", selectedOrderId],
    queryFn: () => freightiqApi.summary(selectedOrderId!),
    enabled: !!selectedOrderId,
  });

  const selectedRfq = rfqRows.find((r) => r.id === selectedRfqId);
  const pol = summary?.request?.pol ?? order?.originPort ?? "—";
  const pod = summary?.request?.pod ?? order?.destinationPort ?? "—";
  const hasRequest = !!summary?.request;
  const offerCount = summary?.offers?.filter((o) => ["ACTIVE", "REVISED", "SELECTED"].includes(o.status)).length ?? 0;
  const canCreateFreight = order ? isFreightIntakeEligible(order.state, "ADMIN") : false;

  const pickRfq = (id: string) => {
    setSelectedRfqId(id);
    setSelectedOrderId(null);
    setSearchParams({ rfqId: id });
  };

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["freightiq", selectedOrderId] });
    void qc.invalidateQueries({ queryKey: ["order", selectedOrderId] });
  };

  const handleCreateRequest = async () => {
    if (!selectedOrderId || !order) return;
    if (!canCreateFreight) {
      toast.error(freightiqErrorMessage(null, order.state));
      return;
    }
    setBusy(true);
    try {
      const next = await freightiqApi.action(selectedOrderId, "create-request", {
        mode: "OCEAN_FCL",
        pol: order.originPort ?? "CNSHA",
        pod: order.destinationPort ?? "NLRTM",
        cargoDescription: order.contractRef ? `Cargo for ${order.contractRef}` : `Cargo for ${selectedRfq?.externalRef ?? "RFQ"}`,
        containerType: "40HC",
      });
      qc.setQueryData(["freightiq", selectedOrderId], next);
      toast.success(t("order.freightiq.requestCreated"));
    } catch (e: unknown) {
      toast.error(freightiqErrorMessage(e, order.state));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitOffer = async (form: AdminOfferFormValues) => {
    if (!selectedOrderId) return;
    setBusy(true);
    try {
      await freightiqApi.action(selectedOrderId, "submit-offer", buildSubmitOfferPayload(form));
      toast.success(t("order.freightiq.adminOfferPublished"));
      refresh();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; error?: { message?: string } } } };
      toast.error(err.response?.data?.error?.message ?? err.response?.data?.message ?? t("common.error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="freight-rfq-intake-page" className="max-w-[1100px] mx-auto space-y-6 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="dmx-eyebrow text-zinc-500">{t("freightiq.intake.eyebrow")}</span>
          <h1 className="font-display text-3xl font-semibold mt-1">{t("freightiq.intake.title")}</h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-xl">{t("freightiq.intake.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/operations/forwarders" className="text-accent-900 hover:underline">
            {t("freightiq.intake.manageForwarders")} →
          </Link>
          <Link to="/operations/shippers" className="text-accent-900 hover:underline">
            {t("freightiq.shippers.manageLink")} →
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* RFQ picker */}
        <section className="dmx-card p-4 space-y-3 h-fit lg:sticky lg:top-4">
          <h2 className="text-sm font-semibold">{t("freightiq.intake.selectRfq")}</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              data-testid="freight-intake-rfq-search"
              className="dmx-input pl-9 text-sm"
              placeholder={t("freightiq.intake.searchRfq")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <ul className="max-h-[420px] overflow-y-auto divide-y divide-paper-100 -mx-1">
            {rfqsLoading && <li className="p-3 text-sm text-zinc-500">{t("common.loading")}</li>}
            {!rfqsLoading && rfqRows.length === 0 && (
              <li className="p-3 text-sm text-zinc-500">{t("freightiq.intake.noRfqs")}</li>
            )}
            {rfqRows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  data-testid={`freight-intake-rfq-${r.id}`}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-sm hover:bg-paper-50 rounded-lg transition-colors",
                    selectedRfqId === r.id && "bg-accent-50 ring-1 ring-accent-900/15",
                  )}
                  onClick={() => pickRfq(r.id)}
                >
                  <div className="font-mono font-medium">{r.externalRef}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 truncate">{r.title ?? r.state}</div>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* Intake workspace */}
        <div className="space-y-4 min-w-0">
          {!selectedRfqId && (
            <section className="dmx-card p-8 text-center text-zinc-500">
              <Ship className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
              <p>{t("freightiq.intake.pickRfqHint")}</p>
            </section>
          )}

          {selectedRfqId && (
            <>
              <section className="dmx-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="dmx-eyebrow text-zinc-500">RFQ</span>
                    <h2 className="font-display text-xl font-semibold mt-0.5">{selectedRfq?.externalRef ?? selectedRfqId}</h2>
                    <p className="text-sm text-zinc-500 mt-1">{t("freightiq.intake.rfqContext")}</p>
                  </div>
                  <Link
                    to={`/workspace/rfq/${selectedRfqId}`}
                    className="text-sm text-accent-900 hover:underline inline-flex items-center gap-1"
                  >
                    {t("freightiq.intake.openRfq")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {orders.length === 0 ? (
                  <p data-testid="freight-intake-no-order" className="mt-4 text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
                    {t("freightiq.intake.noSpawnedOrder")}
                  </p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {orders.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        data-testid={`freight-intake-order-${o.id}`}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-left text-sm",
                          selectedOrderId === o.id ? "border-accent-900 bg-accent-50" : "border-paper-200 hover:bg-paper-50",
                        )}
                        onClick={() => setSelectedOrderId(o.id)}
                      >
                        <div className="font-mono font-medium">{o.externalRef}</div>
                        <div className="text-xs text-zinc-500">{o.state}</div>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {selectedOrderId && order && (
                <>
                  <section className="dmx-card p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{pol} → {pod}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {hasRequest
                          ? t("freightiq.intake.requestOpen").replace("{count}", String(offerCount))
                          : t("freightiq.intake.noRequestYet")}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!hasRequest && (
                        <button
                          type="button"
                          data-testid="freight-intake-create-request"
                          className="dmx-btn-secondary text-sm"
                          disabled={busy || !canCreateFreight}
                          onClick={() => void handleCreateRequest()}
                        >
                          {t("freightiq.intake.ensureRequest")}
                        </button>
                      )}
                      <Link
                        to={`/workspace/order/${selectedOrderId}#order-freightiq-section`}
                        className="dmx-btn-primary text-sm"
                      >
                        {t("freightiq.intake.previewBuyerView")}
                      </Link>
                    </div>
                  </section>

                  {summaryLoading && (
                    <div className="dmx-card p-6 text-sm text-zinc-500">{t("common.loading")}</div>
                  )}

                  {hasRequest && (
                    <FreightAdminOfferForm
                      pol={pol}
                      pod={pod}
                      busy={busy}
                      defaultOpen={!summary?.selection}
                      onSubmit={handleSubmitOffer}
                    />
                  )}

                  {summary && offerCount > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">{t("freightiq.intake.buyerPreview")}</p>
                      <FreightOfferList
                        summary={summary}
                        pol={pol}
                        pod={pod}
                        canSelect={false}
                        onRequestSelect={() => {}}
                      />
                    </div>
                  )}

                  {summary?.selection && (
                    <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2">
                      {t("freightiq.intake.alreadySelected")}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
