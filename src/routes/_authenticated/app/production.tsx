import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Factory, MoreHorizontal, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { RecordFormDialog, type FormValues } from "@/components/common/record-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/lib/company-context";
import { db, nomorDokumen, useAction, useRows, type DbRow } from "@/lib/db";
import { PRODUCTION_STAGE_TEMPLATES } from "@/lib/constants";
import { angka, labelStatus, tanggalPendek } from "@/lib/format";

const BATCH_STATUSES = [
  "direncanakan",
  "dijadwalkan",
  "berlangsung",
  "quality_control",
  "selesai",
  "ditunda",
  "dibatalkan",
];

const STAGE_STATUSES = ["belum", "berlangsung", "selesai", "ditunda"];

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/production")({
  component: ProductionPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Produksi — Maklon Control Center" },
      {
        name: "description",
        content: "Kelola batch produksi maklon, tahapan pengerjaan, progres, dan quality control.",
      },
      { property: "og:title", content: "Produksi — Maklon Control Center" },
      { property: "og:description", content: "Batch produksi, tahapan, dan QC." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProductionPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { q, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [form, setForm] = useState(false);
  const [detail, setDetail] = useState<DbRow | null>(null);
  const [qcOpen, setQcOpen] = useState<DbRow | null>(null);

  const batches = useRows<DbRow>("production_batches", { scopeId });
  const orders = useRows<DbRow>("orders", { scopeId, orderBy: "order_date" });
  const products = useRows<DbRow>("products", { scopeId, orderBy: "name", asc: true });
  const stages = useRows<DbRow>("production_stages", {
    scopeId,
    orderBy: "sort_order",
    asc: true,
    eq: detail ? { batch_id: String(detail["id"]) } : {},
    enabled: detail !== null,
  });
  const checks = useRows<DbRow>("quality_checks", {
    scopeId,
    eq: detail ? { batch_id: String(detail["id"]) } : {},
    enabled: detail !== null,
  });

  const namaProduk = (id: unknown) => {
    const p = (products.data ?? []).find((x) => String(x["id"]) === String(id));
    return p ? String(p["name"]) : "-";
  };
  const nomorPesanan = (id: unknown) => {
    const o = (orders.data ?? []).find((x) => String(x["id"]) === String(id));
    return o ? String(o["order_number"]) : "-";
  };

  const simpanBatch = useAction(
    async (values: FormValues) => {
      const orderId = String(values["order_id"] ?? "");
      const order = (orders.data ?? []).find((o) => String(o["id"]) === orderId);
      const companyId = order ? String(order["company_id"]) : (scopeId ?? companies[0]?.id ?? "");
      if (!companyId) throw new Error("Perusahaan tidak diketahui");
      const nomor = await nomorDokumen(companyId, "batch");
      const { data, error } = await db("production_batches")
        .insert({
          company_id: companyId,
          batch_number: nomor,
          order_id: orderId || null,
          product_id: values["product_id"] || null,
          planned_quantity: Number(values["planned_quantity"] ?? 0),
          scheduled_start: values["scheduled_start"] || null,
          scheduled_end: values["scheduled_end"] || null,
          production_date: values["production_date"] || null,
          status: "direncanakan",
          pic: values["pic"] || null,
          notes: values["notes"] || null,
        })
        .select("id");
      if (error) throw new Error(error.message);
      const batchId = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
      const code = companyById(companyId)?.code ?? "SHJ";
      const template = PRODUCTION_STAGE_TEMPLATES[code] ?? PRODUCTION_STAGE_TEMPLATES["SHJ"] ?? [];
      const rows = template.map((nama, i) => ({
        company_id: companyId,
        batch_id: batchId,
        stage_name: nama,
        sort_order: i + 1,
        status: "belum",
        progress_percentage: 0,
      }));
      if (rows.length > 0) {
        const ins = await db("production_stages").insert(rows);
        if (ins.error) throw new Error(ins.error.message);
      }
    },
    { invalidate: ["production_batches", "production_stages"], success: "Batch produksi dibuat" },
  );

  const ubahStatusBatch = useAction(
    async ({ id, next }: { id: string; next: string }) => {
      const { error } = await db("production_batches").update({ status: next }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    { invalidate: ["production_batches"], success: "Status batch diperbarui" },
  );

  const ubahTahap = useAction(
    async ({ stage, next }: { stage: DbRow; next: string }) => {
      const progress = next === "selesai" ? 100 : next === "berlangsung" ? 50 : 0;
      const { error } = await db("production_stages")
        .update({
          status: next,
          progress_percentage: progress,
          started_at: next === "berlangsung" ? new Date().toISOString() : stage["started_at"],
          completed_at: next === "selesai" ? new Date().toISOString() : null,
        })
        .eq("id", String(stage["id"]));
      if (error) throw new Error(error.message);

      const batchId = String(stage["batch_id"]);
      const { data } = await db("production_stages").select("status").eq("batch_id", batchId);
      const list = (data ?? []) as DbRow[];
      const selesai = list.filter((s) => String(s["status"]) === "selesai").length;
      const persen = list.length > 0 ? Math.round((selesai / list.length) * 100) : 0;
      await db("production_batches")
        .update({ progress_percentage: persen })
        .eq("id", batchId);
    },
    { invalidate: ["production_stages", "production_batches"], success: "Tahapan diperbarui" },
  );

  const simpanQc = useAction(
    async (values: FormValues) => {
      const batch = qcOpen;
      if (!batch) throw new Error("Batch tidak ditemukan");
      const lolos = Number(values["passed_quantity"] ?? 0);
      const gagal = Number(values["failed_quantity"] ?? 0);
      const { error } = await db("quality_checks").insert({
        company_id: batch["company_id"],
        batch_id: batch["id"],
        inspection_date: values["inspection_date"] || new Date().toISOString().slice(0, 10),
        inspector: values["inspector"] || null,
        sample_size: Number(values["sample_size"] ?? 0),
        passed_quantity: lolos,
        failed_quantity: gagal,
        result: String(values["result"] ?? "lulus"),
        decision: values["decision"] || null,
        notes: values["notes"] || null,
      });
      if (error) throw new Error(error.message);
      const upd = await db("production_batches")
        .update({ passed_quantity: lolos, rejected_quantity: gagal })
        .eq("id", String(batch["id"]));
      if (upd.error) throw new Error(upd.error.message);
    },
    { invalidate: ["quality_checks", "production_batches"], success: "Hasil QC tersimpan" },
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (batches.data ?? []).filter((r) => {
      if (status !== "semua" && String(r["status"]) !== status) return false;
      if (!term) return true;
      return [r["batch_number"], namaProduk(r["product_id"]), r["pic"]]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batches.data, products.data, q, status]);

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "batch",
      header: "Batch",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["batch_number"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {namaProduk(r["product_id"])}
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
    { key: "pesanan", header: "Pesanan", render: (r) => nomorPesanan(r["order_id"]) },
    {
      key: "qty",
      header: "Rencana",
      render: (r) => `${angka(Number(r["planned_quantity"]))} unit`,
    },
    {
      key: "jadwal",
      header: "Jadwal",
      desktopOnly: true,
      render: (r) =>
        `${tanggalPendek(r["scheduled_start"] ? String(r["scheduled_start"]) : null)} – ${tanggalPendek(
          r["scheduled_end"] ? String(r["scheduled_end"]) : null,
        )}`,
    },
    {
      key: "progres",
      header: "Progres",
      render: (r) => (
        <div className="flex min-w-[110px] items-center gap-2">
          <Progress value={Number(r["progress_percentage"])} className="h-2" />
          <span className="text-xs text-muted-foreground">{Number(r["progress_percentage"])}%</span>
        </div>
      ),
    },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={String(r["status"])} /> },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader
        title="Produksi"
        description={`Batch produksi, tahapan, dan QC — ${scope}`}
        actions={
          <Button onClick={() => setForm(true)}>
            <Plus className="size-4" aria-hidden /> Buat Batch
          </Button>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari nomor batch, produk, atau PIC"
        searchLabel="Cari batch produksi"
        filters={[
          {
            key: "status",
            label: "Filter status",
            value: status,
            allLabel: "Semua status",
            options: BATCH_STATUSES.map((s) => ({ value: s, label: labelStatus(s) })),
            onChange: (v) => setSearch({ status: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(batches.data ?? []).length} batch`}
        onReset={() => setSearch({ q: "", status: "semua" })}
      />

      {batches.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : batches.isError ? (
        <ErrorState onRetry={() => void batches.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="Belum ada batch produksi"
          description="Buat batch untuk mulai memantau tahapan produksi dan QC."
          action={
            <Button onClick={() => setForm(true)}>
              <Plus className="size-4" aria-hidden /> Buat Batch
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows as (DbRow & { id: string })[]}
          columns={columns}
          onRowClick={(r) => setDetail(r)}
          actions={(r) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi batch">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                <DropdownMenuLabel>Ubah status</DropdownMenuLabel>
                {BATCH_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    className="rounded-xl"
                    onClick={() => ubahStatusBatch.mutate({ id: String(r["id"]), next: s })}
                  >
                    {labelStatus(s)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem className="rounded-xl" onClick={() => setQcOpen(r)}>
                  Catat hasil QC
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />
      )}

      <RecordFormDialog
        open={form}
        onOpenChange={setForm}
        title="Buat batch produksi"
        description="Tahapan produksi dibuat otomatis sesuai template perusahaan."
        saving={simpanBatch.isPending}
        fields={[
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
            name: "product_id",
            label: "Produk",
            type: "select",
            required: true,
            options: (products.data ?? []).map((p) => ({
              value: String(p["id"]),
              label: `${String(p["sku"])} — ${String(p["name"])}`,
            })),
          },
          { name: "planned_quantity", label: "Jumlah rencana", type: "number", required: true },
          { name: "production_date", label: "Tanggal produksi", type: "date" },
          { name: "scheduled_start", label: "Mulai dijadwalkan", type: "date" },
          { name: "scheduled_end", label: "Selesai dijadwalkan", type: "date" },
          { name: "pic", label: "PIC" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) =>
          simpanBatch.mutate(values, { onSuccess: () => setForm(false) })
        }
      />

      <RecordFormDialog
        open={qcOpen !== null}
        onOpenChange={(v) => !v && setQcOpen(null)}
        title="Catat hasil QC"
        description={qcOpen ? String(qcOpen["batch_number"]) : ""}
        saving={simpanQc.isPending}
        fields={[
          { name: "inspection_date", label: "Tanggal inspeksi", type: "date", required: true },
          { name: "inspector", label: "Inspektor" },
          { name: "sample_size", label: "Jumlah sampel", type: "number" },
          { name: "passed_quantity", label: "Lolos", type: "number" },
          { name: "failed_quantity", label: "Gagal", type: "number" },
          {
            name: "result",
            label: "Hasil",
            type: "select",
            required: true,
            options: ["lulus", "lulus_bersyarat", "gagal"].map((v) => ({
              value: v,
              label: labelStatus(v),
            })),
          },
          { name: "decision", label: "Keputusan" },
          { name: "notes", label: "Catatan", type: "textarea" },
        ]}
        onSubmit={(values) => simpanQc.mutate(values, { onSuccess: () => setQcOpen(null) })}
      />

      <Dialog open={detail !== null} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-2xl p-0">
          <DialogHeader className="border-b border-border/70 p-5">
            <DialogTitle>{detail ? String(detail["batch_number"]) : "Detail batch"}</DialogTitle>
            <DialogDescription>
              {detail ? `${namaProduk(detail["product_id"])} — progres ${Number(detail["progress_percentage"])}%` : ""}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] p-5">
            <h3 className="text-sm font-semibold">Tahapan produksi</h3>
            <ol className="mt-2 space-y-2">
              {(stages.data ?? []).map((s) => (
                <li
                  key={String(s["id"])}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {Number(s["sort_order"])}. {String(s["stage_name"])}
                    </p>
                    <StatusBadge status={String(s["status"])} />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        Ubah
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-2xl">
                      {STAGE_STATUSES.map((st) => (
                        <DropdownMenuItem
                          key={st}
                          className="rounded-xl"
                          onClick={() => ubahTahap.mutate({ stage: s, next: st })}
                        >
                          {labelStatus(st)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
              {(stages.data ?? []).length === 0 ? (
                <li className="text-sm text-muted-foreground">Belum ada tahapan.</li>
              ) : null}
            </ol>

            <h3 className="mt-6 text-sm font-semibold">Hasil QC</h3>
            <div className="mt-2 space-y-2">
              {(checks.data ?? []).map((c) => (
                <div key={String(c["id"])} className="rounded-xl border border-border/60 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>{tanggalPendek(String(c["inspection_date"]))}</span>
                    <StatusBadge status={String(c["result"])} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Lolos {angka(Number(c["passed_quantity"]))} · Gagal {angka(Number(c["failed_quantity"]))}
                  </p>
                </div>
              ))}
              {(checks.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada catatan QC.</p>
              ) : null}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
