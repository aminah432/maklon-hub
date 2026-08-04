import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { FloatingCard } from "@/components/common/floating-card";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { labelStatus, rupiah, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  metode: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/finance/payments")({
  component: PaymentsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Pembayaran — Maklon Control Center" },
      {
        name: "description",
        content:
          "Riwayat pembayaran klien maklon lengkap dengan metode, referensi, dan status verifikasi.",
      },
      { property: "og:title", content: "Pembayaran — Maklon Control Center" },
      { property: "og:description", content: "Riwayat pembayaran klien maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PaymentsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, metode } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const payments = useRows<DbRow>("payments", { scopeId, orderBy: "payment_date" });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });
  const invoices = useRows<DbRow>("invoices", { scopeId });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };
  const nomorInvoice = (id: unknown) => {
    const i = (invoices.data ?? []).find((x) => String(x["id"]) === String(id));
    return i ? String(i["invoice_number"]) : "-";
  };

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (payments.data ?? []).filter((r) => {
      if (metode !== "semua" && String(r["method"]) !== metode) return false;
      if (!term) return true;
      return [namaKlien(r["client_id"]), r["reference_number"], nomorInvoice(r["invoice_id"])]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payments.data, clients.data, invoices.data, q, metode]);

  const totalMasuk = rows.reduce((s, r) => s + Number(r["amount"] ?? 0), 0);
  const bulanIni = rows
    .filter((r) => String(r["payment_date"]).slice(0, 7) === new Date().toISOString().slice(0, 7))
    .reduce((s, r) => s + Number(r["amount"] ?? 0), 0);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "klien",
      header: "Klien",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{namaKlien(r["client_id"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {nomorInvoice(r["invoice_id"])}
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
    { key: "tanggal", header: "Tanggal", render: (r) => tanggalPendek(String(r["payment_date"])) },
    {
      key: "jumlah",
      header: "Jumlah",
      render: (r) => <span className="font-semibold">{rupiah(Number(r["amount"]))}</span>,
    },
    { key: "metode", header: "Metode", render: (r) => labelStatus(String(r["method"])) },
    {
      key: "verifikasi",
      header: "Verifikasi",
      render: (r) => <StatusBadge status={String(r["verification_status"])} />,
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader title="Pembayaran" description={`Kas masuk dari klien — ${scope}`} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Total pembayaran</p>
          <p className="mt-2 text-2xl font-bold">{rupiah(totalMasuk)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Bulan berjalan</p>
          <p className="mt-2 text-2xl font-bold text-primary">{rupiah(bulanIni)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Jumlah transaksi</p>
          <p className="mt-2 text-2xl font-bold">{rows.length}</p>
        </FloatingCard>
      </div>

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari klien, invoice, atau nomor referensi"
        searchLabel="Cari pembayaran"
        filters={[
          {
            key: "metode",
            label: "Filter metode",
            value: metode,
            allLabel: "Semua metode",
            options: ["transfer", "tunai", "qris", "lainnya"].map((v) => ({
              value: v,
              label: labelStatus(v),
            })),
            onChange: (v) => setSearch({ metode: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(payments.data ?? []).length} pembayaran`}
        onReset={() => setSearch({ q: "", metode: "semua" })}
      />

      {payments.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : payments.isError ? (
        <ErrorState onRetry={() => void payments.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum ada pembayaran"
          description="Pembayaran akan muncul setelah dicatat dari halaman invoice."
        />
      ) : (
        <DataTable rows={rows as (DbRow & { id: string })[]} columns={columns} />
      )}
    </>
  );
}
