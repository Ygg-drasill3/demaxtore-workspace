import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customsApi } from "../lib/customs.api";
import { useAuth } from "@/store/auth.store";
import { toast } from "@/store/toast.store";

export default function CustomsCasePage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const qc = useQueryClient();
  const [declRef, setDeclRef] = useState("");
  const [customsOffice, setCustomsOffice] = useState("");
  const [holdReason, setHoldReason] = useState("");
  const [holdCategory, setHoldCategory] = useState("OTHER");
  const [docType, setDocType] = useState("COMMERCIAL_INVOICE");
  const [docReason, setDocReason] = useState("");
  const [infoTitle, setInfoTitle] = useState("");
  const [infoDesc, setInfoDesc] = useState("");
  const [verifyProductId, setVerifyProductId] = useState("");
  const [verifyGtip, setVerifyGtip] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["customs", "case", id],
    queryFn: () => customsApi.get(id!),
    enabled: !!id,
  });

  const { data: events } = useQuery({
    queryKey: ["customs", "case", id, "events"],
    queryFn: () => customsApi.events(id!),
    enabled: !!id,
  });

  const { data: dutyTax, refetch: refetchDutyTax } = useQuery({
    queryKey: ["customs", "case", id, "duty-tax"],
    queryFn: () => customsApi.getDutyTax(id!),
    enabled: !!id,
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["customs", "case", id] });
    void qc.invalidateQueries({ queryKey: ["landed-cost"] });
  };

  const onOk = (msg: string) => {
    toast.success(msg);
    invalidate();
  };
  const onErr = (msg: string) => toast.error(msg);

  const startReview = useMutation({
    mutationFn: () => customsApi.startReview(id!),
    onSuccess: () => onOk("Broker review started"),
    onError: () => onErr("Could not start review"),
  });

  const startPrep = useMutation({
    mutationFn: () => customsApi.startDeclarationPreparation(id!),
    onSuccess: () => onOk("Declaration preparation started (external)"),
    onError: () => onErr("Blocked — check readiness"),
  });

  const startProcessing = useMutation({
    mutationFn: () => customsApi.startCustomsProcessing(id!),
    onSuccess: () => onOk("Customs processing recorded (broker-reported)"),
    onError: () => onErr("Could not update processing status"),
  });

  const markPending = useMutation({
    mutationFn: () => customsApi.markClearancePending(id!),
    onSuccess: () => onOk("Clearance pending recorded"),
    onError: () => onErr("Could not mark clearance pending"),
  });

  const markCleared = useMutation({
    mutationFn: () => customsApi.markCleared(id!),
    onSuccess: () => onOk("Broker reported cleared"),
    onError: () => onErr("Could not mark cleared"),
  });

  const recordDecl = useMutation({
    mutationFn: () =>
      customsApi.recordDeclaration(id!, {
        declarationReference: declRef.trim(),
        customsOffice: customsOffice.trim() || undefined,
      }),
    onSuccess: () => {
      onOk("External declaration recorded");
      setDeclRef("");
    },
    onError: () => onErr("Could not record declaration — check readiness / GTİP"),
  });

  const placeHold = useMutation({
    mutationFn: () =>
      customsApi.brokerHold(id!, {
        category: holdCategory,
        reason: holdReason.trim(),
        ownerRole: "BUYER",
      }),
    onSuccess: () => {
      onOk("Operational hold placed");
      setHoldReason("");
    },
    onError: () => onErr("Could not place hold"),
  });

  const resolveHold = useMutation({
    mutationFn: () => customsApi.resolveHold(id!),
    onSuccess: () => onOk("Hold resolved"),
    onError: () => onErr("Could not resolve hold"),
  });

  const requestDoc = useMutation({
    mutationFn: () =>
      customsApi.requestDocument(id!, {
        documentType: docType,
        reason: docReason.trim() || "Broker requested missing customs document",
        ownerRole: "BUYER",
      }),
    onSuccess: () => {
      onOk("Document request created");
      setDocReason("");
    },
    onError: () => onErr("Could not request document"),
  });

  const requestInfo = useMutation({
    mutationFn: () =>
      customsApi.requestInformation(id!, {
        category: "PRODUCT_INFORMATION",
        title: infoTitle.trim(),
        description: infoDesc.trim(),
        ownerRole: "BUYER",
      }),
    onSuccess: () => {
      onOk("Information request created");
      setInfoTitle("");
      setInfoDesc("");
    },
    onError: () => onErr("Could not request information"),
  });

  const verifyClass = useMutation({
    mutationFn: () =>
      customsApi.verifyClassification(id!, {
        productId: verifyProductId,
        gtipCode: verifyGtip.trim(),
      }),
    onSuccess: () => {
      onOk("Classification verified by customs broker");
      setVerifyGtip("");
    },
    onError: () => onErr("Could not verify classification"),
  });

  const syncBroker = useMutation({
    mutationFn: () => customsApi.syncBroker(id!),
    onSuccess: () => onOk("Broker assignment synced"),
  });

  const calculateDutyTax = useMutation({
    mutationFn: () =>
      customsApi.calculateDutyTax(id!, {
        targetCurrency: "TRY",
        exchangeRate: 34,
        exchangeRateSource: "MANUAL",
      }),
    onSuccess: () => {
      toast.success("Duty/Tax calculated");
      void refetchDutyTax();
      invalidate();
    },
    onError: (err: any) => {
      const e = err?.response?.data?.error;
      onErr(typeof e === "string" ? e : e?.message ?? e?.code ?? "Duty/Tax calculate failed");
    },
  });

  if (isLoading) return <p className="p-6 text-sm text-zinc-500">Loading customs case…</p>;
  if (isError || !data) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-600">Failed to load customs case.</p>
        <button type="button" className="text-sm underline" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  const readiness = data.readiness;
  const isBroker = user?.role === "CUSTOMS_BROKER";
  const isOpsCustoms =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN" || isBroker;
  const actions = new Set(data.allowedActions ?? []);
  const eventRows = Array.isArray(events) ? events : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6" data-testid="customs-case-page">
      <header className="space-y-1">
        <Link
          to={isBroker ? "/partner/customs" : isOpsCustoms ? "/partner" : "/buyer/customs"}
          className="text-xs text-blue-600 hover:underline"
          data-testid="customs-back-link"
        >
          ← Back
        </Link>
        <p className="text-xs uppercase tracking-wide text-zinc-500">Turkey Customs Case</p>
        <h1 className="text-2xl font-semibold">{data.shipmentRef ?? "Customs Case"}</h1>
        <p className="text-sm text-zinc-600">
          Status: <strong>{data.status.replace(/_/g, " ")}</strong>
          {" · "}
          Source: {data.statusSource.replace(/_/g, " ")}
          {" · "}
          Readiness (preparation): {data.readinessStatus.replace(/_/g, " ")}
        </p>
        {data.status === "CLEARED" && (
          <p className="text-xs text-emerald-800" data-testid="customs-cleared-readiness-note">
            CLEARED is the current customs lifecycle. Readiness does not override it.
          </p>
        )}
        {data.preArrival && (
          <p className="text-sm text-zinc-700" data-testid="pre-arrival-summary">
            Pre-arrival: <strong>{data.preArrival.label}</strong>
            {data.preArrival.daysToArrival != null ? ` · ${data.preArrival.daysToArrival} days to arrival` : ""}
            {data.preArrival.nextAction ? ` · Next: ${data.preArrival.nextAction}` : ""}
          </p>
        )}
        <p className="text-xs text-zinc-500">
          Broker actions are attributed to the customs broker. DeMaxtore does not file declarations with Turkish
          Customs.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2" data-testid="customs-overview">
        <Card title="Case summary">
          <Row label="Shipment" value={data.shipmentRef} />
          <Row label="Origin" value={data.originPort} />
          <Row label="Destination" value={data.destinationPort} />
          <Row label="ETA" value={data.eta ? new Date(data.eta).toLocaleString() : null} />
          <Row label="ATA" value={data.ata ? new Date(data.ata).toLocaleString() : null} />
          <Row label="Customs status" value={data.status.replace(/_/g, " ")} />
          <Row label="Readiness (preparation)" value={data.readinessStatus.replace(/_/g, " ")} />
          <Link
            className="mt-2 inline-block text-sm text-blue-600 underline"
            to={`/workspace/shipment/${data.shipmentWorkspaceId}`}
          >
            Open Shipment Workspace
          </Link>
        </Card>
        <Card title="Declaration">
          <Row
            label="Reference"
            value={
              data.declarationReference
                ? data.declarationReference
                : "Not recorded"
            }
          />
          <Row
            label="Operational status"
            value={
              data.declarationReference
                ? "External declaration recorded"
                : data.status === "DECLARATION_PREPARING"
                  ? "Preparing externally"
                  : "Not recorded"
            }
          />
          <Row label="Date" value={data.declarationDate ? new Date(data.declarationDate).toLocaleDateString() : null} />
          <Row label="Customs office" value={data.customsOffice} />
          <Row label="Broker" value={data.brokerUserId ? "Assigned" : "Not assigned"} />
          {data.status === "HOLD" && (
            <p className="mt-2 rounded-md bg-red-50 px-2 py-1 text-xs text-red-700">
              HOLD · {data.holdCategory} · {data.holdReason}
            </p>
          )}
          {data.clearedAt && (
            <p className="mt-2 rounded-md bg-emerald-50 px-2 py-1 text-xs text-emerald-800">
              Broker reported cleared · {new Date(data.clearedAt).toLocaleString()}
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-2" data-testid="customs-readiness">
        <h2 className="text-lg font-medium">Customs Readiness</h2>
        <p className="text-sm text-zinc-600">
          {readiness?.status?.replace(/_/g, " ") ?? data.readinessStatus} · {readiness?.blockingCount ?? 0}{" "}
          blocking · {readiness?.warningCount ?? 0} warnings
        </p>
        <ul className="divide-y rounded-lg border bg-white">
          {(readiness?.checks ?? []).map((c) => (
            <li key={c.code} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{c.label ?? c.code}</p>
                {c.reason && <p className="text-xs text-zinc-500">{c.reason}</p>}
              </div>
              <span
                className={`text-xs font-semibold ${
                  c.status === "PASS" ? "text-emerald-700" : c.status === "WARNING" ? "text-amber-700" : "text-red-700"
                }`}
              >
                {c.status === "PASS" ? "✓" : c.status === "WARNING" ? "!" : "✕"} {c.status}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-xl border border-paper-200 bg-white p-4" data-testid="customs-duty-tax">
        <h2 className="text-lg font-medium">Duty &amp; Tax</h2>
        <p className="text-xs text-zinc-500">
          Canonical DutyTaxCalculation feeds the global Landed Cost Engine (duty and VAT as separate
          components). Estimation only — not official customs liability.
        </p>
        {dutyTax ? (
          <div className="space-y-1 text-sm" data-testid="duty-tax-summary">
            <p>
              Status: <strong>{String(dutyTax.status ?? "—")}</strong>
              {" · "}
              Currency: {String(dutyTax.calculationCurrency ?? "—")}
              {" · "}
              Version: {String(dutyTax.version ?? "—")}
            </p>
            <p>
              Duty:{" "}
              <strong data-testid="duty-amount">
                {dutyTax.totalsByComponent?.CUSTOMS_DUTY != null
                  ? Number(dutyTax.totalsByComponent.CUSTOMS_DUTY).toLocaleString()
                  : "—"}
              </strong>
              {" · "}
              VAT:{" "}
              <strong data-testid="vat-amount">
                {dutyTax.totalsByComponent?.VAT != null
                  ? Number(dutyTax.totalsByComponent.VAT).toLocaleString()
                  : "—"}
              </strong>
              {" · "}
              Total evaluated:{" "}
              {dutyTax.totalEvaluatedAmount != null
                ? Number(dutyTax.totalEvaluatedAmount).toLocaleString()
                : "—"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-amber-800" data-testid="duty-tax-missing">
            No DutyTaxCalculation yet.
          </p>
        )}
        <button
          type="button"
          className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          disabled={calculateDutyTax.isPending}
          data-testid="calculate-duty-tax"
          onClick={() => calculateDutyTax.mutate()}
        >
          {calculateDutyTax.isPending ? "Calculating…" : dutyTax ? "Recalculate Duty/Tax" : "Calculate Duty/Tax"}
        </button>
      </section>

      <section className="space-y-2" data-testid="customs-products">
        <h2 className="text-lg font-medium">Products</h2>
        {(data.products?.length ?? 0) === 0 ? (
          <p className="text-sm text-zinc-500">No shipment line allocations yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-paper-50 text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-3 py-2">PO</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Commercial</th>
                  <th className="px-3 py-2">Customs desc</th>
                  <th className="px-3 py-2">Qty (ship)</th>
                  <th className="px-3 py-2">Origin</th>
                  <th className="px-3 py-2">GTİP</th>
                  <th className="px-3 py-2">Class</th>
                </tr>
              </thead>
              <tbody>
                {data.products!.map((p) => (
                  <tr key={p.purchaseOrderLineId} className="border-t">
                    <td className="px-3 py-2">{p.poNumber ?? "—"}</td>
                    <td className="px-3 py-2">{p.sku ?? "MISSING"}</td>
                    <td className="px-3 py-2">{p.description || "MISSING"}</td>
                    <td className="px-3 py-2">{p.customsDescription || "MISSING"}</td>
                    <td className="px-3 py-2">{p.allocatedQuantity ?? p.quantity}</td>
                    <td className="px-3 py-2">{p.countryOfOrigin ?? "MISSING"}</td>
                    <td className="px-3 py-2 font-mono text-xs">{p.gtipCode ?? "MISSING"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`text-xs font-medium ${
                          p.classificationStatus === "VERIFIED"
                            ? "text-emerald-700"
                            : p.classificationStatus === "CANDIDATE"
                              ? "text-amber-700"
                              : "text-zinc-500"
                        }`}
                      >
                        {p.classificationStatus ?? "UNKNOWN"}
                        {p.classificationSource ? ` · ${p.classificationSource}` : ""}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-lg border bg-white p-4" data-testid="customs-actions">
        <h2 className="text-lg font-medium">Broker execution</h2>
        <div className="flex flex-wrap gap-2">
          {!isBroker && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              onClick={() => syncBroker.mutate()}
              disabled={syncBroker.isPending}
            >
              Sync broker assignment
            </button>
          )}
          {actions.has("START_REVIEW") && (
            <button
              type="button"
              className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
              data-testid="start-review"
              disabled={startReview.isPending}
              onClick={() => startReview.mutate()}
            >
              Start review
            </button>
          )}
          {actions.has("START_DECLARATION_PREPARATION") && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              data-testid="start-declaration-prep"
              disabled={startPrep.isPending}
              onClick={() => startPrep.mutate()}
            >
              Start declaration preparation
            </button>
          )}
          {actions.has("START_CUSTOMS_PROCESSING") && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              disabled={startProcessing.isPending}
              onClick={() => startProcessing.mutate()}
            >
              Record customs processing
            </button>
          )}
          {actions.has("MARK_CLEARANCE_PENDING") && (
            <button
              type="button"
              className="rounded-lg border px-3 py-1.5 text-sm"
              disabled={markPending.isPending}
              onClick={() => markPending.mutate()}
            >
              Clearance pending
            </button>
          )}
          {actions.has("MARK_CLEARED") && (
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
              data-testid="mark-cleared"
              disabled={markCleared.isPending}
              onClick={() => markCleared.mutate()}
            >
              Mark cleared (broker reported)
            </button>
          )}
          {data.status === "HOLD" ? (
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-sm text-white"
              onClick={() => resolveHold.mutate()}
            >
              Resolve hold
            </button>
          ) : actions.has("PLACE_HOLD") ? (
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="dmx-input w-40"
                value={holdCategory}
                onChange={(e) => setHoldCategory(e.target.value)}
              >
                {["DOCUMENT", "CLASSIFICATION", "CUSTOMS_QUERY", "VALUATION", "PAYMENT", "INSPECTION", "OTHER"].map(
                  (c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ),
                )}
              </select>
              <input
                className="dmx-input w-56"
                placeholder="Hold reason"
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
              />
              <button
                type="button"
                className="rounded-lg bg-red-700 px-3 py-1.5 text-sm text-white"
                disabled={holdReason.trim().length < 3}
                onClick={() => placeHold.mutate()}
              >
                Place operational hold
              </button>
            </div>
          ) : null}
        </div>

        {actions.has("RECORD_DECLARATION") && (
          <div className="flex flex-wrap items-center gap-2 border-t pt-3">
            <input
              className="dmx-input w-64"
              placeholder="External declaration reference"
              value={declRef}
              onChange={(e) => setDeclRef(e.target.value)}
              data-testid="declaration-ref-input"
            />
            <input
              className="dmx-input w-48"
              placeholder="Customs office (optional)"
              value={customsOffice}
              onChange={(e) => setCustomsOffice(e.target.value)}
            />
            <button
              type="button"
              className="rounded-lg bg-accent-900 px-3 py-1.5 text-sm text-white"
              disabled={declRef.trim().length < 1}
              onClick={() => recordDecl.mutate()}
            >
              Record external declaration
            </button>
          </div>
        )}

        {(actions.has("REQUEST_DOCUMENT") || actions.has("REQUEST_INFORMATION") || actions.has("VERIFY_CLASSIFICATION")) && (
          <div className="grid gap-3 border-t pt-3 md:grid-cols-3">
            {actions.has("REQUEST_DOCUMENT") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">Request document</p>
                <select className="dmx-input w-full" value={docType} onChange={(e) => setDocType(e.target.value)}>
                  {["COMMERCIAL_INVOICE", "PACKING_LIST", "BILL_OF_LADING", "CERTIFICATE_OF_ORIGIN"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className="dmx-input w-full"
                  placeholder="Reason"
                  value={docReason}
                  onChange={(e) => setDocReason(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  data-testid="request-document"
                  onClick={() => requestDoc.mutate()}
                >
                  Request document
                </button>
              </div>
            )}
            {actions.has("REQUEST_INFORMATION") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">Request information</p>
                <input
                  className="dmx-input w-full"
                  placeholder="Title"
                  value={infoTitle}
                  onChange={(e) => setInfoTitle(e.target.value)}
                />
                <input
                  className="dmx-input w-full"
                  placeholder="Description"
                  value={infoDesc}
                  onChange={(e) => setInfoDesc(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  disabled={infoTitle.trim().length < 3 || infoDesc.trim().length < 3}
                  onClick={() => requestInfo.mutate()}
                >
                  Request information
                </button>
              </div>
            )}
            {actions.has("VERIFY_CLASSIFICATION") && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-zinc-500">Verify GTİP</p>
                <select
                  className="dmx-input w-full"
                  value={verifyProductId}
                  onChange={(e) => setVerifyProductId(e.target.value)}
                >
                  <option value="">Select product</option>
                  {(data.products ?? [])
                    .filter((p) => p.productId)
                    .map((p) => (
                      <option key={p.productId!} value={p.productId!}>
                        {p.sku ?? p.productId!.slice(0, 8)} · {p.classificationStatus ?? "?"}
                      </option>
                    ))}
                </select>
                <input
                  className="dmx-input w-full"
                  placeholder="GTİP code"
                  value={verifyGtip}
                  onChange={(e) => setVerifyGtip(e.target.value)}
                  data-testid="verify-gtip-input"
                />
                <button
                  type="button"
                  className="rounded-lg border px-3 py-1.5 text-sm"
                  data-testid="verify-classification"
                  disabled={!verifyProductId || verifyGtip.trim().length < 2}
                  onClick={() => verifyClass.mutate()}
                >
                  Verify classification
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-2" data-testid="customs-activity">
        <h2 className="text-lg font-medium">Activity</h2>
        {eventRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No customs events yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-white text-sm">
            {eventRows.slice(0, 25).map((e: {
              id: string;
              reason?: string | null;
              fromStatus?: string;
              toStatus?: string;
              source?: string;
              createdAt?: string;
            }) => (
              <li key={e.id} className="px-3 py-2">
                <p className="font-medium">
                  {(e.reason ?? `${e.fromStatus} → ${e.toStatus}`).toString().replace(/_/g, " ")}
                </p>
                <p className="text-xs text-zinc-500">
                  {e.source?.replace(/_/g, " ")}
                  {e.createdAt ? ` · ${new Date(e.createdAt).toLocaleString()}` : ""}
                  {e.fromStatus && e.toStatus && e.fromStatus !== e.toStatus
                    ? ` · ${e.fromStatus} → ${e.toStatus}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-1">
      <h3 className="text-sm font-semibold text-zinc-800">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-medium text-zinc-900">{value ?? "—"}</span>
    </div>
  );
}
