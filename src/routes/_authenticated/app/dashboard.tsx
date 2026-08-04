import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Factory,
  Handshake,
  Package,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { FloatingCard } from "@/components/common/floating-card";
import { Mascot } from "@/components/common/mascot";

import { StatusBadge } from "@/components/common/status-badge";
import { LoadingSkeleton } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/lib/company-context";
import { useRows, type DbRow } from "@/lib/db";
import { angka, isoDate, labelStatus, persen, rupiah, sapaan, tanggalPendek } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  dari: fallback(z.string(), "").default(""),
  sampai: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/_authenticated/app/dashboard")({
  validateSearch: zodValidator(searchSchema),
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard — Maklon Control Center" },
      {
        name: "description",
        content:
          "Ringkasan KPI maklon: omzet, laba, piutang, produksi berjalan, dan invoice jatuh tempo.",
      },
      { property: "og:title", content: "Dashboard — Maklon Control Center" },
      { property: "og:description", content: "Ringkasan KPI operasional bisnis maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const SEMUA = "2000-01-01";

function mundur(hari: number): string {
  const d = new Date();
  d.setDate(d.getDate() - hari);
  return isoDate(d);
}

function DashboardPage() {
  const { active, activeId, scopeId } = useCompany();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const dari = search.dari || SEMUA;
  const sampai = search.sampai || isoDate(new Date());
  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const setRentang = (d: string, s: string) => navigate({ search: { dari: d, sampai: s } });

  const clients = useRows<DbRow>("clients", { scopeId, archived: false });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const items = useRows<DbRow>("order_items", { scopeId, orderBy: "created_at" });
  const batches = useRows<DbRow>("production_batches", { scopeId });
  const invoices = useRows<DbRow>("invoices", { scopeId, orderBy: "invoice_date" });
  const payments = useRows<DbRow>("payments", { scopeId, orderBy: "payment_date" });
  const products = useRows<DbRow>("products", { scopeId, archived: false });
  const brands = useRows<DbRow>("brands", { scopeId });
  const brokers = useRows<DbRow>("brokers", { scopeId, archived: false });
  const brokerFees = useRows<DbRow>("broker_fees", { scopeId });

  const memuat =
    clients.isLoading ||
    orders.isLoading ||
    batches.isLoading ||
    invoices.isLoading ||
    payments.isLoading;

  const dalam = useCallback(
    (v: unknown) => {
      const t = String(v ?? "").slice(0, 10);
      return t >= dari && t <= sampai;
    },
    [dari, sampai],
  );

  const kpi = useMemo(() => {
    const semuaOrder = orders.data ?? [];
    const orderPeriode = semuaOrder.filter(
      (o) => dalam(o["order_date"]) && String(o["status"]) !== "dibatalkan",
    );
    const idPeriode = new Set(orderPeriode.map((o) => String(o["id"])));
    const omzet = orderPeriode.reduce((s, o) => s + Number(o["grand_total"] ?? 0), 0);
    const laba = (items.data ?? [])
      .filter((i) => idPeriode.has(String(i["order_id"])))
      .reduce((s, i) => s + Number(i["estimated_profit"] ?? 0), 0);

    const inv = invoices.data ?? [];
    const piutang = inv.reduce((s, i) => s + Number(i["remaining_amount"] ?? 0), 0);
    const hariIniIso = isoDate(new Date());
    const overdue = inv.filter(
      (i) =>
        Number(i["remaining_amount"] ?? 0) > 0 &&
        String(i["due_date"] ?? "").slice(0, 10) !== "" &&
        String(i["due_date"]).slice(0, 10) < hariIniIso,
    );
    const nilaiOverdue = overdue.reduce((s, i) => s + Number(i["remaining_amount"] ?? 0), 0);

    const produksi = (batches.data ?? []).filter((b) =>
      ["dijadwalkan", "berlangsung", "quality_control"].includes(String(b["status"])),
    );
    const kasMasuk = (payments.data ?? [])
      .filter((p) => dalam(p["payment_date"]))
      .reduce((s, p) => s + Number(p["amount"] ?? 0), 0);

    return {
      omzet,
      laba,
      margin: omzet > 0 ? (laba / omzet) * 100 : 0,
      piutang,
      overdue,
      nilaiOverdue,
      produksi,
      kasMasuk,
      orderPeriode,
    };
  }, [orders.data, items.data, invoices.data, batches.data, payments.data, dalam]);

  const seri = useMemo(() => {
    const map = new Map<string, { label: string; omzet: number; kas: number }>();
    const isi = (tgl: string, key: "omzet" | "kas", nilai: number) => {
      const t = tgl.slice(0, 7);
      if (!t) return;
      const [y, m] = t.split("-");
      const label = `${BULAN[Number(m) - 1] ?? m} ${String(y).slice(2)}`;
      const row = map.get(t) ?? { label, omzet: 0, kas: 0 };
      row[key] += nilai;
      map.set(t, row);
    };
    for (const o of kpi.orderPeriode)
      isi(String(o["order_date"]), "omzet", Number(o["grand_total"] ?? 0));
    for (const p of payments.data ?? []) {
      if (dalam(p["payment_date"])) isi(String(p["payment_date"]), "kas", Number(p["amount"] ?? 0));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [kpi.orderPeriode, payments.data, dalam]);

  const puncak = seri.reduce((m, r) => Math.max(m, r.omzet), 0);

  /* ==== Data tambahan: klien, produk, brand, fee makelar ==== */
  const ekstra = useMemo(() => {
    const kl = clients.data ?? [];
    const pr = products.data ?? [];
    const br = brands.data ?? [];
    const bf = brokerFees.data ?? [];
    const klienAktif = kl.filter((c) => String(c["status"]) === "aktif").length;
    const klienBaru = kl.filter((c) => dalam(c["created_at"] ?? c["joined_at"])).length;
    const produkAktif = pr.filter((p) => String(p["status"]) === "aktif").length;
    const feeTotal = bf.reduce((s, f) => s + Number(f["fee_amount"] ?? 0), 0);
    const feeSisa = bf.reduce((s, f) => s + Number(f["remaining_amount"] ?? 0), 0);

    const perKlien = new Map<string, number>();
    for (const p of pr)
      perKlien.set(
        String(p["client_id"] ?? "-"),
        (perKlien.get(String(p["client_id"] ?? "-")) ?? 0) + 1,
      );
    const produkTeratas = [...perKlien.entries()]
      .map(([id, jumlah]) => ({
        nama: String(
          kl.find((c) => String(c["id"]) === id)?.["business_name"] ??
            kl.find((c) => String(c["id"]) === id)?.["owner_name"] ??
            "Tanpa klien",
        ),
        jumlah,
      }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 6);

    const perMakelar = new Map<string, number>();
    for (const f of bf)
      perMakelar.set(
        String(f["broker_id"] ?? "-"),
        (perMakelar.get(String(f["broker_id"] ?? "-")) ?? 0) + Number(f["fee_amount"] ?? 0),
      );
    const feeTeratas = [...perMakelar.entries()]
      .map(([id, nilai]) => ({
        nama: String(
          (brokers.data ?? []).find((b) => String(b["id"]) === id)?.["name"] ?? "Lainnya",
        ),
        nilai,
      }))
      .filter((r) => r.nilai > 0)
      .sort((a, b) => b.nilai - a.nilai)
      .slice(0, 6);

    const statusProduk = new Map<string, number>();
    for (const p of pr)
      statusProduk.set(String(p["status"]), (statusProduk.get(String(p["status"])) ?? 0) + 1);
    const komposisiProduk = [...statusProduk.entries()].map(([s, jumlah]) => ({
      nama: labelStatus(s),
      jumlah,
    }));

    return {
      klienAktif,
      klienBaru,
      totalKlien: kl.length,
      produkAktif,
      totalProduk: pr.length,
      totalBrand: br.length,
      feeTotal,
      feeSisa,
      produkTeratas,
      feeTeratas,
      komposisiProduk,
    };
  }, [clients.data, products.data, brands.data, brokerFees.data, brokers.data, dalam]);

  const WARNA_PIE = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  const kartuEkstra = [
    {
      label: "Klien aktif",
      nilai: angka(ekstra.klienAktif),
      sub: `${angka(ekstra.totalKlien)} total klien · ${angka(ekstra.klienBaru)} baru`,
      to: "/app/clients",
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Produk aktif",
      nilai: angka(ekstra.produkAktif),
      sub: `${angka(ekstra.totalProduk)} produk terdaftar`,
      to: "/app/products",
      icon: Package,
      tone: "info" as const,
    },
    {
      label: "Brand dikelola",
      nilai: angka(ekstra.totalBrand),
      sub: "Merek milik klien maklon",
      to: "/app/brands",
      icon: Boxes,
      tone: "success" as const,
    },
    {
      label: "Fee makelar",
      nilai: rupiah(ekstra.feeTotal),
      sub: `Belum dibayar ${rupiah(ekstra.feeSisa)}`,
      to: "/app/brokers",
      icon: Handshake,
      tone: "danger" as const,
    },
  ];

  const kartu = [
    {
      label: "Omzet",
      nilai: rupiah(kpi.omzet),
      sub: `${angka(kpi.orderPeriode.length)} pesanan pada periode`,
      to: "/app/orders",
      icon: TrendingUp,
      tone: "primary" as const,
    },
    {
      label: "Laba estimasi",
      nilai: rupiah(kpi.laba),
      sub: `Margin ${persen(kpi.margin)}`,
      to: "/app/costings",
      icon: ArrowUpRight,
      tone: "success" as const,
    },
    {
      label: "Piutang",
      nilai: rupiah(kpi.piutang),
      sub: `Kas masuk ${rupiah(kpi.kasMasuk)}`,
      to: "/app/finance/receivables",
      icon: Wallet,
      tone: "info" as const,
    },
    {
      label: "Produksi berjalan",
      nilai: angka(kpi.produksi.length),
      sub: `${angka((batches.data ?? []).length)} total batch`,
      to: "/app/production",
      icon: Factory,
      tone: "primary" as const,
    },
    {
      label: "Invoice overdue",
      nilai: angka(kpi.overdue.length),
      sub: rupiah(kpi.nilaiOverdue),
      to: "/app/finance/invoices",
      icon: AlertTriangle,
      tone: "danger" as const,
    },
  ];

  const presets = [
    { label: "Semua", d: SEMUA },
    { label: "30 hari", d: mundur(30) },
    { label: "90 hari", d: mundur(90) },
    { label: "6 bulan", d: mundur(180) },
  ];

  return (
    <>
      <div className="mb-5 flex items-center gap-4 overflow-hidden rounded-3xl border border-border/70 bg-card px-5 py-4">
        <Mascot float className="w-16 shrink-0 sm:w-20 lg:w-24" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Maklon Control Center</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Asisten maklon Anda memantau {scope.toLowerCase()} — HPP, produksi, hingga penagihan.
          </p>
        </div>
      </div>
      <PageHeader
        title={sapaan()}
        description={`Ringkasan KPI ${scope} · ${dari === SEMUA ? "seluruh periode" : `${tanggalPendek(dari)} – ${tanggalPendek(sampai)}`}`}
        actions={
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-border/70 bg-card p-1.5">
            {presets.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={dari === p.d ? "default" : "ghost"}
                className="h-8 rounded-xl px-3 text-xs"
                onClick={() => setRentang(p.d, isoDate(new Date()))}
              >
                {p.label}
              </Button>
            ))}
            <input
              type="date"
              value={dari}
              max={sampai}
              onChange={(e) => setRentang(e.target.value, sampai)}
              aria-label="Tanggal mulai"
              className="h-8 rounded-xl border border-border/70 bg-background px-2 text-xs"
            />
            <input
              type="date"
              value={sampai}
              min={dari}
              onChange={(e) => setRentang(dari, e.target.value)}
              aria-label="Tanggal akhir"
              className="h-8 rounded-xl border border-border/70 bg-background px-2 text-xs"
            />
          </div>
        }
      />

      {memuat ? (
        <LoadingSkeleton rows={6} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {kartu.map((k) => (
              <Link key={k.label} to={k.to} className="block">
                <FloatingCard className="h-full overflow-hidden p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        k.tone === "primary" && "bg-primary/12 text-primary",
                        k.tone === "success" && "bg-success/15 text-success",
                        k.tone === "info" && "bg-info/15 text-info",
                        k.tone === "danger" && "bg-destructive/12 text-destructive",
                      )}
                    >
                      <k.icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <p className="num mt-3 truncate text-xl font-bold tracking-tight sm:text-2xl">
                    {k.nilai}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
                </FloatingCard>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kartuEkstra.map((k) => (
              <Link key={k.label} to={k.to} className="block">
                <FloatingCard className="h-full overflow-hidden p-5">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-xl",
                        k.tone === "primary" && "bg-primary/12 text-primary",
                        k.tone === "success" && "bg-success/15 text-success",
                        k.tone === "info" && "bg-info/15 text-info",
                        k.tone === "danger" && "bg-destructive/12 text-destructive",
                      )}
                    >
                      <k.icon className="size-4" aria-hidden />
                    </span>
                  </div>
                  <p className="num mt-3 truncate text-xl font-bold tracking-tight sm:text-2xl">
                    {k.nilai}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
                </FloatingCard>
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Produk terbanyak per klien</h2>
              <p className="text-xs text-muted-foreground">Enam klien dengan produk terbanyak</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ekstra.produkTeratas}
                    layout="vertical"
                    margin={{ left: 8, right: 12 }}
                  >
                    <defs>
                      <linearGradient id="gKlien" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" horizontal={false} opacity={0.2} />
                    <XAxis
                      type="number"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="nama"
                      width={110}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => (v.length > 16 ? `${v.slice(0, 15)}…` : v)}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar
                      dataKey="jumlah"
                      name="Produk"
                      fill="url(#gKlien)"
                      radius={[8, 999, 999, 8]}
                      barSize={16}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Komposisi status produk</h2>
              <p className="text-xs text-muted-foreground">Sebaran katalog produk</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ekstra.komposisiProduk}
                      dataKey="jumlah"
                      nameKey="nama"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={3}
                      stroke="none"
                      isAnimationActive={false}
                    >
                      {ekstra.komposisiProduk.map((_, i) => (
                        <Cell key={i} fill={WARNA_PIE[i % WARNA_PIE.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {ekstra.komposisiProduk.map((k, i) => (
                  <li key={k.nama} className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: WARNA_PIE[i % WARNA_PIE.length] }}
                      aria-hidden
                    />
                    {k.nama} · {angka(k.jumlah)}
                  </li>
                ))}
              </ul>
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Fee makelar teratas</h2>
              <p className="text-xs text-muted-foreground">Total fee per makelar</p>
              <div className="mt-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ekstra.feeTeratas} margin={{ left: 4, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gFee" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.3} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" vertical={false} opacity={0.2} />
                    <XAxis dataKey="nama" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis
                      width={52}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${angka(v / 1_000_000, 1)}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      formatter={(v: number) => rupiah(v)}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar
                      dataKey="nilai"
                      name="Fee"
                      fill="url(#gFee)"
                      radius={[999, 999, 8, 8]}
                      barSize={22}
                      isAnimationActive={false}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
            <section className="surface p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold">Omzet vs kas masuk</h2>
                  <p className="text-xs text-muted-foreground">Per bulan pada rentang terpilih</p>
                </div>
                <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold text-primary">
                  {rupiah(kpi.omzet)}
                </span>
              </div>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seri} margin={{ left: 4, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gOmzet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gKas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" vertical={false} opacity={0.25} />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      width={58}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${angka(v / 1_000_000, 1)}jt`}
                    />
                    <Tooltip
                      formatter={(v: number) => rupiah(v)}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="omzet"
                      name="Omzet"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      fill="url(#gOmzet)"
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="kas"
                      name="Kas masuk"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      fill="url(#gKas)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Distribusi omzet bulanan</h2>
              <p className="text-xs text-muted-foreground">Bulan tertinggi disorot</p>
              <div className="mt-4 h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seri} margin={{ left: 4, right: 8, top: 8 }}>
                    <defs>
                      <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      </linearGradient>
                      <linearGradient id="gBarSoft" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 6" vertical={false} opacity={0.25} />
                    <XAxis dataKey="label" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      width={58}
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `${angka(v / 1_000_000, 1)}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "transparent" }}
                      formatter={(v: number) => rupiah(v)}
                      contentStyle={{
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--card)",
                      }}
                    />
                    <Bar
                      dataKey="omzet"
                      name="Omzet"
                      radius={[999, 999, 8, 8]}
                      barSize={26}
                      isAnimationActive={false}
                    >
                      {seri.map((r) => (
                        <Cell
                          key={r.label}
                          fill={r.omzet === puncak && puncak > 0 ? "url(#gBar)" : "url(#gBarSoft)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Pesanan terbaru</h2>
              <ul className="mt-3 space-y-2">
                {kpi.orderPeriode.slice(0, 6).map((o) => (
                  <li
                    key={String(o["id"])}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{String(o["order_number"])}</p>
                      <p className="text-xs text-muted-foreground">
                        {tanggalPendek(String(o["order_date"]))} ·{" "}
                        {rupiah(Number(o["grand_total"]))}
                      </p>
                    </div>
                    <StatusBadge status={String(o["status"])} />
                  </li>
                ))}
                {kpi.orderPeriode.length === 0 ? (
                  <li className="text-sm text-muted-foreground">
                    Belum ada pesanan pada rentang ini.
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="surface p-5">
              <h2 className="text-sm font-semibold">Batch produksi aktif</h2>
              <ul className="mt-3 space-y-2">
                {kpi.produksi.slice(0, 4).map((b) => (
                  <li key={String(b["id"])} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-medium">{String(b["batch_number"])}</p>
                      <span className="num text-xs text-muted-foreground">
                        {Number(b["progress_percentage"])}%
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {labelStatus(String(b["status"]))}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary"
                        style={{ width: `${Number(b["progress_percentage"] ?? 0)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {kpi.produksi.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Belum ada produksi berjalan.</li>
                ) : null}
              </ul>

              <h2 className="mt-5 text-sm font-semibold">Invoice jatuh tempo</h2>
              <ul className="mt-3 space-y-2">
                {kpi.overdue.slice(0, 4).map((i) => (
                  <li
                    key={String(i["id"])}
                    className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{String(i["invoice_number"])}</p>
                      <p className="text-xs text-muted-foreground">
                        Jatuh tempo {tanggalPendek(String(i["due_date"]))}
                      </p>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold text-destructive">
                      {rupiah(Number(i["remaining_amount"]))}
                    </span>
                  </li>
                ))}
                {kpi.overdue.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Tidak ada invoice terlambat.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}
