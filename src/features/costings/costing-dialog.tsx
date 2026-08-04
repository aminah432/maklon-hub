import { useEffect, useMemo, useState } from "react";
import { History, Save } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DecimalInput, PercentageInput, QuantityInput } from "@/components/common/inputs";
import { StatusBadge } from "@/components/common/status-badge";
import { FormulaIngredientsTable } from "./formula-table";
import { useHppMasterData } from "./hpp-master-data";
import {
  bahanBaru,
  biayaBaru,
  moqBaru,
  packagingBaru,
  type BahanDraft,
  type BiayaDraft,
  type HeaderDraft,
  type MoqDraft,
  type PackagingDraft,
} from "./hpp-types";
import { MoqSimulationTable } from "./moq-table";
import { OperationalCostTable } from "./operational-cost-table";
import { PackagingTable } from "./packaging-table";
import { ringkasanDraft, simulasiDariDraft, useBuatVersiHppKosong, useSimpanHpp } from "./use-hpp";
import { useRows, type DbRow } from "@/lib/db";
import { angka, rupiah, tanggalPendek } from "@/lib/format";
import {
  OPSI_PEMBULATAN,
  SATUAN_ISI,
  SATUAN_PRODUK,
  estimasiHasil,
  totalPersentase,
} from "@/lib/hpp";

export type ProductOption = {
  id: string;
  name: string;
  sku: string;
  company_id: string;
  client_id?: string | null;
  brand_id?: string | null;
};

const headerAwal = (): HeaderDraft => ({
  company_id: "",
  client_id: null,
  brand_id: null,
  product_id: null,
  product_variant: "",
  version_name: "",
  version_number: 1,
  status: "draft",
  created_date: "",
  effective_at: "",
  net_content: null,
  net_content_unit: "gram",
  formula_basis: 100,
  formula_basis_unit: "gram",
  planned_quantity: 1000,
  output_unit: "pcs",
  estimated_reject_percentage: 0,
  estimated_shrinkage_percentage: 0,
  overhead_mode: "gabungan",
  combined_overhead_percentage: 20,
  tax_percentage: 11,
  rounding_method: "tanpa",
  notes: "",
  change_reason: "",
});

