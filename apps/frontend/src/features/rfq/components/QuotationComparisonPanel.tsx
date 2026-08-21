// apps/frontend/src/features/rfq/components/QuotationComparisonPanel.tsx
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRfqTimeline } from "../hooks";
import { Card, CardHeader, CardTitle, CardEyebrow, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/SkeletonLoader";
import { Badge } from "@/components/ui/Badge";
import { useQuotations, useSelectQuotation } from "../hooks/useQuotations";
import { useTelemetry } from "@/features/telemetry/useTelemetry";
import { cn } from "@/lib/utils";
import {
  Star, CheckCircle2, Medal, Trophy, Award, Info, Scale, ChevronDown,
  Globe, Layers, Tag, Lock, Package, MapPin, FileText, CalendarClock,
  Wheat, Coffee, Milk, Beef, Fish, Apple, Cookie,
  Shirt, Droplet, FlaskConical, Cpu, Sofa, Pill, Car, Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RfqState } from "@dmx/contracts/rfq.fsm";
import type { QuotationRowDTO } from "@dmx/contracts/supplier-activity";
import { activeQuotations } from "../lib/quotations.normalize";
import {
  groupQuotationsByProduct,
  productSectionTitle,
  type RfqLineRef,
} from "../lib/quotations-by-product";
import {
  buildVariationsFromQuotation,
  variationGridClass,
  variationPriceUnitLabel,
} from "../lib/offer-variations";
import { QuotationAwardFlowModal } from "./QuotationAwardFlowModal";
import { useT } from "@/i18n/useT";

export interface QuotationProductSummary {
  name: string;
  category?: string;
  imageUrl?: string | null;
  products?: Array<{
    name: string;
    category?: string;
    imageUrl?: string | null;
    quantity?: string;
  }>;
  quantity?: string;
  destination?: string;
  incoterm?: string;
  deadline?: string | null;
}

interface Props {
  workspaceId:       string;
  state:             RfqState;
  rfqLineItems?:     RfqLineRef[];
  buyerTargetTotal?: number;
  buyerTargetLeadDays?: number;
  selectedQuotationId?: string | null;
  isOwner: boolean;
  productSummary?: QuotationProductSummary;
}

const SHOW_PANEL_STATES = new Set<RfqState>([
  "RFQ_OPEN", "QUOTATIONS_CLOSED", "UNDER_EVALUATION",
  "SUPPLIER_SELECTED", "PROFORMA_REQUESTED", "PROFORMA_RECEIVED",
  "PROFORMA_APPROVED", "PO_ISSUED",
]);

export function QuotationComparisonPanel(props: Props) {
  const { workspaceId, state, selectedQuotationId, isOwner } = props;
  const { data, isLoading } = useQuotations(
    SHOW_PANEL_STATES.has(state) ? workspaceId : undefined,
    state,
  );
  const { data: timeline } = useRfqTimeline(
    SHOW_PANEL_STATES.has(state) ? workspaceId : undefined,
  );
  const revisionHistory = useMemo(() => buildRevisionHistory(timeline), [timeline]);

  if (!SHOW_PANEL_STATES.has(state)) return null;

  const quotations = activeQuotations(data ?? []);
  const isCollapsed =
    (state === "SUPPLIER_SELECTED" ||
     state === "PROFORMA_REQUESTED" ||
     state === "PROFORMA_RECEIVED" ||
     state === "PROFORMA_APPROVED" ||
     state === "PO_ISSUED") && !!selectedQuotationId;

  if (isLoading) {
    return (
      <Card data-testid="quotations-panel-loading">
        <CardHeader><CardTitle>Supplier Quotations</CardTitle></CardHeader>
        <CardBody className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </CardBody>
      </Card>
    );
  }

  if (state === "RFQ_OPEN" && quotations.length === 0) return <EmptyPanel />;

  if (isCollapsed) {
    return <CollapsedPanel quotations={quotations} selectedId={selectedQuotationId!} />;
  }

  return (
    <QuotationListPanel
      quotations={quotations}
      rfqLineItems={props.rfqLineItems ?? []}
      revisionHistory={revisionHistory}
      state={state}
      workspaceId={workspaceId}
      isOwner={isOwner}
      productSummary={props.productSummary}
    />
  );
}

// ---------------------------------------------------------------------------
type RevisionEntry = { total: number; currency: string; at: string; kind: "SUBMITTED" | "REVISED" };

function buildRevisionHistory(timeline: unknown): Record<string, RevisionEntry[]> {
  const events = Array.isArray(timeline) ? timeline : [];
  const history: Record<string, RevisionEntry[]> = {};
  for (const raw of events) {
    const e = raw as { eventType?: string; createdAt?: string; payload?: Record<string, unknown> };
    if (!e.eventType?.startsWith("quotation.")) continue;
    const sid = String(e.payload?.supplierUserId ?? "");
    const total = Number(e.payload?.total);
    if (!sid || !Number.isFinite(total)) continue;
    const list = history[sid] ?? [];
    list.push({
      total,
      currency: String(e.payload?.currency ?? "USD"),
      at: String(e.createdAt ?? ""),
      kind: e.eventType === "quotation.revised" ? "REVISED" : "SUBMITTED",
    });
    history[sid] = list;
  }
  return history;
}

function fmt(currency: string, amount: number) {
  return `${currency} ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const RANK_CONFIG = [
  { icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-50 border-yellow-200" },
  { icon: Medal,  color: "text-zinc-400",   bg: "bg-zinc-50 border-zinc-200" },
  { icon: Award,  color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
];

const ATTRIBUTES = [
  { icon: Globe,  label: "Export Experience" },
  { icon: Layers, label: "High Capacity" },
  { icon: Tag,    label: "Private Label" },
];

// ---------------------------------------------------------------------------
function EmptyPanel() {
  return (
    <Card data-testid="quotations-panel-empty">
      <CardHeader><CardTitle>Supplier Quotations</CardTitle></CardHeader>
      <CardBody>
        <div className="rounded-xl border border-dashed border-paper-200 bg-paper-50/80 px-6 py-10 text-center">
          <p className="text-sm text-zinc-600 max-w-md mx-auto leading-relaxed">
            Suppliers are reviewing your RFQ. Bids will appear here as they arrive.
          </p>
          <p className="text-xs text-zinc-400 mt-3">You will be notified when the comparison view is ready.</p>
        </div>
      </CardBody>
    </Card>
  );
}

// ---------------------------------------------------------------------------
type Row = {
  quotation: QuotationRowDTO;
  key: string;
  rfqLineItemId: string;
  unitPrice: number;
  total: number;
  lineUom?: string;
  productTitle?: string;
};

function QuotationListPanel(props: {
  quotations: QuotationRowDTO[];
  rfqLineItems: RfqLineRef[];
  revisionHistory: Record<string, RevisionEntry[]>;
  state: RfqState;
  workspaceId: string;
  isOwner: boolean;
  productSummary?: QuotationProductSummary;
}) {
  const { quotations, rfqLineItems, state, workspaceId, isOwner, productSummary } = props;
  const select = useSelectQuotation(workspaceId);
  const qc = useQueryClient();
  const { track } = useTelemetry();

  const [shortlisted, setShortlisted] = useState<Set<string>>(new Set());
  const [compareSel, setCompareSel] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"all" | "shortlisted" | "compared">("all");
  const [showAll, setShowAll] = useState(false);
  const [awardRow, setAwardRow] = useState<Row | null>(null);

  const canSelect = state === "UNDER_EVALUATION" && isOwner;
  const canAwardFromCheckbox =
    isOwner && (state === "RFQ_OPEN" || state === "QUOTATIONS_CLOSED" || state === "UNDER_EVALUATION");

  // Flatten to comparable rows. Multi-product → one row per (quotation, line).
  const rows = useMemo<Row[]>(() => {
    const groups = groupQuotationsByProduct(rfqLineItems, quotations);
    if (groups) {
      const out: Row[] = [];
      for (const g of groups) {
        for (const b of g.bids) {
          out.push({
            quotation: b.quotation,
            key: `${b.quotation.id}-${b.lineItem.id}`,
            rfqLineItemId: b.lineItem.rfqLineItemId ?? b.lineItem.id,
            unitPrice: b.lineItem.unitPrice,
            total: b.lineTotal,
            lineUom: g.line.uom,
            productTitle: productSectionTitle(g.line.description),
          });
        }
      }
      return out.sort((a, b) => a.unitPrice - b.unitPrice);
    }
    return quotations
      .map((q) => ({
        quotation: q,
        key: q.id,
        rfqLineItemId: q.lineItems?.[0]?.rfqLineItemId ?? q.lineItems?.[0]?.id ?? "",
        unitPrice: q.unitPriceAvg ?? q.total,
        total: q.total,
      }))
      .sort((a, b) => a.unitPrice - b.unitPrice);
  }, [rfqLineItems, quotations]);

  const currency = rows[0]?.quotation.currency ?? "USD";
  const unitPrices = rows.map((r) => r.unitPrice);
  const lowestUnit = unitPrices.length ? Math.min(...unitPrices) : 0;
  const highestUnit = unitPrices.length ? Math.max(...unitPrices) : 0;
  const avgUnit = unitPrices.length ? unitPrices.reduce((a, b) => a + b, 0) / unitPrices.length : 0;
  const priceDiff = lowestUnit > 0 ? ((highestUnit - lowestUnit) / lowestUnit) * 100 : 0;

  const fastestLead = useMemo(() => {
    const leads = rows.map((r) => r.quotation.leadTimeDays).filter((d): d is number => d != null);
    return leads.length ? Math.min(...leads) : null;
  }, [rows]);

  const bestRow = rows[0];

  const toggleShortlist = (key: string) =>
    setShortlisted((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const toggleCompare = (key: string) =>
    setCompareSel((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < 3) next.add(key);
      return next;
    });

  const handleSelect = (q: QuotationRowDTO) => {
    track("next_action.clicked", { workspaceId, targetId: "select_supplier", meta: { quotationId: q.id } });
    select.mutate({
      quotationId: q.id,
      supplierUserId: q.supplierId,
      rationale: "Selected from quotation comparison panel",
    });
  };

  const closeAwardFlow = () => setAwardRow(null);

  const toggleAwardRow = (row: Row) => {
    if (awardRow?.key === row.key) {
      setAwardRow(null);
      return;
    }
    track("next_action.clicked", { workspaceId, targetId: "quotation_award_flow", meta: { quotationId: row.quotation.id } });
    setAwardRow(row);
  };

  const visibleRows = useMemo(() => {
    let r = rows;
    if (tab === "shortlisted") r = rows.filter((x) => shortlisted.has(x.key));
    if (tab === "compared") r = rows.filter((x) => compareSel.has(x.key));
    return r;
  }, [rows, tab, shortlisted, compareSel]);

  const VISIBLE_DEFAULT = 3;
  const displayed = showAll || tab !== "all" ? visibleRows : visibleRows.slice(0, VISIBLE_DEFAULT);
  const hiddenCount = visibleRows.length - displayed.length;

  const TABS = [
    { id: "all" as const, label: `All Quotations (${rows.length})` },
    { id: "shortlisted" as const, label: `Shortlisted (${shortlisted.size})` },
    { id: "compared" as const, label: `Compared (${compareSel.size})` },
  ];

  return (
    <div data-testid="quotations-panel-matrix" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-5 items-start">
      {/* ── Main column ── */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Supplier Quotations</p>
            <h2 className="text-lg font-semibold text-ink-900 mt-1">
              Review and compare quotations from verified suppliers.
            </h2>
          </div>
          <Badge tone={state === "UNDER_EVALUATION" ? "accent" : "neutral"} dot className="shrink-0">
            {state === "UNDER_EVALUATION" ? "Evaluation open" : "Ready to evaluate"}
          </Badge>
        </div>

        {/* Product summary */}
        {productSummary && <ProductSummaryCard summary={productSummary} />}

        {/* Tabs + compare */}
        <div className="flex items-center justify-between gap-3 flex-wrap border-b border-paper-200">
          <div className="flex items-center gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
                  tab === t.id
                    ? "border-accent-900 text-accent-900"
                    : "border-transparent text-zinc-500 hover:text-ink-900",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          {compareSel.size >= 2 && (
            <Button variant="secondary" size="sm" className="gap-1.5 mb-1" onClick={() => setTab("compared")}>
              <Scale className="h-3.5 w-3.5" />
              Compare Suppliers ({compareSel.size})
            </Button>
          )}
        </div>

        {/* Info bar */}
        <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-2.5 text-xs text-emerald-800">
          <Info className="h-3.5 w-3.5 shrink-0" />
          All prices are in {currency}. You can select up to 3 suppliers to compare.
        </div>

        {/* Rows */}
        <div className="space-y-3" data-testid="quotation-matrix">
          {displayed.length === 0 ? (
            <p className="text-sm text-zinc-500 rounded-xl border border-dashed border-paper-200 bg-paper-50/60 px-4 py-8 text-center">
              {tab === "shortlisted" ? "No shortlisted quotations yet." : tab === "compared" ? "Select suppliers to compare." : "No quotations yet."}
            </p>
          ) : (
            displayed.map((r, idx) => {
              const q = r.quotation;
              const isLowest = r.unitPrice === lowestUnit;
              const isFastest = q.leadTimeDays === fastestLead && fastestLead != null;
              return (
                <QuotationCard
                  key={r.key}
                  row={r}
                  rank={idx}
                  currency={currency}
                  isLowest={isLowest}
                  isFastest={isFastest}
                  canSelect={canSelect}
                  canAwardFromCheckbox={canAwardFromCheckbox}
                  awardChecked={awardRow?.key === r.key}
                  selectPending={select.isPending && select.variables?.quotationId === q.id}
                  shortlisted={shortlisted.has(r.key)}
                  comparing={compareSel.has(r.key)}
                  onSelect={() => handleSelect(q)}
                  onAwardCheckbox={() => toggleAwardRow(r)}
                  onToggleShortlist={() => toggleShortlist(r.key)}
                  onToggleCompare={() => toggleCompare(r.key)}
                />
              );
            })
          )}
        </div>

        {/* Show more */}
        {tab === "all" && hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-accent-900 hover:underline"
          >
            Show {hiddenCount} more quotation{hiddenCount > 1 ? "s" : ""}
            <ChevronDown className="h-4 w-4" />
          </button>
        )}
        {tab === "all" && showAll && rows.length > VISIBLE_DEFAULT && (
          <button
            type="button"
            onClick={() => setShowAll(false)}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-zinc-500 hover:underline"
          >
            Show fewer
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        )}

        {/* Compare banner */}
        {rows.length >= 2 && (
          <div className="rounded-xl border border-paper-200 bg-paper-50 px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-accent-900/10 flex items-center justify-center text-accent-900 shrink-0">
                <Scale className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink-900">Compare up to 3 suppliers side by side</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Select suppliers and compare their prices, lead times, payment terms, and other conditions.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0 w-full sm:w-auto gap-1.5"
              disabled={compareSel.size < 2}
              onClick={() => setTab("compared")}
            >
              <Scale className="h-3.5 w-3.5" />
              Compare Suppliers
            </Button>
          </div>
        )}
      </div>

      <QuotationAwardFlowModal
        open={!!awardRow}
        onClose={closeAwardFlow}
        workspaceId={workspaceId}
        rfqLineItemId={awardRow?.rfqLineItemId ?? ""}
        productTitle={awardRow?.productTitle}
        quotation={awardRow?.quotation ?? null}
        unitPrice={awardRow?.unitPrice}
        currency={currency}
        onSuccess={() => {
          void qc.invalidateQueries({ queryKey: ["rfq", workspaceId] });
          void qc.invalidateQueries({ queryKey: ["rfq", workspaceId, "quotations"] });
          setAwardRow(null);
        }}
      />

      {/* ── Right sidebar ── */}
      {rows.length > 0 && (
        <aside className="space-y-4">
          {/* Quotation Summary */}
          <div className="rounded-xl border border-paper-200 bg-white p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink-900">Quotation Summary</h3>
              <p className="text-xs text-zinc-400 mt-0.5">All amounts in {currency}</p>
            </div>
            <SummaryRow label="Quotes Received" value={String(rows.length)} valueClass="text-ink-900 font-bold text-base" />
            <SummaryRow
              label="Lowest Quote"
              value={fmt(currency, lowestUnit)}
              sub={bestRow?.quotation.supplierName}
              valueClass="text-emerald-600 font-bold"
            />
            <SummaryRow
              label="Highest Quote"
              value={fmt(currency, highestUnit)}
              sub={rows[rows.length - 1]?.quotation.supplierName}
              valueClass="text-red-500 font-bold"
            />
            <SummaryRow label="Average Quote" value={fmt(currency, avgUnit)} valueClass="text-ink-700 font-semibold" />
            <div className="flex items-center justify-between border-t border-paper-100 pt-3">
              <span className="text-sm text-zinc-500">Price Difference</span>
              <span className={cn("text-sm font-bold", priceDiff > 20 ? "text-red-500" : "text-orange-500")}>
                {priceDiff.toFixed(1)}%
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 pt-1">
              <Lock className="h-3 w-3 shrink-0" />
              Currency is locked after submission.
            </p>
          </div>

          {/* Price Distribution */}
          {unitPrices.length >= 2 && (
            <PriceDistribution prices={unitPrices} currency={currency} uom={rows[0]?.lineUom ?? "container"} />
          )}

          {/* Best Overall Choice */}
          {bestRow && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-full bg-white flex items-center justify-center shrink-0">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Best Overall Choice</p>
                  <p className="text-sm font-semibold text-ink-900 leading-snug">{bestRow.quotation.supplierName}</p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {[
                  "Lowest Price",
                  fastestLead != null && bestRow.quotation.leadTimeDays === fastestLead ? "Fastest Lead Time" : "Good Lead Time",
                  "Verified Supplier",
                  "High Export Experience",
                ].map((tag) => (
                  <li key={tag} className="flex items-center gap-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    {tag}
                  </li>
                ))}
              </ul>
              {canSelect && (
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 border-emerald-700"
                  onClick={() => handleSelect(bestRow.quotation)}
                  loading={select.isPending && select.variables?.quotationId === bestRow.quotation.id}
                >
                  Select as Preferred Supplier
                </Button>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sipariş ürününe göre otomatik seçilen görsel teması (anahtar kelime eşleşmesi)
const PRODUCT_VISUALS: Array<{ icon: LucideIcon; tint: string; keywords: string[] }> = [
  { icon: Wheat,          tint: "bg-amber-50 text-amber-600 border-amber-200",     keywords: ["spaghetti", "pasta", "macaroni", "noodle", "makarna", "flour", "un", "wheat", "grain", "rice", "pirinc", "bulgur", "cereal", "tahil"] },
  { icon: Coffee,         tint: "bg-orange-50 text-orange-700 border-orange-200",   keywords: ["coffee", "kahve", "tea", "cay", "cocoa", "kakao"] },
  { icon: Milk,           tint: "bg-sky-50 text-sky-600 border-sky-200",           keywords: ["milk", "sut", "dairy", "cheese", "peynir", "yogurt", "yoghurt"] },
  { icon: Beef,           tint: "bg-red-50 text-red-600 border-red-200",           keywords: ["meat", "beef", "et", "chicken", "tavuk", "lamb", "kuzu", "poultry"] },
  { icon: Fish,           tint: "bg-cyan-50 text-cyan-600 border-cyan-200",         keywords: ["fish", "balik", "seafood", "tuna", "shrimp", "karides"] },
  { icon: Apple,          tint: "bg-green-50 text-green-600 border-green-200",       keywords: ["fruit", "meyve", "vegetable", "sebze", "apple", "elma", "tomato", "domates", "fresh"] },
  { icon: Cookie,         tint: "bg-yellow-50 text-yellow-700 border-yellow-200",   keywords: ["popcorn", "mikrodalga", "microwave", "biscuit", "cookie", "biskuvi", "snack", "chocolate", "cikolata", "candy", "seker", "sugar", "confection", "chips", "cips"] },
  { icon: Droplet,        tint: "bg-lime-50 text-lime-700 border-lime-200",         keywords: ["oil", "yag", "olive", "zeytin", "liquid", "juice", "meyve suyu", "beverage", "icecek", "water", "su"] },
  { icon: Shirt,          tint: "bg-violet-50 text-violet-600 border-violet-200",   keywords: ["textile", "tekstil", "fabric", "kumas", "cotton", "pamuk", "garment", "giyim", "apparel", "clothing", "shirt", "tshirt"] },
  { icon: FlaskConical,   tint: "bg-teal-50 text-teal-600 border-teal-200",         keywords: ["chemical", "kimyasal", "detergent", "deterjan", "cleaning", "temizlik", "cosmetic", "kozmetik"] },
  { icon: Pill,           tint: "bg-emerald-50 text-emerald-600 border-emerald-200", keywords: ["pharma", "ilac", "medicine", "medical", "medikal", "supplement", "vitamin", "health", "saglik"] },
  { icon: Cpu,            tint: "bg-indigo-50 text-indigo-600 border-indigo-200",   keywords: ["electronic", "elektronik", "device", "cihaz", "phone", "telefon", "computer", "bilgisayar", "gadget", "chip"] },
  { icon: Sofa,           tint: "bg-rose-50 text-rose-600 border-rose-200",         keywords: ["furniture", "mobilya", "chair", "sandalye", "table", "masa", "sofa", "koltuk", "home", "ev"] },
  { icon: Car,            tint: "bg-slate-50 text-slate-600 border-slate-200",       keywords: ["auto", "otomotiv", "car", "araba", "vehicle", "arac", "spare", "yedek parca", "tire", "lastik"] },
  { icon: Wrench,         tint: "bg-zinc-100 text-zinc-600 border-zinc-300",         keywords: ["tool", "alet", "hardware", "hirdavat", "machine", "makine", "industrial", "endustriyel", "equipment", "ekipman"] },
  { icon: FileText,       tint: "bg-blue-50 text-blue-600 border-blue-200",         keywords: ["paper", "kagit", "a4", "stationery", "kirtasiye", "book", "kitap", "notebook", "defter"] },
];

function resolveProductVisual(summary: QuotationProductSummary): { icon: LucideIcon; tint: string } {
  const haystack = `${summary.category ?? ""} ${summary.name ?? ""}`.toLowerCase();
  for (const v of PRODUCT_VISUALS) {
    if (v.keywords.some((k) => haystack.includes(k))) return { icon: v.icon, tint: v.tint };
  }
  return { icon: Package, tint: "bg-paper-50 text-zinc-400 border-paper-200" };
}

// ---------------------------------------------------------------------------
function ProductThumb(props: {
  name: string;
  category?: string;
  imageUrl?: string | null;
  size?: "sm" | "md";
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const visual = resolveProductVisual({ name: props.name, category: props.category });
  const VisualIcon = visual.icon;
  const showImage = Boolean(props.imageUrl) && !imgFailed;
  const sizeCls = props.size === "sm" ? "h-12 w-12" : "h-16 w-16";
  const iconCls = props.size === "sm" ? "h-5 w-5" : "h-7 w-7";

  if (showImage) {
    return (
      <img
        src={props.imageUrl!}
        alt={props.name}
        className={cn("shrink-0 rounded-lg border border-paper-200 object-cover bg-paper-50", sizeCls)}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={cn("shrink-0 rounded-lg border flex items-center justify-center", sizeCls, visual.tint)}>
      <VisualIcon className={iconCls} />
    </div>
  );
}

function ProductSummaryCard(props: { summary: QuotationProductSummary }) {
  const { summary } = props;
  const multi = (summary.products?.length ?? 0) > 1;
  const fields = [
    { icon: Package,       label: "Quantity",     value: summary.quantity },
    { icon: MapPin,        label: "Destination",  value: summary.destination },
    { icon: FileText,      label: "Incoterm",     value: summary.incoterm },
    {
      icon: CalendarClock,
      label: "RFQ Deadline",
      value: summary.deadline ? new Date(summary.deadline).toLocaleDateString("tr-TR") : undefined,
    },
  ].filter((f) => f.value);

  return (
    <div className="rounded-xl border border-paper-200 bg-white p-4 sm:p-5">
      <div className="flex items-start gap-4">
        {multi ? (
          <div className="flex flex-wrap gap-2 shrink-0 max-w-[220px]">
            {summary.products!.map((p) => (
              <div key={p.name} className="flex flex-col items-center gap-1 w-14">
                <ProductThumb name={p.name} category={p.category} imageUrl={p.imageUrl} size="sm" />
                <span className="text-[10px] text-zinc-600 text-center leading-tight line-clamp-2">{p.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <ProductThumb
            name={summary.name}
            category={summary.category}
            imageUrl={summary.imageUrl}
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-ink-900 leading-snug">{summary.name}</h3>
          {multi && (
            <p className="text-xs text-zinc-500 mt-1">
              {summary.products!.map((p) => p.quantity ? `${p.name} (${p.quantity})` : p.name).join(" · ")}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 mt-3">
            {fields.map((f) => (
              <div key={f.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1" lang="en">
                  <f.icon className="h-3 w-3" />
                  {f.label}
                </p>
                <p className="text-sm font-medium text-ink-900 mt-0.5">{f.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function SummaryRow(props: { label: string; value: string; sub?: string; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-sm text-zinc-500 shrink-0">{props.label}</span>
      <div className="text-right min-w-0">
        <span className={cn("text-sm tabular-nums block", props.valueClass)}>{props.value}</span>
        {props.sub && <p className="text-[11px] text-zinc-400 leading-tight truncate" title={props.sub}>{props.sub}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function PriceDistribution(props: { prices: number[]; currency: string; uom: string }) {
  const { prices } = props;
  const BUCKETS = 7;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const step = span / BUCKETS;

  const buckets = Array.from({ length: BUCKETS }, () => 0);
  for (const p of prices) {
    let idx = Math.floor((p - min) / step);
    if (idx >= BUCKETS) idx = BUCKETS - 1;
    if (idx < 0) idx = 0;
    buckets[idx] += 1;
  }
  const peak = Math.max(...buckets, 1);

  return (
    <div className="rounded-xl border border-paper-200 bg-white p-5 space-y-3">
      <h3 className="text-base font-semibold text-ink-900">Price Distribution</h3>
      <div className="flex items-end gap-1.5 h-24">
        {buckets.map((count, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t bg-accent-900/70"
              style={{ height: `${Math.max((count / peak) * 100, count > 0 ? 8 : 2)}%` }}
              title={`${count} quote${count === 1 ? "" : "s"}`}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-zinc-400 tabular-nums">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
      <p className="text-[10px] text-zinc-400 text-center">Price ({props.currency}) per {props.uom}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
function QuotationCard(props: {
  row: Row;
  rank: number;
  currency: string;
  isLowest: boolean;
  isFastest: boolean;
  canSelect: boolean;
  canAwardFromCheckbox: boolean;
  awardChecked: boolean;
  selectPending: boolean;
  shortlisted: boolean;
  comparing: boolean;
  onSelect: () => void;
  onAwardCheckbox: () => void;
  onToggleShortlist: () => void;
  onToggleCompare: () => void;
}) {
  const { t } = useT();
  const {
    row, rank, currency, isLowest, isFastest, canSelect, canAwardFromCheckbox, awardChecked, selectPending,
    shortlisted, comparing, onSelect, onAwardCheckbox, onToggleShortlist, onToggleCompare,
  } = props;
  const q = row.quotation;
  const rankCfg = RANK_CONFIG[rank] ?? null;
  const RankIcon = rankCfg?.icon;
  const uomLabel = row.lineUom ?? "container";
  // A supplier quoting several pack sizes was collapsed into one blended unit price, so
  // the buyer could only see the individual prices after opening the award modal.
  const variations = buildVariationsFromQuotation(q, row.lineUom);
  const hasVariations = variations.length > 1;

  return (
    <article
      data-testid={`quotation-row-${q.id}`}
      className={cn(
        "rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm",
        isLowest ? "border-accent-900/25 ring-1 ring-accent-900/10" : "border-paper-200",
      )}
    >
      {/* Top: supplier identity */}
      <div className="flex items-start gap-3">
        <label className="shrink-0 pt-0.5 cursor-pointer">
          <input
            type="checkbox"
            checked={canAwardFromCheckbox ? awardChecked : comparing}
            onChange={() => {
              if (canAwardFromCheckbox) onAwardCheckbox();
              else onToggleCompare();
            }}
            className="h-4 w-4 rounded border-paper-300 text-accent-900 focus:ring-accent-900/40"
            aria-label={
              canAwardFromCheckbox
                ? t("rfq.quotation.award.checkboxSelect", undefined, { supplier: q.supplierName })
                : t("rfq.quotation.compare.checkbox", undefined, { supplier: q.supplierName })
            }
            data-testid={canAwardFromCheckbox ? `quote-award-checkbox-${q.id}` : `quote-compare-checkbox-${q.id}`}
          />
        </label>

        {rankCfg && RankIcon && (
          <div className={cn("shrink-0 h-8 w-8 rounded-full border flex items-center justify-center", rankCfg.bg)}>
            <RankIcon className={cn("h-4 w-4", rankCfg.color)} />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-ink-900 leading-snug">{q.supplierName}</h4>
          <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 shrink-0" />
            Verified Manufacturer
          </p>
          {row.productTitle && (
            <p className="text-[11px] text-zinc-400 mt-0.5 truncate" title={row.productTitle}>{row.productTitle}</p>
          )}
        </div>

        {/* Unit price — compact. Replaced by the variation grid below for multi-pack offers. */}
        {!hasVariations && (
          <div
            data-testid={`quote-total-${q.id}`}
            className={cn(
              "shrink-0 rounded-lg border px-3 py-2 text-right min-w-[128px]",
              isLowest ? "border-accent-900/20 bg-accent-50/60" : "border-paper-200 bg-paper-50",
            )}
          >
            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500" lang="en">Unit Price</p>
            <p className={cn(
              "text-base font-bold tabular-nums leading-tight mt-0.5",
              isLowest ? "text-accent-900" : "text-ink-900",
            )}>
              {fmt(currency, row.unitPrice)}
              {isLowest && <span className="sr-only"> lowest</span>}
            </p>
            <p className="text-[10px] text-zinc-500">/ {uomLabel}</p>
          </div>
        )}
      </div>

      {hasVariations && (
        <div
          data-testid={`quote-variations-${q.id}`}
          className={cn(variationGridClass(variations.length), "mt-3 pt-3 border-t border-paper-100")}
        >
          {variations.map((v) => (
            <div
              key={v.id}
              data-testid={`quote-variation-${v.id}`}
              className="rounded-lg border border-paper-200 bg-paper-50 px-3 py-2"
            >
              <p className="text-xs font-medium text-ink-900 leading-snug">{v.name}</p>
              <p className="text-sm font-bold tabular-nums text-ink-900 mt-1">
                {fmt(currency, v.unitPrice)}
              </p>
              <p className="text-[10px] text-zinc-500">/ {variationPriceUnitLabel(v)}</p>
              {v.packing && <p className="text-[10px] text-zinc-500 mt-0.5">{v.packing}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Middle: terms grid — shared across variations, shown once */}
      <div
        data-testid={`quote-terms-${q.id}`}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-2 mt-3 pt-3 border-t border-paper-100 text-xs"
      >
        <TermRow label="Lead Time" value={q.leadTimeDays != null ? `${q.leadTimeDays} Days` : "—"} dot={isFastest ? "green" : q.leadTimeDays != null && q.leadTimeDays <= 20 ? "green" : q.leadTimeDays != null ? "yellow" : undefined} />
        <TermRow label="MOQ" value={q.moq != null ? `${q.moq} Container${q.moq > 1 ? "s" : ""}` : "1 Container"} />
        <TermRow label="Incoterm" value={q.incoterm ?? "—"} />
        <TermRow label="Sample" value={q.sampleAvail == null ? "—" : q.sampleAvail ? "Available" : "Not offered"} valueClass={q.sampleAvail ? "text-emerald-600" : undefined} />
        <TermRow label="Valid Until" value={q.validUntil ? new Date(q.validUntil).toLocaleDateString("tr-TR") : "—"} />
      </div>

      {/* Bottom: attributes + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-3 pt-3 border-t border-paper-100">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {ATTRIBUTES.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
              <Icon className="h-3.5 w-3.5 text-zinc-400" />
              {label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isLowest && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              Lowest Price
            </span>
          )}
          <button
            type="button"
            onClick={onToggleShortlist}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              shortlisted
                ? "border-amber-300 bg-amber-50 text-amber-700"
                : "border-paper-200 bg-white text-zinc-600 hover:bg-paper-50",
            )}
          >
            <Star className={cn("h-3.5 w-3.5", shortlisted && "fill-amber-500 text-amber-500")} />
            {shortlisted ? "Shortlisted" : "Shortlist"}
          </button>
          {canAwardFromCheckbox && (
            <button
              type="button"
              onClick={onToggleCompare}
              className={cn(
                "inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                comparing
                  ? "border-accent-900/30 bg-accent-50 text-accent-900"
                  : "border-paper-200 bg-white text-zinc-600 hover:bg-paper-50",
              )}
              data-testid={`quote-compare-toggle-${q.id}`}
            >
              <Scale className="h-3.5 w-3.5" />
              {comparing ? "Comparing" : "Compare"}
            </button>
          )}
          {canSelect ? (
            <Button
              data-testid={`quote-select-${q.id}`}
              variant={isLowest ? "primary" : "secondary"}
              size="sm"
              onClick={onSelect}
              loading={selectPending}
            >
              Select Supplier
            </Button>
          ) : (
            <Button variant="secondary" size="sm">
              View Details
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function TermRow(props: { label: string; value: string; valueClass?: string; dot?: "green" | "yellow" }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-zinc-400" lang="en">{props.label}</span>
      <span className={cn("font-medium text-ink-900 flex items-center gap-1", props.valueClass)}>
        {props.dot && (
          <span className={cn("inline-block h-2 w-2 rounded-full shrink-0", props.dot === "green" ? "bg-emerald-500" : "bg-yellow-400")} />
        )}
        {props.value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
function CollapsedPanel(props: { quotations: QuotationRowDTO[]; selectedId: string }) {
  const { quotations, selectedId } = props;
  const winner = quotations.find((q) => q.id === selectedId);
  if (!winner) return null;

  return (
    <Card data-testid="quotations-panel-collapsed">
      <CardHeader>
        <div>
          <CardEyebrow>Selected quotation</CardEyebrow>
          <CardTitle className="mt-1 inline-flex items-center gap-2">
            <Star className="h-4 w-4 text-accent-900 fill-accent-900" />
            {winner.supplierName}
          </CardTitle>
        </div>
        <Badge tone="accent" dot>Winner</Badge>
      </CardHeader>
      <CardBody>
        <span data-testid="winner-total" className="font-display text-2xl font-semibold tabular-nums">
          {fmt(winner.currency, winner.total)}
        </span>
      </CardBody>
    </Card>
  );
}
