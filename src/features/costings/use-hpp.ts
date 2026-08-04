import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { db, useAction, type DbRow } from "@/lib/db";
import { hitungHpp, hitungSimulasiMoq, bulatkanHarga } from "@/lib/hpp";
import {
  bahanKeInput,
  biayaKeInput,
  hargaDasarBahan,
  hitungBarisBahan,
  hitungBarisPackaging,
  packagingKeInput,
  type BahanDraft,
  type BiayaDraft,
  type HeaderDraft,
  type MoqDraft,
  type PackagingDraft,
} from "./hpp-types";

export function useVersiHpp(id: string) {
  return useQuery({
    queryKey: ["costing_version_detail", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const versi = await db("costing_versions").select("*").eq("id", id).single();
      if (versi.error) throw new Error(versi.error.message);
      const [bahan, packaging, biaya, moq, legacyItems] = await Promise.all([
        db("costing_ingredients")
          .select("*")
          .eq("costing_version_id", id)
          .order("sort_order", { ascending: true }),
        db("costing_packaging_items")
          .select("*")
          .eq("costing_version_id", id)
          .order("sort_order", { ascending: true }),
        db("costing_operational_costs")
          .select("*")
          .eq("costing_version_id", id)
          .order("sort_order", { ascending: true }),
        db("costing_moq_simulations")
          .select("*")
          .eq("costing_version_id", id)
          .order("sort_order", { ascending: true }),
        db("costing_items")
          .select("*")
          .eq("costing_version_id", id)
          .order("sort_order", { ascending: true }),
      ]);
      const err = bahan.error ?? packaging.error ?? biaya.error ?? moq.error ?? legacyItems.error;
      if (err) throw new Error(err.message);
      return {
        versi: versi.data as DbRow,
        bahan: (bahan.data ?? []) as DbRow[],
        packaging: (packaging.data ?? []) as DbRow[],
        biaya: (biaya.data ?? []) as DbRow[],
        moq: (moq.data ?? []) as DbRow[],
        legacyItems: (legacyItems.data ?? []) as DbRow[],
      };
    },
  });
}

export type SimpanPayload = {
  id: string;
  header: HeaderDraft;
  bahan: BahanDraft[];
  packaging: PackagingDraft[];
  biaya: BiayaDraft[];
  moq: MoqDraft[];
};

/** Hitung ringkasan lengkap dari draft, dipakai UI dan penyimpanan. */
export function ringkasanDraft(p: Omit<SimpanPayload, "id">) {
  const basis = Number(p.header.formula_basis ?? 0);
  const unit = Number(p.header.planned_quantity ?? 0);
  const hasil = hitungHpp({
    bahan: p.bahan.map(bahanKeInput),
    packaging: p.packaging.map(packagingKeInput),
    formulaBasis: basis,
    overheadMode: p.header.overhead_mode,
    combinedOverheadPercentage: Number(p.header.combined_overhead_percentage ?? 0),
    biayaOperasional: p.biaya.map(biayaKeInput),
    jumlahUnit: unit,
    rejectPercentage: Number(p.header.estimated_reject_percentage ?? 0),
    shrinkagePercentage: Number(p.header.estimated_shrinkage_percentage ?? 0),
  });
  return hasil;
}

export function simulasiDariDraft(p: Omit<SimpanPayload, "id">, hpp: number) {
  return p.moq.map((m) => ({
    draft: m,
    hasil: hitungSimulasiMoq(hpp, {
      moq_quantity: Number(m.moq_quantity ?? 0),
      pricing_method: m.pricing_method,
      markup_percentage: Number(m.markup_percentage ?? 0),
      target_margin_percentage: Number(m.target_margin_percentage ?? 0),
      manual_price: m.manual_price,
      tax_percentage: Number(p.header.tax_percentage ?? 0),
      rounding_method: p.header.rounding_method,
    }),
  }));
}

