import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Calculator, Pencil, Plus, Tag } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { RecordFormDialog, type FormValues } from "@/components/common/record-form";
import { CostingDialog, type ProductOption } from "@/features/costings/costing-dialog";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { db, useAction, useRows, type DbRow } from "@/lib/db";
import { hargaMarkup, hargaTargetMargin } from "@/lib/calc";
import { angka, rupiah, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
  produk: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/costings")({
  component: CostingsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Kalkulasi HPP — Maklon Control Center" },
      {
        name: "description",
        content:
          "Hitung HPP produk maklon per batch: komponen biaya, reject, penyusutan, dan penetapan harga jual.",
      },
      { property: "og:title", content: "Kalkulasi HPP — Maklon Control Center" },
      {
        property: "og:description",
        content: "Versi HPP dan penetapan harga jual produk maklon.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function CostingsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, status, produk } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DbRow | null>(null);
  const [priceFor, setPriceFor] = useState<DbRow | null>(null);

  const versions = useRows<DbRow>("costing_versions", { scopeId });
  const products = useRows<DbRow>("products", {
    scopeId,
    orderBy: "name",
    asc: true,
    archived: false,
  });

  const productOptions: ProductOption[] = (products.data ?? []).map((p) => ({
    id: String(p["id"]),
    name: String(p["name"]),
    sku: String(p["sku"]),
    company_id: String(p["company_id"]),
  }));

  const namaProduk = (id: unknown) =>
    productOptions.find((p) => p.id === String(id))?.name ?? "Produk tidak ditemukan";

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (versions.data ?? []).filter((v) => {
      if (status !== "semua" && String(v["status"]) !== status) return false;
      if (produk !== "semua" && String(v["product_id"]) !== produk) return false;
      if (!term) return true;
      return [namaProduk(v["product_id"]), v["version_name"], v["notes"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versions.data, q, status, produk, products.data]);

  const simpanHarga = useAction(
    async (values: FormValues) => {
      const v = priceFor;
      if (!v) throw new Error("Versi HPP tidak ditemukan");
      const hpp = Number(v["unit_hpp"] ?? 0);
      const metode = String(values["pricing_method"] ?? "markup");
      const markup = Number(values["markup_percentage"] ?? 0);
      const target = Number(values["target_margin_percentage"] ?? 0);
      const fee = Number(values["broker_fee_per_unit"] ?? 0);
      const harga =
        metode === "target_margin" ? hargaTargetMargin(hpp, target) : hargaMarkup(hpp, markup);
      const clientPrice = Number(values["client_price"] ?? 0) || harga;
      const margin = clientPrice > 0 ? ((clientPrice - hpp - fee) / clientPrice) * 100 : 0;

      const nonaktif = await db("product_prices")
        .update({ is_active: false })
        .eq("product_id", String(v["product_id"]));
      if (nonaktif.error) throw new Error(nonaktif.error.message);

      const { error } = await db("product_prices").insert({
        company_id: v["company_id"],
        product_id: v["product_id"],
        costing_version_id: v["id"],
        pricing_method: metode,
        markup_percentage: markup,
        target_margin_percentage: target,
        base_price: harga,
        minimum_price: hpp * 1.05,
        client_price: clientPrice,
        recommended_retail_price: clientPrice * 1.6,
        broker_fee_per_unit: fee,
        actual_margin: margin,
        is_active: true,
        notes: values["notes"] ?? null,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["product_prices"], success: "Harga jual tersimpan" },
  );

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "produk",
      header: "Produk",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{namaProduk(r["product_id"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            Versi {String(r["version_number"])} · {String(r["version_name"] ?? "-")}
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
    { key: "batch", header: "Batch", render: (r) => angka(Number(r["planned_quantity"])) },
    { key: "layak", header: "Layak jual", render: (r) => angka(Number(r["good_units"])) },
    { key: "total", header: "Total biaya", render: (r) => rupiah(Number(r["total_batch_cost"])) },
    {
      key: "hpp",
      header: "HPP / unit",
      render: (r) => <span className="font-semibold">{rupiah(Number(r["unit_hpp"]), true)}</span>,
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r["status"])} /> },
    {
      key: "tanggal",
      header: "Dibuat",
      desktopOnly: true,
      render: (r) => tanggalPendek(String(r["created_at"])),
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");
  const adaFilter = q.trim() !== "" || status !== "semua" || produk !== "semua";

  return (
    <>
      <PageHeader
        title="Kalkulasi HPP"
        description={`Versi perhitungan biaya produksi — ${scope}`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden /> Versi HPP
          </Button>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari produk atau nama versi"
        searchLabel="Cari versi HPP"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: ["draft", "aktif", "digantikan"].map((s) => ({ value: s, label: s })),
            onChange: (v) => setSearch({ status: v }),
          },
          {
            key: "produk",
            label: "Filter produk",
            value: produk,
            allLabel: "Semua produk",
            options: productOptions.map((p) => ({ value: p.id, label: p.name })),
            onChange: (v) => setSearch({ produk: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(versions.data ?? []).length} versi`}
        onReset={() => setSearch({ q: "", status: "semua", produk: "semua" })}
      />

      {versions.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : versions.isError ? (
        <ErrorState onRetry={() => void versions.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Calculator}
          title="Belum ada versi HPP"
          description={
            adaFilter
              ? "Tidak ada versi HPP yang cocok dengan filter."
              : "Buat versi HPP pertama untuk menghitung biaya produksi per unit."
          }
          action={
            adaFilter ? (
              <Button variant="outline" onClick={() => setSearch({ q: "", status: "semua", produk: "semua" })}>
                Reset filter
              </Button>
            ) : (
              <Button onClick={() => setFormOpen(true)}>
                <Plus className="size-4" aria-hidden /> Versi HPP
              </Button>
            )
          }
        />
      ) : (
        <DataTable
          rows={rows as (DbRow & { id: string })[]}
          columns={columns}
          actions={(r) => (
            <div className="flex justify-end gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Atur harga jual"
                onClick={() => setPriceFor(r)}
              >
                <Tag className="size-4" aria-hidden />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Ubah versi"
                onClick={() => {
                  setEditing(r);
                  setFormOpen(true);
                }}
              >
                <Pencil className="size-4" aria-hidden />
              </Button>
            </div>
          )}
        />
      )}

      <CostingDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        products={productOptions}
        editing={editing}
      />

      <RecordFormDialog
        open={priceFor !== null}
        onOpenChange={(v) => !v && setPriceFor(null)}
        title="Tetapkan Harga Jual"
        description={
          priceFor
            ? `HPP per unit ${rupiah(Number(priceFor["unit_hpp"]), true)} — ${namaProduk(priceFor["product_id"])}`
            : ""
        }
        saving={simpanHarga.isPending}
        fields={[
          {
            name: "pricing_method",
            label: "Metode",
            type: "select",
            required: true,
            options: [
              { value: "markup", label: "Markup dari HPP" },
              { value: "target_margin", label: "Target margin" },
            ],
          },
          { name: "markup_percentage", label: "Markup (%)", type: "percent" },
          { name: "target_margin_percentage", label: "Target margin (%)", type: "percent" },
          { name: "client_price", label: "Harga ke klien (opsional)", type: "currency" },
          { name: "broker_fee_per_unit", label: "Fee makelar / unit", type: "currency" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        initial={{ pricing_method: "markup", markup_percentage: 30 }}
        onSubmit={(values) =>
          simpanHarga.mutate(values, { onSuccess: () => setPriceFor(null) })
        }
      />
    </>
  );
}
