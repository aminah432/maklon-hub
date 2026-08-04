import { describe, expect, it } from "vitest";
import { buatSnapshotProduk } from "./product-order-snapshot";

const product = {
  id: "product-1",
  name: "Serum",
  moq: 500,
  unit: "botol",
  specifications: { manual_hpp: 7_500 },
};

describe("snapshot produk untuk item pesanan", () => {
  it("mengambil HPP manual, MOQ, satuan, dan harga produk", () => {
    const snapshot = buatSnapshotProduk({
      productId: "product-1",
      products: [product],
      costings: [{ id: "costing-1", product_id: "product-1", status: "aktif", unit_hpp: 6_000 }],
      prices: [{ product_id: "product-1", client_price: 12_000 }],
    });

    expect(snapshot).toEqual({
      productId: "product-1",
      quantity: 500,
      unit: "botol",
      unitHpp: 7_500,
      unitPrice: 12_000,
      costingVersionId: null,
    });
  });

  it("memakai HPP aktif bila HPP manual bernilai nol", () => {
    const snapshot = buatSnapshotProduk({
      productId: "product-1",
      products: [{ ...product, specifications: { manual_hpp: 0 } }],
      costings: [{ id: "costing-1", product_id: "product-1", status: "aktif", unit_hpp: 6_000 }],
      prices: [],
    });

    expect(snapshot.unitHpp).toBe(6_000);
    expect(snapshot.costingVersionId).toBe("costing-1");
  });
});
