import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Package, Pencil, Plus, Tags } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/common/states";
import { CompanyBadge, StatusBadge } from "@/components/common/status-badge";
import { FilterBar } from "@/components/common/filter-bar";
import { ProductFormDialog } from "@/features/products/product-form";
import { CategoryManagerDialog } from "@/features/products/category-manager";
import {
  useArchiveProduct,
  useBrandOptions,
  useClientOptions,
  useProductCategories,
  useProducts,
  type Product,
} from "@/features/products/use-products";
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
import { PRODUCT_STATUSES } from "@/lib/constants";
import { labelStatus } from "@/lib/format";


export const Route = createFileRoute("/_authenticated/app/products")({
  component: ProductsPage,
  head: () => ({
    meta: [
      { title: "Produk Maklon — Maklon Control Center" },
      {
        name: "description",
        content:
          "Kelola produk maklon: spesifikasi dasar, kategori, MOQ, status produksi, dan pengarsipan produk.",
      },
      { property: "og:title", content: "Produk Maklon — Maklon Control Center" },
      {
        property: "og:description",
        content: "Katalog produk maklon lintas perusahaan lengkap dengan spesifikasi dan kategori.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ProductsPage() {
  const { scopeId, companyById, active, activeId } = useCompany();
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("semua");
  const [category, setCategory] = useState("semua");
  const [formOpen, setFormOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [target, setTarget] = useState<Product | null>(null);

  const { data = [], isLoading, isError, refetch } = useProducts(scopeId, archived);
  const { data: categories = [] } = useProductCategories(scopeId);
  const archive = useArchiveProduct();

  const namaKategori = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "-";

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.filter((p) => {
      if (status !== "semua" && p.status !== status) return false;
      if (category !== "semua" && p.category_id !== category) return false;
      if (!q) return true;
      return [p.sku, p.name, p.variant, p.subcategory, p.packaging_type]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [data, search, status, category]);

  const scope = activeId === "all" ? "Semua Perusahaan" : (active?.name ?? "-");

  return (
    <>
      <PageHeader
        title="Produk Maklon"
        description={`Katalog produk — ${scope}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setCategoryOpen(true)}>
              <Tags className="size-4" aria-hidden /> Kategori
            </Button>
            <Button variant="outline" onClick={() => setArchived((v) => !v)}>
              {archived ? "Lihat produk aktif" : "Lihat arsip"}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus className="size-4" aria-hidden /> Tambah Produk
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_200px]">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari SKU, nama produk, varian, atau kemasan"
          aria-label="Cari produk"
          className="rounded-xl"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="rounded-xl" aria-label="Filter status produk">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {PRODUCT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {labelStatus(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="rounded-xl" aria-label="Filter kategori">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Package}
          title={archived ? "Belum ada produk diarsipkan" : "Belum ada produk"}
          description={
            search || status !== "semua" || category !== "semua"
              ? "Tidak ada produk yang cocok dengan filter. Coba ubah kata kunci, status, atau kategori."
              : archived
                ? "Produk yang diarsipkan akan muncul di sini."
                : "Tambahkan produk maklon pertama lengkap dengan spesifikasi dasarnya."
          }
          action={
            archived ? (
              <Button variant="outline" onClick={() => setArchived(false)}>
                Kembali ke produk aktif
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                <Plus className="size-4" aria-hidden /> Tambah Produk
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
                  <TableHead>SKU</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Perusahaan</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Isi / Satuan</TableHead>
                  <TableHead className="text-right">MOQ</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => {
                  const perusahaan = companyById(p.company_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.sku}</TableCell>
                      <TableCell>
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.variant ?? p.subcategory ?? "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <CompanyBadge code={perusahaan?.code ?? null} name={perusahaan?.name ?? null} />
                      </TableCell>
                      <TableCell>{namaKategori(p.category_id)}</TableCell>
                      <TableCell>
                        {p.net_content ? `${p.net_content} ` : ""}
                        {p.unit}
                      </TableCell>
                      <TableCell className="num text-right">{p.moq}</TableCell>
                      <TableCell>
                        <StatusBadge status={p.archived_at ? "diarsipkan" : p.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <RowActions
                          product={p}
                          onEdit={() => {
                            setEditing(p);
                            setFormOpen(true);
                          }}
                          onArchive={() => setTarget(p)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {rows.map((p) => {
              const perusahaan = companyById(p.company_id);
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-muted-foreground">{p.sku}</p>
                    </div>
                    <StatusBadge status={p.archived_at ? "diarsipkan" : p.status} />
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Perusahaan</dt>
                      <dd>
                        <CompanyBadge code={perusahaan?.code ?? null} name={perusahaan?.name ?? null} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Kategori</dt>
                      <dd>{namaKategori(p.category_id)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Isi</dt>
                      <dd>
                        {p.net_content ? `${p.net_content} ` : ""}
                        {p.unit}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">MOQ</dt>
                      <dd className="num">{p.moq}</dd>
                    </div>
                  </dl>
                  <div className="mt-3 flex justify-end gap-2">
                    <RowActions
                      product={p}
                      onEdit={() => {
                        setEditing(p);
                        setFormOpen(true);
                      }}
                      onArchive={() => setTarget(p)}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      <CategoryManagerDialog open={categoryOpen} onOpenChange={setCategoryOpen} />

      <AlertDialog open={Boolean(target)} onOpenChange={(v) => !v && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.archived_at ? "Pulihkan produk ini?" : "Arsipkan produk ini?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.archived_at
                ? `${target?.name} akan kembali muncul di katalog produk aktif.`
                : `${target?.name} akan disembunyikan dari katalog aktif. Riwayat HPP, penawaran, dan pesanan tetap tersimpan.`}
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
  product,
  onEdit,
  onArchive,
}: {
  product: Product;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <Button variant="ghost" size="icon" onClick={onEdit} aria-label="Ubah produk">
        <Pencil className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onArchive}
        aria-label={product.archived_at ? "Pulihkan produk" : "Arsipkan produk"}
      >
        {product.archived_at ? (
          <ArchiveRestore className="size-4" aria-hidden />
        ) : (
          <Archive className="size-4" aria-hidden />
        )}
      </Button>
    </div>
  );
}