/** Membuat header draft baru; rincian lengkap langsung disimpan oleh useSimpanHpp. */
export function useBuatVersiHppKosong() {
  return useAction(async (header: HeaderDraft) => {
    if (!header.company_id || !header.product_id) {
      throw new Error("Perusahaan dan produk wajib dipilih");
    }
    const semua = await db("costing_versions")
      .select("version_number")
      .eq("product_id", header.product_id);
    if (semua.error) throw new Error(semua.error.message);
    const versionNumber =
      Math.max(
        0,
        ...(semua.data ?? []).map((row) => Number((row as DbRow)["version_number"] ?? 0)),
      ) + 1;
    const { data, error } = await db("costing_versions")
      .insert({
        company_id: header.company_id,
        client_id: header.client_id,
        brand_id: header.brand_id,
        product_id: header.product_id,
        version_name: header.version_name || `Kalkulasi v${versionNumber}`,
        version_number: versionNumber,
        status: "draft",
        planned_quantity: Number(header.planned_quantity ?? 0),
        good_units: Number(header.planned_quantity ?? 0),
        total_batch_cost: 0,
        unit_hpp: 0,
        notes: header.notes || null,
      })
      .select("id");
    if (error) throw new Error(error.message);
    const id = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
    if (!id) throw new Error("Gagal membuat versi HPP baru");
    return id;
  });
}

