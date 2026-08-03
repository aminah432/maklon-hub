import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useCompany } from "@/lib/company-context";
import {
  useDeleteCategory,
  useProductCategories,
  useSaveCategory,
} from "@/features/products/use-products";

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { companies, scopeId } = useCompany();
  const [companyId, setCompanyId] = useState(scopeId ?? companies[0]?.id ?? "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) setCompanyId(scopeId ?? companies[0]?.id ?? "");
  }, [open, scopeId, companies]);

  const { data: categories = [], isLoading } = useProductCategories(companyId || null);
  const simpan = useSaveCategory();
  const hapus = useDeleteCategory();

  const tambah = () => {
    if (!companyId || name.trim().length < 2) return;
    simpan.mutate(
      {
        company_id: companyId,
        name: name.trim(),
        description: description.trim() || null,
        sort_order: categories.length + 1,
        is_active: true,
      },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Kelola Kategori Produk</DialogTitle>
          <DialogDescription>
            Kategori berlaku per perusahaan dan dipakai saat menambahkan produk.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="kategori-perusahaan">Perusahaan</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger id="kategori-perusahaan">
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

          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="kategori-nama">Nama kategori</Label>
              <Input
                id="kategori-nama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Skincare"
                maxLength={80}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="kategori-deskripsi">Keterangan</Label>
              <Input
                id="kategori-deskripsi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Opsional"
                maxLength={160}
              />
            </div>
            <Button type="button" onClick={tambah} disabled={simpan.isPending}>
              <Plus className="size-4" aria-hidden /> Tambah
            </Button>
          </div>

          <div className="rounded-2xl border border-border/70">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Memuat kategori…</p>
            ) : categories.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                Belum ada kategori untuk perusahaan ini.
              </p>
            ) : (
              <ul className="divide-y divide-border/70">
                {categories.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      {c.description ? (
                        <p className="truncate text-xs text-muted-foreground">{c.description}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={c.is_active}
                        aria-label={`Aktifkan kategori ${c.name}`}
                        onCheckedChange={(v) =>
                          simpan.mutate({
                            id: c.id,
                            company_id: c.company_id,
                            name: c.name,
                            description: c.description,
                            sort_order: c.sort_order,
                            is_active: v,
                          })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus kategori ${c.name}`}
                        onClick={() => hapus.mutate(c.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
