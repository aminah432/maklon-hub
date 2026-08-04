import { useMemo } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput, DecimalInput, PercentageInput } from "@/components/common/inputs";
import { labelStatus, rupiah } from "@/lib/format";
import { KATEGORI_PACKAGING, SATUAN_ISI } from "@/lib/hpp";
import {
  hitungBarisPackaging,
  kunci,
  packagingBaru,
  type PackagingDraft,
} from "./hpp-types";

type Props = {
  packaging: PackagingDraft[];
  onChange: (rows: PackagingDraft[]) => void;
  readOnly?: boolean;
};

export function PackagingTable({ packaging, onChange, readOnly = false }: Props) {
  const total = useMemo(
    () => packaging.reduce((s, p) => s + hitungBarisPackaging(p).finalCost, 0),
    [packaging],
  );

  const set = (key: string, patch: Partial<PackagingDraft>) =>
    onChange(packaging.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const hapus = (key: string) => onChange(packaging.filter((p) => p.key !== key));
  const duplikat = (key: string) => {
    const i = packaging.findIndex((p) => p.key === key);
    if (i < 0) return;
    const salinan = { ...packaging[i]!, key: kunci() };
    delete salinan.id;
    onChange([...packaging.slice(0, i + 1), salinan, ...packaging.slice(i + 1)]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Biaya kemasan per unit produk. Gunakan kapasitas untuk kemasan bersama seperti master box.
        </p>
        {!readOnly ? (
          <Button variant="outline" onClick={() => onChange([...packaging, packagingBaru()])}>
            <Plus className="size-4" aria-hidden /> Tambah packaging
          </Button>
        ) : null}
      </div>

      <div className="hidden rounded-2xl border border-border/70 bg-card lg:block">
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[1180px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="[&>th]:border-b [&>th]:border-border/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:text-muted-foreground">
                <th className="w-14">No</th>
                <th className="w-56">Nama packaging</th>
                <th className="w-40">Kategori</th>
                <th className="w-36">Supplier</th>
                <th className="w-28 text-right">Jumlah</th>
                <th className="w-28">Satuan</th>
                <th className="w-40 text-right">Harga satuan</th>
                <th className="w-28 text-right">Kapasitas</th>
                <th className="w-24 text-right">Waste %</th>
                <th className="w-36 text-right">Biaya / unit</th>
                <th className="w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {packaging.map((p, i) => {
                const c = hitungBarisPackaging(p);
                return (
                  <tr
                    key={p.key}
                    className="odd:bg-muted/20 [&>td]:border-b [&>td]:border-border/50 [&>td]:px-2 [&>td]:py-1.5"
                  >
                    <td className="text-center text-muted-foreground">{i + 1}</td>
                    <td>
                      <Input
                        value={p.packaging_name_snapshot}
                        disabled={readOnly}
                        aria-label={`Nama packaging baris ${i + 1}`}
                        onChange={(e) => set(p.key, { packaging_name_snapshot: e.target.value })}
                      />
                    </td>
                    <td>
                      <Select
                        value={p.category}
                        disabled={readOnly}
                        onValueChange={(v) => set(p.key, { category: v })}
                      >
                        <SelectTrigger aria-label={`Kategori packaging baris ${i + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KATEGORI_PACKAGING.map((k) => (
                            <SelectItem key={k} value={k}>
                              {labelStatus(k)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <Input
                        value={p.supplier_name_snapshot}
                        disabled={readOnly}
                        aria-label={`Supplier packaging baris ${i + 1}`}
                        onChange={(e) => set(p.key, { supplier_name_snapshot: e.target.value })}
                      />
                    </td>
                    <td>
                      <DecimalInput
                        value={p.usage_quantity}
                        disabled={readOnly}
                        aria-label={`Jumlah pemakaian packaging baris ${i + 1}`}
                        onChange={(v) => set(p.key, { usage_quantity: v })}
                      />
                    </td>
                    <td>
                      <Select
                        value={p.usage_unit}
                        disabled={readOnly}
                        onValueChange={(v) => set(p.key, { usage_unit: v })}
                      >
                        <SelectTrigger aria-label={`Satuan packaging baris ${i + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["pcs", "set", ...SATUAN_ISI].map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <CurrencyInput
                        value={p.unit_price_snapshot}
                        disabled={readOnly}
                        aria-label={`Harga packaging baris ${i + 1}`}
                        onChange={(v) => set(p.key, { unit_price_snapshot: v })}
                      />
                    </td>
                    <td>
                      <DecimalInput
                        value={p.capacity_quantity}
                        disabled={readOnly}
                        aria-label={`Kapasitas packaging baris ${i + 1}`}
                        onChange={(v) => set(p.key, { capacity_quantity: v })}
                      />
                    </td>
                    <td>
                      <PercentageInput
                        value={p.waste_percentage}
                        disabled={readOnly}
                        aria-label={`Waste packaging baris ${i + 1}`}
                        onChange={(v) => set(p.key, { waste_percentage: v })}
                      />
                    </td>
                    <td className="num text-right font-medium">{rupiah(c.finalCost, true)}</td>
                    <td className="text-right">
                      {!readOnly ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Duplikasi packaging ${i + 1}`}
                            onClick={() => duplikat(p.key)}
                          >
                            <Copy className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus packaging ${i + 1}`}
                            onClick={() => hapus(p.key)}
                          >
                            <Trash2 className="size-4 text-destructive" aria-hidden />
                          </Button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="[&>td]:border-t [&>td]:border-border/70 [&>td]:px-3 [&>td]:py-2 [&>td]:font-medium">
                <td colSpan={9}>Total packaging per unit</td>
                <td className="num text-right">{rupiah(total, true)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {packaging.map((p, i) => {
          const c = hitungBarisPackaging(p);
          return (
            <article key={p.key} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Label className="text-xs text-muted-foreground">Nama packaging {i + 1}</Label>
                  <Input
                    value={p.packaging_name_snapshot}
                    disabled={readOnly}
                    onChange={(e) => set(p.key, { packaging_name_snapshot: e.target.value })}
                  />
                </div>
                {!readOnly ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus packaging ${i + 1}`}
                    onClick={() => hapus(p.key)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Jumlah</Label>
                  <DecimalInput
                    value={p.usage_quantity}
                    disabled={readOnly}
                    onChange={(v) => set(p.key, { usage_quantity: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Harga satuan</Label>
                  <CurrencyInput
                    value={p.unit_price_snapshot}
                    disabled={readOnly}
                    onChange={(v) => set(p.key, { unit_price_snapshot: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kapasitas</Label>
                  <DecimalInput
                    value={p.capacity_quantity}
                    disabled={readOnly}
                    onChange={(v) => set(p.key, { capacity_quantity: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Waste %</Label>
                  <PercentageInput
                    value={p.waste_percentage}
                    disabled={readOnly}
                    onChange={(v) => set(p.key, { waste_percentage: v })}
                  />
                </div>
              </div>
              <p className="num mt-3 rounded-xl bg-muted/40 p-3 text-right text-sm font-medium">
                {rupiah(c.finalCost, true)} / unit
              </p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
