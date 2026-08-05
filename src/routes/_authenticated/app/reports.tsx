import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/layout/app-shell";
import { FloatingCard } from "@/components/common/floating-card";
import { LoadingSkeleton } from "@/components/common/states";
import { ExportMenuSections } from "@/components/common/export-menu";
import { slugFile, type SectionDoc } from "@/lib/export";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { angka, labelStatus, rupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/reports")({
  component: ReportsPage,
  head: () => ({
    meta: [
      { title: "Laporan — Maklon Control Center" },
      {
        name: "description",
        content:
          "Laporan penjualan, laba, produksi, dan pembayaran maklon dalam satu tampilan ringkas.",
      },
      { property: "og:title", content: "Laporan — Maklon Control Center" },
      { property: "og:description", content: "Analitik penjualan dan produksi maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const WARNA = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function bulanKey(v: unknown): string {
  return String(v ?? "").slice(0, 7);
}

function ReportsPage() {
  const { scopeId, active, activeId } = useCompany();

  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date", asc: true });
  const items = useRows<DbRow>("order_items", { scopeId });
  const payments = useRows<DbRow>("payments", { scopeId, orderBy: "payment_date", asc: true });
  const batches = useRows<DbRow>("production_batches", { scopeId });
  const products = useRows<DbRow>("products", { scopeId });

  const memuat = orders.isLoading || items.isLoading || payments.isLoading || batches.isLoading;

  const penjualanBulanan = useMemo(() => {
    const map = new Map<string, { bulan: string; omzet: number; bayar: number }>();
    for (const o of orders.data ?? []) {
      const k = bulanKey(o["order_date"]);
      const cur = map.get(k) ?? { bulan: k, omzet: 0, bayar: 0 };
      cur.omzet += Number(o["grand_total"] ?? 0);
      map.set(k, cur);
    }
    for (const p of payments.data ?? []) {
      const k = bulanKey(p["payment_date"]);
      const cur = map.get(k) ?? { bulan: k, omzet: 0, bayar: 0 };
      cur.bayar += Number(p["amount"] ?? 0);
      map.set(k, cur);
    }
    return [...map.values()].sort((a, b) => a.bulan.localeCompare(b.bulan)).slice(-12);
  }, [orders.data, payments.data]);

  const produkTeratas = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items.data ?? []) {
      const key = String(i["product_id"] ?? "");
      map.set(key, (map.get(key) ?? 0) + Number(i["subtotal"] ?? 0));
    }
    return [...map.entries()]
      .map(([id, nilai]) => ({
        nama:
          (products.data ?? []).find((p) => String(p["id"]) === id)?.["name"]?.toString() ??
          "Lainnya",
        nilai,
      }))
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 6);
  }, [items.data, products.data]);

  const statusProduksi = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of batches.data ?? []) {
      const k = String(b["status"]);
      map.set(k, (map.get(k) ?? 0) + 1);
    }
    return [...map.entries()].map(([status, jumlah]) => ({ status: labelStatus(status), jumlah }));
  }, [batches.data]);

  const totalOmzet = (orders.data ?? []).reduce((s, o) => s + Number(o["grand_total"] ?? 0), 0);
  const totalBayar = (payments.data ?? []).reduce((s, p) => s + Number(p["amount"] ?? 0), 0);
  const totalLaba = (items.data ?? []).reduce((s, i) => s + Number(i["estimated_profit"] ?? 0), 0);
  const totalUnit = (batches.data ?? []).reduce((s, b) => s + Number(b["passed_quantity"] ?? 0), 0);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const dokumenLaporan = (): SectionDoc => ({
    title: "Laporan Kinerja Bisnis",
    subtitle: scope,
    fileName: slugFile(`laporan-${scope}`),
    meta: [
      { label: "Jumlah pesanan", value: String((orders.data ?? []).length) },
      { label: "Batch produksi", value: String((batches.data ?? []).length) },
    ],
    sections: [
      {
        heading: "Omzet vs kas masuk per bulan",
        columns: [
          { header: "Bulan" },
          { header: "Omzet", align: "right" },
          { header: "Kas masuk", align: "right" },
          { header: "Selisih", align: "right" },
        ],
        rows: penjualanBulanan.map((b) => [
          b.bulan,
          rupiah(b.omzet),
          rupiah(b.bayar),
          rupiah(b.omzet - b.bayar),
        ]),
      },
      {
        heading: "Produk dengan nilai penjualan tertinggi",
        columns: [{ header: "Produk" }, { header: "Nilai penjualan", align: "right" }],
        rows: produkTeratas.map((p) => [p.nama, rupiah(p.nilai)]),
      },
      {
        heading: "Distribusi status batch produksi",
        columns: [{ header: "Status" }, { header: "Jumlah batch", align: "right" }],
        rows: statusProduksi.map((s) => [s.status, angka(s.jumlah)]),
      },
    ],
    summary: [
      { label: "Total omzet", value: rupiah(totalOmzet) },
      { label: "Kas masuk", value: rupiah(totalBayar) },
      { label: "Estimasi laba", value: rupiah(totalLaba) },
      { label: "Unit lolos QC", value: angka(totalUnit) },
      { label: "Sisa tagihan", value: rupiah(Math.max(totalOmzet - totalBayar, 0)) },
    ],
  });

  return (
    <>
      <PageHeader
        title="Laporan"
        description={`Ringkasan kinerja bisnis — ${scope}`}
        actions={<ExportMenuSections doc={dokumenLaporan} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Total omzet</p>
          <p className="mt-2 text-2xl font-bold">{rupiah(totalOmzet)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Kas masuk</p>
          <p className="mt-2 text-2xl font-bold text-primary">{rupiah(totalBayar)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Estimasi laba</p>
          <p className="mt-2 text-2xl font-bold">{rupiah(totalLaba)}</p>
        </FloatingCard>
        <FloatingCard>
          <p className="text-sm text-muted-foreground">Unit lolos QC</p>
          <p className="mt-2 text-2xl font-bold">{angka(totalUnit)}</p>
        </FloatingCard>
      </div>

      {memuat ? (
        <div className="mt-6">
          <LoadingSkeleton rows={6} />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold">Omzet vs kas masuk per bulan</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={penjualanBulanan}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="bulan" fontSize={12} />
                  <YAxis width={70} fontSize={12} tickFormatter={(v: number) => angka(v / 1000)} />
                  <Tooltip formatter={(v: number) => rupiah(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="omzet"
                    name="Omzet"
                    stroke={WARNA[0]}
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="bayar"
                    name="Kas masuk"
                    stroke={WARNA[1]}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold">Produk dengan nilai penjualan tertinggi</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={produkTeratas}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis
                    dataKey="nama"
                    fontSize={11}
                    interval={0}
                    height={50}
                    angle={-15}
                    dy={10}
                  />
                  <YAxis width={70} fontSize={12} tickFormatter={(v: number) => angka(v / 1000)} />
                  <Tooltip formatter={(v: number) => rupiah(v)} />
                  <Bar dataKey="nilai" name="Penjualan" fill={WARNA[2]} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold">Distribusi status batch produksi</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusProduksi}
                    dataKey="jumlah"
                    nameKey="status"
                    outerRadius={95}
                    label
                  >
                    {statusProduksi.map((_, i) => (
                      <Cell key={i} fill={WARNA[i % WARNA.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-2xl border border-border/70 bg-card p-4">
            <h2 className="text-sm font-semibold">Ringkasan cepat</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Jumlah pesanan</dt>
                <dd className="font-semibold">{(orders.data ?? []).length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Batch produksi</dt>
                <dd className="font-semibold">{(batches.data ?? []).length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Sisa tagihan</dt>
                <dd className="font-semibold">{rupiah(Math.max(totalOmzet - totalBayar, 0))}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Rata-rata nilai pesanan</dt>
                <dd className="font-semibold">
                  {rupiah(
                    (orders.data ?? []).length > 0 ? totalOmzet / (orders.data ?? []).length : 0,
                  )}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      )}
    </>
  );
}
