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
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export const Route = createFileRoute("/_authenticated/app/clients")({
  component: ClientsPage,
  head: () => ({
    meta: [
      { title: "Klien Maklon — Maklon Control Center" },
      {
        name: "description",
        content:
          "Kelola data klien maklon: tambah, ubah, arsipkan, dan pantau status klien setiap perusahaan.",
      },
      { property: "og:title", content: "Klien Maklon — Maklon Control Center" },
      {
        property: "og:description",
        content: "Pusat data klien maklon lintas perusahaan dengan pencarian dan arsip.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ClientsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [target, setTarget] = useState<Client | null>(null);

  const { data = [], isLoading, isError, refetch } = useClients(scopeId, archived);
  const archive = useArchiveClient();

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((c) => {
      if (status !== "semua" && c.status !== status) return false;
      if (!q) return true;
      return [c.client_code, c.owner_name, c.business_name, c.city, c.phone, c.email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status]);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader
        title="Klien Maklon"
        description={`Data klien — ${scope}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setArchived((v) => !v)}>
              {archived ? "Lihat klien aktif" : "Lihat arsip"}
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

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari kode, nama pemilik, usaha, atau kota"
          aria-label="Cari klien"
          className="rounded-xl"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="rounded-xl" aria-label="Filter status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            <SelectItem value="prospek">Prospek</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={archived ? "Belum ada klien diarsipkan" : "Belum ada klien"}
          description={
            search || status !== "semua"
              ? "Tidak ada klien yang cocok dengan filter. Coba ubah kata kunci atau status."
              : archived
                ? "Klien yang diarsipkan akan muncul di sini."
                : "Tambahkan klien maklon pertama untuk mulai membuat brand, produk, dan penawaran."
          }
          action={
            archived ? (
              <Button variant="outline" onClick={() => setArchived(false)}>
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
                        <CompanyBadge code={perusahaan?.code ?? null} name={perusahaan?.name ?? null} />
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
                        <CompanyBadge code={perusahaan?.code ?? null} name={perusahaan?.name ?? null} />
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
