import { useMemo, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/app-shell";
import { DataTable, type Column } from "@/components/common/data-table";
import { FilterBar } from "@/components/common/filter-bar";
import { ExportMenu } from "@/components/common/export-menu";
import type { ExportDoc } from "@/lib/export";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCompany } from "@/lib/company-context";
import { db, useAction, useRows, type DbRow } from "@/lib/db";
import { DOCUMENT_TYPES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";
import { tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  tipe: fallback(z.string(), "semua").default("semua"),
});

export const Route = createFileRoute("/_authenticated/app/documents")({
  component: DocumentsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Dokumen — Maklon Control Center" },
      {
        name: "description",
        content:
          "Pusat berkas maklon: legalitas, formula, desain kemasan, dan bukti pembayaran tersimpan aman.",
      },
      { property: "og:title", content: "Dokumen — Maklon Control Center" },
      { property: "og:description", content: "Pusat berkas dan legalitas maklon." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ukuran(bytes: number): string {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentsPage() {
  const { scopeId, companyById, active, activeId, companies } = useCompany();
  const { q, tipe } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type S = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<S>) =>
    void navigate({ search: (prev: S) => ({ ...prev, ...patch }), replace: true });

  const [open, setOpen] = useState(false);
  const [jenis, setJenis] = useState(DOCUMENT_TYPES[0] ?? "Dokumen lainnya");
  const [klien, setKlien] = useState("");
  const [companyPilih, setCompanyPilih] = useState(scopeId ?? companies[0]?.id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const documents = useRows<DbRow>("documents", { scopeId, archived: false });
  const clients = useRows<DbRow>("clients", { scopeId, orderBy: "owner_name", asc: true });

  const namaKlien = (id: unknown) => {
    const c = (clients.data ?? []).find((x) => String(x["id"]) === String(id));
    return c ? String(c["business_name"] ?? c["owner_name"]) : "-";
  };

  const unggah = useAction(
    async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Pilih berkas terlebih dahulu");
      const companyId = scopeId ?? companyPilih;
      if (!companyId) throw new Error("Pilih perusahaan");
      const path = `${companyId}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const up = await supabase.storage.from("dokumen").upload(path, file, { upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { error } = await db("documents").insert({
        company_id: companyId,
        client_id: klien || null,
        document_type: jenis,
        file_name: file.name,
        storage_path: path,
        mime_type: file.type || null,
        file_size: file.size,
      });
      if (error) throw new Error(error.message);
    },
    { invalidate: ["documents"], success: "Dokumen terunggah" },
  );

  const buka = async (row: DbRow) => {
    const { data, error } = await supabase.storage
      .from("dokumen")
      .createSignedUrl(String(row["storage_path"]), 60);
    if (error || !data) {
      toast.error("Gagal membuka berkas");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const hapus = useAction(
    async (row: DbRow) => {
      await supabase.storage.from("dokumen").remove([String(row["storage_path"])]);
      const { error } = await db("documents")
        .update({ archived_at: new Date().toISOString() })
        .eq("id", String(row["id"]));
      if (error) throw new Error(error.message);
    },
    { invalidate: ["documents"], success: "Dokumen dihapus" },
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (documents.data ?? []).filter((r) => {
      if (tipe !== "semua" && String(r["document_type"]) !== tipe) return false;
      if (!term) return true;
      return [r["file_name"], r["document_type"], namaKlien(r["client_id"])]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(term));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents.data, clients.data, q, tipe]);

  const uploadClients = (clients.data ?? []).filter(
    (client) => String(client["company_id"]) === (scopeId ?? companyPilih),
  );

  const columns: Column<DbRow & { id: string }>[] = [
    {
      key: "berkas",
      header: "Berkas",
      primary: true,
      render: (r) => (
        <div className="min-w-0">
          <span className="block truncate font-medium">{String(r["file_name"])}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {String(r["document_type"])}
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
    { key: "klien", header: "Klien", render: (r) => namaKlien(r["client_id"]) },
    { key: "ukuran", header: "Ukuran", render: (r) => ukuran(Number(r["file_size"] ?? 0)) },
    {
      key: "diunggah",
      header: "Diunggah",
      render: (r) => tanggalPendek(String(r["created_at"])),
    },
  ];

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const dokumenEkspor = (): ExportDoc<DbRow> => ({
    title: "Daftar Dokumen",
    subtitle: scope,
    meta: [
      { label: "Total baris", value: String(rows.length) },
      { label: "Pencarian", value: q.trim() || "-" },
      { label: "Jenis", value: tipe === "semua" ? "Semua" : tipe },
    ],
    columns: [
      { header: "Berkas", value: (r) => String(r["file_name"] ?? "-") },
      { header: "Jenis", value: (r) => String(r["document_type"] ?? "-") },
      { header: "Klien", value: (r) => namaKlien(r["client_id"]) },
      { header: "Perusahaan", value: (r) => companyById(String(r["company_id"]))?.code ?? "-" },
      { header: "Ukuran", value: (r) => ukuran(Number(r["file_size"] ?? 0)), align: "right" },
      { header: "Diunggah", value: (r) => tanggalPendek(String(r["created_at"])) },
    ],
    rows,
  });

  return (
    <>
      <PageHeader
        title="Dokumen"
        description={`Pusat berkas dan legalitas — ${scope}`}
        actions={
          <>
            <ExportMenu doc={dokumenEkspor} />
            <Button onClick={() => setOpen(true)}>
              <Upload className="size-4" aria-hidden /> Unggah Dokumen
            </Button>
          </>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari nama berkas, jenis, atau klien"
        searchLabel="Cari dokumen"
        filters={[
          {
            key: "tipe",
            label: "Filter jenis dokumen",
            value: tipe,
            allLabel: "Semua jenis",
            options: DOCUMENT_TYPES.map((v) => ({ value: v, label: v })),
            onChange: (v) => setSearch({ tipe: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${(documents.data ?? []).length} dokumen`}
        onReset={() => setSearch({ q: "", tipe: "semua" })}
      />

      {documents.isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : documents.isError ? (
        <ErrorState onRetry={() => void documents.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Belum ada dokumen"
          description="Unggah legalitas klien, formula, desain kemasan, atau bukti pembayaran."
          action={
            <Button onClick={() => setOpen(true)}>
              <Upload className="size-4" aria-hidden /> Unggah Dokumen
            </Button>
          }
        />
      ) : (
        <DataTable
          rows={rows as (DbRow & { id: string })[]}
          columns={columns}
          actions={(r) => (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => void buka(r)}>
                Lihat
              </Button>
              <Button variant="ghost" size="sm" onClick={() => hapus.mutate(r)}>
                Hapus
              </Button>
            </div>
          )}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Unggah dokumen</DialogTitle>
            <DialogDescription>
              Berkas tersimpan privat dan diakses lewat tautan aman.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!scopeId ? (
              <div className="space-y-1.5">
                <Label htmlFor="doc-company">Perusahaan</Label>
                <Select
                  value={companyPilih}
                  onValueChange={(value) => {
                    setCompanyPilih(value);
                    setKlien("");
                  }}
                >
                  <SelectTrigger id="doc-company" aria-label="Pilih perusahaan">
                    <SelectValue placeholder="Pilih perusahaan" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="doc-jenis">Jenis dokumen</Label>
              <Select value={jenis} onValueChange={setJenis}>
                <SelectTrigger id="doc-jenis" aria-label="Pilih jenis dokumen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-klien">Klien (opsional)</Label>
              <Select value={klien} onValueChange={setKlien}>
                <SelectTrigger id="doc-klien" aria-label="Pilih klien">
                  <SelectValue placeholder="Tanpa klien" />
                </SelectTrigger>
                <SelectContent>
                  {uploadClients.map((c) => (
                    <SelectItem key={String(c["id"])} value={String(c["id"])}>
                      {String(c["owner_name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-file">Berkas</Label>
              <Input id="doc-file" type="file" ref={fileRef} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={unggah.isPending}
              onClick={() => unggah.mutate(undefined as never, { onSuccess: () => setOpen(false) })}
            >
              {unggah.isPending ? "Mengunggah…" : "Unggah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