/** Simpan header + seluruh baris anak. Baris anak versi ini ditulis ulang, versi lain tidak tersentuh. */
export function useSimpanHpp() {
  const qc = useQueryClient();
  return useAction(
    async (p: SimpanPayload) => {
      const h = p.header;
      const hasil = ringkasanDraft(p);
      const basis = Number(h.formula_basis ?? 0);
      const unit = Number(h.planned_quantity ?? 0);
      const reject = (unit * Number(h.estimated_reject_percentage ?? 0)) / 100;
      const susut = (unit * Number(h.estimated_shrinkage_percentage ?? 0)) / 100;

      const upd = await db("costing_versions")
        .update({
          client_id: h.client_id,
          brand_id: h.brand_id,
          product_id: h.product_id,
          product_variant: h.product_variant || null,
          version_name: h.version_name || null,
          status: h.status,
          net_content: h.net_content,
          net_content_unit: h.net_content_unit,
          formula_basis: basis,
          formula_basis_unit: h.formula_basis_unit,
          planned_quantity: unit,
          output_unit: h.output_unit,
          estimated_reject_percentage: Number(h.estimated_reject_percentage ?? 0),
          estimated_shrinkage_percentage: Number(h.estimated_shrinkage_percentage ?? 0),
          rejected_units: reject,
          shrinkage_units: susut,
          good_units: Math.max(unit - reject - susut, 0),
          overhead_mode: h.overhead_mode,
          combined_overhead_percentage: Number(h.combined_overhead_percentage ?? 0),
          tax_percentage: Number(h.tax_percentage ?? 0),
          rounding_method: h.rounding_method,
          total_formula_cost: hasil.totalFormula,
          total_packaging_cost: hasil.totalPackaging,
          subtotal_cost: hasil.subtotal,
          direct_labor_cost: hasil.btkl,
          factory_overhead_cost: hasil.ohp,
          additional_cost: hasil.biayaTambahan,
          total_batch_cost: hasil.hppBatch,
          unit_hpp: hasil.hppPerUnit,
          batch_hpp: hasil.hppBatch,
          effective_at: h.effective_at || null,
          change_reason: h.change_reason || null,
          notes: h.notes || null,
        })
        .eq("id", p.id);
      if (upd.error) throw new Error(upd.error.message);

      const hapus = async (table: string) => {
        const { error } = await db(table).delete().eq("costing_version_id", p.id);
        if (error) throw new Error(error.message);
      };
      await Promise.all([
        hapus("costing_ingredients"),
        hapus("costing_packaging_items"),
        hapus("costing_operational_costs"),
        hapus("costing_moq_simulations"),
      ]);

      if (p.bahan.length) {
        const rows = p.bahan.map((b, i) => {
          const c = hitungBarisBahan(b, basis);
          return {
            company_id: h.company_id,
            costing_version_id: p.id,
            material_id: b.material_id,
            supplier_price_id: b.supplier_price_id,
            material_name_snapshot: b.material_name_snapshot || "(tanpa nama)",
            category: b.category,
            supplier_name_snapshot: b.supplier_name_snapshot || null,
            usage_percentage: Number(b.usage_percentage ?? 0),
            purchase_price_snapshot: Number(b.purchase_price_snapshot ?? 0),
            purchase_quantity_snapshot: Number(b.purchase_quantity_snapshot ?? 1),
            purchase_unit_snapshot: b.purchase_unit_snapshot,
            normalized_unit_price_snapshot: hargaDasarBahan(b),
            required_quantity: c.requiredQuantity,
            required_unit: b.required_unit,
            waste_percentage: Number(b.waste_percentage ?? 0),
            base_cost: c.baseCost,
            final_cost: c.finalCost,
            notes: b.notes || null,
            sort_order: i,
          };
        });
        const { error } = await db("costing_ingredients").insert(rows);
        if (error) throw new Error(error.message);
      }

      if (p.packaging.length) {
        const rows = p.packaging.map((k, i) => {
          const c = hitungBarisPackaging(k);
          return {
            company_id: h.company_id,
            costing_version_id: p.id,
            packaging_material_id: k.packaging_material_id,
            packaging_price_id: k.packaging_price_id,
            packaging_name_snapshot: k.packaging_name_snapshot || "(tanpa nama)",
            category: k.category,
            supplier_name_snapshot: k.supplier_name_snapshot || null,
            usage_quantity: Number(k.usage_quantity ?? 0),
            usage_unit: k.usage_unit,
            unit_price_snapshot: Number(k.unit_price_snapshot ?? 0),
            capacity_quantity: Number(k.capacity_quantity ?? 1),
            waste_percentage: Number(k.waste_percentage ?? 0),
            base_cost: c.baseCost,
            final_cost: c.finalCost,
            notes: k.notes || null,
            sort_order: i,
          };
        });
        const { error } = await db("costing_packaging_items").insert(rows);
        if (error) throw new Error(error.message);
      }

      if (h.overhead_mode === "terpisah" && p.biaya.length) {
        const rows = p.biaya.map((b, i) => ({
          company_id: h.company_id,
          costing_version_id: p.id,
          cost_name: b.cost_name || b.cost_category,
          cost_category: b.cost_category,
          calculation_type: b.calculation_type,
          percentage_value: Number(b.percentage_value ?? 0),
          fixed_value: Number(b.fixed_value ?? 0),
          calculation_base: b.calculation_base,
          amount: hasil.rincianOperasional[i] ?? 0,
          notes: b.notes || null,
          sort_order: i,
        }));
        const { error } = await db("costing_operational_costs").insert(rows);
        if (error) throw new Error(error.message);
      }

      if (p.moq.length) {
        const rows = p.moq.map((m, i) => {
          const r = hitungSimulasiMoq(hasil.hppPerUnit, {
            moq_quantity: Number(m.moq_quantity ?? 0),
            pricing_method: m.pricing_method,
            markup_percentage: Number(m.markup_percentage ?? 0),
            target_margin_percentage: Number(m.target_margin_percentage ?? 0),
            manual_price: m.manual_price,
            tax_percentage: Number(h.tax_percentage ?? 0),
            rounding_method: h.rounding_method,
          });
          return {
            company_id: h.company_id,
            costing_version_id: p.id,
            moq_quantity: Number(m.moq_quantity ?? 0),
            pricing_method: m.pricing_method,
            markup_percentage: Number(m.markup_percentage ?? 0),
            target_margin_percentage: Number(m.target_margin_percentage ?? 0),
            manual_price: m.manual_price,
            hpp_snapshot: r.hpp,
            markup_amount: r.markupAmount,
            price_before_tax: r.priceBeforeTax,
            tax_percentage: Number(h.tax_percentage ?? 0),
            tax_amount: r.taxAmount,
            price_after_tax: r.priceAfterTax,
            rounding_method: h.rounding_method,
            rounded_price: r.roundedPrice,
            profit_per_unit: r.profitPerUnit,
            total_profit: r.totalProfit,
            actual_margin: r.actualMargin,
            sort_order: i,
          };
        });
        const { error } = await db("costing_moq_simulations").insert(rows);
        if (error) throw new Error(error.message);
      }

      qc.invalidateQueries({ queryKey: ["costing_version_detail", p.id] });
      return hasil;
    },
    { invalidate: ["costing_versions", "product_prices"], success: "Kalkulasi HPP tersimpan" },
  );
}

