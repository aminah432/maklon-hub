import { useMemo } from "react";
import { useRows, type DbRow } from "@/lib/db";

export type MaterialCatalogItem = {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  priceId: string | null;
  supplierName: string;
  purchasePrice: number;
  purchaseQuantity: number;
  purchaseUnit: string;
  normalizedUnitPrice: number;
};

export type PackagingCatalogItem = {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  capacity: number;
  priceId: string | null;
  supplierName: string;
  unitPrice: number;
};

/** Menggabungkan master dan harga terbaru menjadi pilihan siap pakai di editor HPP. */
export function useHppMasterData(companyId: string) {
  const enabled = Boolean(companyId);
  const suppliers = useRows<DbRow>("suppliers", {
    scopeId: companyId,
    orderBy: "name",
    asc: true,
    eq: { is_active: true },
    enabled,
  });
  const materials = useRows<DbRow>("raw_materials", {
    scopeId: companyId,
    orderBy: "name",
    asc: true,
    eq: { is_active: true },
    enabled,
  });
  const materialPrices = useRows<DbRow>("material_supplier_prices", {
    scopeId: companyId,
    orderBy: "effective_date",
    asc: false,
    enabled,
  });
  const packaging = useRows<DbRow>("packaging_materials", {
    scopeId: companyId,
    orderBy: "name",
    asc: true,
    eq: { is_active: true },
    enabled,
  });
  const packagingPrices = useRows<DbRow>("packaging_prices", {
    scopeId: companyId,
    orderBy: "effective_date",
    asc: false,
    enabled,
  });

  const supplierNames = useMemo(
    () =>
      new Map((suppliers.data ?? []).map((row) => [String(row["id"]), String(row["name"] ?? "")])),
    [suppliers.data],
  );

  const materialCatalog = useMemo<MaterialCatalogItem[]>(() => {
    const latest = new Map<string, DbRow>();
    for (const price of materialPrices.data ?? []) {
      const id = String(price["material_id"] ?? "");
      if (id && !latest.has(id)) latest.set(id, price);
    }
    return (materials.data ?? []).map((row) => {
      const price = latest.get(String(row["id"]));
      return {
        id: String(row["id"]),
        name: String(row["name"] ?? ""),
        category: String(row["category"] ?? "bahan_baku_utama"),
        defaultUnit: String(row["default_unit"] ?? "gram"),
        priceId: price ? String(price["id"]) : null,
        supplierName: price ? (supplierNames.get(String(price["supplier_id"] ?? "")) ?? "") : "",
        purchasePrice: Number(price?.["purchase_price"] ?? 0),
        purchaseQuantity: Number(price?.["purchase_quantity"] ?? 1),
        purchaseUnit: String(price?.["purchase_unit"] ?? "kg"),
        normalizedUnitPrice: Number(price?.["normalized_unit_price"] ?? 0),
      };
    });
  }, [materialPrices.data, materials.data, supplierNames]);

  const packagingCatalog = useMemo<PackagingCatalogItem[]>(() => {
    const latest = new Map<string, DbRow>();
    for (const price of packagingPrices.data ?? []) {
      const id = String(price["packaging_material_id"] ?? "");
      if (id && !latest.has(id)) latest.set(id, price);
    }
    return (packaging.data ?? []).map((row) => {
      const price = latest.get(String(row["id"]));
      return {
        id: String(row["id"]),
        name: String(row["name"] ?? ""),
        category: String(row["category"] ?? "lainnya"),
        defaultUnit: String(row["default_unit"] ?? "pcs"),
        capacity: Number(row["capacity_per_package"] ?? 1),
        priceId: price ? String(price["id"]) : null,
        supplierName: price ? (supplierNames.get(String(price["supplier_id"] ?? "")) ?? "") : "",
        unitPrice: Number(price?.["unit_price"] ?? 0),
      };
    });
  }, [packaging.data, packagingPrices.data, supplierNames]);

  return {
    materials: materialCatalog,
    packaging: packagingCatalog,
    isLoading:
      suppliers.isLoading ||
      materials.isLoading ||
      materialPrices.isLoading ||
      packaging.isLoading ||
      packagingPrices.isLoading,
  };
}
