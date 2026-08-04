import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Package, Search, ShoppingCart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/lib/company-context";
import { db, useAction, useRows, type DbRow } from "@/lib/db";
import { labelStatus, tanggal } from "@/lib/format";
import { cn } from "@/lib/utils";

type SearchResult = {
  id: string;
  kind: "client" | "product" | "order";
  title: string;
  detail: string;
};

export function GlobalSearch() {
  const { scopeId } = useCompany();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const enabled = query.trim().length >= 2;
  const clients = useRows<DbRow>("clients", {
    scopeId,
    archived: false,
    limit: 150,
    enabled,
  });
  const products = useRows<DbRow>("products", {
    scopeId,
    archived: false,
    limit: 150,
    enabled,
  });
  const orders = useRows<DbRow>("orders", { scopeId, limit: 150, enabled });

  const results = useMemo<SearchResult[]>(() => {
    if (!enabled) return [];
    const term = query.trim().toLowerCase();
    const includes = (...values: unknown[]) =>
      values.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(term),
      );
    const clientResults = (clients.data ?? [])
      .filter((row) =>
        includes(row["business_name"], row["owner_name"], row["email"], row["phone"]),
      )
      .slice(0, 5)
      .map((row) => ({
        id: String(row["id"]),
        kind: "client" as const,
        title: String(row["business_name"] ?? row["owner_name"] ?? "Klien"),
        detail: String(row["owner_name"] ?? row["city"] ?? ""),
      }));
    const productResults = (products.data ?? [])
      .filter((row) => includes(row["name"], row["sku"], row["product_type"]))
      .slice(0, 5)
      .map((row) => ({
        id: String(row["id"]),
        kind: "product" as const,
        title: String(row["name"] ?? "Produk"),
        detail: String(row["sku"] ?? row["product_type"] ?? ""),
      }));
    const orderResults = (orders.data ?? [])
      .filter((row) => includes(row["order_number"], row["status"], row["payment_status"]))
      .slice(0, 5)
      .map((row) => ({
        id: String(row["id"]),
        kind: "order" as const,
        title: String(row["order_number"] ?? "Pesanan"),
        detail: labelStatus(String(row["status"] ?? "")),
      }));
    return [...clientResults, ...productResults, ...orderResults].slice(0, 12);
  }, [clients.data, enabled, orders.data, products.data, query]);

  const openResult = (result: SearchResult) => {
    setFocused(false);
    if (result.kind === "client") {
      void navigate({
        to: "/app/clients",
        search: { q: result.title, status: "semua", kota: "semua", sumber: "semua", arsip: false },
      });
    } else if (result.kind === "product") {
      void navigate({
        to: "/app/products",
        search: {
          q: result.title,
          status: "semua",
          kategori: "semua",
          klien: "semua",
          brand: "semua",
          arsip: false,
        },
      });
    } else {
      void navigate({
        to: "/app/orders",
        search: { q: result.title, status: "semua", bayar: "semua" },
      });
    }
    setQuery("");
  };

  const loading = clients.isLoading || products.isLoading || orders.isLoading;

  return (
    <div className="relative min-w-0">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Cari klien, produk, atau pesanan"
        className="h-10 rounded-xl pl-9"
        aria-label="Pencarian global"
        role="combobox"
        aria-expanded={focused && enabled}
      />
      {focused && enabled ? (
        <div className="absolute inset-x-0 top-12 z-50 overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-xl">
          <div className="border-b border-border/70 px-3 py-2 text-xs text-muted-foreground">
            Hasil lintas modul
          </div>
          {loading ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">Mencari…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-5 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk “{query}”.
            </p>
          ) : (
            <div className="max-h-80 overflow-auto p-1.5">
              {results.map((result) => {
                const Icon =
                  result.kind === "client"
                    ? Users
                    : result.kind === "product"
                      ? Package
                      : ShoppingCart;
                return (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openResult(result)}
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{result.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {labelStatus(result.kind)} · {result.detail}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function NotificationCenter() {
  const { scopeId } = useCompany();
  const notifications = useRows<DbRow>("notifications", {
    scopeId,
    limit: 50,
    refetchInterval: 30_000,
  });
  const rows = notifications.data ?? [];
  const unread = rows.filter((row) => !row["is_read"]);

  const markRead = useAction(
    async (id: string) => {
      const { error } = await db("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    { invalidate: ["notifications"] },
  );
  const markAll = useAction(
    async () => {
      let query = db("notifications").update({ is_read: true }).eq("is_read", false);
      if (scopeId) query = query.eq("company_id", scopeId);
      const { error } = await query;
      if (error) throw new Error(error.message);
    },
    { invalidate: ["notifications"], success: "Semua notifikasi ditandai dibaca" },
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="size-5" aria-hidden />
          {unread.length > 0 ? (
            <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(92vw,380px)] rounded-2xl p-0">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <DropdownMenuLabel className="p-0">Notifikasi</DropdownMenuLabel>
          {unread.length > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={markAll.isPending}
              onClick={(event) => {
                event.preventDefault();
                markAll.mutate(undefined);
              }}
            >
              <CheckCheck className="size-4" aria-hidden /> Tandai semua
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <ScrollArea className="max-h-[420px]">
          {notifications.isLoading ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Memuat notifikasi…</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {rows.map((row) => {
                const isRead = Boolean(row["is_read"]);
                return (
                  <button
                    key={String(row["id"])}
                    type="button"
                    className={cn(
                      "block w-full px-4 py-3 text-left hover:bg-muted/70",
                      !isRead && "bg-primary/5",
                    )}
                    onClick={() => {
                      if (!isRead) markRead.mutate(String(row["id"]));
                    }}
                  >
                    <span className="flex items-start gap-2">
                      <span
                        className={cn(
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          isRead ? "bg-muted" : "bg-primary",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">
                          {String(row["title"] ?? "Notifikasi")}
                        </span>
                        {row["message"] ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {String(row["message"])}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[11px] text-muted-foreground">
                          {tanggal(String(row["created_at"]), true)}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
