/**
 * Mesin perhitungan HPP maklon.
 * Seluruh fungsi bersifat murni (pure) dan memakai nilai mentah presisi penuh.
 * Pembulatan hanya dilakukan pada lapisan tampilan atau lewat `bulatkanHarga`.
 */

// ---------- Satuan ----------

export type SatuanDasar = "gram" | "ml" | "pcs";

export const SATUAN_PEMBELIAN = [
  { value: "kg", label: "Kilogram (kg)", dasar: "gram" as SatuanDasar, faktor: 1000 },
  { value: "gram", label: "Gram (g)", dasar: "gram" as SatuanDasar, faktor: 1 },
  { value: "liter", label: "Liter (L)", dasar: "ml" as SatuanDasar, faktor: 1000 },
  { value: "ml", label: "Mililiter (ml)", dasar: "ml" as SatuanDasar, faktor: 1 },
  { value: "pcs", label: "Pcs", dasar: "pcs" as SatuanDasar, faktor: 1 },
];

export const SATUAN_PRODUK = [
  "pcs",
  "sachet",
  "tablet",
  "kapsul",
  "botol",
  "tube",
  "jar",
  "dus",
  "gram",
  "kg",
  "ml",
  "liter",
];

export const SATUAN_ISI = ["gram", "kg", "ml", "liter", "pcs"];

export const KATEGORI_BAHAN = [
  "bahan_baku_utama",
  "bahan_aktif",
  "bahan_tambahan",
  "minyak",
  "ekstrak",
  "pemanis",
  "perisa",
  "pewarna",
  "pengawet",
  "bahan_pendukung",
  "lainnya",
];

export const KATEGORI_PACKAGING = [
  "tube",
  "botol",
  "jar",
  "pouch",
  "sachet",
  "sticker",
  "label",
  "dus_satuan",
  "master_box",
  "shrink",
  "segel",
  "sendok_takar",
  "silica_gel",
  "inner_box",
  "outer_box",
  "lainnya",
];

export const KATEGORI_BIAYA_OPERASIONAL = [
  "btkl",
  "ohp",
  "qc",
  "pengujian",
  "legalitas",
  "desain",
  "produksi_tambahan",
  "penyusutan_mesin",
  "administrasi",
  "pengiriman_internal",
  "lainnya",
];

export const BASIS_PERHITUNGAN = [
  { value: "formula", label: "Total formula" },
  { value: "packaging", label: "Total packaging" },
  { value: "formula_packaging", label: "Formula + packaging" },
  { value: "hpp_berjalan", label: "HPP sebelum biaya ini" },
];

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Info satuan pembelian; default kilogram. */
export function infoSatuan(unit: string) {
  return SATUAN_PEMBELIAN.find((s) => s.value === unit) ?? SATUAN_PEMBELIAN[0]!;
}

/** Konversi jumlah pembelian ke satuan dasar (gram / ml / pcs). */
export function jumlahDasar(purchaseQuantity: number, purchaseUnit: string): number {
  return num(purchaseQuantity) * infoSatuan(purchaseUnit).faktor;
}

/** Harga per gram atau per ml dari harga pembelian supplier. */
export function hargaSatuanDasar(
  purchasePrice: number,
  purchaseQuantity: number,
  purchaseUnit: string,
): number {
  const dasar = jumlahDasar(purchaseQuantity, purchaseUnit);
  if (dasar <= 0) return 0;
  return num(purchasePrice) / dasar;
}

/** Harga per kg atau per liter (1000x satuan dasar), berguna untuk tampilan. */
export function hargaPerSatuanBesar(hargaDasar: number): number {
  return num(hargaDasar) * 1000;
}

// ---------- Formula bahan ----------

export type BahanInput = {
  usage_percentage: number;
  normalized_unit_price_snapshot: number;
  waste_percentage: number;
};

export type BahanHitung = {
  requiredQuantity: number;
  baseCost: number;
  finalCost: number;
};

/** kebutuhan = persentase / 100 × basis formula */
export function kebutuhanBahan(usagePercentage: number, formulaBasis: number): number {
  return (num(usagePercentage) / 100) * num(formulaBasis);
}

export function hitungBahan(bahan: BahanInput, formulaBasis: number): BahanHitung {
  const requiredQuantity = kebutuhanBahan(bahan.usage_percentage, formulaBasis);
  const baseCost = requiredQuantity * num(bahan.normalized_unit_price_snapshot);
  const finalCost = baseCost * (1 + num(bahan.waste_percentage) / 100);
  return { requiredQuantity, baseCost, finalCost };
}

