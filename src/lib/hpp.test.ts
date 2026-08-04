import { describe, expect, it } from "vitest";
import {
  bulatkanHarga,
  hargaDariMarkup,
  hargaDariTargetMargin,
  hargaSatuanDasar,
  hitungBahan,
  hitungHpp,
  hitungPackaging,
  hitungSimulasiMoq,
  kebutuhanBahan,
  statusFormula,
} from "./hpp";

// Data contoh hanya untuk pengujian, tidak dimasukkan ke database.

describe("konversi harga supplier", () => {
  it("kilogram menjadi harga per gram", () => {
    expect(hargaSatuanDasar(180_000, 1, "kg")).toBeCloseTo(180, 6);
  });
  it("liter menjadi harga per ml", () => {
    expect(hargaSatuanDasar(650_000, 5, "liter")).toBeCloseTo(130, 6);
  });
  it("jumlah pembelian nol tidak membuat pembagian nol", () => {
    expect(hargaSatuanDasar(100_000, 0, "kg")).toBe(0);
  });
});

describe("kebutuhan dan biaya bahan", () => {
  it("87,498% dari basis 25 gram", () => {
    expect(kebutuhanBahan(87.498, 25)).toBeCloseTo(21.8745, 6);
  });
  it("biaya bahan sesuai contoh spreadsheet", () => {
    const r = hitungBahan(
      { usage_percentage: 87.498, normalized_unit_price_snapshot: 77.46667, waste_percentage: 0 },
      25,
    );
    expect(r.finalCost).toBeCloseTo(1694.54, 1);
  });
  it("waste menaikkan biaya", () => {
    const r = hitungBahan(
      { usage_percentage: 10, normalized_unit_price_snapshot: 100, waste_percentage: 5 },
      25,
    );
    expect(r.baseCost).toBeCloseTo(250, 6);
    expect(r.finalCost).toBeCloseTo(262.5, 6);
  });
});

describe("status formula", () => {
  it("mendeteksi kurang, pas, dan lebih", () => {
    expect(statusFormula(87.5)).toBe("kurang");
    expect(statusFormula(100)).toBe("pas");
    expect(statusFormula(100.0005)).toBe("pas");
    expect(statusFormula(103)).toBe("lebih");
  });
});

describe("packaging", () => {
  it("master box dibagi kapasitas produk", () => {
    const r = hitungPackaging({
      usage_quantity: 1,
      unit_price_snapshot: 25_000,
      capacity_quantity: 50,
      waste_percentage: 0,
    });
    expect(r.finalCost).toBeCloseTo(500, 6);
  });
});

describe("HPP mengikuti contoh spreadsheet", () => {
  // total formula Rp2.600,93 dan packaging Rp3.700 direplikasi lewat baris sintetis
  const hasil = hitungHpp({
    bahan: [
      { usage_percentage: 100, normalized_unit_price_snapshot: 2600.93 / 25, waste_percentage: 0 },
    ],
    packaging: [
      { usage_quantity: 1, unit_price_snapshot: 3700, capacity_quantity: 1, waste_percentage: 0 },
    ],
    formulaBasis: 25,
    overheadMode: "gabungan",
    combinedOverheadPercentage: 20,
    biayaOperasional: [],
    jumlahUnit: 1000,
  });

  it("subtotal formula + packaging", () => {
    expect(hasil.totalFormula).toBeCloseTo(2600.93, 2);
    expect(hasil.totalPackaging).toBeCloseTo(3700, 2);
    expect(hasil.subtotal).toBeCloseTo(6300.93, 2);
  });

  it("BTKL + OHP 20%", () => {
    expect(Math.abs(hasil.btkl - 1260.19)).toBeLessThanOrEqual(1);
  });

  it("HPP final dalam toleransi Rp1", () => {
    expect(Math.abs(hasil.hppPerUnit - 7561.12)).toBeLessThanOrEqual(1);
  });

  it("HPP batch = HPP unit × jumlah unit", () => {
    expect(hasil.hppBatch).toBeCloseTo(hasil.hppPerUnit * 1000, 4);
  });
});

