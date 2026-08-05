import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";

import { ArchiveRestore, Archive, Pencil, Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { ClientFormDialog } from "@/features/clients/client-form";
import { useArchiveClient, useClients, type Client } from "@/features/clients/use-clients";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/common/filter-bar";
import { ExportMenu } from "@/components/common/export-menu";
import { labelStatus } from "@/lib/format";
import type { ExportDoc } from "@/lib/export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompany } from "@/lib/company-context";
import { tanggalPendek } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
  kota: fallback(z.string(), "semua").default("semua"),
  sumber: fallback(z.string(), "semua").default("semua"),
  arsip: fallback(z.boolean(), false).default(false),
});

type ClientSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: ClientsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Klien Maklon — Maklon Control Center" },
      {
        name: "description",
        content:
          "Kelola data klien maklon: cari cepat, filter status, kota, dan sumber, lalu tambah, ubah, atau arsipkan klien.",
      },
      { property: "og:title", content: "Klien Maklon — Maklon Control Center" },
      {
        property: "og:description",
        content: "Pusat data klien maklon lintas perusahaan dengan pencarian, filter, dan arsip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ClientsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, status, kota, sumber, arsip } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const setSearch = (patch: Partial<ClientSearch>) =>
    void navigate({
      search: (prev: ClientSearch) => ({ ...prev, ...patch }),
      replace: true,
    });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [target, setTarget] = useState<Client | null>(null);

  const { data = [], isLoading, isError, refetch } = useClients(scopeId, arsip);
  const archive = useArchiveClient();

  const kotaOptions = useMemo(
    () =>
      Array.from(new Set(data.map((c) => c.city).filter((v): v is string => Boolean(v)))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [data],
  );
  const sumberOptions = useMemo(
    () =>
      Array.from(new Set(data.map((c) => c.source).filter((v): v is string => Boolean(v)))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [data],
  );

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((c) => {
      if (status !== "semua" && c.status !== status) return false;
      if (kota !== "semua" && c.city !== kota) return false;
      if (sumber !== "semua" && c.source !== sumber) return false;
      if (!term) return true;
      return [c.client_code, c.owner_name, c.business_name, c.city, c.phone, c.email, c.npwp, c.nib]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, q, status, kota, sumber]);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  const dokumenEkspor = (): ExportDoc<Client> => ({
    title: arsip ? "Arsip Klien Maklon" : "Daftar Klien Maklon",
    subtitle: scope,
    meta: [
      { label: "Total baris", value: String(rows.length) },
      { label: "Pencarian", value: q.trim() || "-" },
      { label: "Status", value: status === "semua" ? "Semua" : labelStatus(status) },
      { label: "Kota", value: kota === "semua" ? "Semua" : kota },
    ],
    columns: [
      { header: "Kode", value: (c) => c.client_code ?? "-" },
      { header: "Pemilik", value: (c) => c.owner_name ?? "-" },
      { header: "Nama Usaha", value: (c) => c.business_name ?? "-" },
      { header: "Kota", value: (c) => c.city ?? "-" },
      { header: "Telepon", value: (c) => c.phone ?? "-" },
      { header: "Email", value: (c) => c.email ?? "-" },
      { header: "Sumber", value: (c) => labelStatus(c.source) },
      { header: "Perusahaan", value: (c) => companyById(c.company_id)?.code ?? "-" },
      { header: "Status", value: (c) => labelStatus(c.status) },
    ],
    rows,
  });
  const adaFilter = q.trim() !== "" || status !== "semua" || kota !== "semua" || sumber !== "semua";
  const resetFilter = () => setSearch({ q: "", status: "semua", kota: "semua", sumber: "semua" });

  return (
    <>
      <PageHeader
        title="Klien Maklon"
        description={`Data klien — ${scope}`}
        actions={
          <>
            <ExportMenu doc={dokumenEkspor} />
            <Button variant="outline" onClick={() => setSearch({ arsip: !arsip })}>
              {arsip ? "Lihat klien aktif" : "Lihat arsip"}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden /> Tambah Klien
            </Button>
          </>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari kode, nama pemilik, usaha, kota, telepon, atau email"
        searchLabel="Cari klien"
        filters={[
          {
            key: "status",
            label: "Filter status klien",
            value: status,
            allLabel: "Semua status",
            options: [
              { value: "prospek", label: "Prospek" },
              { value: "aktif", label: "Aktif" },
              { value: "nonaktif", label: "Nonaktif" },
            ],
            onChange: (v) => setSearch({ status: v }),
          },
          {
            key: "kota",
            label: "Filter kota",
            value: kota,
            allLabel: "Semua kota",
            options: kotaOptions.map((c) => ({ value: c, label: c })),
            onChange: (v) => setSearch({ kota: v }),
          },
          {
            key: "sumber",
            label: "Filter sumber klien",
            value: sumber,
            allLabel: "Semua sumber",
            options: sumberOptions.map((s) => ({ value: s, label: s })),
            onChange: (v) => setSearch({ sumber: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${data.length} klien`}
        onReset={resetFilter}
      />

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={arsip ? "Belum ada klien diarsipkan" : "Belum ada klien"}
          description={
            adaFilter
              ? "Tidak ada klien yang cocok dengan filter. Coba ubah kata kunci, status, kota, atau sumber."
              : arsip
                ? "Klien yang diarsipkan akan muncul di sini."
                : "Tambahkan klien maklon pertama untuk mulai membuat brand, produk, dan penawaran."
          }
          action={
            adaFilter ? (
              <Button variant="outline" onClick={resetFilter}>
                Reset filter
              </Button>
            ) : arsip ? (
              <Button variant="outline" onClick={() => setSearch({ arsip: false })}>
                Kembali ke klien aktif
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden /> Tambah Klien
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Tabel untuk layar lebar */}
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Pemilik / Usaha</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kontak</TableHead>
                  <TableHead>Kota</TableHead>
                  <TableHead>Bergabung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const perusahaan = companyById(c.company_id);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.client_code}</TableCell>
                      <TableCell>
                        <span className="block font-medium">{c.owner_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.business_name ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <CompanyBadge
                          code={perusahaan?.code ?? null}
                          name={perusahaan?.name ?? null}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="block">{c.phone ?? "-"}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.email ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>{c.city ?? "-"}</TableCell>
                      <TableCell>{tanggalPendek(c.joined_at)}</TableCell>
                      <TableCell>
                        <StatusBadge status={c.archived_at ? "diarsipkan" : c.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          client={c}
                          onEdit={() => {
                            setEditing(c);
                            setFormOpen(true);
                          }}
                          onArchive={() => setTarget(c)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Kartu untuk layar kecil */}
          <div className="grid gap-3 lg:hidden">
            {rows.map((c) => {
              const perusahaan = companyById(c.company_id);
              return (
                <article
                  key={c.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{c.owner_name}</p>
                      <p className="truncate text-sm text-muted-foreground">
                        {c.business_name ?? "-"}
                      </p>
                    </div>
                    <StatusBadge status={c.archived_at ? "diarsipkan" : c.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Kode</dt>
                      <dd>{c.client_code}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Perusahaan</dt>
                      <dd>
                        <CompanyBadge
                          code={perusahaan?.code ?? null}
                          name={perusahaan?.name ?? null}
                        />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Telepon</dt>
                      <dd>{c.phone ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Kota</dt>
                      <dd>{c.city ?? "-"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end gap-2">
                    <RowActions
                      client={c}
                      onEdit={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                      onArchive={() => setTarget(c)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ClientFormDialog open={formOpen} onOpenChange={setFormOpen} client={editing} />

      <AlertDialog open={Boolean(target)} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.archived_at ? "Pulihkan klien ini?" : "Arsipkan klien ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.archived_at
                ? `${target?.owner_name} akan kembali muncul di daftar klien aktif.`
                : `${target?.owner_name} akan disembunyikan dari daftar aktif. Data dan riwayatnya tetap tersimpan dan bisa dipulihkan kapan saja.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!target) return;
                archive.mutate({ id: target.id, archive: !target.archived_at });
                setTarget(null);
              }}
            >
              {target?.archived_at ? "Pulihkan" : "Arsipkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RowActions({
  client,
  onEdit,
  onArchive,
}: {
  client: Client;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Ubah klien">
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onArchive}
        aria-label={client.archived_at ? "Pulihkan klien" : "Arsipkan klien"}
      >
        {client.archived_at ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Archive className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