export const TOLERANSI_PERSEN = 0.001;

export type StatusFormula = "kurang" | "pas" | "lebih";

export function totalPersentase(bahan: { usage_percentage: number }[]): number {
  return bahan.reduce((s, b) => s + num(b.usage_percentage), 0);
}

export function statusFormula(total: number): StatusFormula {
  if (Math.abs(total - 100) <= TOLERANSI_PERSEN) return "pas";
  return total < 100 ? "kurang" : "lebih";
}

export function totalBiayaFormula(bahan: BahanInput[], formulaBasis: number): number {
  return bahan.reduce((s, b) => s + hitungBahan(b, formulaBasis).finalCost, 0);
}

// ---------- Packaging ----------

export type PackagingInput = {
  usage_quantity: number;
  unit_price_snapshot: number;
  capacity_quantity: number;
  waste_percentage: number;
};

/**
 * Biaya packaging per produk.
 * Kapasitas > 1 berarti satu kemasan dipakai untuk beberapa produk (mis. master box).
 */
export function hitungPackaging(item: PackagingInput): { baseCost: number; finalCost: number } {
  const kapasitas = num(item.capacity_quantity) > 0 ? num(item.capacity_quantity) : 1;
  const baseCost = (num(item.usage_quantity) * num(item.unit_price_snapshot)) / kapasitas;
  const finalCost = baseCost * (1 + num(item.waste_percentage) / 100);
  return { baseCost, finalCost };
}

export function totalBiayaPackaging(items: PackagingInput[]): number {
  return items.reduce((s, i) => s + hitungPackaging(i).finalCost, 0);
}

// ---------- Biaya operasional (BTKL, OHP, dll) ----------

export type BiayaOperasionalInput = {
  cost_category: string;
  calculation_type: "persentase" | "nominal_unit" | "nominal_batch" | string;
  percentage_value: number;
  fixed_value: number;
  calculation_base: string;
};

export type KonteksBiaya = {
  totalFormula: number;
  totalPackaging: number;
  /** akumulasi HPP sebelum biaya ini dihitung */
  hppBerjalan: number;
  /** jumlah unit untuk membagi biaya tetap per batch */
  jumlahUnit: number;
};

export function dasarPerhitungan(base: string, ctx: KonteksBiaya): number {
  switch (base) {
    case "formula":
      return ctx.totalFormula;
    case "packaging":
      return ctx.totalPackaging;
    case "hpp_berjalan":
      return ctx.hppBerjalan;
    case "formula_packaging":
    default:
      return ctx.totalFormula + ctx.totalPackaging;
  }
}

/** Nominal satu baris biaya operasional, selalu dalam rupiah per unit. */
export function hitungBiayaOperasional(
  biaya: BiayaOperasionalInput,
  ctx: KonteksBiaya,
): number {
  if (biaya.calculation_type === "nominal_unit") return num(biaya.fixed_value);
  if (biaya.calculation_type === "nominal_batch") {
    const unit = num(ctx.jumlahUnit) > 0 ? num(ctx.jumlahUnit) : 1;
    return num(biaya.fixed_value) / unit;
  }
  return (dasarPerhitungan(biaya.calculation_base, ctx) * num(biaya.percentage_value)) / 100;
}

// ---------- HPP ----------

export type HppInput = {
  bahan: BahanInput[];
  packaging: PackagingInput[];
  formulaBasis: number;
  overheadMode: "gabungan" | "terpisah" | string;
  /** dipakai pada mode gabungan: persentase BTKL + OHP dari formula + packaging */
  combinedOverheadPercentage: number;
  /** dipakai pada mode terpisah */
  biayaOperasional: BiayaOperasionalInput[];
  jumlahUnit: number;
};

export type HppResult = {
  totalFormula: number;
  totalPackaging: number;
  subtotal: number;
  btkl: number;
  ohp: number;
  biayaTambahan: number;
  totalOperasional: number;
  /** rincian nominal per baris biaya operasional (mode terpisah) */
  rincianOperasional: number[];
  hppPerUnit: number;
  hppBatch: number;
};

