import { useMemo } from "react";
import { Copy, GripVertical, Plus, Trash2 } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CurrencyInput, DecimalInput, PercentageInput } from "@/components/common/inputs";
import { angka, persen, rupiah } from "@/lib/format";
import { labelStatus } from "@/lib/format";
import {
  KATEGORI_BAHAN,
  SATUAN_PEMBELIAN,
  hargaPerSatuanBesar,
  statusFormula,
  totalPersentase,
} from "@/lib/hpp";
import { cn } from "@/lib/utils";
import { bahanBaru, hargaDasarBahan, hitungBarisBahan, kunci, type BahanDraft } from "./hpp-types";
import type { MaterialCatalogItem } from "./hpp-master-data";

export function FormulaPercentageIndicator({ total }: { total: number }) {
  const st = statusFormula(total);
  const teks =
    st === "pas"
      ? `Total formula: ${angka(total, 3)}% — formula sudah lengkap`
      : st === "kurang"
        ? `Total formula: ${angka(total, 3)}% — masih kurang ${angka(100 - total, 3)}%`
        : `Total formula: ${angka(total, 3)}% — kelebihan ${angka(total - 100, 3)}%`;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
        st === "pas" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
        st === "kurang" && "border-amber-500/30 bg-amber-500/10 text-amber-700",
        st === "lebih" && "border-destructive/30 bg-destructive/10 text-destructive",
      )}
      role="status"
    >
      <span className="size-2 rounded-full bg-current" aria-hidden />
      {teks}
    </div>
  );
}

function SatuanDasarLabel({ unit }: { unit: string }) {
  const dasar = SATUAN_PEMBELIAN.find((s) => s.value === unit)?.dasar ?? "gram";
  return <span>{dasar === "ml" ? "ml" : dasar === "pcs" ? "pcs" : "gram"}</span>;
}

type Props = {
  bahan: BahanDraft[];
  onChange: (rows: BahanDraft[]) => void;
  formulaBasis: number;
  catalog?: MaterialCatalogItem[];
  readOnly?: boolean;
};

