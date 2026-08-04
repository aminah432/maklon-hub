import type { DbRow } from "@/lib/db";

export type ProductOrderSnapshot = {
  productId: string;
  quantity: number;
  unit: string;
  unitHpp: number;
  unitPrice: number;
  costingVersionId: string | null;
};

const angka = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export function manualHppProduk(product: DbRow | undefined): number {
  const specifications = product?.["specifications"];
  if (!specifications || typeof specifications !== "object" || Array.isArray(specifications)) {
    return 0;
  }
  return Math.max(0, angka((specifications as DbRow)["manual_hpp"]));
}

/** Nilai produk yang dibekukan saat produk dipilih pada item penjualan. */
export function buatSnapshotProduk({
  productId,
  products,
  costings,
  prices,
}: {
  productId: string;
  products: DbRow[];
  costings: DbRow[];
  prices: DbRow[];
}): ProductOrderSnapshot {
  const product = products.find((row) => String(row["id"]) === productId);
  const costingList = costings.filter((row) => String(row["product_id"]) === productId);
  const activeCosting =
    costingList.find((row) => String(row["status"]) === "aktif") ?? costingList[0];
  const productPrice = prices.find((row) => String(row["product_id"]) === productId);
  const manualHpp = manualHppProduk(product);
  const unitHpp = manualHpp > 0 ? manualHpp : Math.max(0, angka(activeCosting?.["unit_hpp"]));
  const moq = Math.max(1, angka(product?.["moq"]) || 100);

  return {
    productId,
    quantity: moq,
    unit: String(product?.["unit"] ?? "pcs"),
    unitHpp,
    unitPrice: Math.max(0, angka(productPrice?.["client_price"])),
    costingVersionId:
      manualHpp > 0 || !activeCosting ? null : String(activeCosting["id"] ?? "") || null,
  };
}