export function hitungHpp(input: HppInput): HppResult {
  const totalFormula = totalBiayaFormula(input.bahan, input.formulaBasis);
  const totalPackaging = totalBiayaPackaging(input.packaging);
  const subtotal = totalFormula + totalPackaging;

  let btkl = 0;
  let ohp = 0;
  let biayaTambahan = 0;
  const rincianOperasional: number[] = [];

  if (input.overheadMode === "gabungan") {
    const gabungan = (subtotal * num(input.combinedOverheadPercentage)) / 100;
    btkl = gabungan;
  } else {
    let hppBerjalan = subtotal;
    for (const b of input.biayaOperasional) {
      const nominal = hitungBiayaOperasional(b, {
        totalFormula,
        totalPackaging,
        hppBerjalan,
        jumlahUnit: input.jumlahUnit,
      });
      rincianOperasional.push(nominal);
      hppBerjalan += nominal;
      if (b.cost_category === "btkl") btkl += nominal;
      else if (b.cost_category === "ohp") ohp += nominal;
      else biayaTambahan += nominal;
    }
  }

  const totalOperasional = btkl + ohp + biayaTambahan;
  const hppPerUnit = subtotal + totalOperasional;
  const unit = num(input.jumlahUnit);

  return {
    totalFormula,
    totalPackaging,
    subtotal,
    btkl,
    ohp,
    biayaTambahan,
    totalOperasional,
    rincianOperasional,
    hppPerUnit,
    hppBatch: hppPerUnit * (unit > 0 ? unit : 0),
  };
}

/** Estimasi hasil produksi setelah reject dan penyusutan. */
export function estimasiHasil(
  jumlahProduksi: number,
  rejectPersen: number,
  penyusutanPersen: number,
) {
  const total = num(jumlahProduksi);
  const reject = (total * num(rejectPersen)) / 100;
  const susut = (total * num(penyusutanPersen)) / 100;
  return {
    reject,
    penyusutan: susut,
    layakJual: Math.max(total - reject - susut, 0),
  };
}

// ---------- Harga jual ----------

export type MetodeHarga = "markup" | "target_margin" | "laba_tetap" | "manual";

export function hargaDariMarkup(hpp: number, markupPersen: number): number {
  return num(hpp) * (1 + num(markupPersen) / 100);
}

export function hargaDariTargetMargin(hpp: number, marginPersen: number): number {
  const m = num(marginPersen);
  if (m >= 100 || m < 0) return 0;
  return num(hpp) / (1 - m / 100);
}

export type PembulatanMethod =
  | "tanpa"
  | "rupiah"
  | "puluhan"
  | "ratusan"
  | "lima_ratus"
  | "ribuan"
  | "atas_ratusan"
  | "bawah_ratusan";

export const OPSI_PEMBULATAN: { value: PembulatanMethod; label: string }[] = [
  { value: "tanpa", label: "Tanpa pembulatan" },
  { value: "rupiah", label: "Rupiah terdekat" },
  { value: "puluhan", label: "Kelipatan Rp10" },
  { value: "ratusan", label: "Kelipatan Rp100" },
  { value: "lima_ratus", label: "Kelipatan Rp500" },
  { value: "ribuan", label: "Kelipatan Rp1.000" },
  { value: "atas_ratusan", label: "Selalu ke atas (Rp100)" },
  { value: "bawah_ratusan", label: "Selalu ke bawah (Rp100)" },
];

export function bulatkanHarga(harga: number, metode: PembulatanMethod | string): number {
  const h = num(harga);
  switch (metode) {
    case "rupiah":
      return Math.round(h);
    case "puluhan":
      return Math.round(h / 10) * 10;
    case "ratusan":
      return Math.round(h / 100) * 100;
    case "lima_ratus":
      return Math.round(h / 500) * 500;
    case "ribuan":
      return Math.round(h / 1000) * 1000;
    case "atas_ratusan":
      return Math.ceil(h / 100) * 100;
    case "bawah_ratusan":
      return Math.floor(h / 100) * 100;
    case "tanpa":
    default:
      return h;
  }
}

export type SimulasiMoqInput = {
  moq_quantity: number;
  pricing_method: MetodeHarga | string;
  markup_percentage: number;
  target_margin_percentage: number;
  fixed_profit?: number;
  manual_price?: number | null;
  tax_percentage: number;
  rounding_method: PembulatanMethod | string;
};

export type SimulasiMoqResult = {
  hpp: number;
  markupAmount: number;
  priceBeforeTax: number;
  taxAmount: number;
  priceAfterTax: number;
  tax11: number;
  priceAfterTax11: number;
  tax12: number;
  priceAfterTax12: number;
  roundedPrice: number;
  selisihPembulatan: number;
  profitPerUnit: number;
  totalProfit: number;
  actualMargin: number;
};

