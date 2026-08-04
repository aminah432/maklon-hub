import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { FilterBar } from "@/components/common/filter-bar";
import { BrandFormDialog } from "@/features/brands/brand-form";
import {
  BRAND_STATUSES,
  useArchiveBrand,
  useBrands,
  type Brand,
} from "@/features/brands/use-brands";
import { useClientOptions } from "@/features/products/use-products";
import { Button } from "@/components/ui/button";
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
import { labelStatus } from "@/lib/format";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(z.string(), "semua").default("semua"),
  klien: fallback(z.string(), "semua").default("semua"),
  arsip: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/_authenticated/app/brands")({
  component: BrandsPage,
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Brand Klien — Maklon Control Center" },
      {
        name: "description",
        content:
          "Kelola brand milik klien maklon: pencarian cepat, filter status dan klien, tambah, ubah, serta arsipkan brand.",
      },
      { property: "og:title", content: "Brand Klien — Maklon Control Center" },
      {
        property: "og:description",
        content: "Daftar brand klien lintas perusahaan dengan pencarian dan filter.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function BrandsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const { q, status, klien, arsip } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  type BrandSearch = z.infer<typeof searchSchema>;
  const setSearch = (patch: Partial<BrandSearch>) =>
    void navigate({
      search: (prev: BrandSearch) => ({ ...prev, ...patch }),
      replace: true,
    });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [target, setTarget] = useState<Brand | null>(null);

  const { data = [], isLoading, isError, refetch } = useBrands(scopeId, arsip);
  const { data: clients = [] } = useClientOptions(scopeId);
  const archive = useArchiveBrand();

  const namaKlien = (id: string) => clients.find((c) => c.id === id)?.name ?? "-";

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return data.filter((b) => {
      if (status !== "semua" && b.status !== status) return false;
      if (klien !== "semua" && b.client_id !== klien) return false;
      if (!term) return true;
      return [b.brand_code, b.name, b.main_category, b.target_market, b.description]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [data, q, status, klien]);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");
  const adaFilter = q.trim() !== "" || status !== "semua" || klien !== "semua";

  return (
    <>
      <PageHeader
        title="Brand Klien"
        description={`Daftar brand — ${scope}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setSearch({ arsip: !arsip })}>
              {arsip ? "Lihat brand aktif" : "Lihat arsip"}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden /> Tambah Brand
            </Button>
          </>
        }
      />

      <FilterBar
        search={q}
        onSearchChange={(v) => setSearch({ q: v })}
        placeholder="Cari kode brand, nama, kategori, atau target pasar"
        searchLabel="Cari brand"
        filters={[
          {
            key: "status",
            label: "Filter status brand",
            value: status,
            allLabel: "Semua status",
            options: BRAND_STATUSES.map((s) => ({ value: s, label: labelStatus(s) })),
            onChange: (v) => setSearch({ status: v }),
          },
          {
            key: "klien",
            label: "Filter klien",
            value: klien,
            allLabel: "Semua klien",
            options: clients.map((c) => ({ value: c.id, label: c.name })),
            onChange: (v) => setSearch({ klien: v }),
          },
        ]}
        resultLabel={`${rows.length} dari ${data.length} brand`}
        onReset={() => setSearch({ q: "", status: "semua", klien: "semua" })}
      />

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title={arsip ? "Belum ada brand diarsipkan" : "Belum ada brand"}
          description={
            adaFilter
              ? "Tidak ada brand yang cocok dengan filter. Coba ubah kata kunci, status, atau klien."
              : arsip
                ? "Brand yang diarsipkan akan muncul di sini."
                : "Tambahkan brand pertama milik klien maklon Anda."
          }
          action={
            adaFilter ? (
              <Button
                variant="outline"
                onClick={() => setSearch({ q: "", status: "semua", klien: "semua" })}
              >
                Reset filter
              </Button>
            ) : arsip ? (
              <Button variant="outline" onClick={() => setSearch({ arsip: false })}>
                Kembali ke brand aktif
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden /> Tambah Brand
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-border/70 bg-card lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const perusahaan = companyById(b.company_id);
                  return (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.brand_code}</TableCell>
                      <TableCell>
                        <span className="block font-medium">{b.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {b.target_market ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <CompanyBadge
                          code={perusahaan?.code ?? null}
                          name={perusahaan?.name ?? null}
                        />
                      </TableCell>
                      <TableCell>{namaKlien(b.client_id)}</TableCell>
                      <TableCell>{b.main_category ?? "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={b.archived_at ? "diarsipkan" : b.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          brand={b}
                          onEdit={() => {
                            setEditing(b);
                            setFormOpen(true);
                          }}
                          onArchive={() => setTarget(b)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {rows.map((b) => {
              const perusahaan = companyById(b.company_id);
              return (
                <article
                  key={b.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{b.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{b.brand_code}</p>
                    </div>
                    <StatusBadge status={b.archived_at ? "diarsipkan" : b.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
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
                      <dt className="text-xs text-muted-foreground">Klien</dt>
                      <dd className="truncate">{namaKlien(b.client_id)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Kategori</dt>
                      <dd>{b.main_category ?? "-"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Target pasar</dt>
                      <dd className="truncate">{b.target_market ?? "-"}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end gap-2">
                    <RowActions
                      brand={b}
                      onEdit={() => {
                        setEditing(b);
                        setFormOpen(true);
                      }}
                      onArchive={() => setTarget(b)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <BrandFormDialog open={formOpen} onOpenChange={setFormOpen} brand={editing} />

      <AlertDialog open={Boolean(target)} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.archived_at ? "Pulihkan brand ini?" : "Arsipkan brand ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.archived_at
                ? `${target?.name} akan kembali muncul di daftar brand aktif.`
                : `${target?.name} akan disembunyikan dari daftar aktif. Produk dan riwayat tetap tersimpan.`}
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
  brand,
  onEdit,
  onArchive,
}: {
  brand: Brand;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Ubah brand">
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onArchive}
        aria-label={brand.archived_at ? "Pulihkan brand" : "Arsipkan brand"}
      >
        {brand.archived_at ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Archive className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
