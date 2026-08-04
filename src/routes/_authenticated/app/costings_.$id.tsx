import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, GitBranch, Save } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { ErrorState, LoadingSkeleton } from "@/components/common/states";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CurrencyInput,
  DecimalInput,
  PercentageInput,
  QuantityInput,
} from "@/components/common/inputs";
import { FormulaIngredientsTable } from "@/features/costings/formula-table";
import { PackagingTable } from "@/features/costings/packaging-table";
import { OperationalCostTable } from "@/features/costings/operational-cost-table";
import { MoqSimulationTable } from "@/features/costings/moq-table";
import { HppSummaryCard } from "@/features/costings/hpp-summary";
import { useHppMasterData } from "@/features/costings/hpp-master-data";
import {
  bahanDariRow,
  biayaDariRow,
  hargaDasarBahan,
  moqDariRow,
  packagingDariRow,
  type BahanDraft,
  type BiayaDraft,
  type HeaderDraft,
  type MoqDraft,
  type PackagingDraft,
} from "@/features/costings/hpp-types";
import {
  ringkasanDraft,
  simulasiDariDraft,
  unduhCsv,
  useAktifkanVersi,
  useBuatVersiBaru,
  useSimpanHpp,
  useVersiHpp,
} from "@/features/costings/use-hpp";
import { useRows, type DbRow } from "@/lib/db";
import { useCompany } from "@/lib/company-context";
import { angka, rupiah, tanggalPendek } from "@/lib/format";
import {
  OPSI_PEMBULATAN,
  SATUAN_ISI,
  SATUAN_PRODUK,
  bolehDiaktifkan,
  estimasiHasil,
  totalPersentase,
  validasiKalkulasi,
} from "@/lib/hpp";

