import { useEffect, useMemo, useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput, PercentageInput } from "@/components/common/inputs";
import { COSTING_CATEGORIES } from "@/lib/constants";
import { goodUnits, totalBatchCost, totalItem, unitHpp } from "@/lib/calc";
import { db, useAction, type DbRow } from "@/lib/db";
import { rupiah, angka } from "@/lib/format";

export type ProductOption = { id: string; name: string; sku: string; company_id: string };

type ItemDraft = {
  key: string;
  category: string;
  item_name: string;
  quantity: number | null;
  unit: string;
  unit_cost: number | null;
  waste_percentage: number | null;
};

const barisBaru = (): ItemDraft => ({
  key: Math.random().toString(36).slice(2),
  category: COSTING_CATEGORIES[0],
  item_name: "",
  quantity: 1,
  unit: "pcs",
  unit_cost: null,
  waste_percentage: 0,
});

export function CostingDialog({
  open,
  onOpenChange,
  products,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: ProductOption[];
  editing: DbRow | null;
}) {
  const [productId, setProductId] = useState("");
  const [versionName, setVersionName] = useState("");
  const [planned, setPlanned] = useState<number | null>(1000);
  const [rejected, setRejected] = useState<number | null>(0);
  const [shrinkage, setShrinkage] = useState<number | null>(0);
  const [status, setStatus] = useState("draft");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([barisBaru()]);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setProductId(String(editing["product_id"] ?? ""));
      setVersionName(String(editing["version_name"] ?? ""));
      setPlanned(Number(editing["planned_quantity"] ?? 0));
      setRejected(Number(editing["rejected_units"] ?? 0));
      setShrinkage(Number(editing["shrinkage_units"] ?? 0));
      setStatus(String(editing["status"] ?? "draft"));
      setNotes(String(editing["notes"] ?? ""));
      void (async () => {
        const { data } = await db("costing_items")
          .select("*")
          .eq("costing_version_id", String(editing["id"]))
          .order("sort_order", { ascending: true });
        const rows = (data ?? []) as DbRow[];
        setItems(
          rows.length > 0
            ? rows.map((r) => ({
                key: String(r["id"]),
                category: String(r["category"] ?? COSTING_CATEGORIES[0]),
                item_name: String(r["item_name"] ?? ""),
                quantity: Number(r["quantity"] ?? 0),
                unit: String(r["unit"] ?? "pcs"),
                unit_cost: Number(r["unit_cost"] ?? 0),
                waste_percentage: Number(r["waste_percentage"] ?? 0),
              }))
            : [barisBaru()],
        );
      })();
    } else {
      setProductId("");
      setVersionName("");
      setPlanned(1000);
      setRejected(0);
      setShrinkage(0);
      setStatus("draft");
      setNotes("");
      setItems([barisBaru()]);
    }
  }, [open, editing]);

  const hitung = useMemo(() => {
    const list = items.map((i) => ({
      quantity: i.quantity ?? 0,
      unit_cost: i.unit_cost ?? 0,
      waste_percentage: i.waste_percentage ?? 0,
    }));
    const total = totalBatchCost(list);
    const layak = goodUnits(planned ?? 0, rejected ?? 0, shrinkage ?? 0);
    return { total, layak, hpp: unitHpp(total, layak) };
  }, [items, planned, rejected, shrinkage]);

  const simpan = useAction(
    async () => {
      const produk = products.find((p) => p.id === productId);
      if (!produk) throw new Error("Pilih produk terlebih dahulu");
      const isi = items.filter((i) => i.item_name.trim() !== "");
      if (isi.length === 0) throw new Error("Tambahkan minimal satu komponen biaya");

      const payload: DbRow = {
        company_id: produk.company_id,
        product_id: produk.id,
        version_name: versionName || null,
        planned_quantity: planned ?? 0,
        good_units: hitung.layak,
        rejected_units: rejected ?? 0,
        shrinkage_units: shrinkage ?? 0,
        total_batch_cost: hitung.total,
        unit_hpp: hitung.hpp,
        status,
        notes: notes || null,
      };

      let versionId = editing ? String(editing["id"]) : "";
      if (editing) {
        const { error } = await db("costing_versions").update(payload).eq("id", versionId);
        if (error) throw new Error(error.message);
        const del = await db("costing_items").delete().eq("costing_version_id", versionId);
        if (del.error) throw new Error(del.error.message);
      } else {
        const { data: existing } = await db("costing_versions")
          .select("version_number")
          .eq("product_id", produk.id)
          .order("version_number", { ascending: false })
          .limit(1);
        const last = ((existing ?? [])[0] as DbRow | undefined)?.["version_number"];
        const { data, error } = await db("costing_versions")
          .insert({ ...payload, version_number: Number(last ?? 0) + 1 })
          .select("id");
        if (error) throw new Error(error.message);
        versionId = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
      }

      const rows = isi.map((i, idx) => ({
        company_id: produk.company_id,
        costing_version_id: versionId,
        category: i.category,
        item_name: i.item_name,
        quantity: i.quantity ?? 0,
        unit: i.unit || null,
        unit_cost: i.unit_cost ?? 0,
        waste_percentage: i.waste_percentage ?? 0,
        subtotal: (i.quantity ?? 0) * (i.unit_cost ?? 0),
        total: totalItem({
          quantity: i.quantity ?? 0,
          unit_cost: i.unit_cost ?? 0,
          waste_percentage: i.waste_percentage ?? 0,
        }),
        sort_order: idx,
      }));
      const ins = await db("costing_items").insert(rows);
      if (ins.error) throw new Error(ins.error.message);
      return versionId;
    },
    {
      invalidate: ["costing_versions", "costing_items"],
      success: "Versi HPP tersimpan",
    },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border/70 p-5">
          <DialogTitle>{editing ? "Ubah Versi HPP" : "Buat Versi HPP"}</DialogTitle>
          <DialogDescription>
            Rinci komponen biaya, lalu HPP per unit dihitung otomatis dari jumlah layak jual.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[66vh] px-5">
          <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="hpp-produk">Produk *</Label>
              <Select
                value={productId}
                onValueChange={setProductId}
                disabled={Boolean(editing)}
              >
                <SelectTrigger id="hpp-produk" aria-label="Pilih produk">
                  <SelectValue placeholder="Pilih produk" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hpp-nama">Nama versi</Label>
              <Input
                id="hpp-nama"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="Contoh: Formula awal"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hpp-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="hpp-status" aria-label="Status versi">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["draft", "aktif", "digantikan"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hpp-planned">Jumlah batch</Label>
              <Input
                id="hpp-planned"
                type="number"
                value={planned ?? ""}
                onChange={(e) => setPlanned(e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hpp-reject">Reject</Label>
              <Input
                id="hpp-reject"
                type="number"
                value={rejected ?? ""}
                onChange={(e) => setRejected(e.target.value === "" ? null : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hpp-susut">Penyusutan</Label>
              <Input
                id="hpp-susut"
                type="number"
                value={shrinkage ?? ""}
                onChange={(e) =>
                  setShrinkage(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold">Komponen biaya</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setItems((p) => [...p, barisBaru()])}
              >
                <Plus className="size-4" aria-hidden /> Baris
              </Button>
            </div>
            <div className="space-y-3 p-3">
              {items.map((item, idx) => (
                <div
                  key={item.key}
                  className="grid gap-2 rounded-xl border border-border/60 p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_90px_80px_minmax(0,1fr)_90px_auto] md:items-end"
                >
                  <div className="space-y-1">
                    <Label className="text-xs">Kategori</Label>
                    <Select
                      value={item.category}
                      onValueChange={(v) =>
                        setItems((p) =>
                          p.map((r, i) => (i === idx ? { ...r, category: v } : r)),
                        )
                      }
                    >
                      <SelectTrigger aria-label="Kategori biaya">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COSTING_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nama item</Label>
                    <Input
                      value={item.item_name}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((r, i) => (i === idx ? { ...r, item_name: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      value={item.quantity ?? ""}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((r, i) =>
                            i === idx
                              ? { ...r, quantity: e.target.value === "" ? null : Number(e.target.value) }
                              : r,
                          ),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Satuan</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((r, i) => (i === idx ? { ...r, unit: e.target.value } : r)),
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Harga satuan</Label>
                    <CurrencyInput
                      value={item.unit_cost}
                      onChange={(v) =>
                        setItems((p) => p.map((r, i) => (i === idx ? { ...r, unit_cost: v } : r)))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Waste</Label>
                    <PercentageInput
                      value={item.waste_percentage}
                      onChange={(v) =>
                        setItems((p) =>
                          p.map((r, i) => (i === idx ? { ...r, waste_percentage: v } : r)),
                        )
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 md:justify-end">
                    <span className="text-sm font-medium md:hidden">
                      {rupiah(
                        totalItem({
                          quantity: item.quantity ?? 0,
                          unit_cost: item.unit_cost ?? 0,
                          waste_percentage: item.waste_percentage ?? 0,
                        }),
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Hapus baris"
                      onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="my-4 grid gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Total biaya batch</p>
              <p className="text-lg font-bold">{rupiah(hitung.total)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unit layak jual</p>
              <p className="text-lg font-bold">{angka(hitung.layak)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">HPP per unit</p>
              <p className="text-lg font-bold text-primary">{rupiah(hitung.hpp, true)}</p>
            </div>
          </div>

          <div className="space-y-1.5 pb-4">
            <Label htmlFor="hpp-catatan">Catatan</Label>
            <Input
              id="hpp-catatan"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Alasan perubahan atau asumsi biaya"
            />
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/70 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={simpan.isPending}
            onClick={() =>
              simpan.mutate(undefined as never, {
                onSuccess: () => onOpenChange(false),
              })
            }
          >
            {simpan.isPending ? "Menyimpan…" : "Simpan versi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