describe("simulasi harga MOQ", () => {
  const hpp = 7561.116;
  const kasus = [
    { moq: 200, markup: 120, harga: 16634.47 },
    { moq: 500, markup: 100, harga: 15122.24 },
    { moq: 1000, markup: 90, harga: 14366.13 },
    { moq: 2000, markup: 80, harga: 13610.02 },
    { moq: 5000, markup: 30, harga: 9829.46 },
  ];
  for (const k of kasus) {
    it(`MOQ ${k.moq} markup ${k.markup}%`, () => {
      const r = hitungSimulasiMoq(hpp, {
        moq_quantity: k.moq,
        pricing_method: "markup",
        markup_percentage: k.markup,
        target_margin_percentage: 0,
        tax_percentage: 11,
        rounding_method: "tanpa",
      });
      expect(Math.abs(r.priceBeforeTax - k.harga)).toBeLessThanOrEqual(1);
    });
  }

  it("PPN 11% dan 12% dihitung berdampingan", () => {
    const r = hitungSimulasiMoq(10_000, {
      moq_quantity: 100,
      pricing_method: "markup",
      markup_percentage: 0,
      target_margin_percentage: 0,
      tax_percentage: 11,
      rounding_method: "tanpa",
    });
    expect(r.priceAfterTax11).toBeCloseTo(11_100, 6);
    expect(r.priceAfterTax12).toBeCloseTo(11_200, 6);
    expect(r.priceAfterTax).toBeCloseTo(11_100, 6);
  });
});

describe("markup berbeda dengan margin", () => {
  it("markup 100% bukan margin 100%", () => {
    expect(hargaDariMarkup(1000, 100)).toBeCloseTo(2000, 6);
    expect(hargaDariTargetMargin(1000, 50)).toBeCloseTo(2000, 6);
  });
  it("margin >= 100% ditolak", () => {
    expect(hargaDariTargetMargin(1000, 100)).toBe(0);
  });
});

describe("pembulatan", () => {
  it("mengikuti metode terpilih", () => {
    expect(bulatkanHarga(16634.47, "tanpa")).toBeCloseTo(16634.47, 6);
    expect(bulatkanHarga(16634.47, "rupiah")).toBe(16634);
    expect(bulatkanHarga(16634.47, "ratusan")).toBe(16600);
    expect(bulatkanHarga(16634.47, "lima_ratus")).toBe(16500);
    expect(bulatkanHarga(16634.47, "ribuan")).toBe(17000);
    expect(bulatkanHarga(16634.47, "atas_ratusan")).toBe(16700);
    expect(bulatkanHarga(16634.47, "bawah_ratusan")).toBe(16600);
  });
});

describe("mode biaya terpisah", () => {
  it("BTKL dan OHP dihitung terpisah dengan dasar berbeda", () => {
    const r = hitungHpp({
      bahan: [{ usage_percentage: 100, normalized_unit_price_snapshot: 100, waste_percentage: 0 }],
      packaging: [
        { usage_quantity: 1, unit_price_snapshot: 2000, capacity_quantity: 1, waste_percentage: 0 },
      ],
      formulaBasis: 10, // formula = 1000
      overheadMode: "terpisah",
      combinedOverheadPercentage: 0,
      biayaOperasional: [
        {
          cost_category: "btkl",
          calculation_type: "persentase",
          percentage_value: 10,
          fixed_value: 0,
          calculation_base: "formula_packaging",
        },
        {
          cost_category: "ohp",
          calculation_type: "nominal_batch",
          percentage_value: 0,
          fixed_value: 500_000,
          calculation_base: "formula_packaging",
        },
        {
          cost_category: "qc",
          calculation_type: "nominal_unit",
          percentage_value: 0,
          fixed_value: 50,
          calculation_base: "formula_packaging",
        },
      ],
      jumlahUnit: 1000,
    });
    expect(r.subtotal).toBeCloseTo(3000, 6);
    expect(r.btkl).toBeCloseTo(300, 6);
    expect(r.ohp).toBeCloseTo(500, 6);
    expect(r.biayaTambahan).toBeCloseTo(50, 6);
    expect(r.hppPerUnit).toBeCloseTo(3850, 6);
  });

  it("biaya tetap batch menurunkan HPP saat volume naik", () => {
    const buat = (unit: number) =>
      hitungHpp({
        bahan: [{ usage_percentage: 100, normalized_unit_price_snapshot: 100, waste_percentage: 0 }],
        packaging: [],
        formulaBasis: 10,
        overheadMode: "terpisah",
        combinedOverheadPercentage: 0,
        biayaOperasional: [
          {
            cost_category: "ohp",
            calculation_type: "nominal_batch",
            percentage_value: 0,
            fixed_value: 1_000_000,
            calculation_base: "formula_packaging",
          },
        ],
        jumlahUnit: unit,
      }).hppPerUnit;
    expect(buat(2000)).toBeLessThan(buat(500));
  });
});
