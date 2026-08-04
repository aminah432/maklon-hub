import type { DbRow } from "@/lib/db";
import {
  hargaSatuanDasar,
  hitungBahan,
  hitungPackaging,
  type BiayaOperasionalInput,
} from "@/lib/hpp";

export type BahanDraft = {
  key: string;
  id?: string;
  material_id: string | null;
  supplier_price_id: string | null;
  material_name_snapshot: string;
  category: string;
  supplier_name_snapshot: string;
  usage_percentage: number | null;
  purchase_price_snapshot: number | null;
  purchase_quantity_snapshot: number | null;
  purchase_unit_snapshot: string;
  normalized_unit_price_snapshot: number | null;
  /** true bila harga per gram/ml diisi manual, bukan hasil konversi */
  override: boolean;
  override_reason: string;
  required_unit: string;
  waste_percentage: number | null;
  notes: string;
};

export type PackagingDraft = {
  key: string;
  id?: string;
  packaging_material_id: string | null;
  packaging_name_snapshot: string;
  category: string;
  supplier_name_snapshot: string;
  usage_quantity: number | null;
  usage_unit: string;
  unit_price_snapshot: number | null;
  capacity_quantity: number | null;
  waste_percentage: number | null;
  notes: string;
};

export type BiayaDraft = {
  key: string;
  id?: string;
  cost_name: string;
  cost_category: string;
  calculation_type: "persentase" | "nominal_unit" | "nominal_batch";
  percentage_value: number | null;
  fixed_value: number | null;
  calculation_base: string;
  notes: string;
};

export type MoqDraft = {
  key: string;
  id?: string;
  moq_quantity: number | null;
  pricing_method: string;
  markup_percentage: number | null;
  target_margin_percentage: number | null;
  manual_price: number | null;
};

export type HeaderDraft = {
  company_id: string;
  client_id: string | null;
  brand_id: string | null;
  product_id: string | null;
  product_variant: string;
  version_name: string;
  version_number: number;
  status: string;
  created_date: string;
  effective_at: string;
  net_content: number | null;
  net_content_unit: string;
  formula_basis: number | null;
  formula_basis_unit: string;
  planned_quantity: number | null;
  output_unit: string;
  estimated_reject_percentage: number | null;
  estimated_shrinkage_percentage: number | null;
  overhead_mode: "gabungan" | "terpisah";
  combined_overhead_percentage: number | null;
  tax_percentage: number | null;
  rounding_method: string;
  notes: string;
  change_reason: string;
};

export const kunci = () => Math.random().toString(36).slice(2);

export const bahanBaru = (): BahanDraft => ({
  key: kunci(),
  material_id: null,
  supplier_price_id: null,
  material_name_snapshot: "",
  category: "bahan_baku_utama",
  supplier_name_snapshot: "",
  usage_percentage: null,
  purchase_price_snapshot: null,
  purchase_quantity_snapshot: 1,
  purchase_unit_snapshot: "kg",
  normalized_unit_price_snapshot: null,
  override: false,
  override_reason: "",
  required_unit: "gram",
  waste_percentage: 0,
  notes: "",
});

export const packagingBaru = (): PackagingDraft => ({
  key: kunci(),
  packaging_material_id: null,
  packaging_name_snapshot: "",
  category: "lainnya",
  supplier_name_snapshot: "",
  usage_quantity: 1,
  usage_unit: "pcs",
  unit_price_snapshot: null,
  capacity_quantity: 1,
  waste_percentage: 0,
  notes: "",
});

export const biayaBaru = (kategori = "lainnya"): BiayaDraft => ({
  key: kunci(),
  cost_name: "",
  cost_category: kategori,
  calculation_type: "persentase",
  percentage_value: 0,
  fixed_value: 0,
  calculation_base: "formula_packaging",
  notes: "",
});

export const moqBaru = (qty: number, markup: number): MoqDraft => ({
  key: kunci(),
  moq_quantity: qty,
  pricing_method: "markup",
  markup_percentage: markup,
  target_margin_percentage: 0,
  manual_price: null,
});

/** harga per gram/ml efektif; hasil konversi kecuali di-override manual */
export function hargaDasarBahan(b: BahanDraft): number {
  if (b.override) return Number(b.normalized_unit_price_snapshot ?? 0);
  return hargaSatuanDasar(
    Number(b.purchase_price_snapshot ?? 0),
    Number(b.purchase_quantity_snapshot ?? 0),
    b.purchase_unit_snapshot,
  );
}

