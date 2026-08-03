import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MoreHorizontal, Package, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, PriorityBadge, StatusBadge } from "@/components/common/status-badge";
import { SalesDocDialog } from "@/features/sales/sales-doc-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/lib/company-context";
import { db, useAction, useRows, type DbRow } from "@/lib/db";
import { ORDER_STATUSES } from "@/lib/constants";
import { labelStatus, rupiah, tanggal, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
  bayar: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/orders")({
  component: OrdersPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Pesanan — Maklon Control Center" },
      {
        name: "description",
        content: "Pantau pesanan maklon dari persetujuan penawaran sampai pengiriman dan pelunasan.",
      },
      { property: "og:title", content: "Pesanan — Maklon Control Center" },
      { property: "og:description", content: "Pantau pesanan maklon end-to-end." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function OrdersPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { q, status, bayar } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<DbRow | null>(null);

  const orders = useRows<DbRow>("orders", { scopeId });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });
  const products = useRows<DbRow>("products", { scopeId, orderBy: "name", asc: true });
  const items = useRows<DbRow>("order_items", {
    scopeId,
    eq: detail ? { order_id: String(detail["id"]) } : {},
    enabled: detail !== null,
  });
  const history = useRows<DbRow>("order_status_history", {
    scopeId,
    eq: detail ? { order_id: String(detail["id"]) } : {},
    enabled: detail !== null,
  });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };
  const namaProduk = (id: unknown) => {
    const p = (products.data ?? []).find((x) => String(x["id"]) === String(id));
    return p ? String(p["name"]) : "-";
  };

  const ubahStatus = useAction(
    async ({ id, next }: { id: string; next: string }) => {
      const { error } = await db("orders").update({ status: next }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    { invalidate: ["orders", "order_status_history"], success: "Status pesanan diperbarui" },
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (orders.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (bayar !== "semua" && String(r["payment_status"]) !== bayar) return false;
      if (!term) return true;
      return [r["order_number"], namaKlien(r["client_id"]), r["pic"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.data, clients.data, q, status, bayar]);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "nomor",
      header: "Nomor",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["order_number"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {namaKlien(r["client_id"])}
          </span>
        </div>
      ),
    },
    {
      key: "perusahaan",
      header: "Perusahaan",
      desktopOnly: true,
      render: (r) => {
        const c = companyById(String(r["company_id"]));
        return <CompanyBadge code={c?.code ?? null} name={c?.name ?? null} />;
      },
    },
    { key: "tanggal", header: "Tanggal", render: (r) => tanggalPendek(String(r["order_date"])) },
    {
      key: "target",
      header: "Target selesai",
      desktopOnly: true,
      render: (r) =>
        tanggalPendek(r["target_completion_date"] ? String(r["target_completion_date"]) : null),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => (
        <div className="min-w-0">
          <span className="block font-semibold">{rupiah(Number(r["grand_total"]))}</span>
          <span className="block text-xs text-muted-foreground">
            Sisa {rupiah(Number(r["remaining_amount"]))}
          </span>
        </div>
      ),
    },
    { key: "prioritas", header: "Prioritas", render: (r) => <PriorityBadge priority={String(r["priority"])} /> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r["status"])} /> },
    {
      key: "bayar",
      header: "Pembayaran",
      render: (r) => <StatusBadge status={String(r["payment_status"])} />,
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader
        title="Pesanan"
        description={`Pesanan produksi maklon — ${scope}`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden /> Buat Pesanan
          </Button>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari nomor pesanan, klien, atau PIC"
        searchLabel="Cari pesanan"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: ORDER_STATUSES.map((s) => ({ value: s, label: labelStatus(s) })),
            onChange: (v) => setSearch({ status: v }),
          },
          {
            key: "bayar",
            label: "Filter pembayaran",
            value: bayar,
            allLabel: "Semua pembayaran",
            options: ["belum_dibayar", "dibayar_sebagian", "lunas"].map((s) => ({
              value: s,
              label: labelStatus(s),
            })),
            onChange: (v) => setSearch({ bayar: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(orders.data ?? []).length} pesanan`}
        onReset={() => setSearch({ q: "", status: "semua", bayar: "semua" })}
      />

      {orders.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : orders.isError ? (
        <ErrorState onRetry={() => void orders.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum ada pesanan"
          description="Konversi penawaran yang disetujui atau buat pesanan baru."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden /> Buat Pesanan
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows as (DbRow & { id: string })[]}
          columns={columns}
          onRowClick={(r) => setDetail(r)}
          actions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi pesanan">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-80 w-60 overflow-y-auto rounded-2xl">
                <DropdownMenuLabel>Ubah status</DropdownMenuLabel>
                {ORDER_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="rounded-xl"
                    onClick={() => ubahStatus.mutate({ id: String(r["id"]), next: s })}
                  >
                    {labelStatus(s)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <SalesDocDialog
        mode="order"
        open={open}
        onOpenChange={setOpen}
        scopeId={scopeId}
        defaultCompanyId={companies[0]?.id ?? null}
      />

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border/70 p-5">
            <DialogTitle>{detail ? String(detail["order_number"]) : "Detail pesanan"}</DialogTitle>
            <DialogDescription>
              {detail ? `${namaKlien(detail["client_id"])} — ${rupiah(Number(detail["grand_total"]))}` : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-5">
            <h3 className="text-sm font-semibold">Item pesanan</h3>
            <div className="mt-2 space-y-2">
              {(items.data ?? []).map((i) => (
                <div
                  key={String(i["id"])}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{namaProduk(i["product_id"])}</p>
                    <p className="text-xs text-muted-foreground">
                      {Number(i["quantity"])} {String(i["unit"] ?? "")} ×{" "}
                      {rupiah(Number(i["unit_price_snapshot"]))}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{rupiah(Number(i["subtotal"]))}</span>
                </div>
              ))}
              {(items.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada item.</p>
              ) : null}
            </div>

            <h3 className="mt-6 text-sm font-semibold">Riwayat status</h3>
            <ol className="mt-2 space-y-2 border-l border-border/70 pl-4">
              {(history.data ?? []).map((h) => (
                <li key={String(h["id"])} className="relative text-sm">
                  <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                  <p className="font-medium">{labelStatus(String(h["new_status"]))}</p>
                  <p className="text-xs text-muted-foreground">{tanggal(String(h["created_at"]), true)}</p>
                </li>
              ))}
              {(history.data ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">Belum ada riwayat.</li>
              ) : null}
            </ol>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
