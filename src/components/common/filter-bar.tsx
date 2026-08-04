import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterOption = { value: string; label: string };

export type FilterConfig = {
  key: string;
  label: string;
  value: string;
  allLabel: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

export function FilterBar({
  search,
  onSearchChange,
  placeholder,
  searchLabel,
  filters = [],
  resultLabel,
  onReset,
  trailing,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  searchLabel: string;
  filters?: FilterConfig[];
  resultLabel?: ReactNode;
  onReset?: () => void;
  trailing?: ReactNode;
}) {
  const aktif = search.trim() !== "" || filters.some((f) => f.value !== "semua" && f.value !== "");

  return (
    <section
      className="mb-4 rounded-2xl border border-border/70 bg-card/60 p-3"
      aria-label="Pencarian dan filter"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={searchLabel}
            className="rounded-xl pl-9 pr-9"
          />
          {search !== "" ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Bersihkan pencarian"
              className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:flex lg:items-center">
          {filters.map((f) => (
            <Select key={f.key} value={f.value || "semua"} onValueChange={f.onChange}>
              <SelectTrigger
                aria-label={f.label}
                className={cn(
                  "rounded-xl lg:w-[190px]",
                  f.value !== "semua" && "border-primary/60 text-foreground",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">{f.allLabel}</SelectItem>
                {f.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {trailing}
        </div>
      </div>

      {(resultLabel || aktif) && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{resultLabel}</span>
          {aktif && onReset ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onReset}>
              <X className="size-3.5" aria-hidden /> Reset filter
            </Button>
          ) : null}
        </div>
      )}
    </section>
  );
}
