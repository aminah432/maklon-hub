import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { ClipboardList, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { SalesDocDialog } from "@/features/sales/sales-doc-dialog";
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
import { db, nomorDokumen, useAction, useRows, type DbRow } from "@/lib/db";
import { QUOTATION_STATUSES } from "@/lib/constants";
import { labelStatus, rupiah, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/quotations")({
  component: QuotationsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Penawaran — Maklon Control Center" },
      {
        name: "description",
        content: "Buat dan kelola penawaran harga maklon, lalu konversi menjadi pesanan produksi.",
      },
      { property: "og:title", content: "Penawaran — Maklon Control Center" },
      { property: "og:description", content: "Kelola penawaran harga maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function QuotationsPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { q, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [open, setOpen] = useState(false);

  const quotations = useRows<DbRow>("quotations", { scopeId });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };

  const ubahStatus = useAction(
    async ({ id, next }: { id: string; next: string }) => {
      const { error } = await db("quotations").update({ status: next }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    { invalidate: ["quotations"], success: "Status penawaran diperbarui" },
  );

  const konversi = useAction(
    async (row: DbRow) => {
      const companyId = String(row["company_id"]);
      const nomor = await nomorDokumen(companyId, "order");
      const { data, error } = await db("orders")
        .insert({
          company_id: companyId,
          order_number: nomor,
          quotation_id: row["id"],
          client_id: row["client_id"],
          brand_id: row["brand_id"],
          broker_id: row["broker_id"],
          order_date: new Date().toISOString().slice(0, 10),
          priority: "normal",
          status: "penawaran_disetujui",
          production_status: "belum_dijadwalkan",
          payment_status: "belum_dibayar",
          subtotal: row["subtotal"],
          discount: row["discount"],
          tax: row["tax"],
          shipping_cost: row["shipping_cost"],
          broker_fee: row["broker_fee"],
          grand_total: row["grand_total"],
          remaining_amount: row["grand_total"],
          client_notes: row["notes"],
        })
        .select("id");
      if (error) throw new Error(error.message);
      const orderId = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");

      const { data: items, error: itemErr } = await db("quotation_items")
        .select("*")
        .eq("quotation_id", String(row["id"]));
      if (itemErr) throw new Error(itemErr.message);
      const rows = ((items ?? []) as DbRow[]).map((i) => ({
        company_id: companyId,
        order_id: orderId,
        product_id: i["product_id"],
        costing_version_id: i["costing_version_id"],
        quantity: i["quantity"],
        unit: i["unit"],
        unit_hpp_snapshot: i["unit_hpp_snapshot"],
        unit_price_snapshot: i["unit_price"],
        discount: i["discount"],
        broker_fee: i["broker_fee"],
        subtotal: i["subtotal"],
        estimated_profit: i["estimated_profit"],
        actual_margin: i["estimated_margin"],
      }));
      if (rows.length > 0) {
        const ins = await db("order_items").insert(rows);
        if (ins.error) throw new Error(ins.error.message);
      }
      const upd = await db("quotations").update({ status: "dikonversi" }).eq("id", String(row["id"]));
      if (upd.error) throw new Error(upd.error.message);
    },
    { invalidate: ["quotations", "orders", "order_items"], success: "Penawaran dikonversi menjadi pesanan" },
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (quotations.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (!term) return true;
      return [r["quotation_number"], namaKlien(r["client_id"]), r["notes"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotations.data, clients.data, q, status]);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "nomor",
      header: "Nomor",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["quotation_number"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {namaKlien(r["client_id"])}
          </span>
        </div>
      ),
    },
    {
      key: "perusahaan",
      header: "Perusahaan",
      render: (r) => {
        const c = companyById(String(r["company_id"]));
        return <CompanyBadge code={c?.code ?? null} name={c?.name ?? null} />;
      },
    },
    { key: "tanggal", header: "Tanggal", render: (r) => tanggalPendek(String(r["quotation_date"])) },
    {
      key: "berlaku",
      header: "Berlaku sampai",
      desktopOnly: true,
      render: (r) => tanggalPendek(r["valid_until"] ? String(r["valid_until"]) : null),
    },
    {
      key: "total",
      header: "Total",
      render: (r) => <span className="font-semibold">{rupiah(Number(r["grand_total"]))}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r["status"])} /> },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader
        title="Penawaran"
        description={`Penawaran harga ke klien — ${scope}`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden /> Buat Penawaran
          </Button>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari nomor penawaran atau klien"
        searchLabel="Cari penawaran"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: QUOTATION_STATUSES.map((s) => ({ value: s, label: labelStatus(s) })),
            onChange: (v) => setSearch({ status: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(quotations.data ?? []).length} penawaran`}
        onReset={() => setSearch({ q: "", status: "semua" })}
      />

      {quotations.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : quotations.isError ? (
        <ErrorState onRetry={() => void quotations.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada penawaran"
          description="Buat penawaran pertama untuk klien maklon Anda."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden /> Buat Penawaran
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows as (DbRow & { id: string })[]}
          columns={columns}
          actions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi penawaran">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>Ubah status</DropdownMenuLabel>
                {QUOTATION_STATUSES.filter((s) => s !== "dikonversi").map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="rounded-xl"
                    onClick={() => ubahStatus.mutate({ id: String(r["id"]), next: s })}
                  >
                    {labelStatus(s)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-xl"
                  disabled={String(r["status"]) === "dikonversi"}
                  onClick={() => konversi.mutate(r)}
                >
                  Konversi ke pesanan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <SalesDocDialog
        mode="quotation"
        open={open}
        onOpenChange={setOpen}
        scopeId={scopeId}
        defaultCompanyId={companies[0]?.id ?? null}
      />
    </>
  );
}
