import { Plus, Trash2 } from "lucide-react";
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
import { CurrencyInput, PercentageInput } from "@/components/common/inputs";
import { labelStatus, rupiah } from "@/lib/format";
import { BASIS_PERHITUNGAN, KATEGORI_BIAYA_OPERASIONAL } from "@/lib/hpp";
import { biayaBaru, type BiayaDraft } from "./hpp-types";

const TIPE = [
  { value: "persentase", label: "Persentase" },
  { value: "nominal_unit", label: "Nominal / unit" },
  { value: "nominal_batch", label: "Nominal / batch" },
];

type Props = {
  biaya: BiayaDraft[];
  rincian: number[];
  onChange: (rows: BiayaDraft[]) => void;
  readOnly?: boolean;
};

export function OperationalCostTable({ biaya, rincian, onChange, readOnly = false }: Props) {
  const set = (key: string, patch: Partial<BiayaDraft>) =>
    onChange(biaya.map((b) => (b.key === key ? { ...b, ...patch } : b)));
  const hapus = (key: string) => onChange(biaya.filter((b) => b.key !== key));
  const total = rincian.reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          BTKL, OHP, dan biaya tambahan lain. Setiap baris menghasilkan nominal per unit.
        </p>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => onChange([...biaya, biayaBaru("btkl")])}>
              <Plus className="size-4" aria-hidden /> BTKL
            </Button>
            <Button variant="outline" onClick={() => onChange([...biaya, biayaBaru("ohp")])}>
              <Plus className="size-4" aria-hidden /> OHP
            </Button>
            <Button variant="outline" onClick={() => onChange([...biaya, biayaBaru()])}>
              <Plus className="size-4" aria-hidden /> Biaya lain
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden rounded-2xl border border-border/70 bg-card min-[1200px]:block">
        <div className="max-h-[50vh] overflow-y-auto overflow-x-hidden">
          <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="[&>th]:border-b [&>th]:border-border/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:text-muted-foreground">
                <th className="w-14">No</th>
                <th className="w-56">Nama biaya</th>
                <th className="w-40">Kategori</th>
                <th className="w-40">Tipe</th>
                <th className="w-28 text-right">Persentase</th>
                <th className="w-44">Dasar hitung</th>
                <th className="w-40 text-right">Nominal</th>
                <th className="w-36 text-right">Hasil / unit</th>
                <th className="w-20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {biaya.map((b, i) => (
                <tr
                  key={b.key}
                  className="odd:bg-muted/20 [&>td]:border-b [&>td]:border-border/50 [&>td]:px-2 [&>td]:py-1.5"
                >
                  <td className="text-center text-muted-foreground">{i + 1}</td>
                  <td>
                    <Input
                      value={b.cost_name}
                      disabled={readOnly}
                      placeholder={labelStatus(b.cost_category)}
                      aria-label={`Nama biaya baris ${i + 1}`}
                      onChange={(e) => set(b.key, { cost_name: e.target.value })}
                    />
                  </td>
                  <td>
                    <Select
                      value={b.cost_category}
                      disabled={readOnly}
                      onValueChange={(v) => set(b.key, { cost_category: v })}
                    >
                      <SelectTrigger aria-label={`Kategori biaya baris ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {KATEGORI_BIAYA_OPERASIONAL.map((k) => (
                          <SelectItem key={k} value={k}>
                            {labelStatus(k)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <Select
                      value={b.calculation_type}
                      disabled={readOnly}
                      onValueChange={(v) =>
                        set(b.key, { calculation_type: v as BiayaDraft["calculation_type"] })
                      }
                    >
                      <SelectTrigger aria-label={`Tipe perhitungan baris ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPE.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <PercentageInput
                      value={b.percentage_value}
                      disabled={readOnly || b.calculation_type !== "persentase"}
                      aria-label={`Persentase biaya baris ${i + 1}`}
                      onChange={(v) => set(b.key, { percentage_value: v })}
                    />
                  </td>
                  <td>
                    <Select
                      value={b.calculation_base}
                      disabled={readOnly || b.calculation_type !== "persentase"}
                      onValueChange={(v) => set(b.key, { calculation_base: v })}
                    >
                      <SelectTrigger aria-label={`Dasar hitung baris ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BASIS_PERHITUNGAN.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <CurrencyInput
                      value={b.fixed_value}
                      disabled={readOnly || b.calculation_type === "persentase"}
                      aria-label={`Nominal biaya baris ${i + 1}`}
                      onChange={(v) => set(b.key, { fixed_value: v })}
                    />
                  </td>
                  <td className="num text-right font-medium">{rupiah(rincian[i] ?? 0, true)}</td>
                  <td className="text-right">
                    {!readOnly ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus biaya ${i + 1}`}
                        onClick={() => hapus(b.key)}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="sticky bottom-0 bg-card">
              <tr className="[&>td]:border-t [&>td]:border-border/70 [&>td]:px-3 [&>td]:py-2 [&>td]:font-medium">
                <td colSpan={7}>Total biaya operasional per unit</td>
                <td className="num text-right">{rupiah(total, true)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="grid min-w-0 gap-3 min-[1200px]:hidden">
        {biaya.map((b, i) => (
          <article key={b.key} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-muted-foreground">Nama biaya {i + 1}</Label>
                <Input
                  value={b.cost_name}
                  disabled={readOnly}
                  placeholder={labelStatus(b.cost_category)}
                  onChange={(e) => set(b.key, { cost_name: e.target.value })}
                />
              </div>
              {!readOnly ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus biaya ${i + 1}`}
                  onClick={() => hapus(b.key)}
                >
                  <Trash2 className="size-4 text-destructive" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs text-muted-foreground">Tipe</Label>
                <Select
                  value={b.calculation_type}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    set(b.key, { calculation_type: v as BiayaDraft["calculation_type"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPE.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                {b.calculation_type === "persentase" ? (
                  <>
                    <Label className="text-xs text-muted-foreground">Persentase</Label>
                    <PercentageInput
                      value={b.percentage_value}
                      disabled={readOnly}
                      onChange={(v) => set(b.key, { percentage_value: v })}
                    />
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">Nominal</Label>
                    <CurrencyInput
                      value={b.fixed_value}
                      disabled={readOnly}
                      onChange={(v) => set(b.key, { fixed_value: v })}
                    />
                  </>
                )}
              </div>
            </div>
            <p className="num mt-3 rounded-xl bg-muted/40 p-3 text-right text-sm font-medium">
              {rupiah(rincian[i] ?? 0, true)} / unit
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
