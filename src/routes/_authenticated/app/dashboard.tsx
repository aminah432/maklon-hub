import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/app-shell";
import { FloatingCard } from "@/components/common/floating-card";
import { StatusBadge } from "@/components/common/status-badge";
import { LoadingSkeleton } from "@/components/common/states";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { angka, labelStatus, rupiah, sapaan, tanggalPendek } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Maklon Control Center" },
      {
        name: "description",
        content: "Ringkasan operasional maklon: klien aktif, pesanan berjalan, produksi, dan piutang.",
      },
      { property: "og:title", content: "Dashboard — Maklon Control Center" },
      { property: "og:description", content: "Ringkasan operasional bisnis maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function DashboardPage() {
  const { active, activeId, scopeId } = useCompany();
  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const clients = useRows<DbRow>("clients", { scopeId, archived: false });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const batches = useRows<DbRow>("production_batches", { scopeId });
  const invoices = useRows<DbRow>("invoices", { scopeId });
  const products = useRows<DbRow>("products", { scopeId, archived: false });

  const memuat = clients.isLoading || orders.isLoading || batches.isLoading || invoices.isLoading;

  const klienAktif = (clients.data ?? []).filter((c) => String(c["status"]) === "aktif").length;
  const pesananBerjalan = (orders.data ?? []).filter(
    (o) => !["selesai", "dibatalkan", "draft"].includes(String(o["status"])),
  );
  const produksiBerjalan = (batches.data ?? []).filter((b) =>
    ["dijadwalkan", "berlangsung", "quality_control"].includes(String(b["status"])),
  );
  const piutang = (invoices.data ?? []).reduce(
    (s, i) => s + Number(i["remaining_amount"] ?? 0),
    0,
  );

  const grafik = pesananBerjalan.slice(0, 8).map((o) => ({
    nama: String(o["order_number"]).split("-").slice(-1)[0] ?? "",
    nilai: Number(o["grand_total"] ?? 0),
  }));

  const kartu = [
    { label: "Klien Aktif", nilai: angka(klienAktif), sub: `${(clients.data ?? []).length} total klien`, to: "/app/clients" },
    { label: "Pesanan Berjalan", nilai: angka(pesananBerjalan.length), sub: `${(orders.data ?? []).length} total pesanan`, to: "/app/orders" },
    { label: "Produksi Aktif", nilai: angka(produksiBerjalan.length), sub: `${(batches.data ?? []).length} total batch`, to: "/app/production" },
    { label: "Piutang", nilai: rupiah(piutang), sub: `${(products.data ?? []).length} produk aktif`, to: "/app/finance/receivables" },
  ] as const;

  return (
    <>
      <PageHeader title="Dashboard" description={`${sapaan()} — ringkasan operasional ${scope}`} />

      {memuat ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kartu.map((k) => (
              <Link key={k.label} to={k.to} className="block">
                <FloatingCard>
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <p className="mt-2 text-2xl font-bold">{k.nilai}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{k.sub}</p>
                </FloatingCard>
              </Link>
            ))}
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <section className="rounded-2xl border border-border/70 bg-card p-4">
              <h2 className="text-sm font-semibold">Nilai pesanan berjalan</h2>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafik}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                    <XAxis dataKey="nama" fontSize={12} />
                    <YAxis width={70} fontSize={12} tickFormatter={(v: number) => angka(v / 1000)} />
                    <Tooltip formatter={(v: number) => rupiah(v)} />
                    <Bar dataKey="nilai" name="Nilai" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-border/70 bg-card p-4">
              <h2 className="text-sm font-semibold">Pesanan terbaru</h2>
              <ul className="mt-3 space-y-2">
                {pesananBerjalan.slice(0, 6).map((o) => (
                  <li
                    key={String(o["id"])}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{String(o["order_number"])}</p>
                      <p className="text-xs text-muted-foreground">
                        {tanggalPendek(String(o["order_date"]))} · {rupiah(Number(o["grand_total"]))}
                      </p>
                    </div>
                    <StatusBadge status={String(o["status"])} />
                  </li>
                ))}
                {pesananBerjalan.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Belum ada pesanan berjalan.</li>
                ) : null}
              </ul>

              <h2 className="mt-5 text-sm font-semibold">Batch produksi aktif</h2>
              <ul className="mt-3 space-y-2">
                {produksiBerjalan.slice(0, 4).map((b) => (
                  <li
                    key={String(b["id"])}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{String(b["batch_number"])}</p>
                      <p className="text-xs text-muted-foreground">
                        {labelStatus(String(b["status"]))} · {Number(b["progress_percentage"])}%
                      </p>
                    </div>
                  </li>
                ))}
                {produksiBerjalan.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Belum ada produksi berjalan.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
