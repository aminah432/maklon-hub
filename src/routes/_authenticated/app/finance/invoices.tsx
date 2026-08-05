import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { MoreHorizontal, Plus, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { ExportMenu } from "@/components/common/export-menu";
import type { ExportDoc } from "@/lib/export";
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
import { useCompany } from "@/lib/company-context";
import { db, nomorDokumen, useAction, useRows, type DbRow } from "@/lib/db";
import { labelStatus, rupiah, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/finance/invoices")({
  component: InvoicesPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Invoice — Maklon Control Center" },
      {
        name: "description",
        content:
          "Terbitkan invoice DP, pelunasan, dan penuh untuk pesanan maklon serta pantau statusnya.",
      },
      { property: "og:title", content: "Invoice — Maklon Control Center" },
      { property: "og:description", content: "Kelola invoice maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function InvoicesPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { q, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [open, setOpen] = useState(false);
  const [bayar, setBayar] = useState<DbRow | null>(null);

  const invoices = useRows<DbRow>("invoices", { scopeId });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };

  const buatInvoice = useAction(
    async (values: FormValues) => {
      const orderId = String(values["order_id"] ?? "");
      const order = (orders.data ?? []).find((o) => String(o["id"]) === orderId);
      const companyId = order ? String(order["company_id"]) : (scopeId ?? companies[0]?.id ?? "");
      if (!companyId) throw new Error("Perusahaan tidak diketahui");
      const clientId = order ? String(order["client_id"]) : String(values["client_id"] ?? "");
      if (!clientId) throw new Error("Klien wajib dipilih");
      const total = Number(values["grand_total"] ?? (order ? Number(order["grand_total"]) : 0));
      const nomor = await nomorDokumen(companyId, "invoice");
      const { error } = await db("invoices").insert({
        company_id: companyId,
        invoice_number: nomor,
        order_id: orderId || null,
        client_id: clientId,
        invoice_type: String(values["invoice_type"] ?? "penuh"),
        invoice_date: values["invoice_date"] || new Date().toISOString().slice(0, 10),
        due_date: values["due_date"] || null,
        status: "belum_dibayar",
        subtotal: total,
        discount: 0,
        tax: 0,
        shipping_cost: 0,
        grand_total: total,
        paid_amount: 0,
        remaining_amount: total,
        notes: values["notes"] || null,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["invoices"], success: "Invoice diterbitkan" },
  );

  const catatBayar = useAction(
    async (values: FormValues) => {
      const inv = bayar;
      if (!inv) throw new Error("Invoice tidak ditemukan");
      const { error } = await db("payments").insert({
        company_id: inv["company_id"],
        invoice_id: inv["id"],
        order_id: inv["order_id"],
        client_id: inv["client_id"],
        payment_date: values["payment_date"] || new Date().toISOString().slice(0, 10),
        amount: Number(values["amount"] ?? 0),
        method: String(values["method"] ?? "transfer"),
        bank_destination: values["bank_destination"] || null,
        reference_number: values["reference_number"] || null,
        verification_status: "terverifikasi",
        notes: values["notes"] || null,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["payments", "invoices", "orders"], success: "Pembayaran tercatat" },
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (invoices.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (!term) return true;
      return [r["invoice_number"], namaKlien(r["client_id"])]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoices.data, clients.data, q, status]);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "nomor",
      header: "Nomor",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["invoice_number"])}</span>
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
    { key: "tipe", header: "Tipe", render: (r) => labelStatus(String(r["invoice_type"])) },
    { key: "tanggal", header: "Tanggal", render: (r) => tanggalPendek(String(r["invoice_date"])) },
    {
      key: "tempo",
      header: "Jatuh tempo",
      desktopOnly: true,
      render: (r) => tanggalPendek(r["due_date"] ? String(r["due_date"]) : null),
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
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r["status"])} />,
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const dokumenEkspor = (): ExportDoc<DbRow> => ({
    title: "Daftar Invoice",
    subtitle: scope,
    meta: [
      { label: "Total baris", value: String(rows.length) },
      { label: "Pencarian", value: q.trim() || "-" },
      { label: "Status", value: status === "semua" ? "Semua" : labelStatus(status) },
    ],
    columns: [
      { header: "Nomor", value: (r) => String(r["invoice_number"] ?? "-") },
      { header: "Klien", value: (r) => namaKlien(r["client_id"]) },
      { header: "Perusahaan", value: (r) => companyById(String(r["company_id"]))?.code ?? "-" },
      { header: "Tipe", value: (r) => labelStatus(String(r["invoice_type"])) },
      { header: "Tanggal", value: (r) => tanggalPendek(String(r["invoice_date"])) },
      {
        header: "Jatuh tempo",
        value: (r) => tanggalPendek(r["due_date"] ? String(r["due_date"]) : null),
      },
      { header: "Total", value: (r) => rupiah(Number(r["grand_total"])), align: "right" },
      { header: "Dibayar", value: (r) => rupiah(Number(r["paid_amount"])), align: "right" },
      { header: "Sisa", value: (r) => rupiah(Number(r["remaining_amount"])), align: "right" },
      { header: "Status", value: (r) => labelStatus(String(r["status"])) },
    ],
    rows,
    summary: [
      {
        label: "Total tagihan",
        value: rupiah(rows.reduce((s, r) => s + Number(r["grand_total"] ?? 0), 0)),
      },
      {
        label: "Total dibayar",
        value: rupiah(rows.reduce((s, r) => s + Number(r["paid_amount"] ?? 0), 0)),
      },
      {
        label: "Sisa tagihan",
        value: rupiah(rows.reduce((s, r) => s + Number(r["remaining_amount"] ?? 0), 0)),
      },
    ],
  });

  return (
    <>
      <PageHeader
        title="Invoice"
        description={`Penagihan pesanan maklon — ${scope}`}
        actions={
          <>
            <ExportMenu doc={dokumenEkspor} />
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden /> Buat Invoice
            </Button>
          </>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari nomor invoice atau klien"
        searchLabel="Cari invoice"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: ["belum_dibayar", "dibayar_sebagian", "lunas"].map((s) => ({
              value: s,
              label: labelStatus(s),
            })),
            onChange: (v) => setSearch({ status: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(invoices.data ?? []).length} invoice`}
        onReset={() => setSearch({ q: "", status: "semua" })}
      />

      {invoices.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : invoices.isError ? (
        <ErrorState onRetry={() => void invoices.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Belum ada invoice"
          description="Terbitkan invoice DP atau pelunasan dari pesanan yang berjalan."
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus className="size-4" aria-hidden /> Buat Invoice
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
                <Button variant="ghost" size="icon" aria-label="Aksi invoice">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-2xl">
                <DropdownMenuItem className="rounded-xl" onClick={() => setBayar(r)}>
                  Catat pembayaran
                </DropdownMenuItem>
                <DropdownMenuItem className="rounded-xl" onClick={() => window.print()}>
                  Cetak
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <RecordFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Buat invoice"
        description="Pilih pesanan agar nilai tagihan terisi otomatis."
        saving={buatInvoice.isPending}
        initial={{ invoice_type: "penuh", invoice_date: new Date().toISOString().slice(0, 10) }}
        fields={[
          {
            name: "order_id",
            label: "Pesanan",
            type: "select",
            options: (orders.data ?? []).map((o) => ({
              value: String(o["id"]),
              label: `${String(o["order_number"])} — ${rupiah(Number(o["grand_total"]))}`,
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
            name: "invoice_type",
            label: "Tipe invoice",
            type: "select",
            required: true,
            options: ["dp", "termin", "pelunasan", "penuh"].map((v) => ({
              value: v,
              label: labelStatus(v),
            })),
          },
          { name: "grand_total", label: "Nilai tagihan", type: "currency" },
          { name: "invoice_date", label: "Tanggal invoice", type: "date", required: true },
          { name: "due_date", label: "Jatuh tempo", type: "date" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => buatInvoice.mutate(values, { onSuccess: () => setOpen(false) })}
      />

      <RecordFormDialog
        open={bayar !== null}
        onOpenChange={(v) => !v && setBayar(null)}
        title="Catat pembayaran"
        description={bayar ? `Sisa tagihan ${rupiah(Number(bayar["remaining_amount"]))}` : ""}
        saving={catatBayar.isPending}
        initial={{ method: "transfer", payment_date: new Date().toISOString().slice(0, 10) }}
        fields={[
          { name: "payment_date", label: "Tanggal bayar", type: "date", required: true },
          { name: "amount", label: "Jumlah", type: "currency", required: true },
          {
            name: "method",
            label: "Metode",
            type: "select",
            required: true,
            options: ["transfer", "tunai", "qris", "lainnya"].map((v) => ({
              value: v,
              label: labelStatus(v),
            })),
          },
          { name: "bank_destination", label: "Bank tujuan" },
          { name: "reference_number", label: "Nomor referensi" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => catatBayar.mutate(values, { onSuccess: () => setBayar(null) })}
      />
    </>
  );
}