export const Route = createFileRoute("/_authenticated/app/costings_/$id")({
  component: HppDetailPage,
  head: () => ({
    meta: [
      { title: "Editor Kalkulasi HPP — Maklon Control Center" },
      {
        name: "description",
        content:
          "Editor kalkulasi HPP maklon: formula bahan, packaging, BTKL/OHP, pajak, pembulatan, dan simulasi harga per MOQ.",
      },
      { property: "og:title", content: "Editor Kalkulasi HPP — Maklon Control Center" },
      {
        property: "og:description",
        content: "Susun formula, biaya produksi, dan harga jual per tingkat MOQ.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function headerDariRow(r: DbRow): HeaderDraft {
  const teks = (k: string) => (r[k] === null || r[k] === undefined ? "" : String(r[k]));
  const angkaAtauNull = (k: string) => (r[k] === null || r[k] === undefined ? null : Number(r[k]));
  return {
    company_id: String(r["company_id"] ?? ""),
    client_id: r["client_id"] ? String(r["client_id"]) : null,
    brand_id: r["brand_id"] ? String(r["brand_id"]) : null,
    product_id: r["product_id"] ? String(r["product_id"]) : null,
    product_variant: teks("product_variant"),
    version_name: teks("version_name"),
    version_number: Number(r["version_number"] ?? 1),
    status: String(r["status"] ?? "draft"),
    created_date: teks("created_at"),
    effective_at: teks("effective_at"),
    net_content: angkaAtauNull("net_content"),
    net_content_unit: String(r["net_content_unit"] ?? "gram"),
    formula_basis: angkaAtauNull("formula_basis"),
    formula_basis_unit: String(r["formula_basis_unit"] ?? "gram"),
    planned_quantity: angkaAtauNull("planned_quantity"),
    output_unit: String(r["output_unit"] ?? "pcs"),
    estimated_reject_percentage: angkaAtauNull("estimated_reject_percentage"),
    estimated_shrinkage_percentage: angkaAtauNull("estimated_shrinkage_percentage"),
    overhead_mode:
      String(r["overhead_mode"] ?? "gabungan") === "terpisah" ? "terpisah" : "gabungan",
    combined_overhead_percentage: angkaAtauNull("combined_overhead_percentage"),
    tax_percentage: angkaAtauNull("tax_percentage"),
    rounding_method: String(r["rounding_method"] ?? "tanpa"),
    notes: teks("notes"),
    change_reason: teks("change_reason"),
  };
}

function HppDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { scopeId, companyById } = useCompany();
  const detail = useVersiHpp(id);

  const [header, setHeader] = useState<HeaderDraft | null>(null);
  const [bahan, setBahan] = useState<BahanDraft[]>([]);
  const [packaging, setPackaging] = useState<PackagingDraft[]>([]);
  const [biaya, setBiaya] = useState<BiayaDraft[]>([]);
  const [moq, setMoq] = useState<MoqDraft[]>([]);
  const [dimuat, setDimuat] = useState("");
  const master = useHppMasterData(header?.company_id ?? "");

  const produk = useRows<DbRow>("products", {
    scopeId,
    orderBy: "name",
    asc: true,
    archived: false,
  });
  const klien = useRows<DbRow>("clients", {
    scopeId,
    orderBy: "owner_name",
    asc: true,
    archived: false,
  });
  const brand = useRows<DbRow>("brands", { scopeId, orderBy: "name", asc: true, archived: false });

  const simpan = useSimpanHpp();
  const aktifkan = useAktifkanVersi();
  const versiBaru = useBuatVersiBaru();

  useEffect(() => {
    const d = detail.data;
    if (!d || dimuat === id) return;
    setHeader(headerDariRow(d.versi));
    setBahan(d.bahan.map(bahanDariRow));
    setPackaging(d.packaging.map(packagingDariRow));
    setBiaya(d.biaya.map(biayaDariRow));
    setMoq(d.moq.map(moqDariRow));
    setDimuat(id);
  }, [detail.data, id, dimuat]);

  const draft = useMemo(
    () => (header ? { header, bahan, packaging, biaya, moq } : null),
    [header, bahan, packaging, biaya, moq],
  );
  const hasil = useMemo(() => (draft ? ringkasanDraft(draft) : null), [draft]);
  const simulasi = useMemo(
    () => (draft && hasil ? simulasiDariDraft(draft, hasil.hppPerUnit) : []),
    [draft, hasil],
  );

  const totalPersen = useMemo(
    () =>
      totalPersentase(bahan.map((b) => ({ usage_percentage: Number(b.usage_percentage ?? 0) }))),
    [bahan],
  );

  if (detail.isLoading || !header || !hasil) {
    return detail.isError ? (
      <ErrorState onRetry={() => void detail.refetch()} />
    ) : (
      <LoadingSkeleton rows={6} />
    );
  }

  const setH = (patch: Partial<HeaderDraft>) => setHeader({ ...header, ...patch });
  const perusahaan = companyById(header.company_id);
  const estimasi = estimasiHasil(
    Number(header.planned_quantity ?? 0),
    Number(header.estimated_reject_percentage ?? 0),
    Number(header.estimated_shrinkage_percentage ?? 0),
  );
  const peringatan = validasiKalkulasi({
    totalPersen,
    formulaBasis: Number(header.formula_basis ?? 0),
    formulaBasisUnit: header.formula_basis_unit,
    netContent: header.net_content,
    netContentUnit: header.net_content_unit,
    bahan: bahan.map((b) => ({
      material_name_snapshot: b.material_name_snapshot || "(tanpa nama)",
      normalized_unit_price_snapshot: hargaDasarBahan(b),
    })),
    packaging: packaging.map((p) => ({
      packaging_name_snapshot: p.packaging_name_snapshot || "(tanpa nama)",
      unit_price_snapshot: Number(p.unit_price_snapshot ?? 0),
    })),
    hpp: hasil.hppPerUnit,
    status: header.status,
  });
  const dapatDiaktifkan = bolehDiaktifkan(totalPersen, hasil.hppPerUnit);
  const namaProduk =
    (produk.data ?? []).find((p) => String(p["id"]) === header.product_id)?.["name"] ?? "-";

  const eksporCsv = () => {
    const baris: (string | number)[][] = [
      ["Kalkulasi HPP", String(namaProduk), `Versi ${header.version_number}`],
      [],
      ["Bahan", "Kategori", "% Pakai", "Harga satuan", "Kebutuhan", "Waste %", "Biaya"],
      ...bahan.map((b) => {
        const dasar = hargaDasarBahan(b);
        const kebutuhan =
          (Number(b.usage_percentage ?? 0) / 100) * Number(header.formula_basis ?? 0);
        return [
          b.material_name_snapshot,
          b.category,
          Number(b.usage_percentage ?? 0),
          dasar,
          kebutuhan,
          Number(b.waste_percentage ?? 0),
          dasar * kebutuhan * (1 + Number(b.waste_percentage ?? 0) / 100),
        ];
      }),
      [],
      ["Packaging", "Jumlah", "Harga satuan", "Kapasitas", "Waste %"],
      ...packaging.map((p) => [
        p.packaging_name_snapshot,
        Number(p.usage_quantity ?? 0),
        Number(p.unit_price_snapshot ?? 0),
        Number(p.capacity_quantity ?? 1),
        Number(p.waste_percentage ?? 0),
      ]),
      [],
      ["Total formula", hasil.totalFormula],
      ["Total packaging", hasil.totalPackaging],
      ...(hasil.combinedBtklOhp > 0
        ? ([["BTKL + OHP", hasil.combinedBtklOhp]] as (string | number)[][])
        : ([
            ["BTKL", hasil.btkl],
            ["OHP", hasil.ohp],
          ] as (string | number)[][])),
      ["Biaya tambahan", hasil.biayaTambahan],
      ["HPP per unit", hasil.hppPerUnit],
      ["HPP per batch", hasil.hppBatch],
      [],
      [
        "MOQ",
        "Metode",
        "HNC (sebelum PPN)",
        "HNC + PPN 11%",
        "HNC + PPN 12%",
        "Harga termasuk PPN",
        "Laba/unit",
        "Margin %",
      ],
      ...simulasi.map(({ draft: m, hasil: r }) => [
        Number(m.moq_quantity ?? 0),
        m.pricing_method,
        r.priceBeforeTax,
        r.priceAfterTax11,
        r.priceAfterTax12,
        r.roundedPrice,
        r.profitPerUnit,
        r.actualMargin,
      ]),
    ];
    unduhCsv(
      `hpp-${String(namaProduk).toLowerCase().replace(/\s+/g, "-")}-v${header.version_number}`,
      baris,
    );
  };

  const hargaAcuan = simulasi.reduce<(typeof simulasi)[number] | null>(
    (terendah, baris) =>
      !terendah || baris.hasil.roundedPrice < terendah.hasil.roundedPrice ? baris : terendah,
    null,
  );
  const hargaTerendah = hargaAcuan?.hasil.roundedPrice ?? 0;
  const isLegacy =
    (detail.data?.legacyItems.length ?? 0) > 0 &&
    (detail.data?.bahan.length ?? 0) === 0 &&
    (detail.data?.packaging.length ?? 0) === 0 &&
    (detail.data?.biaya.length ?? 0) === 0;

  return (
    <>
      <PageHeader
        title={`Kalkulasi HPP — ${String(namaProduk)}`}
        description={`Versi ${header.version_number} · ${perusahaan?.name ?? "-"} · dibuat ${tanggalPendek(header.created_date)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" asChild>
              <Link to="/app/costings">
                <ArrowLeft className="size-4" aria-hidden /> Daftar
              </Link>
            </Button>
            <Button variant="outline" onClick={eksporCsv}>
              <Download className="size-4" aria-hidden /> CSV
            </Button>
            <Button
              variant="outline"
              disabled={versiBaru.isPending || isLegacy}
              onClick={() =>
                versiBaru.mutate(
                  { sumberId: id, alasan: "Duplikasi dari versi sebelumnya" },
                  {
                    onSuccess: (newId) => {
                      setDimuat("");
                      void navigate({ to: "/app/costings/$id", params: { id: newId } });
                    },
                  },
                )
              }
            >
              <GitBranch className="size-4" aria-hidden /> Versi baru
            </Button>
            <Button
              variant="outline"
              disabled={!dapatDiaktifkan || aktifkan.isPending || header.status === "aktif"}
              onClick={() =>
                aktifkan.mutate(
                  {
                    id,
                    productId: header.product_id ?? "",
                    harga: {
                      clientPrice: hargaTerendah,
                      netPrice: hargaAcuan?.hasil.priceBeforeTax ?? hargaTerendah,
                      hpp: hasil.hppPerUnit,
                      companyId: header.company_id,
                    },
                  },
                  { onSuccess: () => setH({ status: "aktif" }) },
                )
              }
            >
              <CheckCircle2 className="size-4" aria-hidden /> Aktifkan
            </Button>
            <Button
              disabled={simpan.isPending || isLegacy}
              onClick={() => simpan.mutate({ id, header, bahan, packaging, biaya, moq })}
            >
              <Save className="size-4" aria-hidden /> Simpan
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {isLegacy ? (
            <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div>
                <p className="font-medium">Versi ini dibuat dengan format HPP lama.</p>
                <p className="mt-1">
                  {angka(detail.data?.legacyItems.length ?? 0)} komponen biaya asli tetap tersimpan
                  dan versi ini dibuat hanya-baca agar tidak tertimpa. Buat versi lengkap baru dari
                  daftar HPP untuk memakai formula, packaging, BTKL/OHP, dan MOQ.
                </p>
              </div>
            </div>
          ) : null}
          <section className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-medium text-muted-foreground">Identitas kalkulasi</h2>
              <StatusBadge status={header.status} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label htmlFor="produk">Produk</Label>
                <Select
                  value={header.product_id ?? ""}
                  onValueChange={(v) => setH({ product_id: v })}
                >
                  <SelectTrigger id="produk">
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                  <SelectContent>
                    {(produk.data ?? []).map((p) => (
                      <SelectItem key={String(p["id"])} value={String(p["id"])}>
                        {String(p["name"])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="klien">Klien</Label>
                <Select
                  value={header.client_id ?? ""}
                  onValueChange={(v) => setH({ client_id: v })}
                >
                  <SelectTrigger id="klien">
                    <SelectValue placeholder="Pilih klien" />
                  </SelectTrigger>
                  <SelectContent>
                    {(klien.data ?? []).map((c) => (
                      <SelectItem key={String(c["id"])} value={String(c["id"])}>
                        {String(c["owner_name"])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand">Brand</Label>
                <Select value={header.brand_id ?? ""} onValueChange={(v) => setH({ brand_id: v })}>
                  <SelectTrigger id="brand">
                    <SelectValue placeholder="Pilih brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {(brand.data ?? []).map((b) => (
                      <SelectItem key={String(b["id"])} value={String(b["id"])}>
                        {String(b["name"])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="varian">Varian</Label>
                <Input
                  id="varian"
                  value={header.product_variant}
                  onChange={(e) => setH({ product_variant: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nama-versi">Nama versi</Label>
                <Input
                  id="nama-versi"
                  value={header.version_name}
                  onChange={(e) => setH({ version_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="isi-bersih">Isi bersih</Label>
                <div className="flex gap-2">
                  <DecimalInput
                    id="isi-bersih"
                    value={header.net_content}
                    onChange={(v) => setH({ net_content: v })}
                  />
                  <Select
                    value={header.net_content_unit}
                    onValueChange={(v) => setH({ net_content_unit: v })}
                  >
                    <SelectTrigger className="w-28" aria-label="Satuan isi bersih">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_ISI.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="basis">Basis formula / volume produk</Label>
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
                <div className="flex gap-2">
                  <DecimalInput
                    id="basis"
                    value={header.formula_basis}
                    onChange={(v) => setH({ formula_basis: v })}
                  />
                  <Select
                    value={header.formula_basis_unit}
                    onValueChange={(v) => setH({ formula_basis_unit: v })}
                  >
                    <SelectTrigger className="w-28" aria-label="Satuan basis formula">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_ISI.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="jumlah">Jumlah produksi</Label>
                <div className="flex gap-2">
                  <QuantityInput
                    id="jumlah"
                    value={header.planned_quantity}
                    onChange={(v) => setH({ planned_quantity: v })}
                  />
                  <Select
                    value={header.output_unit}
                    onValueChange={(v) => setH({ output_unit: v })}
                  >
                    <SelectTrigger className="w-28" aria-label="Satuan produksi">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SATUAN_PRODUK.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="reject">Estimasi reject (%)</Label>
                <PercentageInput
                  id="reject"
                  max={100}
                  value={header.estimated_reject_percentage}
                  onChange={(v) => setH({ estimated_reject_percentage: v })}
                />
              </div>
              <div>
                <Label htmlFor="susut">Estimasi penyusutan (%)</Label>
                <PercentageInput
                  id="susut"
                  max={100}
                  value={header.estimated_shrinkage_percentage}
                  onChange={(v) => setH({ estimated_shrinkage_percentage: v })}
                />
              </div>
              <div>
                <Label htmlFor="pajak">Pajak (%)</Label>
                <Select
                  value={String(header.tax_percentage ?? 0)}
                  onValueChange={(v) => setH({ tax_percentage: Number(v) })}
                >
                  <SelectTrigger id="pajak">
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
                <Label htmlFor="bulat">Pembulatan harga</Label>
                <Select
                  value={header.rounding_method}
                  onValueChange={(v) => setH({ rounding_method: v })}
                >
                  <SelectTrigger id="bulat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPSI_PEMBULATAN.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Tabs defaultValue="formula">
            <TabsList className="flex w-full flex-wrap justify-start">
              <TabsTrigger value="formula">Formula</TabsTrigger>
              <TabsTrigger value="packaging">Packaging</TabsTrigger>
              <TabsTrigger value="operasional">BTKL & OHP</TabsTrigger>
              <TabsTrigger value="moq">Simulasi MOQ</TabsTrigger>
              <TabsTrigger value="catatan">Catatan</TabsTrigger>
            </TabsList>

            <TabsContent value="formula" className="mt-4">
              <FormulaIngredientsTable
                bahan={bahan}
                onChange={setBahan}
                formulaBasis={Number(header.formula_basis ?? 0)}
                catalog={master.materials}
                readOnly={isLegacy}
              />
            </TabsContent>

            <TabsContent value="packaging" className="mt-4">
              <PackagingTable
                packaging={packaging}
                onChange={setPackaging}
                catalog={master.packaging}
                readOnly={isLegacy}
              />
            </TabsContent>

            <TabsContent value="operasional" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-border/70 bg-card p-4">
                <div className="min-w-56">
                  <Label htmlFor="mode-overhead">Mode overhead</Label>
                  <Select
                    value={header.overhead_mode}
                    onValueChange={(v) =>
                      setH({ overhead_mode: v === "terpisah" ? "terpisah" : "gabungan" })
                    }
                  >
                    <SelectTrigger id="mode-overhead">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gabungan">Gabungan (satu persentase)</SelectItem>
                      <SelectItem value="terpisah">Terpisah (rincian baris)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {header.overhead_mode === "gabungan" ? (
                  <div className="min-w-48">
                    <Label htmlFor="overhead">BTKL + OHP (% dari formula + packaging)</Label>
                    <PercentageInput
                      id="overhead"
                      value={header.combined_overhead_percentage}
                      onChange={(v) => setH({ combined_overhead_percentage: v })}
                    />
                  </div>
                ) : null}
                <p className="num text-sm text-muted-foreground">
                  Total operasional {rupiah(hasil.totalOperasional, true)} / unit
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

            <TabsContent value="moq" className="mt-4">
              <MoqSimulationTable
                baris={simulasi}
                onChange={setMoq}
                pajak={Number(header.tax_percentage ?? 0)}
              />
            </TabsContent>

            <TabsContent value="catatan" className="mt-4">
              <div className="grid gap-4 rounded-2xl border border-border/70 bg-card p-5 sm:grid-cols-2">
                <div>
                  <Label htmlFor="alasan">Alasan perubahan</Label>
                  <Textarea
                    id="alasan"
                    value={header.change_reason}
                    onChange={(e) => setH({ change_reason: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="catatan">Catatan internal</Label>
                  <Textarea
                    id="catatan"
                    value={header.notes}
                    onChange={(e) => setH({ notes: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="berlaku">Berlaku sejak</Label>
                  <Input
                    id="berlaku"
                    type="date"
                    value={header.effective_at ? header.effective_at.slice(0, 10) : ""}
                    onChange={(e) => setH({ effective_at: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="harga-acuan">Harga acuan terendah (termasuk PPN)</Label>
                  <CurrencyInput
                    id="harga-acuan"
                    value={hargaTerendah}
                    disabled
                    onChange={() => {}}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Harga final ini dipakai saat versi diaktifkan ({angka(simulasi.length)} tier
                    MOQ). Margin tetap dihitung dari HNC sebelum PPN.
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <aside className="xl:sticky xl:top-4 xl:self-start">
          <HppSummaryCard
            hasil={hasil}
            jumlahUnit={Number(header.planned_quantity ?? 0)}
            layakJual={estimasi.layakJual}
            reject={estimasi.reject}
            penyusutan={estimasi.penyusutan}
            peringatan={peringatan}
          />
        </aside>
      </div>
    </>
  );
}
