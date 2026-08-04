import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CurrencyInput, PercentageInput, QuantityInput } from "@/components/common/inputs";
import { angka, persen, rupiah } from "@/lib/format";
import { SARAN_TIER_MOQ, type SimulasiMoqResult } from "@/lib/hpp";
import { moqBaru, type MoqDraft } from "./hpp-types";

const METODE = [
  { value: "markup", label: "Markup dari HPP" },
  { value: "target_margin", label: "Target margin" },
  { value: "manual", label: "Harga manual" },
];

type Baris = { draft: MoqDraft; hasil: SimulasiMoqResult };

type Props = {
  baris: Baris[];
  onChange: (rows: MoqDraft[]) => void;
  pajak: number;
  readOnly?: boolean;
};

export function MoqSimulationTable({ baris, onChange, pajak, readOnly = false }: Props) {
  const rows = baris.map((b) => b.draft);
  const set = (key: string, patch: Partial<MoqDraft>) =>
    onChange(rows.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  const hapus = (key: string) => onChange(rows.filter((m) => m.key !== key));

  const isiSaran = () =>
    onChange(SARAN_TIER_MOQ.map((t) => moqBaru(t.minimum_quantity, t.percentage_value)));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Simulasi harga jual per tingkat MOQ. Pajak aktif {angka(pajak, 0)}%.
        </p>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={isiSaran}>
              Isi tier saran
            </Button>
            <Button variant="outline" onClick={() => onChange([...rows, moqBaru(1000, 90)])}>
              <Plus className="size-4" aria-hidden /> Tambah MOQ
            </Button>
          </div>
        ) : null}
      </div>

      <div className="hidden rounded-2xl border border-border/70 bg-card lg:block">
        <div className="max-h-[55vh] overflow-auto">
          <table className="w-full min-w-[1320px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-20 bg-card">
              <tr className="[&>th]:border-b [&>th]:border-border/70 [&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium [&>th]:text-muted-foreground">
                <th className="w-28 text-right">MOQ</th>
                <th className="w-44">Metode</th>
                <th className="w-28 text-right">Markup %</th>
                <th className="w-28 text-right">Margin %</th>
                <th className="w-40 text-right">Harga manual</th>
                <th className="w-36 text-right">HPP</th>
                <th className="w-36 text-right">Harga pra-pajak</th>
                <th className="w-36 text-right">+PPN 11%</th>
                <th className="w-36 text-right">+PPN 12%</th>
                <th className="w-36 text-right">Harga final</th>
                <th className="w-32 text-right">Laba / unit</th>
                <th className="w-36 text-right">Total laba</th>
                <th className="w-28 text-right">Margin</th>
                <th className="w-20 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {baris.map(({ draft: m, hasil: r }, i) => (
                <tr
                  key={m.key}
                  className="odd:bg-muted/20 [&>td]:border-b [&>td]:border-border/50 [&>td]:px-2 [&>td]:py-1.5"
                >
                  <td>
                    <QuantityInput
                      value={m.moq_quantity}
                      disabled={readOnly}
                      aria-label={`Jumlah MOQ baris ${i + 1}`}
                      onChange={(v) => set(m.key, { moq_quantity: v })}
                    />
                  </td>
                  <td>
                    <Select
                      value={m.pricing_method}
                      disabled={readOnly}
                      onValueChange={(v) => set(m.key, { pricing_method: v })}
                    >
                      <SelectTrigger aria-label={`Metode harga baris ${i + 1}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {METODE.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td>
                    <PercentageInput
                      value={m.markup_percentage}
                      disabled={readOnly || m.pricing_method !== "markup"}
                      aria-label={`Markup baris ${i + 1}`}
                      onChange={(v) => set(m.key, { markup_percentage: v })}
                    />
                  </td>
                  <td>
                    <PercentageInput
                      value={m.target_margin_percentage}
                      max={99}
                      disabled={readOnly || m.pricing_method !== "target_margin"}
                      aria-label={`Target margin baris ${i + 1}`}
                      onChange={(v) => set(m.key, { target_margin_percentage: v })}
                    />
                  </td>
                  <td>
                    <CurrencyInput
                      value={m.manual_price}
                      disabled={readOnly || m.pricing_method !== "manual"}
                      aria-label={`Harga manual baris ${i + 1}`}
                      onChange={(v) => set(m.key, { manual_price: v })}
                    />
                  </td>
                  <td className="num text-right text-muted-foreground">{rupiah(r.hpp, true)}</td>
                  <td className="num text-right">{rupiah(r.priceBeforeTax, true)}</td>
                  <td className="num text-right text-muted-foreground">
                    {rupiah(r.priceAfterTax11, true)}
                  </td>
                  <td className="num text-right text-muted-foreground">
                    {rupiah(r.priceAfterTax12, true)}
                  </td>
                  <td className="num text-right font-semibold">{rupiah(r.roundedPrice)}</td>
                  <td className="num text-right">{rupiah(r.profitPerUnit, true)}</td>
                  <td className="num text-right">{rupiah(r.totalProfit)}</td>
                  <td className="num text-right">{persen(r.actualMargin, 1)}</td>
                  <td className="text-right">
                    {!readOnly ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Hapus MOQ ${i + 1}`}
                        onClick={() => hapus(m.key)}
                      >
                        <Trash2 className="size-4 text-destructive" aria-hidden />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 lg:hidden">
        {baris.map(({ draft: m, hasil: r }, i) => (
          <article key={m.key} className="rounded-2xl border border-border/70 bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <Label className="text-xs text-muted-foreground">MOQ (unit)</Label>
                <QuantityInput
                  value={m.moq_quantity}
                  disabled={readOnly}
                  onChange={(v) => set(m.key, { moq_quantity: v })}
                />
              </div>
              {!readOnly ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Hapus MOQ ${i + 1}`}
                  onClick={() => hapus(m.key)}
                >
                  <Trash2 className="size-4 text-destructive" aria-hidden />
                </Button>
              ) : null}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Metode</Label>
                <Select
                  value={m.pricing_method}
                  disabled={readOnly}
                  onValueChange={(v) => set(m.key, { pricing_method: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METODE.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                {m.pricing_method === "manual" ? (
                  <>
                    <Label className="text-xs text-muted-foreground">Harga manual</Label>
                    <CurrencyInput
                      value={m.manual_price}
                      disabled={readOnly}
                      onChange={(v) => set(m.key, { manual_price: v })}
                    />
                  </>
                ) : m.pricing_method === "target_margin" ? (
                  <>
                    <Label className="text-xs text-muted-foreground">Target margin %</Label>
                    <PercentageInput
                      value={m.target_margin_percentage}
                      max={99}
                      disabled={readOnly}
                      onChange={(v) => set(m.key, { target_margin_percentage: v })}
                    />
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">Markup %</Label>
                    <PercentageInput
                      value={m.markup_percentage}
                      disabled={readOnly}
                      onChange={(v) => set(m.key, { markup_percentage: v })}
                    />
                  </>
                )}
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-muted/40 p-3 text-xs">
              <div>
                <dt className="text-muted-foreground">Harga final</dt>
                <dd className="num text-sm font-semibold">{rupiah(r.roundedPrice)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Margin</dt>
                <dd className="num text-sm">{persen(r.actualMargin, 1)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">+PPN 11%</dt>
                <dd className="num">{rupiah(r.priceAfterTax11)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">+PPN 12%</dt>
                <dd className="num">{rupiah(r.priceAfterTax12)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Laba / unit</dt>
                <dd className="num">{rupiah(r.profitPerUnit, true)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Total laba</dt>
                <dd className="num">{rupiah(r.totalProfit)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}