export function hitungSimulasiMoq(hpp: number, s: SimulasiMoqInput): SimulasiMoqResult {
  const h = num(hpp);
  let priceBeforeTax: number;
  switch (s.pricing_method) {
    case "target_margin":
      priceBeforeTax = hargaDariTargetMargin(h, s.target_margin_percentage);
      break;
    case "laba_tetap":
      priceBeforeTax = h + num(s.fixed_profit);
      break;
    case "manual":
      priceBeforeTax = num(s.manual_price);
      break;
    case "markup":
    default:
      priceBeforeTax = hargaDariMarkup(h, s.markup_percentage);
  }

  const taxPct = num(s.tax_percentage);
  const taxAmount = (priceBeforeTax * taxPct) / 100;
  const roundedPrice = bulatkanHarga(priceBeforeTax, s.rounding_method);
  const profitPerUnit = roundedPrice - h;

  return {
    hpp: h,
    markupAmount: priceBeforeTax - h,
    priceBeforeTax,
    taxAmount,
    priceAfterTax: priceBeforeTax + taxAmount,
    tax11: priceBeforeTax * 0.11,
    priceAfterTax11: priceBeforeTax * 1.11,
    tax12: priceBeforeTax * 0.12,
    priceAfterTax12: priceBeforeTax * 1.12,
    roundedPrice,
    selisihPembulatan: roundedPrice - priceBeforeTax,
    profitPerUnit,
    totalProfit: profitPerUnit * num(s.moq_quantity),
    actualMargin: roundedPrice > 0 ? (profitPerUnit / roundedPrice) * 100 : 0,
  };
}

/** Markup default per MOQ, dipakai hanya sebagai saran awal saat template belum dibuat. */
export const SARAN_TIER_MOQ = [
  { minimum_quantity: 200, percentage_value: 120 },
  { minimum_quantity: 500, percentage_value: 100 },
  { minimum_quantity: 1000, percentage_value: 90 },
  { minimum_quantity: 2000, percentage_value: 80 },
  { minimum_quantity: 5000, percentage_value: 30 },
];

// ---------- Validasi ----------

export type Peringatan = { level: "error" | "warning" | "info"; pesan: string };

export function validasiKalkulasi(opts: {
  totalPersen: number;
  formulaBasis: number;
  netContent: number | null;
  bahan: { material_name_snapshot: string; normalized_unit_price_snapshot: number }[];
  packaging: { packaging_name_snapshot: string; unit_price_snapshot: number }[];
  hpp: number;
  status: string;
}): Peringatan[] {
  const out: Peringatan[] = [];
  const st = statusFormula(opts.totalPersen);
  if (st === "kurang")
    out.push({
      level: "warning",
      pesan: `Total formula ${opts.totalPersen.toFixed(3)}% — masih kurang ${(100 - opts.totalPersen).toFixed(3)}%`,
    });
  if (st === "lebih")
    out.push({
      level: "error",
      pesan: `Total formula ${opts.totalPersen.toFixed(3)}% — kelebihan ${(opts.totalPersen - 100).toFixed(3)}%`,
    });
  if (opts.formulaBasis <= 0)
    out.push({ level: "error", pesan: "Basis formula belum diisi." });
  if (opts.netContent !== null && opts.netContent > 0 && opts.formulaBasis > 0 && opts.formulaBasis < opts.netContent)
    out.push({
      level: "warning",
      pesan: "Basis formula lebih kecil daripada isi bersih produk.",
    });
  for (const b of opts.bahan) {
    if (num(b.normalized_unit_price_snapshot) <= 0)
      out.push({ level: "warning", pesan: `Harga satuan "${b.material_name_snapshot}" masih nol.` });
  }
  for (const p of opts.packaging) {
    if (num(p.unit_price_snapshot) <= 0)
      out.push({ level: "warning", pesan: `Harga packaging "${p.packaging_name_snapshot}" masih nol.` });
  }
  if (opts.hpp <= 0) out.push({ level: "error", pesan: "HPP masih nol." });
  if (st !== "pas" && opts.status === "aktif")
    out.push({ level: "error", pesan: "Versi aktif wajib memiliki total formula tepat 100%." });
  return out;
}

export function bolehDiaktifkan(totalPersen: number, hpp: number): boolean {
  return statusFormula(totalPersen) === "pas" && num(hpp) > 0;
}
