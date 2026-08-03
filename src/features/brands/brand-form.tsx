import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { useClientOptions } from "@/features/products/use-products";
import type { Brand } from "@/features/brands/use-brands";

const opsional = (max: number) =>
  z.string().trim().max(max, { message: `Maksimal ${max} karakter` }).optional().or(z.literal(""));

export const brandSchema = z.object({
  company_id: z.string().uuid({ message: "Perusahaan wajib dipilih" }),
  client_id: z.string().uuid({ message: "Klien pemilik brand wajib dipilih" }),
  name: z
    .string()
    .trim()
    .min(2, { message: "Nama brand minimal 2 karakter" })
    .max(120, { message: "Maksimal 120 karakter" }),
  main_category: opsional(80),
  target_market: opsional(120),
  description: opsional(500),
  status: z.enum(["pengembangan", "aktif", "nonaktif"]),
  notes: opsional(1000),
});

export type BrandFormValues = z.infer<typeof brandSchema>;

const kosong = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  brand: Brand | null;
}) {
  const { companies, scopeId } = useCompany();
  const queryClient = useQueryClient();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      company_id: brand?.company_id ?? scopeId ?? "",
      client_id: brand?.client_id ?? "",
      name: "",
      main_category: "",
      target_market: "",
      description: "",
      status: "pengembangan",
      notes: "",
    },
  });

  const companyId = form.watch("company_id");
  const { data: clients = [] } = useClientOptions(companyId || scopeId);

  useEffect(() => {
    if (!open) return;
    form.reset({
      company_id: brand?.company_id ?? scopeId ?? "",
      client_id: brand?.client_id ?? "",
      name: brand?.name ?? "",
      main_category: brand?.main_category ?? "",
      target_market: brand?.target_market ?? "",
      description: brand?.description ?? "",
      status: (brand?.status as BrandFormValues["status"]) ?? "pengembangan",
      notes: brand?.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, brand?.id]);

  const simpan = useMutation({
    mutationFn: async (values: BrandFormValues) => {
      const payload = {
        company_id: values.company_id,
        client_id: values.client_id,
        name: values.name.trim(),
        main_category: kosong(values.main_category),
        target_market: kosong(values.target_market),
        description: kosong(values.description),
        status: values.status,
        notes: kosong(values.notes),
      };

      if (brand) {
        const { error } = await supabase.from("brands").update(payload).eq("id", brand.id);
        if (error) throw error;
        return;
      }

      const { data: kode, error: kodeError } = await supabase.rpc("next_document_number", {
        _company_id: values.company_id,
        _doc_type: "brand",
      });
      if (kodeError) throw kodeError;

      const { error } = await supabase.from("brands").insert({ ...payload, brand_code: kode });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand-options"] });
      toast.success(brand ? "Data brand diperbarui" : "Brand baru ditambahkan");
      onOpenChange(false);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan data brand"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{brand ? "Ubah Brand" : "Tambah Brand"}</DialogTitle>
          <DialogDescription>
            {brand
              ? `Perbarui data brand ${brand.brand_code}.`
              : "Kode brand dibuat otomatis setelah data disimpan."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit((v) => simpan.mutate(v))}
          >
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
                    }}
                    disabled={Boolean(brand)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih perusahaan" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies.map((c) => (
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
              name="client_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Klien pemilik</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih klien" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients
                        .filter((c) => !companyId || c.company_id === companyId)
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
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama brand</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh: Glowlyn" />
                  </FormControl>
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
                      <SelectItem value="pengembangan">Pengembangan</SelectItem>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="nonaktif">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="main_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori utama</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Skincare, minuman, dll" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_market"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target pasar</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh: Wanita 18-35 tahun" />
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
                    <Textarea {...field} rows={3} />
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

            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={simpan.isPending}>
                {simpan.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
