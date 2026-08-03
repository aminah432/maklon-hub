import { useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { labelStatus, tanggal } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  entitas: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/activities")({
  component: ActivitiesPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Aktivitas — Maklon Control Center" },
      {
        name: "description",
        content: "Jejak audit perubahan data maklon: siapa mengubah apa dan kapan perubahan terjadi.",
      },
      { property: "og:title", content: "Aktivitas — Maklon Control Center" },
      { property: "og:description", content: "Jejak audit aktivitas pengguna." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ActivitiesPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, entitas } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const logs = useRows<DbRow>("activity_logs", { scopeId, limit: 300 });
  const riwayat = useRows<DbRow>("order_status_history", { scopeId, limit: 300 });

  const gabungan = useMemo(() => {
    const a = (logs.data ?? []).map((l) => ({
      id: String(l["id"]),
      company_id: l["company_id"],
      waktu: String(l["created_at"]),
      judul: String(l["action"]),
      entitas: String(l["entity_type"] ?? "sistem"),
      detail: String(l["notes"] ?? ""),
    }));
    const b = (riwayat.data ?? []).map((h) => ({
      id: String(h["id"]),
      company_id: h["company_id"],
      waktu: String(h["created_at"]),
      judul: `Status pesanan menjadi ${labelStatus(String(h["new_status"]))}`,
      entitas: "orders",
      detail: String(h["notes"] ?? ""),
    }));
    return [...a, ...b].sort((x, y) => y.waktu.localeCompare(x.waktu));
  }, [logs.data, riwayat.data]);

  const jenisEntitas = useMemo(
    () => [...new Set(gabungan.map((g) => g.entitas))].sort(),
    [gabungan],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return gabungan.filter((g) => {
      if (entitas !== "semua" && g.entitas !== entitas) return false;
      if (!term) return true;
      return `${g.judul} ${g.detail}`.toLowerCase().includes(term);
    });
  }, [gabungan, q, entitas]);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader title="Aktivitas" description={`Jejak audit sistem — ${scope}`} />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari aktivitas"
        searchLabel="Cari aktivitas"
        filters={[
          {
            key: "entitas",
            label: "Filter entitas",
            value: entitas,
            allLabel: "Semua entitas",
            options: jenisEntitas.map((v) => ({ value: v, label: labelStatus(v) })),
            onChange: (v) => setSearch({ entitas: v }),
          },
        ]}
        resultLabel={`${rows.length} aktivitas`}
        onReset={() => setSearch({ q: "", entitas: "semua" })}
      />

      {logs.isLoading || riwayat.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : logs.isError || riwayat.isError ? (
        <ErrorState onRetry={() => void logs.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="Belum ada aktivitas"
          description="Perubahan data akan tercatat otomatis di sini."
        />
      ) : (
        <ol className="space-y-3 border-l border-border/70 pl-5">
          {rows.map((g) => {
            const c = companyById(String(g.company_id));
            return (
              <li key={g.id} className="relative rounded-2xl border border-border/70 bg-card p-4">
                <span className="absolute -left-[27px] top-6 size-2.5 rounded-full bg-primary" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{g.judul}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-lg">
                      {labelStatus(g.entitas)}
                    </Badge>
                    <CompanyBadge code={c?.code ?? null} name={c?.name ?? null} />
                  </div>
                </div>
                {g.detail ? (
                  <p className="mt-1 text-sm text-muted-foreground">{g.detail}</p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">{tanggal(g.waktu, true)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
