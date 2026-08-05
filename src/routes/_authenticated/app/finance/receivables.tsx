import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { HandCoins } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { ExportMenu } from "@/components/common/export-menu";
import type { ExportDoc } from "@/lib/export";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { FloatingCard } from "@/components/common/floating-card";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { labelStatus, rupiah, selisihHari, tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  umur: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/finance/receivables")({
  component: ReceivablesPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Piutang — Maklon Control Center" },
      {
        name: "description",
        content: "Pantau piutang klien maklon berdasarkan umur tagihan dan tanggal jatuh tempo.",
      },
      { property: "og:title", content: "Piutang — Maklon Control Center" },
      { property: "og:description", content: "Pantau piutang dan umur tagihan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ember(hari: number): "lancar" | "1_30" | "31_60" | "60_plus" {
  if (hari <= 0) return "lancar";
  if (hari <= 30) return "1_30";
  if (hari <= 60) return "31_60";
  return "60_plus";
}

const LABEL_EMBER: Record<string, string> = {
  lancar: "Belum jatuh tempo",
  "1_30": "Terlambat 1–30 hari",
  "31_60": "Terlambat 31–60 hari",
  "60_plus": "Terlambat > 60 hari",
};

function ReceivablesPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, umur } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const invoices = useRows<DbRow>("invoices", { scopeId });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };

  const belum = useMemo(
    () => (invoices.data ?? []).filter((i) => Number(i["remaining_amount"]) > 0),
    [invoices.data],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return belum.filter((r) => {
      const hari = r["due_date"] ? selisihHari(String(r["due_date"])) : 0;
      if (umur !== "semua" && ember(hari) !== umur) return false;
      if (!term) return true;
      return [r["invoice_number"], namaKlien(r["client_id"])]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [belum, clients.data, q, umur]);

  const total = belum.reduce((s, r) => s + Number(r["remaining_amount"] ?? 0), 0);
  const jatuhTempo = belum
    .filter((r) => r["due_date"] && selisihHari(String(r["due_date"])) > 0)
    .reduce((s, r) => s + Number(r["remaining_amount"] ?? 0), 0);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "invoice",
      header: "Invoice",
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
    {
      key: "tempo",
      header: "Jatuh tempo",
      render: (r) => tanggalPendek(r["due_date"] ? String(r["due_date"]) : null),
    },
    {
      key: "umur",
      header: "Umur",
      render: (r) => {
        const hari = r["due_date"] ? selisihHari(String(r["due_date"])) : 0;
        const key = ember(hari);
        return (
          <Badge variant={key === "lancar" ? "secondary" : "destructive"} className="rounded-lg">
            {LABEL_EMBER[key]}
          </Badge>
        );
      },
    },
    {
      key: "sisa",
      header: "Sisa tagihan",
      render: (r) => <span className="font-semibold">{rupiah(Number(r["remaining_amount"]))}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={String(r["status"])} />,
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const dokumenEkspor = (): ExportDoc<DbRow> => ({
    title: "Laporan Piutang",
    subtitle: scope,
    meta: [
      { label: "Total baris", value: String(rows.length) },
      { label: "Pencarian", value: q.trim() || "-" },
      { label: "Umur", value: umur === "semua" ? "Semua" : (LABEL_EMBER[umur] ?? umur) },
    ],
    columns: [
      { header: "Invoice", value: (r) => String(r["invoice_number"] ?? "-") },
      { header: "Klien", value: (r) => namaKlien(r["client_id"]) },
      { header: "Perusahaan", value: (r) => companyById(String(r["company_id"]))?.code ?? "-" },
      {
        header: "Jatuh tempo",
        value: (r) => tanggalPendek(r["due_date"] ? String(r["due_date"]) : null),
      },
      {
        header: "Umur",
        value: (r) => LABEL_EMBER[ember(r["due_date"] ? selisihHari(String(r["due_date"])) : 0)],
      },
      {
        header: "Sisa tagihan",
        value: (r) => rupiah(Number(r["remaining_amount"])),
        align: "right",
      },
      { header: "Status", value: (r) => labelStatus(String(r["status"])) },
    ],
    rows,
    summary: [
      { label: "Total piutang", value: rupiah(total) },
      { label: "Sudah jatuh tempo", value: rupiah(jatuhTempo) },
      { label: "Invoice terbuka", value: String(belum.length) },
    ],
  });

  return (
    <>
      <PageHeader
        title="Piutang"
        description={`Tagihan belum lunas — ${scope}`}
        actions={<ExportMenu doc={dokumenEkspor} />}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Total piutang</p>
          <p className="mt-2 text-2xl font-bold">{rupiah(total)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Sudah jatuh tempo</p>
          <p className="mt-2 text-2xl font-bold text-destructive">{rupiah(jatuhTempo)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Invoice terbuka</p>
          <p className="mt-2 text-2xl font-bold">{belum.length}</p>
        </FloatingCard>
      </div>

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari invoice atau klien"
        searchLabel="Cari piutang"
        filters={[
          {
            key: "umur",
            label: "Filter umur piutang",
            value: umur,
            allLabel: "Semua umur",
            options: Object.entries(LABEL_EMBER).map(([value, label]) => ({ value, label })),
            onChange: (v) => setSearch({ umur: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${belum.length} tagihan`}
        onReset={() => setSearch({ q: "", umur: "semua" })}
      />

      {invoices.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : invoices.isError ? (
        <ErrorState onRetry={() => void invoices.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Tidak ada piutang"
          description="Semua invoice sudah lunas atau belum ada tagihan diterbitkan."
        />
      ) : (
        <DataTable rows={rows as (DbRow & { id: string })[]} columns={columns} />
      )}
    </>
  );
}
