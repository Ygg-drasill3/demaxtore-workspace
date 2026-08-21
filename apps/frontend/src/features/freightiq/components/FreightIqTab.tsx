import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { freightiqApi } from "../lib/freightiq.api";
import { freightiqErrorMessage } from "../lib/freightiq.errors";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";
import { FREIGHTIQ_ORDER_ELIGIBLE_STATES, type FreightSummary } from "@dmx/contracts/freightiq";

type TabId = "overview" | "forwarders" | "communications" | "intake" | "offers" | "comparison" | "history";

export default function FreightIqTab({ orderId, orderState }: { orderId: string; orderState: string }) {
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>("overview");
  const [selectedForwarders, setSelectedForwarders] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["freightiq", orderId],
    queryFn: () => freightiqApi.summary(orderId),
  });

  const { data: forwarderDir } = useQuery({
    queryKey: ["forwarders"],
    queryFn: () => freightiqApi.listForwarders(),
    enabled: user?.role === "ADMIN",
  });

  const mutate = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      freightiqApi.action(orderId, action, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["freightiq", orderId] });
      toast.success("Freight updated");
    },
    onError: (err) => {
      void qc.invalidateQueries({ queryKey: ["freightiq", orderId] });
      toast.error(freightiqErrorMessage(err, orderState));
    },
  });

  const commMutate = useMutation({
    mutationFn: ({ action, payload }: { action: string; payload?: Record<string, unknown> }) =>
      freightiqApi.communicationAction(orderId, action, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["freightiq", orderId] });
      toast.success("Freight communication updated");
    },
  });

  if (isLoading || !data) {
    return <div data-testid="freightiq-loading" className="text-sm text-zinc-500">Loading freight…</div>;
  }

  const isAdmin = user?.role === "ADMIN";
  const canCreate = isAdmin || user?.role === "BUYER";
  const canSelect = user?.role === "BUYER" || isAdmin;
  const freightEligible = (FREIGHTIQ_ORDER_ELIGIBLE_STATES as readonly string[]).includes(orderState);
  const showCreateRequest = !data.request && canCreate && freightEligible;
  const tabs: TabId[] = ["overview", "forwarders", "communications", "intake", "offers", "comparison", "history"];

  return (
    <div data-testid="freightiq-tab" className="space-y-4">
      <nav className="flex flex-wrap gap-2 text-xs">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            data-testid={`freightiq-tab-${t}`}
            onClick={() => setTab(t)}
            className={`px-2 py-1 rounded ${tab === t ? "bg-blue-900 text-white" : "border"}`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "overview" && (
        <section data-testid="freightiq-overview" className="space-y-3 text-sm">
          {showCreateRequest && (
            <button
              type="button"
              data-testid="freightiq-create-request"
              disabled={mutate.isPending}
              onClick={() => mutate.mutate({
                action: "create-request",
                payload: {
                  mode: "OCEAN_FCL",
                  pol: "CNSHA",
                  pod: "NLRTM",
                  cargoDescription: "General cargo",
                  containerType: "40HC",
                },
              })}
              className="h-9 px-3 rounded bg-blue-900 text-white text-xs"
            >
              Create freight request
            </button>
          )}
          {!data.request && canCreate && !freightEligible && (
            <p data-testid="freightiq-not-eligible" className="text-xs text-zinc-500">
              Freight becomes available after production completes and inspection is recorded
              (current state: {orderState}).
            </p>
          )}
          {data.request && (
            <div className="grid grid-cols-2 gap-2">
              <div><span className="text-zinc-500">Status</span><div data-testid="freightiq-status">{data.request.status}</div></div>
              <div><span className="text-zinc-500">Lane</span><div>{data.request.pol} → {data.request.pod}</div></div>
            </div>
          )}
          {data.selection && (
            <p data-testid="freightiq-selection" className="text-green-800 text-xs">
              Offer selected · shipment: {data.selection.shipmentWorkspaceId ?? "pending"}
            </p>
          )}
          {data.commercialSummary && (
            <div data-testid="freightiq-cif-summary" className="grid grid-cols-3 gap-2 text-xs border rounded p-2">
              <div>
                <span className="text-zinc-500">FOB value</span>
                <div data-testid="freightiq-fob">{data.commercialSummary.fobValueUsd} {data.commercialSummary.currency}</div>
              </div>
              <div>
                <span className="text-zinc-500">Freight (display)</span>
                <div data-testid="freightiq-display-freight">
                  {data.commercialSummary.displayFreightUsd ?? "—"} {data.commercialSummary.currency}
                </div>
              </div>
              <div>
                <span className="text-zinc-500">Est. CIF</span>
                <div data-testid="freightiq-estimated-cif">
                  {data.commercialSummary.estimatedCifUsd ?? "—"} {data.commercialSummary.currency}
                </div>
              </div>
            </div>
          )}
          {isAdmin && data.offers.some((o) => o.commercial) && (
            <div data-testid="freightiq-admin-commercial" className="text-xs space-y-1">
              {data.offers.filter((o) => o.commercial).map((o) => (
                <div key={o.id} data-testid={`freightiq-commercial-${o.id}`}>
                  {o.carrierName}: cost {o.commercial!.internalCostUsd} + margin {o.commercial!.freightiqMarginUsd}
                  {" = "}{o.commercial!.displayPriceUsd} USD
                </div>
              ))}
            </div>
          )}
          {data.emailTemplate && (
            <pre data-testid="freightiq-email-preview" className="text-xs bg-zinc-50 p-2 rounded overflow-auto max-h-32">
              {data.emailTemplate.subject}
            </pre>
          )}
          <p className="text-xs text-zinc-500">Order: {orderState}</p>
        </section>
      )}

      {tab === "forwarders" && isAdmin && (
        <section data-testid="freightiq-forwarders" className="text-xs space-y-2">
          <p className="text-zinc-500">Select forwarders to send freight request (external — no login).</p>
          {(forwarderDir?.items ?? []).filter((f) => f.active).map((f) => (
            <label key={f.id} className="flex items-center gap-2" data-testid={`freightiq-forwarder-pick-${f.id}`}>
              <input
                type="checkbox"
                checked={selectedForwarders.includes(f.id)}
                onChange={(e) => {
                  setSelectedForwarders((prev) =>
                    e.target.checked ? [...prev, f.id] : prev.filter((id) => id !== f.id),
                  );
                }}
              />
              {f.companyName} · {f.email}
            </label>
          ))}
        </section>
      )}

      {tab === "communications" && (
        <section data-testid="freightiq-communications" className="space-y-3 text-xs">
          {isAdmin && data.request && (
            <button
              type="button"
              data-testid="freightiq-send-request"
              disabled={!selectedForwarders.length || commMutate.isPending}
              className="h-9 px-3 rounded bg-blue-900 text-white"
              onClick={() => commMutate.mutate({
                action: "send-communications",
                payload: {
                  forwarderContactIds: selectedForwarders,
                  channel: "EMAIL",
                  requestedReplyDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
                },
              })}
            >
              Send freight request
            </button>
          )}
          <ul className="space-y-1">
            {(data.communications ?? []).map((c) => (
              <li key={c.id} data-testid={`freightiq-comm-${c.id}`}>
                {c.forwarderCompanyName} · {c.status} · {c.channel}
              </li>
            ))}
            {!(data.communications ?? []).length && <li className="text-zinc-500">No communications yet</li>}
          </ul>
        </section>
      )}

      {tab === "intake" && isAdmin && data.request && (
        <section data-testid="freightiq-intake">
          <IntakeForm
            forwarders={forwarderDir?.items ?? []}
            onSubmit={(payload) => commMutate.mutate({ action: "intake-offer", payload })}
          />
        </section>
      )}

      {tab === "offers" && (
        <section data-testid="freightiq-offers">
          <OfferTable data={data} isAdmin={isAdmin} />
        </section>
      )}

      {tab === "comparison" && (
        <section data-testid="freightiq-comparison">
          <ComparisonView
            data={data}
            canSelect={canSelect && !data.selection}
            onSelect={(offerId) => {
              mutate.mutate({ action: "select-offer", payload: { offerId } });
              toast.success("Freight offer selected");
            }}
          />
        </section>
      )}

      {tab === "history" && (
        <section data-testid="freightiq-history" className="text-xs text-zinc-600 space-y-2">
          <p>Request: {data.request?.createdAt ? new Date(data.request.createdAt).toLocaleString() : "—"}</p>
          <p>Offers: {data.offers.length}</p>
          <p>Communications: {(data.communications ?? []).length}</p>
        </section>
      )}
    </div>
  );
}