export function bahanKeInput(b: BahanDraft) {
  return {
    usage_percentage: Number(b.usage_percentage ?? 0),
    normalized_unit_price_snapshot: hargaDasarBahan(b),
    waste_percentage: Number(b.waste_percentage ?? 0),
  };
}

export function packagingKeInput(p: PackagingDraft) {
  return {
    usage_quantity: Number(p.usage_quantity ?? 0),
    unit_price_snapshot: Number(p.unit_price_snapshot ?? 0),
    capacity_quantity: Number(p.capacity_quantity ?? 1),
    waste_percentage: Number(p.waste_percentage ?? 0),
  };
}

export function biayaKeInput(b: BiayaDraft): BiayaOperasionalInput {
  return {
    cost_category: b.cost_category,
    calculation_type: b.calculation_type,
    percentage_value: Number(b.percentage_value ?? 0),
    fixed_value: Number(b.fixed_value ?? 0),
    calculation_base: b.calculation_base,
  };
}

export function hitungBarisBahan(b: BahanDraft, basis: number) {
  return hitungBahan(bahanKeInput(b), basis);
}

export function hitungBarisPackaging(p: PackagingDraft) {
  return hitungPackaging(packagingKeInput(p));
}

// ---------- pemetaan dari baris database ----------

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export function bahanDariRow(r: DbRow): BahanDraft {
  return {
    key: kunci(),
    id: s(r["id"]),
    material_id: r["material_id"] ? s(r["material_id"]) : null,
    supplier_price_id: r["supplier_price_id"] ? s(r["supplier_price_id"]) : null,
    material_name_snapshot: s(r["material_name_snapshot"]),
    category: s(r["category"]) || "bahan_baku_utama",
    supplier_name_snapshot: s(r["supplier_name_snapshot"]),
    usage_percentage: n(r["usage_percentage"]),
    purchase_price_snapshot: n(r["purchase_price_snapshot"]),
    purchase_quantity_snapshot: n(r["purchase_quantity_snapshot"]) || 1,
    purchase_unit_snapshot: s(r["purchase_unit_snapshot"]) || "kg",
    normalized_unit_price_snapshot: n(r["normalized_unit_price_snapshot"]),
    override: false,
    override_reason: "",
    required_unit: s(r["required_unit"]) || "gram",
    waste_percentage: n(r["waste_percentage"]),
    notes: s(r["notes"]),
  };
}

export function packagingDariRow(r: DbRow): PackagingDraft {
  return {
    key: kunci(),
    id: s(r["id"]),
    packaging_material_id: r["packaging_material_id"] ? s(r["packaging_material_id"]) : null,
    packaging_name_snapshot: s(r["packaging_name_snapshot"]),
    category: s(r["category"]) || "lainnya",
    supplier_name_snapshot: s(r["supplier_name_snapshot"]),
    usage_quantity: n(r["usage_quantity"]),
    usage_unit: s(r["usage_unit"]) || "pcs",
    unit_price_snapshot: n(r["unit_price_snapshot"]),
    capacity_quantity: n(r["capacity_quantity"]) || 1,
    waste_percentage: n(r["waste_percentage"]),
    notes: s(r["notes"]),
  };
}

export function biayaDariRow(r: DbRow): BiayaDraft {
  return {
    key: kunci(),
    id: s(r["id"]),
    cost_name: s(r["cost_name"]),
    cost_category: s(r["cost_category"]) || "lainnya",
    calculation_type: (s(r["calculation_type"]) || "persentase") as BiayaDraft["calculation_type"],
    percentage_value: n(r["percentage_value"]),
    fixed_value: n(r["fixed_value"]),
    calculation_base: s(r["calculation_base"]) || "formula_packaging",
    notes: s(r["notes"]),
  };
}

export function moqDariRow(r: DbRow): MoqDraft {
  return {
    key: kunci(),
    id: s(r["id"]),
    moq_quantity: n(r["moq_quantity"]),
    pricing_method: s(r["pricing_method"]) || "markup",
    markup_percentage: n(r["markup_percentage"]),
    target_margin_percentage: n(r["target_margin_percentage"]),
    manual_price: r["manual_price"] === null ? null : n(r["manual_price"]),
  };
}