export function FormulaIngredientsTable({
  bahan,
  onChange,
  formulaBasis,
  catalog = [],
  readOnly = false,
}: Props) {
  const total = useMemo(
    () =>
      totalPersentase(bahan.map((b) => ({ usage_percentage: Number(b.usage_percentage ?? 0) }))),
    [bahan],
  );
  const totalBiaya = useMemo(
    () => bahan.reduce((s, b) => s + hitungBarisBahan(b, formulaBasis).finalCost, 0),
    [bahan, formulaBasis],
  );

  const set = (key: string, patch: Partial<BahanDraft>) =>
    onChange(bahan.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const hapus = (key: string) => onChange(bahan.filter((b) => b.key !== key));
  const pilihMaster = (key: string, id: string) => {
    const item = catalog.find((c) => c.id === id);
    if (!item) return;
    set(key, {
      material_id: item.id,
      supplier_price_id: item.priceId,
      material_name_snapshot: item.name,
      category: item.category,
      supplier_name_snapshot: item.supplierName,
      purchase_price_snapshot: item.purchasePrice,
      purchase_quantity_snapshot: item.purchaseQuantity,
      purchase_unit_snapshot: item.purchaseUnit,
      normalized_unit_price_snapshot: item.normalizedUnitPrice,
      required_unit: item.defaultUnit,
      override: false,
    });
  };
  const duplikat = (key: string) => {
    const idx = bahan.findIndex((b) => b.key === key);
    if (idx < 0) return;
    const salinan = { ...bahan[idx]!, key: kunci() };
    delete salinan.id;
    onChange([...bahan.slice(0, idx + 1), salinan, ...bahan.slice(idx + 1)]);
  };
  const geser = (key: string, arah: -1 | 1) => {
    const i = bahan.findIndex((b) => b.key === key);
    const j = i + arah;
    if (i < 0 || j < 0 || j >= bahan.length) return;
    const next = [...bahan];
    const a = next[i]!;
    next[i] = next[j]!;
    next[j] = a;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormulaPercentageIndicator total={total} />
        {!readOnly ? (
          <Button variant="outline" onClick={() => onChange([...bahan, bahanBaru()])}>
            <Plus className="size-4" aria-hidden /> Tambah bahan
          </Button>
        ) : null}
      </div>

      {/* Desktop: spreadsheet */}
      <div className="hidden rounded-2xl border border-border/70 bg-card lg:block">
        <div className="max-h-[60vh] overflow-auto">
          <table className="w-full min-w-[1500px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="[&>th]:border-b [&>th]:border-border/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:text-muted-foreground">
                <th className="sticky left-0 z-30 w-14 bg-card">No</th>
                <th className="sticky left-14 z-30 w-56 bg-card">Nama bahan</th>
                <th className="w-40">Kategori</th>
                <th className="w-36">Supplier</th>
                <th className="w-28 text-right">% Pakai</th>
                <th className="w-40 text-right">Harga beli</th>
                <th className="w-24 text-right">Isi</th>
                <th className="w-28">Satuan</th>
                <th className="w-36 text-right">Harga /kg-L</th>
                <th className="w-36 text-right">Harga /g-ml</th>
                <th className="w-36 text-right">Kebutuhan</th>
                <th className="w-24 text-right">Waste %</th>
                <th className="w-36 text-right">Biaya bahan</th>
                <th className="w-40">Catatan</th>
                <th className="w-28 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {bahan.map((b, i) => {
                const dasar = hargaDasarBahan(b);
                const c = hitungBarisBahan(b, formulaBasis);
                const kontribusi = totalBiaya > 0 ? (c.finalCost / totalBiaya) * 100 : 0;
                return (
                  <tr
                    key={b.key}
                    className="odd:bg-muted/20 [&>td]:border-b [&>td]:border-border/50 [&>td]:px-2 [&>td]:py-1.5"
                  >
                    <td className="sticky left-0 z-10 bg-inherit text-center text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {!readOnly ? (
                          <span className="flex flex-col">
                            <button
                              type="button"
                              aria-label="Naikkan urutan"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={() => geser(b.key, -1)}
                            >
                              <GripVertical className="size-3" aria-hidden />
                            </button>
                          </span>
                        ) : null}
                        {i + 1}
                      </div>
                    </td>
                    <td className="sticky left-14 z-10 bg-inherit">
                      {catalog.length > 0 && !readOnly ? (
                        <Select
                          value={b.material_id ?? ""}
                          onValueChange={(v) => pilihMaster(b.key, v)}
                        >
                          <SelectTrigger
                            className="mb-1"
                            aria-label={`Pilih master bahan baris ${i + 1}`}
                          >
                            <SelectValue placeholder="Pilih dari master" />
                          </SelectTrigger>
                          <SelectContent>
                            {catalog.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : null}
                      <Input
                        value={b.material_name_snapshot}
                        disabled={readOnly}
                        aria-label={`Nama bahan baris ${i + 1}`}
                        onChange={(e) => set(b.key, { material_name_snapshot: e.target.value })}
                      />
                    </td>
                    <td>
                      <Select
                        value={b.category}
                        disabled={readOnly}
                        onValueChange={(v) => set(b.key, { category: v })}
                      >
                        <SelectTrigger aria-label={`Kategori bahan baris ${i + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {KATEGORI_BAHAN.map((k) => (
                            <SelectItem key={k} value={k}>
                              {labelStatus(k)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td>
                      <Input
                        value={b.supplier_name_snapshot}
                        disabled={readOnly}
                        aria-label={`Supplier baris ${i + 1}`}
                        onChange={(e) => set(b.key, { supplier_name_snapshot: e.target.value })}
                      />
                    </td>
                    <td>
                      <DecimalInput
                        value={b.usage_percentage}
                        disabled={readOnly}
                        aria-label={`Persentase pemakaian baris ${i + 1}`}
                        onChange={(v) => set(b.key, { usage_percentage: v })}
                      />
                    </td>
                    <td>
                      <CurrencyInput
                        value={b.purchase_price_snapshot}
                        disabled={readOnly}
                        aria-label={`Harga pembelian baris ${i + 1}`}
                        onChange={(v) => set(b.key, { purchase_price_snapshot: v })}
                      />
                    </td>
                    <td>
                      <DecimalInput
                        value={b.purchase_quantity_snapshot}
                        disabled={readOnly}
                        aria-label={`Jumlah isi pembelian baris ${i + 1}`}
                        onChange={(v) => set(b.key, { purchase_quantity_snapshot: v })}
                      />
                    </td>
                    <td>
                      <Select
                        value={b.purchase_unit_snapshot}
                        disabled={readOnly}
                        onValueChange={(v) => {
                          const dasarUnit =
                            SATUAN_PEMBELIAN.find((s) => s.value === v)?.dasar ?? "gram";
                          set(b.key, { purchase_unit_snapshot: v, required_unit: dasarUnit });
                        }}
                      >
                        <SelectTrigger aria-label={`Satuan pembelian baris ${i + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SATUAN_PEMBELIAN.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="num text-right text-muted-foreground">
                      {rupiah(hargaPerSatuanBesar(dasar), true)}
                    </td>
                    <td>
                      {b.override ? (
                        <CurrencyInput
                          value={b.normalized_unit_price_snapshot}
                          disabled={readOnly}
                          aria-label={`Harga per satuan dasar baris ${i + 1}`}
                          onChange={(v) => set(b.key, { normalized_unit_price_snapshot: v })}
                        />
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              disabled={readOnly}
                              className="num w-full rounded-md px-2 py-1 text-right hover:bg-muted"
                              onClick={() =>
                                set(b.key, {
                                  override: true,
                                  normalized_unit_price_snapshot: dasar,
                                })
                              }
                            >
                              {rupiah(dasar, true)}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Hasil konversi otomatis. Klik untuk override manual.
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {b.override ? (
                        <Input
                          className="mt-1 h-8 text-xs"
                          placeholder="Alasan override"
                          value={b.override_reason}
                          disabled={readOnly}
                          aria-label={`Alasan override baris ${i + 1}`}
                          onChange={(e) => set(b.key, { override_reason: e.target.value })}
                        />
                      ) : null}
                    </td>
                    <td className="num text-right">
                      {angka(c.requiredQuantity, 6)}{" "}
                      <span className="text-xs text-muted-foreground">
                        <SatuanDasarLabel unit={b.purchase_unit_snapshot} />
                      </span>
                    </td>
                    <td>
                      <PercentageInput
                        value={b.waste_percentage}
                        disabled={readOnly}
                        aria-label={`Waste baris ${i + 1}`}
                        onChange={(v) => set(b.key, { waste_percentage: v })}
                      />
                    </td>
                    <td className="num text-right font-medium">
                      {rupiah(c.finalCost, true)}
                      <span className="block text-xs font-light text-muted-foreground">
                        {persen(kontribusi, 1)}
                      </span>
                    </td>
                    <td>
                      <Input
                        value={b.notes}
                        disabled={readOnly}
                        aria-label={`Catatan baris ${i + 1}`}
                        onChange={(e) => set(b.key, { notes: e.target.value })}
                      />
                    </td>
                    <td className="text-right">
                      {!readOnly ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Duplikasi baris ${i + 1}`}
                            onClick={() => duplikat(b.key)}
                          >
                            <Copy className="size-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Hapus baris ${i + 1}`}
                            onClick={() => hapus(b.key)}
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
                <td colSpan={4} className="sticky left-0 bg-card">
                  Total formula
                </td>
                <td className="num text-right">{angka(total, 3)}%</td>
                <td colSpan={7} />
                <td className="num text-right">{rupiah(totalBiaya, true)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Mobile: kartu */}
      <div className="grid gap-3 lg:hidden">
        {bahan.map((b, i) => {
          const dasar = hargaDasarBahan(b);
          const c = hitungBarisBahan(b, formulaBasis);
          return (
            <article key={b.key} className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <Label className="text-xs text-muted-foreground">Nama bahan {i + 1}</Label>
                  {catalog.length > 0 && !readOnly ? (
                    <Select
                      value={b.material_id ?? ""}
                      onValueChange={(v) => pilihMaster(b.key, v)}
                    >
                      <SelectTrigger className="mb-1">
                        <SelectValue placeholder="Pilih dari master bahan" />
                      </SelectTrigger>
                      <SelectContent>
                        {catalog.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : null}
                  <Input
                    value={b.material_name_snapshot}
                    disabled={readOnly}
                    onChange={(e) => set(b.key, { material_name_snapshot: e.target.value })}
                  />
                </div>
                {!readOnly ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Hapus bahan ${i + 1}`}
                    onClick={() => hapus(b.key)}
                  >
                    <Trash2 className="size-4 text-destructive" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">% Pakai</Label>
                  <DecimalInput
                    value={b.usage_percentage}
                    disabled={readOnly}
                    onChange={(v) => set(b.key, { usage_percentage: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Waste %</Label>
                  <PercentageInput
                    value={b.waste_percentage}
                    disabled={readOnly}
                    onChange={(v) => set(b.key, { waste_percentage: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Harga beli</Label>
                  <CurrencyInput
                    value={b.purchase_price_snapshot}
                    disabled={readOnly}
                    onChange={(v) => set(b.key, { purchase_price_snapshot: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Isi pembelian</Label>
                  <DecimalInput
                    value={b.purchase_quantity_snapshot}
                    disabled={readOnly}
                    onChange={(v) => set(b.key, { purchase_quantity_snapshot: v })}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Satuan</Label>
                  <Select
                    value={b.purchase_unit_snapshot}
                    disabled={readOnly}
                    onValueChange={(v) => set(b.key, { purchase_unit_snapshot: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_PEMBELIAN.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Kategori</Label>
                  <Select
                    value={b.category}
                    disabled={readOnly}
                    onValueChange={(v) => set(b.key, { category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KATEGORI_BAHAN.map((k) => (
                        <SelectItem key={k} value={k}>
                          {labelStatus(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Harga satuan</dt>
                  <dd className="num">{rupiah(dasar, true)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Kebutuhan</dt>
                  <dd className="num">{angka(c.requiredQuantity, 4)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Biaya</dt>
                  <dd className="num font-medium">{rupiah(c.finalCost, true)}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}
