import type { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
  /** kolom yang ditampilkan sebagai judul kartu di mobile */
  primary?: boolean;
  /** sembunyikan di kartu mobile */
  desktopOnly?: boolean;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  actions,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  actions?: (row: T) => ReactNode;
  onRowClick?: (row: T) => void;
}) {
  const primary = columns.find((c) => c.primary) ?? columns[0];
  const rest = columns.filter((c) => c !== primary && !c.desktopOnly);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-border/70 bg-card lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.key} className={c.className}>
                  {c.header}
                </TableHead>
              ))}
              {actions ? <TableHead className="text-right">Aksi</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(onRowClick && "cursor-pointer")}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((c) => (
                  <TableCell key={c.key} className={c.className}>
                    {c.render(row)}
                  </TableCell>
                ))}
                {actions ? (
                  <TableCell
                    className="text-right"
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    {actions(row)}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <article
            key={row.id}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
            onClick={onRowClick ? () => onRowClick(row) : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-semibold">{primary?.render(row)}</div>
              {actions ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  {actions(row)}
                </div>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              {rest.map((c) => (
                <div key={c.key} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{c.header}</dt>
                  <dd className="truncate">{c.render(row)}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </>
  );
}
