import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Handshake, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { RecordFormDialog, type FormValues } from "@/components/common/record-form";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/lib/company-context";
import { db, useAction, useArchiveRow, useRows, useSaveRow, type DbRow } from "@/lib/db";
import { feeMakelar } from "@/lib/calc";
import { labelStatus, rupiah, tanggalPendek } from "@/lib/format";

const FEE_TYPES = ["persentase", "nominal", "per_unit", "per_batch", "klien_baru"];

const searchSchema = z.object({
  tab: fallback(z.enum(["makelar", "fee"]), "makelar").default("makelar"),
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/brokers")({
  component: BrokersPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Makelar & Fee — Maklon Control Center" },
      {
        name: "description",
        content: "Data makelar maklon, perhitungan fee per pesanan, dan pencatatan pembayaran fee.",
      },
      { property: "og:title", content: "Makelar & Fee — Maklon Control Center" },
      { property: "og:description", content: "Kelola makelar dan fee komisi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BrokersPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { tab, q, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [formMakelar, setFormMakelar] = useState<DbRow | null>(null);
  const [openMakelar, setOpenMakelar] = useState(false);
  const [openFee, setOpenFee] = useState(false);
  const [bayarFee, setBayarFee] = useState<DbRow | null>(null);

  const brokers = useRows<DbRow>("brokers", {
    scopeId,
    orderBy: "name",
    asc: true,
    archived: false,
  });
  const fees = useRows<DbRow>("broker_fees", { scopeId });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });

  const simpanMakelar = useSaveRow("brokers", { label: "Makelar" });
  const arsipMakelar = useArchiveRow("brokers", { label: "Makelar" });

  const namaMakelar = (id: unknown) => {
    const b = (brokers.data ?? []).find((x) => String(x["id"]) === String(id));
    return b ? String(b["name"]) : "-";
  };

  const simpanFee = useAction(
    async (values: FormValues) => {
      const orderId = String(values["order_id"] ?? "");
      const order = (orders.data ?? []).find((o) => String(o["id"]) === orderId);
      const companyId = order ? String(order["company_id"]) : (scopeId ?? companies[0]?.id ?? "");
      if (!companyId) throw new Error("Perusahaan tidak diketahui");
      const feeType = String(values["fee_type"] ?? "persentase");
      const base = Number(values["fee_base"] ?? (order ? Number(order["grand_total"]) : 0));
      const persen = Number(values["fee_percentage"] ?? 0);
      const nominal = Number(values["fee_amount"] ?? 0);
      const jumlah = feeMakelar({
        type: feeType,
        base,
        percentage: persen,
        amount: nominal,
        quantity: 1,
      });
      const { error } = await db("broker_fees").insert({
        company_id: companyId,
        broker_id: values["broker_id"],
        client_id: order ? order["client_id"] : values["client_id"] || null,
        order_id: orderId || null,
        fee_type: feeType,
        fee_base: base,
        fee_percentage: persen,
        fee_amount: jumlah,
        paid_amount: 0,
        remaining_amount: jumlah,
        due_date: values["due_date"] || null,
        status: "belum_dibayar",
        notes: values["notes"] || null,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["broker_fees"], success: "Fee makelar dicatat" },
  );

  const simpanBayar = useAction(
    async (values: FormValues) => {
      const fee = bayarFee;
      if (!fee) throw new Error("Fee tidak ditemukan");
      const { error } = await db("broker_fee_payments").insert({
        company_id: fee["company_id"],
        broker_fee_id: fee["id"],
        payment_date: values["payment_date"] || new Date().toISOString().slice(0, 10),
        amount: Number(values["amount"] ?? 0),
        method: String(values["method"] ?? "transfer"),
        notes: values["notes"] || null,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["broker_fee_payments", "broker_fees"], success: "Pembayaran fee tersimpan" },
  );

  const rowsMakelar = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (brokers.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (!term) return true;
      return [r["name"], r["business_name"], r["phone"], r["city"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
  }, [brokers.data, q, status]);

  const rowsFee = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (fees.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (!term) return true;
      return namaMakelar(r["broker_id"]).toLowerCase().includes(term);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fees.data, brokers.data, q, status]);

  const kolomMakelar: Column<DbRow & { id: string }>[] = [
    {
      key: "nama",
      header: "Makelar",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["name"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {String(r["business_name"] ?? r["city"] ?? "-")}
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
    { key: "kontak", header: "Kontak", render: (r) => String(r["phone"] ?? "-") },
    {
      key: "fee",
      header: "Fee default",
      render: (r) =>
        String(r["default_fee_type"]) === "persentase"
          ? `${Number(r["default_fee_value"])}%`
          : rupiah(Number(r["default_fee_value"])),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r["status"])} />,
    },
  ];

  const kolomFee: Column<DbRow & { id: string }>[] = [
    {
      key: "makelar",
      header: "Makelar",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{namaMakelar(r["broker_id"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {labelStatus(String(r["fee_type"]))}
          </span>
        </div>
      ),
    },
    {
      key: "jumlah",
      header: "Fee",
      render: (r) => <span className="font-semibold">{rupiah(Number(r["fee_amount"]))}</span>,
    },
    { key: "dibayar", header: "Dibayar", render: (r) => rupiah(Number(r["paid_amount"])) },
    { key: "sisa", header: "Sisa", render: (r) => rupiah(Number(r["remaining_amount"])) },
    {
      key: "jatuh_tempo",
      header: "Jatuh tempo",
      desktopOnly: true,
      render: (r) => tanggalPendek(r["due_date"] ? String(r["due_date"]) : null),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r["status"])} />,
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");
  const daftarKosong = tab === "makelar" ? rowsMakelar.length === 0 : rowsFee.length === 0;
  const memuat = tab === "makelar" ? brokers.isLoading : fees.isLoading;
  const gagal = tab === "makelar" ? brokers.isError : fees.isError;

  return (
    <>
      <PageHeader
        title="Makelar & Fee"
        description={`Mitra makelar dan komisi — ${scope}`}
        actions={
          tab === "makelar" ? (
            <Button
              onClick={() => {
                setFormMakelar(null);
                setOpenMakelar(true);
              }}
            >
              <Plus className="size-4" aria-hidden /> Tambah Makelar
            </Button>
          ) : (
            <Button onClick={() => setOpenFee(true)}>
              <Plus className="size-4" aria-hidden /> Catat Fee
            </Button>
          )
        }
      />

      <Tabs
        value={tab}
        onValueChange={(v) => setSearch({ tab: v as S["tab"], q: "", status: "semua" })}
        className="mb-4"
      >
        <TabsList>
          <TabsTrigger value="makelar">Makelar</TabsTrigger>
          <TabsTrigger value="fee">Fee & Pembayaran</TabsTrigger>
        </TabsList>
      </Tabs>

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder={tab === "makelar" ? "Cari nama makelar atau kota" : "Cari makelar"}
        searchLabel="Cari data makelar"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: (tab === "makelar"
              ? ["aktif", "nonaktif"]
              : ["belum_dibayar", "dibayar_sebagian", "lunas"]
            ).map((s) => ({ value: s, label: labelStatus(s) })),
            onChange: (v) => setSearch({ status: v }),
          },
        ]}
        resultLabel={
          tab === "makelar" ? `${rowsMakelar.length} makelar` : `${rowsFee.length} catatan fee`
        }
        onReset={() => setSearch({ q: "", status: "semua" })}
      />

      {memuat ? (
        <LoadingSkeleton rows={5} />
      ) : gagal ? (
        <ErrorState onRetry={() => void (tab === "makelar" ? brokers.refetch() : fees.refetch())} />
      ) : daftarKosong ? (
        <EmptyState
          icon={Handshake}
          title={tab === "makelar" ? "Belum ada makelar" : "Belum ada fee tercatat"}
          description={
            tab === "makelar"
              ? "Tambahkan mitra makelar yang membawa klien maklon."
              : "Catat fee makelar untuk pesanan yang sudah berjalan."
          }
        />
      ) : tab === "makelar" ? (
        <DataTable
          rows={rowsMakelar as (DbRow & { id: string })[]}
          columns={kolomMakelar}
          actions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi makelar">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() => {
                    setFormMakelar(r);
                    setOpenMakelar(true);
                  }}
                >
                  Ubah
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="rounded-xl"
                  onClick={() => arsipMakelar.mutate({ id: String(r["id"]), archive: true })}
                >
                  Arsipkan
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      ) : (
        <DataTable
          rows={rowsFee as (DbRow & { id: string })[]}
          columns={kolomFee}
          actions={(r) => (
            <Button variant="outline" size="sm" onClick={() => setBayarFee(r)}>
              Bayar
            </Button>
          )}
        />
      )}

      <RecordFormDialog
        open={openMakelar}
        onOpenChange={setOpenMakelar}
        title={formMakelar ? "Ubah makelar" : "Tambah makelar"}
        saving={simpanMakelar.isPending}
        initial={
          formMakelar
            ? {
                name: String(formMakelar["name"] ?? ""),
                business_name: String(formMakelar["business_name"] ?? ""),
                phone: String(formMakelar["phone"] ?? ""),
                email: String(formMakelar["email"] ?? ""),
                city: String(formMakelar["city"] ?? ""),
                bank_name: String(formMakelar["bank_name"] ?? ""),
                bank_account: String(formMakelar["bank_account"] ?? ""),
                default_fee_type: String(formMakelar["default_fee_type"] ?? "persentase"),
                default_fee_value: Number(formMakelar["default_fee_value"] ?? 0),
                status: String(formMakelar["status"] ?? "aktif"),
              }
            : { default_fee_type: "persentase", status: "aktif" }
        }
        fields={[
          {
            name: "company_id",
            label: "Perusahaan",
            type: "select",
            required: !scopeId,
            options: companies.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` })),
          },
          { name: "name", label: "Nama makelar", required: true },
          { name: "business_name", label: "Nama usaha" },
          { name: "phone", label: "Telepon" },
          { name: "email", label: "Email" },
          { name: "city", label: "Kota" },
          { name: "bank_name", label: "Bank" },
          { name: "bank_account", label: "Nomor rekening" },
          {
            name: "default_fee_type",
            label: "Tipe fee default",
            type: "select",
            options: FEE_TYPES.map((v) => ({ value: v, label: labelStatus(v) })),
          },
          { name: "default_fee_value", label: "Nilai fee default", type: "number" },
          {
            name: "status",
            label: "Status",
            type: "select",
            options: ["aktif", "nonaktif"].map((v) => ({ value: v, label: labelStatus(v) })),
          },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => {
          const companyId = scopeId ?? String(values["company_id"] ?? "");
          simpanMakelar.mutate(
            {
              id: formMakelar ? String(formMakelar["id"]) : null,
              values: {
                ...(formMakelar ? {} : { company_id: companyId }),
                name: values["name"],
                business_name: values["business_name"] || null,
                phone: values["phone"] || null,
                email: values["email"] || null,
                city: values["city"] || null,
                bank_name: values["bank_name"] || null,
                bank_account: values["bank_account"] || null,
                default_fee_type: values["default_fee_type"] ?? "persentase",
                default_fee_value: Number(values["default_fee_value"] ?? 0),
                status: values["status"] ?? "aktif",
                notes: values["notes"] || null,
              },
            },
            { onSuccess: () => setOpenMakelar(false) },
          );
        }}
      />

      <RecordFormDialog
        open={openFee}
        onOpenChange={setOpenFee}
        title="Catat fee makelar"
        description="Fee dihitung otomatis dari tipe dan nilai yang dipilih."
        saving={simpanFee.isPending}
        initial={{ fee_type: "persentase" }}
        fields={[
          {
            name: "broker_id",
            label: "Makelar",
            type: "select",
            required: true,
            options: (brokers.data ?? []).map((b) => ({
              value: String(b["id"]),
              label: String(b["name"]),
            })),
          },
          {
            name: "order_id",
            label: "Pesanan",
            type: "select",
            options: (orders.data ?? []).map((o) => ({
              value: String(o["id"]),
              label: String(o["order_number"]),
            })),
          },
          {
            name: "client_id",
            label: "Klien (jika tanpa pesanan)",
            type: "select",
            options: (clients.data ?? []).map((c) => ({
              value: String(c["id"]),
              label: String(c["owner_name"]),
            })),
          },
          {
            name: "fee_type",
            label: "Tipe fee",
            type: "select",
            required: true,
            options: FEE_TYPES.map((v) => ({ value: v, label: labelStatus(v) })),
          },
          { name: "fee_base", label: "Dasar perhitungan", type: "currency" },
          { name: "fee_percentage", label: "Persentase", type: "percent" },
          { name: "fee_amount", label: "Nominal fee", type: "currency" },
          { name: "due_date", label: "Jatuh tempo", type: "date" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => simpanFee.mutate(values, { onSuccess: () => setOpenFee(false) })}
      />

      <RecordFormDialog
        open={bayarFee !== null}
        onOpenChange={(v) => !v && setBayarFee(null)}
        title="Bayar fee makelar"
        description={bayarFee ? `Sisa ${rupiah(Number(bayarFee["remaining_amount"]))}` : ""}
        saving={simpanBayar.isPending}
        fields={[
          { name: "payment_date", label: "Tanggal bayar", type: "date", required: true },
          { name: "amount", label: "Jumlah", type: "currency", required: true },
          {
            name: "method",
            label: "Metode",
            type: "select",
            required: true,
            options: ["transfer", "tunai", "lainnya"].map((v) => ({
              value: v,
              label: labelStatus(v),
            })),
          },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => simpanBayar.mutate(values, { onSuccess: () => setBayarFee(null) })}
      />
    </>
  );
}