export function CostingDialog({
  open,
  onOpenChange,
  onCreated,
  products,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  onCreated?: (id: string) => void;
  products: ProductOption[];
}) {
  const [header, setHeader] = useState<HeaderDraft>(headerAwal);
  const [bahan, setBahan] = useState<BahanDraft[]>([bahanBaru()]);
  const [packaging, setPackaging] = useState<PackagingDraft[]>([packagingBaru()]);
  const [biaya, setBiaya] = useState<BiayaDraft[]>([biayaBaru("btkl"), biayaBaru("ohp")]);
  const [moq, setMoq] = useState<MoqDraft[]>([
    moqBaru(500, 100),
    moqBaru(1000, 90),
    moqBaru(2000, 80),
  ]);
  const [createdId, setCreatedId] = useState("");

  const master = useHppMasterData(header.company_id);
  const history = useRows<DbRow>("costing_versions", {
    scopeId: header.company_id || null,
    eq: { product_id: header.product_id },
    enabled: open && Boolean(header.product_id),
    limit: 50,
  });
  const buat = useBuatVersiHppKosong();
  const simpan = useSimpanHpp();

  useEffect(() => {
    if (!open) return;
    setHeader(headerAwal());
    setBahan([bahanBaru()]);
    setPackaging([packagingBaru()]);
    setBiaya([biayaBaru("btkl"), biayaBaru("ohp")]);
    setMoq([moqBaru(500, 100), moqBaru(1000, 90), moqBaru(2000, 80)]);
    setCreatedId("");
  }, [open]);

  const draft = useMemo(
    () => ({ header, bahan, packaging, biaya, moq }),
    [header, bahan, packaging, biaya, moq],
  );
  const hasil = useMemo(() => ringkasanDraft(draft), [draft]);
  const simulasi = useMemo(
    () => simulasiDariDraft(draft, hasil.hppPerUnit),
    [draft, hasil.hppPerUnit],
  );
  const estimasi = estimasiHasil(
    Number(header.planned_quantity ?? 0),
    Number(header.estimated_reject_percentage ?? 0),
    Number(header.estimated_shrinkage_percentage ?? 0),
  );
  const formulaTotal = totalPersentase(
    bahan.map((row) => ({ usage_percentage: Number(row.usage_percentage ?? 0) })),
  );
  const setH = (patch: Partial<HeaderDraft>) => setHeader((current) => ({ ...current, ...patch }));

  const pilihProduk = (id: string) => {
    const product = products.find((item) => item.id === id);
    if (!product) return;
    setH({
      product_id: product.id,
      company_id: product.company_id,
      client_id: product.client_id ?? null,
      brand_id: product.brand_id ?? null,
    });
  };

  const handleSave = async () => {
    if (!header.product_id) {
      buat.mutate(header);
      return;
    }
    try {
      const id = createdId || (await buat.mutateAsync(header));
      if (!createdId) setCreatedId(id);
      await simpan.mutateAsync({ id, header, bahan, packaging, biaya, moq });
      onOpenChange(false);
      onCreated?.(id);
    } catch {
      // Pesan kesalahan ditampilkan oleh mutation masing-masing.
    }
  };

  const isSaving = buat.isPending || simpan.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[96dvh] max-h-[96dvh] w-[96vw] max-w-[1280px] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-2xl p-0 min-[1700px]:max-w-[1680px]">
        <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4">
          <DialogTitle>Buat Versi HPP</DialogTitle>
          <DialogDescription>
            Susun formula, packaging, biaya produksi, harga MOQ, dan riwayat dalam satu modul. Versi
            sebelumnya tidak akan diubah.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-full min-h-0 min-w-0 px-4 sm:px-5">
          <div className="min-w-0 space-y-5 py-5">
            <section className="rounded-2xl border border-border/70 bg-card p-4">
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 min-[1700px]:grid-cols-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="hpp-product">Produk *</Label>
                  <Select value={header.product_id ?? ""} onValueChange={pilihProduk}>
                    <SelectTrigger id="hpp-product">
                      <SelectValue placeholder="Pilih produk" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.sku} — {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hpp-version-name">Nama versi</Label>
                  <Input
                    id="hpp-version-name"
                    value={header.version_name}
                    onChange={(event) => setH({ version_name: event.target.value })}
                    placeholder="Contoh: Formula awal"
                  />
                </div>
                <div>
                  <Label htmlFor="hpp-variant">Varian</Label>
                  <Input
                    id="hpp-variant"
                    value={header.product_variant}
                    onChange={(event) => setH({ product_variant: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hpp-net-content">Isi bersih</Label>
                  <div className="flex min-w-0 gap-2">
                    <DecimalInput
                      id="hpp-net-content"
                      value={header.net_content}
                      onChange={(value) => setH({ net_content: value })}
                    />
                    <UnitSelect
                      value={header.net_content_unit}
                      values={SATUAN_ISI}
                      onChange={(value) => setH({ net_content_unit: value })}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="hpp-formula-basis">Basis formula / volume produk</Label>
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline disabled:text-muted-foreground"
                      disabled={!header.net_content}
                      onClick={() =>
                        setH({
                          formula_basis: header.net_content,
                          formula_basis_unit: header.net_content_unit,
                        })
                      }
                    >
                      Samakan isi bersih
                    </button>
                  </div>
                  <div className="flex min-w-0 gap-2">
                    <DecimalInput
                      id="hpp-formula-basis"
                      value={header.formula_basis}
                      onChange={(value) => setH({ formula_basis: value })}
                    />
                    <UnitSelect
                      value={header.formula_basis_unit}
                      values={SATUAN_ISI}
                      onChange={(value) => setH({ formula_basis_unit: value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="hpp-planned">Jumlah produksi</Label>
                  <div className="flex min-w-0 gap-2">
                    <QuantityInput
                      id="hpp-planned"
                      value={header.planned_quantity}
                      onChange={(value) => setH({ planned_quantity: value })}
                    />
                    <UnitSelect
                      value={header.output_unit}
                      values={SATUAN_PRODUK}
                      onChange={(value) => setH({ output_unit: value })}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="hpp-reject">Reject (%)</Label>
                  <PercentageInput
                    id="hpp-reject"
                    max={100}
                    value={header.estimated_reject_percentage}
                    onChange={(value) => setH({ estimated_reject_percentage: value })}
                  />
                </div>
                <div>
                  <Label htmlFor="hpp-shrinkage">Penyusutan (%)</Label>
                  <PercentageInput
                    id="hpp-shrinkage"
                    max={100}
                    value={header.estimated_shrinkage_percentage}
                    onChange={(value) => setH({ estimated_shrinkage_percentage: value })}
                  />
                </div>
              </div>
            </section>

            <Tabs defaultValue="formula">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-start">
                <TabsTrigger className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm" value="formula">
                  Formula Bahan
                </TabsTrigger>
                <TabsTrigger className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm" value="packaging">
                  Packaging
                </TabsTrigger>
                <TabsTrigger className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm" value="production">
                  Biaya Produksi / BTKL / OHP
                </TabsTrigger>
                <TabsTrigger className="min-w-0 px-2 text-xs sm:px-3 sm:text-sm" value="pricing">
                  Harga & MOQ
                </TabsTrigger>
                <TabsTrigger
                  className="col-span-2 min-w-0 px-2 text-xs sm:px-3 sm:text-sm"
                  value="history"
                >
                  Riwayat Versi
                </TabsTrigger>
              </TabsList>

              <TabsContent value="formula" className="mt-4">
                <FormulaIngredientsTable
                  bahan={bahan}
                  onChange={setBahan}
                  formulaBasis={Number(header.formula_basis ?? 0)}
                  catalog={master.materials}
                />
              </TabsContent>

              <TabsContent value="packaging" className="mt-4">
                <PackagingTable
                  packaging={packaging}
                  onChange={setPackaging}
                  catalog={master.packaging}
                />
              </TabsContent>

              <TabsContent value="production" className="mt-4 space-y-4">
                <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border/70 bg-card p-4">
                  <div className="min-w-56">
                    <Label htmlFor="hpp-overhead-mode">Mode overhead</Label>
                    <Select
                      value={header.overhead_mode}
                      onValueChange={(value) =>
                        setH({ overhead_mode: value === "terpisah" ? "terpisah" : "gabungan" })
                      }
                    >
                      <SelectTrigger id="hpp-overhead-mode">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gabungan">Gabungan</SelectItem>
                        <SelectItem value="terpisah">Rinci per biaya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {header.overhead_mode === "gabungan" ? (
                    <div className="min-w-64">
                      <Label htmlFor="hpp-overhead">BTKL + OHP (%)</Label>
                      <PercentageInput
                        id="hpp-overhead"
                        value={header.combined_overhead_percentage}
                        onChange={(value) => setH({ combined_overhead_percentage: value })}
                      />
                    </div>
                  ) : null}
                  <p className="num text-sm text-muted-foreground">
                    {rupiah(hasil.totalOperasional, true)} / unit produksi
                  </p>
                </div>
                {header.overhead_mode === "terpisah" ? (
                  <OperationalCostTable
                    biaya={biaya}
                    rincian={hasil.rincianOperasional}
                    onChange={setBiaya}
                  />
                ) : null}
              </TabsContent>

              <TabsContent value="pricing" className="mt-4 space-y-4">
                <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <Label htmlFor="hpp-tax">Pajak</Label>
                    <Select
                      value={String(header.tax_percentage ?? 0)}
                      onValueChange={(value) => setH({ tax_percentage: Number(value) })}
                    >
                      <SelectTrigger id="hpp-tax">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Tanpa pajak</SelectItem>
                        <SelectItem value="11">PPN 11%</SelectItem>
                        <SelectItem value="12">PPN 12%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hpp-rounding">Pembulatan</Label>
                    <Select
                      value={header.rounding_method}
                      onValueChange={(value) => setH({ rounding_method: value })}
                    >
                      <SelectTrigger id="hpp-rounding">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPSI_PEMBULATAN.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hpp-effective">Berlaku sejak</Label>
                    <Input
                      id="hpp-effective"
                      type="date"
                      value={header.effective_at}
                      onChange={(event) => setH({ effective_at: event.target.value })}
                    />
                  </div>
                </div>
                <MoqSimulationTable
                  baris={simulasi}
                  onChange={setMoq}
                  pajak={Number(header.tax_percentage ?? 0)}
                />
              </TabsContent>

              <TabsContent value="history" className="mt-4 space-y-4">
                <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="hpp-reason">Alasan perubahan</Label>
                    <Textarea
                      id="hpp-reason"
                      value={header.change_reason}
                      onChange={(event) => setH({ change_reason: event.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="hpp-notes">Catatan internal</Label>
                    <Textarea
                      id="hpp-notes"
                      value={header.notes}
                      onChange={(event) => setH({ notes: event.target.value })}
                    />
                  </div>
                </div>
                {!header.product_id ? (
                  <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Pilih produk untuk melihat riwayat versinya.
                  </p>
                ) : (history.data ?? []).length === 0 ? (
                  <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Belum ada versi sebelumnya. Versi pertama akan dibuat tanpa mengubah data lain.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-card">
                    <div className="border-b border-border/70 px-4 py-3 text-sm font-medium">
                      <History className="mr-2 inline size-4" aria-hidden /> Riwayat produk
                    </div>
                    <div className="divide-y divide-border/60">
                      {(history.data ?? []).map((version) => (
                        <div
                          key={String(version["id"])}
                          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-medium">
                              Versi {String(version["version_number"] ?? "-")} ·{" "}
                              {String(version["version_name"] ?? "Tanpa nama")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {tanggalPendek(String(version["created_at"]))} · HPP{" "}
                              {rupiah(Number(version["unit_hpp"] ?? 0), true)}
                            </p>
                          </div>
                          <StatusBadge status={String(version["status"] ?? "draft")} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <section className="grid gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <Summary label="Formula" value={rupiah(hasil.totalFormula, true)} />
              <Summary label="Packaging" value={rupiah(hasil.totalPackaging, true)} />
              <Summary
                label={`Layak jual (${angka(estimasi.layakJual)})`}
                value={rupiah(hasil.hppPerUnit, true)}
              />
              <Summary label="HPP batch" value={rupiah(hasil.hppBatch)} />
              <Summary
                label="Status formula"
                value={`${angka(formulaTotal, 3)}%`}
                highlight={Math.abs(formulaTotal - 100) <= 0.001}
              />
            </section>
          </div>
        </ScrollArea>

        <DialogFooter className="relative z-10 shrink-0 gap-2 border-t border-border/70 bg-background px-5 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={isSaving || !header.product_id} onClick={() => void handleSave()}>
            <Save className="size-4" aria-hidden />
            {isSaving ? "Menyimpan…" : "Simpan versi lengkap"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UnitSelect({
  value,
  values,
  onChange,
}: {
  value: string;
  values: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28" aria-label="Pilih satuan">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {values.map((unit) => (
          <SelectItem key={unit} value={unit}>
            {unit}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Summary({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={highlight ? "num font-semibold text-emerald-700" : "num font-semibold"}>
        {value}
      </p>
    </div>
  );
}