/** Aktifkan versi: versi aktif lain untuk produk yang sama menjadi digantikan. */
export function useAktifkanVersi() {
  const qc = useQueryClient();
  return useAction(
    async (v: {
      id: string;
      productId: string;
      harga?: { clientPrice: number; hpp: number; companyId: string };
    }) => {
      const lama = await db("costing_versions")
        .update({ status: "digantikan" })
        .eq("product_id", v.productId)
        .eq("status", "aktif");
      if (lama.error) throw new Error(lama.error.message);
      const { error } = await db("costing_versions").update({ status: "aktif" }).eq("id", v.id);
      if (error) throw new Error(error.message);

      if (v.harga && v.harga.clientPrice > 0) {
        const off = await db("product_prices")
          .update({ is_active: false })
          .eq("product_id", v.productId);
        if (off.error) throw new Error(off.error.message);
        const ins = await db("product_prices").insert({
          company_id: v.harga.companyId,
          product_id: v.productId,
          costing_version_id: v.id,
          pricing_method: "markup",
          base_price: v.harga.clientPrice,
          minimum_price: v.harga.hpp,
          client_price: v.harga.clientPrice,
          recommended_retail_price: v.harga.clientPrice * 1.6,
          actual_margin:
            v.harga.clientPrice > 0
              ? ((v.harga.clientPrice - v.harga.hpp) / v.harga.clientPrice) * 100
              : 0,
          is_active: true,
          notes: "Otomatis dari aktivasi versi HPP",
        });
        if (ins.error) throw new Error(ins.error.message);
      }
      qc.invalidateQueries({ queryKey: ["costing_version_detail", v.id] });
    },
    { invalidate: ["costing_versions", "product_prices"], success: "Versi HPP diaktifkan" },
  );
}

/** Duplikasi versi menjadi draft baru tanpa mengubah versi lama. */
export function useBuatVersiBaru() {
  return useAction(
    async (v: { sumberId: string; alasan: string }) => {
      const src = await db("costing_versions").select("*").eq("id", v.sumberId).single();
      if (src.error || !src.data) throw new Error(src.error?.message ?? "Versi tidak ditemukan");
      const row = src.data as DbRow;
      const semua = await db("costing_versions")
        .select("version_number")
        .eq("product_id", String(row["product_id"]));
      if (semua.error) throw new Error(semua.error.message);
      const next =
        Math.max(0, ...(semua.data ?? []).map((r) => Number((r as DbRow)["version_number"] ?? 0))) +
        1;

      const baru: DbRow = { ...row };
      delete baru["id"];
      delete baru["created_at"];
      delete baru["updated_at"];
      baru["version_number"] = next;
      baru["status"] = "draft";
      baru["change_reason"] = v.alasan || null;
      baru["version_name"] = `${String(row["version_name"] ?? "Kalkulasi")} (v${next})`;

      const ins = await db("costing_versions").insert(baru).select("id");
      if (ins.error) throw new Error(ins.error.message);
      const newId = String(((ins.data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
      if (!newId) throw new Error("Gagal membuat versi baru");

      const salin = async (table: string) => {
        const { data, error } = await db(table).select("*").eq("costing_version_id", v.sumberId);
        if (error) throw new Error(error.message);
        const rows = (data ?? []).map((r) => {
          const c: DbRow = { ...(r as DbRow) };
          delete c["id"];
          delete c["created_at"];
          c["costing_version_id"] = newId;
          return c;
        });
        if (!rows.length) return;
        const res = await db(table).insert(rows);
        if (res.error) throw new Error(res.error.message);
      };
      await salin("costing_ingredients");
      await salin("costing_packaging_items");
      await salin("costing_operational_costs");
      await salin("costing_moq_simulations");
      return newId;
    },
    { invalidate: ["costing_versions"], success: "Versi draft baru dibuat" },
  );
}

export function unduhCsv(nama: string, baris: (string | number)[][]) {
  const isi = baris
    .map((r) =>
      r
        .map((c) => {
          const t = String(c ?? "");
          return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
        })
        .join(";"),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + isi], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nama}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("Berkas CSV diunduh");
}

export { bulatkanHarga };
