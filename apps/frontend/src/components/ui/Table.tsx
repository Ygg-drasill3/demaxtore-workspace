// apps/frontend/src/components/ui/Table.tsx
import { type HTMLAttributes, type ReactNode, type ThHTMLAttributes, type TdHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...rest }: HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="dmx-card overflow-hidden">
      <table className={cn("w-full text-sm", className)} {...rest} />
    </div>
  );
}

export function THead({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("bg-paper-50 text-xs uppercase tracking-wider text-zinc-500", className)} {...rest} />;
}

export function TBody({ className, ...rest }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={className} {...rest} />;
}

export function TR({ className, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-t border-paper-200 hover:bg-paper-50/40 transition-colors", className)} {...rest} />;
}

export function TH({ className, ...rest }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("text-left px-4 py-3 font-medium", className)} {...rest} />;
}

export function TD({ className, ...rest }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3", className)} {...rest} />;
}

interface DataTableColumn<T> {
  key:    string;
  header: ReactNode;
  cell:   (row: T) => ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  data:    T[];
  columns: DataTableColumn<T>[];
  rowKey:  (row: T) => string;
  empty?:  ReactNode;
  testId?: string;
}

/** Opinionated wrapper for list pages (RFQ list, supplier list, etc.) */
export function DataTable<T>({ data, columns, rowKey, empty, testId }: DataTableProps<T>) {
  return (
    <Table data-testid={testId}>
      <THead>
        <TR>
          {columns.map((c) => <TH key={c.key} style={c.width ? { width: c.width } : undefined}>{c.header}</TH>)}
        </TR>
      </THead>
      <TBody>
        {data.length === 0 ? (
          <TR>
            <TD colSpan={columns.length} className="px-4 py-12 text-center text-zinc-500">
              {empty ?? "No records found."}
            </TD>
          </TR>
        ) : data.map((row) => (
          <TR key={rowKey(row)} data-testid={`${testId}-row-${rowKey(row)}`}>
            {columns.map((c) => <TD key={c.key}>{c.cell(row)}</TD>)}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