function IntakeForm({
  forwarders,
  onSubmit,
}: {
  forwarders: Array<{ id: string; companyName: string }>;
  onSubmit: (p: Record<string, unknown>) => void;
}) {
  const [fid, setFid] = useState(forwarders[0]?.id ?? "");
  const [internalCost, setInternalCost] = useState("2000");
  const [margin, setMargin] = useState("350");
  const etd = new Date(Date.now() + 14 * 86400_000).toISOString();
  const eta = new Date(Date.now() + 35 * 86400_000).toISOString();
  const validUntil = new Date(Date.now() + 21 * 86400_000).toISOString();
  const cutOff = new Date(Date.now() + 10 * 86400_000).toISOString();
  const displayPreview = Number(internalCost || 0) + Number(margin || 0);

  return (
    <div className="space-y-2 text-xs max-w-md">
      <label className="block">
        Forwarder
        <select
          data-testid="freightiq-intake-forwarder"
          className="mt-1 w-full border rounded px-2 py-1"
          value={fid}
          onChange={(e) => setFid(e.target.value)}
        >
          {forwarders.map((f) => (
            <option key={f.id} value={f.id}>{f.companyName}</option>
          ))}
        </select>
      </label>
      <label className="block">
        Internal cost (USD)
        <input
          data-testid="freightiq-intake-internal-cost"
          type="number"
          className="mt-1 w-full border rounded px-2 py-1"
          value={internalCost}
          onChange={(e) => setInternalCost(e.target.value)}
        />
      </label>
      <label className="block">
        Margin (USD)
        <input
          data-testid="freightiq-intake-margin"
          type="number"
          className="mt-1 w-full border rounded px-2 py-1"
          value={margin}
          onChange={(e) => setMargin(e.target.value)}
        />
      </label>
      <p data-testid="freightiq-intake-display-preview">
        Display price: {displayPreview} USD
      </p>
      <button
        type="button"
        data-testid="freightiq-intake-submit"
        className="h-9 px-3 rounded border"
        disabled={!fid}
        onClick={() => onSubmit({
          forwarderContactId: fid,
          offerSource: "MANUAL_ENTRY",
          carrierName: "MSC",
          vesselName: "MSC Vessel",
          etd,
          eta,
          transitDays: 21,
          cutOff,
          internalCostUsd: Number(internalCost),
          freightiqMarginUsd: Number(margin),
          currency: "USD",
          validUntil,
          remarks: "Intake E2E",
        })}
      >
        Add freight offer (manual intake)
      </button>
    </div>
  );
}

