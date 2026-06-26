import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

export interface ComparisonColumn {
  key: string;
  label: string;
  align?: "left" | "right";
}

export interface ComparisonRow {
  id: string;
  cells: Record<string, ReactNode>;
  badges?: string[];
  selected?: boolean;
  highlight?: boolean;
}

interface Props {
  title: string;
  eyebrow?: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  emptyMessage?: string;
  onSelectRow?: (id: string) => void;
  selectLabel?: string;
  testId?: string;
}

export function ComparisonMatrix({
  title,
  eyebrow,
  columns,
  rows,
  emptyMessage = "No items to compare yet.",
  onSelectRow,
  selectLabel = "Select",
  testId = "comparison-matrix",
}: Props) {
  if (!rows.length) {
    return (
      <div data-testid={`${testId}-empty`} className="dmx-card p-6 text-center">
        {eyebrow && <span className="dmx-eyebrow text-zinc-500">{eyebrow}</span>}
        <p className="text-sm text-zinc-500 mt-2">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <section data-testid={testId} className="dmx-card overflow-hidden">
      <div className="px-5 py-4 border-b border-paper-200">
        {eyebrow && <span className="dmx-eyebrow text-zinc-500">{eyebrow}</span>}
        <h3 className="font-display text-lg font-semibold mt-0.5">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[560px]">
          <thead className="bg-zinc-50 text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={cn("px-4 py-3", c.align === "right" ? "text-right" : "text-left")}>
                  {c.label}
                </th>
              ))}
              {onSelectRow && <th className="px-4 py-3 text-right">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                data-testid={`${testId}-row-${row.id}`}
                className={cn(
                  "border-t border-paper-100",
                  row.selected && "bg-emerald-50/60",
                  row.highlight && !row.selected && "bg-accent-50/30",
                  "hover:bg-paper-50/80",
                )}
              >
                {columns.map((c, ci) => (
                  <td key={c.key} className={cn("px-4 py-3", c.align === "right" ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {ci === 0 && row.badges?.map((b) => (
                        <span key={b} className="inline-flex items-center gap-0.5 text-[10px] uppercase font-medium px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                          <Star className="h-2.5 w-2.5" />{b}
                        </span>
                      ))}
                      {row.cells[c.key]}
                    </div>
                  </td>
                ))}
                {onSelectRow && (
                  <td className="px-4 py-3 text-right">
                    {row.selected ? (
                      <span className="text-xs font-medium text-emerald-800">Selected</span>
                    ) : (
                      <button type="button" className="dmx-btn-primary text-xs" onClick={() => onSelectRow(row.id)}>
                        {selectLabel}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
