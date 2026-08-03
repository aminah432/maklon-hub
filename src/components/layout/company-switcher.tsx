import { Check, ChevronsUpDown, Building2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCompany } from "@/lib/company-context";
import { logoPerusahaan, skalaLogo } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

function LogoPerusahaan({
  code,
  nama,
  size = "md",
}: {
  code: string;
  nama: string;
  size?: "sm" | "md";
}) {
  const src = logoPerusahaan(code);
  const box = size === "sm" ? "size-7" : "size-9";
  if (!src) {
    return (
      <span
        className={cn(
          box,
          "grid shrink-0 place-items-center rounded-xl bg-primary text-[10px] font-bold text-primary-foreground",
        )}
      >
        {code === "ALL" ? <Layers className="size-4" aria-hidden /> : code}
      </span>
    );
  }
  return (
    <span
      className={cn(box, "grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-0.5")}
    >
      <img
        src={src}
        alt={`Logo ${nama}`}
        loading="lazy"
        className={cn("size-full object-contain transition-transform duration-300", skalaLogo(code))}
      />
    </span>
  );
}

export function CompanySwitcher({ collapsed = false }: { collapsed?: boolean }) {
  const { companies, active, activeId, setActive } = useCompany();

  const label = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "Pilih perusahaan");
  const code = activeId === "all" ? "ALL" : (active?.code ?? "—");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-auto w-full justify-between gap-2 rounded-2xl border-border/70 bg-card/70 px-3 py-2.5 text-left",
            collapsed && "px-2",
          )}
          aria-label="Ganti perusahaan aktif"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <LogoPerusahaan code={code} nama={label} />
            {!collapsed && (
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {activeId === "all" ? "Tampilan gabungan" : (active?.business_type ?? "Maklon")}
                </span>
              </span>
            )}
          </span>
          {!collapsed && <ChevronsUpDown className="size-4 shrink-0 opacity-60" aria-hidden />}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64 rounded-2xl">
        <DropdownMenuLabel>Perusahaan</DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 rounded-xl" onClick={() => setActive("all")}>
          <Layers className="size-4" aria-hidden />
          <span className="flex-1">Semua Perusahaan</span>
          {activeId === "all" && <Check className="size-4" aria-hidden />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {companies.map((c) => (
          <DropdownMenuItem key={c.id} className="gap-2 rounded-xl py-2" onClick={() => setActive(c.id)}>
            <LogoPerusahaan code={String(c.code ?? "")} nama={String(c.name ?? "")} size="sm" />

            <span className="flex-1 truncate">
              {c.code} — {c.name}
            </span>
            {activeId === c.id && <Check className="size-4" aria-hidden />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
