import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/app-shell";
import { FloatingCard } from "@/components/common/floating-card";
import { useCompany } from "@/lib/company-context";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { active, activeId } = useCompany();
  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader title="Dashboard" description={`Ringkasan operasional — ${scope}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["Klien Aktif", "Pesanan Berjalan", "Produksi Hari Ini", "Piutang"].map((t) => (
          <FloatingCard key={t}>
            <p className="text-sm text-muted-foreground">{t}</p>
            <p className="mt-2 text-2xl font-bold">—</p>
          </FloatingCard>
        ))}
      </div>
    </>
  );
}
