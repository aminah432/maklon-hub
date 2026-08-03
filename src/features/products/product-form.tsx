import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { PRODUCT_STATUSES, SPEC_FIELDS } from "@/lib/constants";
import { labelStatus } from "@/lib/format";
import {
  useBrandOptions,
  useClientOptions,
  useProductCategories,
  type Product,
} from "@/features/products/use-products";

const opsional = (max: number) =>
  z.string().trim().max(max, { message: `Maksimal ${max} karakter` }).optional().or(z.literal(""));

const angkaOpsional = z.number().optional();

export const productSchema = z.object({
  company_id: z.string().uuid({ message: "Perusahaan wajib dipilih" }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama produk minimal 2 karakter" })
    .max(150, { message: "Maksimal 150 karakter" }),
  client_id: z.string().optional().or(z.literal("")),
  brand_id: z.string().optional().or(z.literal("")),
  category_id: z.string().optional().or(z.literal("")),
  subcategory: opsional(80),
  variant: opsional(80),
  description: opsional(1000),
  net_content: angkaOpsional,
  unit: z.string().trim().min(1, { message: "Satuan wajib diisi" }).max(20),
  moq: z
    .number({ message: "MOQ wajib diisi" })
    .int({ message: "MOQ harus bilangan bulat" })
    .min(1, { message: "MOQ minimal 1" }),
  standard_batch_quantity: angkaOpsional,
  shelf_life_months: angkaOpsional,
  packaging_type: opsional(80),
  status: z.enum(PRODUCT_STATUSES),
  notes: opsional(1000),
  specifications: z.record(z.string(), z.string()),
});

export type ProductFormValues = z.infer<typeof productSchema>;

const kosong = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);
const numOrEmpty = (v: number | null | undefined) => (v === null || v === undefined ? undefined : v);

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: Product | null;
}) {
  const { companies, scopeId, companyById } = useCompany();
  const queryClient = useQueryClient();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      company_id: product?.company_id ?? scopeId ?? "",
      name: "",
      client_id: "",
      brand_id: "",
      category_id: "",
      subcategory: "",
      variant: "",
      description: "",
      unit: "pcs",
      moq: 100,
      packaging_type: "",
      status: "draft",
      notes: "",
      specifications: {},
    },
  });

  const companyId = form.watch("company_id");
  const clientId = form.watch("client_id");
  const perusahaan = companyById(companyId);
  const specFields = useMemo(
    () => SPEC_FIELDS[perusahaan?.code ?? ""] ?? [],
    [perusahaan?.code],
  );

  const { data: categories = [] } = useProductCategories(companyId || null);
  const { data: clients = [] } = useClientOptions(companyId || null);
  const { data: brands = [] } = useBrandOptions(companyId || null);
  const brandOptions = clientId ? brands.filter((b) => b.client_id === clientId) : brands;

  useEffect(() => {
    if (!open) return;
    form.reset({
      company_id: product?.company_id ?? scopeId ?? "",
      name: product?.name ?? "",
      client_id: product?.client_id ?? "",
      brand_id: product?.brand_id ?? "",
      category_id: product?.category_id ?? "",
      subcategory: product?.subcategory ?? "",
      variant: product?.variant ?? "",
      description: product?.description ?? "",
      net_content: numOrEmpty(product?.net_content),
      unit: product?.unit ?? "pcs",
      moq: product?.moq ?? 100,
      standard_batch_quantity: numOrEmpty(product?.standard_batch_quantity),
      shelf_life_months: numOrEmpty(product?.shelf_life_months),
      packaging_type: product?.packaging_type ?? "",
      status: (product?.status as ProductFormValues["status"]) ?? "draft",
      notes: product?.notes ?? "",
      specifications: Object.fromEntries(
        Object.entries(product?.specifications ?? {}).map(([k, v]) => [k, String(v ?? "")]),
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product?.id]);

  const simpan = useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const specifications = Object.fromEntries(
        Object.entries(values.specifications ?? {}).filter(([, v]) => v.trim() !== ""),
      );
      const payload = {
        company_id: values.company_id,
        name: values.name.trim(),
        client_id: kosong(values.client_id),
        brand_id: kosong(values.brand_id),
        category_id: kosong(values.category_id),
        subcategory: kosong(values.subcategory),
        variant: kosong(values.variant),
        description: kosong(values.description),
        net_content: values.net_content ?? null,
        unit: values.unit.trim(),
        moq: values.moq,
        standard_batch_quantity: values.standard_batch_quantity ?? null,
        shelf_life_months: values.shelf_life_months ?? null,
        packaging_type: kosong(values.packaging_type),
        status: values.status,
        notes: kosong(values.notes),
        specifications,
      };

      if (product) {
        const { error } = await supabase.from("products").update(payload).eq("id", product.id);
        if (error) throw error;
        return;
      }

      const { data: sku, error: skuError } = await supabase.rpc("next_document_number", {
        _company_id: values.company_id,
        _doc_type: "product",
      });
      if (skuError) throw skuError;

      const { error } = await supabase.from("products").insert({ ...payload, sku });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(product ? "Produk diperbarui" : "Produk baru ditambahkan");
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan produk"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{product ? "Ubah Produk" : "Tambah Produk"}</DialogTitle>
          <DialogDescription>
            {product
              ? `Perbarui data produk ${product.sku}.`
              : "SKU produk dibuat otomatis setelah data disimpan."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => simpan.mutate(v))}>
            <Tabs defaultValue="umum">
              <TabsList className="mb-4">
                <TabsTrigger value="umum">Data umum</TabsTrigger>
                <TabsTrigger value="spesifikasi">Spesifikasi</TabsTrigger>
              </TabsList>

              <TabsContent value="umum" className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="company_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Perusahaan</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          form.setValue("client_id", "");
                          form.setValue("brand_id", "");
                          form.setValue("category_id", "");
                          form.setValue("specifications", {});
                        }}
                        disabled={Boolean(product)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih perusahaan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {companies.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} — {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PRODUCT_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {labelStatus(s)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Nama produk</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Serum Brightening 20ml" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="client_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Klien</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => {
                          field.onChange(v === "none" ? "" : v);
                          form.setValue("brand_id", "");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih klien" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Tanpa klien</SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="brand_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih brand" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Tanpa brand</SelectItem>
                          {brandOptions.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Tanpa kategori</SelectItem>
                          {categories
                            .filter((c) => c.is_active || c.id === field.value)
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="subcategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subkategori</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Serum wajah" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="variant"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Varian</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Vanilla" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="packaging_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis kemasan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Contoh: Botol pump 20ml" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="net_content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Isi bersih</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="decimal"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                          className="num text-right"
                          placeholder="20"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satuan</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="pcs / botol / sachet" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="moq"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MOQ</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                          className="num text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="standard_batch_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kuantitas batch standar</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                          className="num text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="shelf_life_months"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Masa simpan (bulan)</FormLabel>
                      <FormControl>
                        <Input
                          inputMode="numeric"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                          }
                          className="num text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} placeholder="Deskripsi singkat produk" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Catatan internal</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={2} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="spesifikasi" className="grid gap-4 sm:grid-cols-2">
                {specFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Pilih perusahaan terlebih dahulu untuk menampilkan field spesifikasi khusus.
                  </p>
                ) : (
                  specFields.map((f) => (
                    <FormField
                      key={f.key}
                      control={form.control}
                      name={`specifications.${f.key}`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{f.label}</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))
                )}
                {specFields.length > 0 ? (
                  <p className="text-sm text-muted-foreground sm:col-span-2">
                    Field spesifikasi menyesuaikan jenis produk {perusahaan?.code}.
                  </p>
                ) : null}
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={simpan.isPending}>
                {simpan.isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
