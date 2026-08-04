import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/common/inputs";
import { db, nomorDokumen, useAction, useRows, type DbRow } from "@/lib/db";
import { hitungLaba } from "@/lib/calc";
import { isoDate, rupiah } from "@/lib/format";

export type Mode = "quotation" | "order";

type Line = {
  key: string;
  product_id: string;
  quantity: number | null;
  unit_price: number | null;
  discount: number | null;
};

const lineBaru = (): Line => ({
  key: Math.random().toString(36).slice(2),
  product_id: "",
  quantity: 100,
  unit_price: null,
  discount: 0,
});

export function SalesDocDialog({
  mode,
  open,
  onOpenChange,
  scopeId,
  defaultCompanyId,
}: {
  mode: Mode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  scopeId: string | null;
  defaultCompanyId: string | null;
}) {
  const clients = useRows<DbRow>("clients", {
    scopeId,
    orderBy: "owner_name",
    asc: true,
    archived: false,
  });
  const brands = useRows<DbRow>("brands", { scopeId, orderBy: "name", asc: true, archived: false });
  const brokers = useRows<DbRow>("brokers", {
    scopeId,
    orderBy: "name",
    asc: true,
    archived: false,
  });
  const products = useRows<DbRow>("products", {
    scopeId,
    orderBy: "name",
    asc: true,
    archived: false,
  });
  const costings = useRows<DbRow>("costing_versions", { scopeId });
  const prices = useRows<DbRow>("product_prices", { scopeId, eq: { is_active: true } });

  const [clientId, setClientId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [tanggalDoc, setTanggalDoc] = useState(isoDate(new Date()));
  const [tanggal2, setTanggal2] = useState("");
  const [pajak, setPajak] = useState<number | null>(0);
  const [ongkir, setOngkir] = useState<number | null>(0);
  const [catatan, setCatatan] = useState("");
  const [lines, setLines] = useState<Line[]>([lineBaru()]);

  useEffect(() => {
    if (!open) return;
    setClientId("");
    setBrandId("");
    setBrokerId("");
    setTanggalDoc(isoDate(new Date()));
    setTanggal2("");
    setPajak(0);
    setOngkir(0);
    setCatatan("");
    setLines([lineBaru()]);
  }, [open]);

  const hppProduk = (productId: string) => {
    const list = (costings.data ?? []).filter((c) => String(c["product_id"]) === productId);
    const aktif = list.find((c) => String(c["status"]) === "aktif") ?? list[0];
    return { hpp: Number(aktif?.["unit_hpp"] ?? 0), versionId: aktif ? String(aktif["id"]) : null };
  };
  const hargaProduk = (productId: string) => {
    const p = (prices.data ?? []).find((x) => String(x["product_id"]) === productId);
    return Number(p?.["client_price"] ?? 0);
  };

  const produkTerpilih = (id: string) => (products.data ?? []).find((p) => String(p["id"]) === id);

  const hitung = useMemo(() => {
    let subtotal = 0;
    let laba = 0;
    for (const l of lines) {
      const qty = l.quantity ?? 0;
      const harga = l.unit_price ?? 0;
      const disc = l.discount ?? 0;
      const { hpp } = hppProduk(l.product_id);
      const s = qty * harga - disc;
      subtotal += s;
      laba += hitungLaba({
        finalUnitPrice: harga,
        quantity: qty,
        unitHpp: hpp,
        discount: disc,
      }).netContribution;
    }
    const grand = subtotal + (pajak ?? 0) + (ongkir ?? 0);
    return { subtotal, grand, laba };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines, pajak, ongkir, costings.data]);

  const companyIdAktif = () => {
    if (scopeId) return scopeId;
    const klien = (clients.data ?? []).find((c) => String(c["id"]) === clientId);
    return klien ? String(klien["company_id"]) : (defaultCompanyId ?? "");
  };

  const simpan = useAction(
    async () => {
      const companyId = companyIdAktif();
      if (!companyId) throw new Error("Perusahaan tidak diketahui");
      if (!clientId) throw new Error("Pilih klien terlebih dahulu");
      const isi = lines.filter((l) => l.product_id !== "");
      if (isi.length === 0) throw new Error("Tambahkan minimal satu item");

      const nomor = await nomorDokumen(companyId, mode === "quotation" ? "quotation" : "order");
      const header: DbRow = {
        company_id: companyId,
        client_id: clientId,
        brand_id: brandId || null,
        broker_id: brokerId || null,
        subtotal: hitung.subtotal,
        discount: 0,
        tax: pajak ?? 0,
        shipping_cost: ongkir ?? 0,
        broker_fee: 0,
        grand_total: hitung.grand,
        notes: catatan || null,
      };

      if (mode === "quotation") {
        const { data, error } = await db("quotations")
          .insert({
            ...header,
            quotation_number: nomor,
            quotation_date: tanggalDoc,
            valid_until: tanggal2 || null,
            status: "draft",
          })
          .select("id");
        if (error) throw new Error(error.message);
        const id = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
        const items = isi.map((l) => {
          const { hpp, versionId } = hppProduk(l.product_id);
          const qty = l.quantity ?? 0;
          const harga = l.unit_price ?? 0;
          const disc = l.discount ?? 0;
          const sub = qty * harga - disc;
          const profit = sub - hpp * qty;
          return {
            company_id: companyId,
            quotation_id: id,
            product_id: l.product_id,
            costing_version_id: versionId,
            quantity: qty,
            unit: String(produkTerpilih(l.product_id)?.["unit"] ?? "pcs"),
            unit_hpp_snapshot: hpp,
            unit_price: harga,
            discount: disc,
            broker_fee: 0,
            subtotal: sub,
            estimated_profit: profit,
            estimated_margin: sub > 0 ? (profit / sub) * 100 : 0,
          };
        });
        const ins = await db("quotation_items").insert(items);
        if (ins.error) throw new Error(ins.error.message);
      } else {
        const { data, error } = await db("orders")
          .insert({
            ...header,
            order_number: nomor,
            order_date: tanggalDoc,
            target_completion_date: tanggal2 || null,
            priority: "normal",
            status: "draft",
            production_status: "belum_dijadwalkan",
            payment_status: "belum_dibayar",
            client_notes: catatan || null,
          })
          .select("id");
        if (error) throw new Error(error.message);
        const id = String(((data ?? [])[0] as DbRow | undefined)?.["id"] ?? "");
        const items = isi.map((l) => {
          const { hpp, versionId } = hppProduk(l.product_id);
          const qty = l.quantity ?? 0;
          const harga = l.unit_price ?? 0;
          const disc = l.discount ?? 0;
          const sub = qty * harga - disc;
          const profit = sub - hpp * qty;
          return {
            company_id: companyId,
            order_id: id,
            product_id: l.product_id,
            costing_version_id: versionId,
            quantity: qty,
            unit: String(produkTerpilih(l.product_id)?.["unit"] ?? "pcs"),
            unit_hpp_snapshot: hpp,
            unit_price_snapshot: harga,
            discount: disc,
            broker_fee: 0,
            subtotal: sub,
            estimated_profit: profit,
            actual_margin: sub > 0 ? (profit / sub) * 100 : 0,
          };
        });
        const ins = await db("order_items").insert(items);
        if (ins.error) throw new Error(ins.error.message);
      }
    },
    {
      invalidate: ["quotations", "quotation_items", "orders", "order_items"],
      success: mode === "quotation" ? "Penawaran dibuat" : "Pesanan dibuat",
    },
  );

  const klienTerfilter = (clients.data ?? []).filter(
    (c) => !scopeId || String(c["company_id"]) === scopeId,
  );
  const brandTerfilter = (brands.data ?? []).filter(
    (b) => clientId === "" || String(b["client_id"]) === clientId,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-4xl overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b border-border/70 p-5">
          <DialogTitle>{mode === "quotation" ? "Buat Penawaran" : "Buat Pesanan"}</DialogTitle>
          <DialogDescription>
            HPP dan harga diambil sebagai snapshot saat dokumen dibuat.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[66vh] px-5">
          <div className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="sd-klien">Klien *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="sd-klien" aria-label="Pilih klien">
                  <SelectValue placeholder="Pilih klien" />
                </SelectTrigger>
                <SelectContent>
                  {klienTerfilter.map((c) => (
                    <SelectItem key={String(c["id"])} value={String(c["id"])}>
                      {String(c["client_code"])} — {String(c["owner_name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-brand">Brand</Label>
              <Select value={brandId} onValueChange={setBrandId}>
                <SelectTrigger id="sd-brand" aria-label="Pilih brand">
                  <SelectValue placeholder="Pilih brand" />
                </SelectTrigger>
                <SelectContent>
                  {brandTerfilter.map((b) => (
                    <SelectItem key={String(b["id"])} value={String(b["id"])}>
                      {String(b["name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-makelar">Makelar</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger id="sd-makelar" aria-label="Pilih makelar">
                  <SelectValue placeholder="Tanpa makelar" />
                </SelectTrigger>
                <SelectContent>
                  {(brokers.data ?? []).map((b) => (
                    <SelectItem key={String(b["id"])} value={String(b["id"])}>
                      {String(b["name"])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-tgl">
                {mode === "quotation" ? "Tanggal penawaran" : "Tanggal pesanan"}
              </Label>
              <Input
                id="sd-tgl"
                type="date"
                value={tanggalDoc}
                onChange={(e) => setTanggalDoc(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-tgl2">
                {mode === "quotation" ? "Berlaku sampai" : "Target selesai"}
              </Label>
              <Input
                id="sd-tgl2"
                type="date"
                value={tanggal2}
                onChange={(e) => setTanggal2(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-pajak">Pajak</Label>
              <CurrencyInput id="sd-pajak" value={pajak} onChange={setPajak} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sd-ongkir">Ongkos kirim</Label>
              <CurrencyInput id="sd-ongkir" value={ongkir} onChange={setOngkir} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70">
            <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
              <h3 className="text-sm font-semibold">Item</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLines((p) => [...p, lineBaru()])}
              >
                <Plus className="size-4" aria-hidden /> Item
              </Button>
            </div>
            <div className="space-y-3 p-3">
              {lines.map((l, idx) => {
                const { hpp } = hppProduk(l.product_id);
                const sub = (l.quantity ?? 0) * (l.unit_price ?? 0) - (l.discount ?? 0);
                return (
                  <div
                    key={l.key}
                    className="grid gap-2 rounded-xl border border-border/60 p-3 md:grid-cols-[minmax(0,1.6fr)_90px_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                  >
                    <div className="space-y-1">
                      <Label className="text-xs">Produk</Label>
                      <Select
                        value={l.product_id}
                        onValueChange={(v) =>
                          setLines((p) =>
                            p.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    product_id: v,
                                    unit_price: r.unit_price ?? (hargaProduk(v) || null),
                                  }
                                : r,
                            ),
                          )
                        }
                      >
                        <SelectTrigger aria-label="Pilih produk">
                          <SelectValue placeholder="Pilih produk" />
                        </SelectTrigger>
                        <SelectContent>
                          {(products.data ?? []).map((p) => (
                            <SelectItem key={String(p["id"])} value={String(p["id"])}>
                              {String(p["sku"])} — {String(p["name"])}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">HPP {rupiah(hpp, true)}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        value={l.quantity ?? ""}
                        onChange={(e) =>
                          setLines((p) =>
                            p.map((r, i) =>
                              i === idx
                                ? {
                                    ...r,
                                    quantity: e.target.value === "" ? null : Number(e.target.value),
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Harga / unit</Label>
                      <CurrencyInput
                        value={l.unit_price}
                        onChange={(v) =>
                          setLines((p) =>
                            p.map((r, i) => (i === idx ? { ...r, unit_price: v } : r)),
                          )
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Diskon</Label>
                      <CurrencyInput
                        value={l.discount}
                        onChange={(v) =>
                          setLines((p) => p.map((r, i) => (i === idx ? { ...r, discount: v } : r)))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <span className="text-sm font-medium md:hidden">{rupiah(sub)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Hapus item"
                        onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="my-4 grid gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="text-lg font-bold">{rupiah(hitung.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold text-primary">{rupiah(hitung.grand)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Estimasi laba</p>
              <p className="text-lg font-bold">{rupiah(hitung.laba)}</p>
            </div>
          </div>

          <div className="space-y-1.5 pb-4">
            <Label htmlFor="sd-catatan">Catatan</Label>
            <Textarea
              id="sd-catatan"
              rows={2}
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </ScrollArea>

        <DialogFooter className="border-t border-border/70 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button
            disabled={simpan.isPending}
            onClick={() =>
              simpan.mutate(undefined as never, { onSuccess: () => onOpenChange(false) })
            }
          >
            {simpan.isPending ? "Menyimpan…" : "Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