function OfferTable({ data, isAdmin }: { data: FreightSummary; isAdmin: boolean }) {
  if (!data.offers.length) return <p className="text-sm text-zinc-500">No offers yet.</p>;
  return (
    <table className="w-full text-xs" data-testid="freightiq-offer-table">
      <thead>
        <tr className="text-left text-zinc-500">
          <th>Forwarder</th><th>Carrier</th><th>Vessel</th>
          {isAdmin && <><th>Cost</th><th>Margin</th></>}
          <th>Display price</th><th>Transit</th>
        </tr>
      </thead>
      <tbody>
        {data.offers.map((o) => (
          <tr key={o.id} data-testid={`freightiq-offer-${o.id}`} className="border-t">
            <td>{o.forwarderCompanyName ?? o.providerName}</td>
            <td>{o.carrierName}</td>
            <td>{o.vesselName ?? "—"}</td>
            {isAdmin && (
              <>
                <td data-testid={`freightiq-offer-cost-${o.id}`}>{o.commercial?.internalCostUsd ?? "—"}</td>
                <td data-testid={`freightiq-offer-margin-${o.id}`}>{o.commercial?.freightiqMarginUsd ?? "—"}</td>
              </>
            )}
            <td data-testid={`freightiq-offer-display-${o.id}`}>{o.price} {o.currency}</td>
            <td>{o.transitDays}d</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ComparisonView({
  data,
  canSelect,
  onSelect,
}: {
  data: FreightSummary;
  canSelect: boolean;
  onSelect: (offerId: string) => void;
}) {
  const hints = data.comparisonHints;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-zinc-500">
          <th>Forwarder</th><th>Carrier</th><th>Vessel</th><th>ETD</th><th>ETA</th>
          <th>Transit</th><th>Cut-off</th><th>Price</th><th>Indicators</th><th />
        </tr>
      </thead>
      <tbody>
        {data.offers.map((o) => (
          <tr key={o.id} data-testid={`freightiq-offer-${o.id}`} className="border-t">
            <td>{o.forwarderCompanyName ?? o.providerName}</td>
            <td>{o.carrierName}</td>
            <td>{o.vesselName ?? "—"}</td>
            <td>{o.etd ? new Date(o.etd).toLocaleDateString() : "—"}</td>
            <td>{o.eta ? new Date(o.eta).toLocaleDateString() : "—"}</td>
            <td>{o.transitDays}d</td>
            <td>{o.cutOff ? new Date(o.cutOff).toLocaleDateString() : "—"}</td>
            <td data-testid={`freightiq-comparison-price-${o.id}`}>{o.price} {o.currency}</td>
            <td>
              {hints.lowestPriceOfferId === o.id && <span className="mr-1 text-green-700">Lowest</span>}
              {hints.fastestTransitOfferId === o.id && <span className="mr-1 text-blue-700">Fastest</span>}
              {hints.earliestEtdOfferId === o.id && <span className="mr-1 text-indigo-700">Earliest ETD</span>}
              {hints.closestCutOffOfferId === o.id && <span className="mr-1 text-purple-700">Cut-off</span>}
              {hints.expiringSoonOfferIds.includes(o.id) && <span className="text-amber-700">Expiring</span>}
            </td>
            <td>
              {canSelect && (
                <button
                  type="button"
                  data-testid={`freightiq-select-${o.id}`}
                  className="px-2 py-0.5 border rounded"
                  onClick={() => onSelect(o.id)}
                >
                  Select
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
