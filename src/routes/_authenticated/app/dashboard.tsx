import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ArrowUpRight, Factory, TrendingUp, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { FloatingCard } from "@/components/common/floating-card";
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

  const setRentang = (d: string, s: string) =>
    navigate({ search: { dari: d, sampai: s } });

  const clients = useRows<DbRow>("clients", { scopeId, archived: false });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const items = useRows<DbRow>("order_items", { scopeId, orderBy: "created_at" });
  const batches = useRows<DbRow>("production_batches", { scopeId });
  const invoices = useRows<DbRow>("invoices", { scopeId, orderBy: "invoice_date" });
  const payments = useRows<DbRow>("payments", { scopeId, orderBy: "payment_date" });

  const memuat =
    clients.isLoading ||
    orders.isLoading ||
    batches.isLoading ||
    invoices.isLoading ||
    payments.isLoading;

  const dalam = (v: unknown) => {
    const t = String(v ?? "").slice(0, 10);
    return t >= dari && t <= sampai;
  };

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
  }, [orders.data, items.data, invoices.data, batches.data, payments.data, dari, sampai]);

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
    for (const o of kpi.orderPeriode) isi(String(o["order_date"]), "omzet", Number(o["grand_total"] ?? 0));
    for (const p of payments.data ?? []) {
      if (dalam(p["payment_date"])) isi(String(p["payment_date"]), "kas", Number(p["amount"] ?? 0));
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [kpi.orderPeriode, payments.data, dari, sampai]);

  const puncak = seri.reduce((m, r) => Math.max(m, r.omzet), 0);

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
      <PageHeader
        title={`${sapaan()} 👋`}
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
                  <p className="num mt-3 text-2xl font-bold tracking-tight">{k.nilai}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{k.sub}</p>
                </FloatingCard>
              </Link>
            ))}
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
                    />
                    <Area
                      type="monotone"
                      dataKey="kas"
                      name="Kas masuk"
                      stroke="var(--chart-3)"
                      strokeWidth={2}
                      fill="url(#gKas)"
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
                    <Bar dataKey="omzet" name="Omzet" radius={[999, 999, 8, 8]} barSize={26}>
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
                        {tanggalPendek(String(o["order_date"]))} · {rupiah(Number(o["grand_total"]))}
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
