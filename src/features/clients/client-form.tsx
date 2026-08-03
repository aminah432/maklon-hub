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
import type { Client } from "@/features/clients/use-clients";

const opsional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Maksimal ${max} karakter` })
    .optional()
    .or(z.literal(""));

export const clientSchema = z.object({
  company_id: z.string().uuid({ message: "Perusahaan wajib dipilih" }),
  owner_name: z
    .string()
    .trim()
    .min(2, { message: "Nama pemilik minimal 2 karakter" })
    .max(120, { message: "Maksimal 120 karakter" }),
  business_name: opsional(150),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9+()\s-]{8,20}$/, { message: "Nomor telepon tidak valid" })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .email({ message: "Email tidak valid" })
    .max(255)
    .optional()
    .or(z.literal("")),
  address: opsional(300),
  city: opsional(80),
  province: opsional(80),
  postal_code: z
    .string()
    .trim()
    .regex(/^\d{5}$/, { message: "Kode pos harus 5 digit" })
    .optional()
    .or(z.literal("")),
  nib: opsional(40),
  npwp: opsional(40),
  source: opsional(80),
  joined_at: z.string().optional().or(z.literal("")),
  status: z.enum(["prospek", "aktif", "nonaktif"]),
  notes: opsional(1000),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

const kosong = (v: string | undefined) => (v && v.trim() !== "" ? v.trim() : null);

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: Client | null;
}) {
  const { companies, scopeId } = useCompany();
  const queryClient = useQueryClient();

  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_id: client?.company_id ?? scopeId ?? "",
      owner_name: "",
      business_name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      province: "",
      postal_code: "",
      nib: "",
      npwp: "",
      source: "",
      joined_at: "",
      status: "prospek",
      notes: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      company_id: client?.company_id ?? scopeId ?? "",
      owner_name: client?.owner_name ?? "",
      business_name: client?.business_name ?? "",
      phone: client?.phone ?? "",
      email: client?.email ?? "",
      address: client?.address ?? "",
      city: client?.city ?? "",
      province: client?.province ?? "",
      postal_code: client?.postal_code ?? "",
      nib: client?.nib ?? "",
      npwp: client?.npwp ?? "",
      source: client?.source ?? "",
      joined_at: client?.joined_at ?? "",
      status: (client?.status as ClientFormValues["status"]) ?? "prospek",
      notes: client?.notes ?? "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);

  const simpan = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const payload = {
        company_id: values.company_id,
        owner_name: values.owner_name.trim(),
        business_name: kosong(values.business_name),
        phone: kosong(values.phone),
        email: kosong(values.email),
        address: kosong(values.address),
        city: kosong(values.city),
        province: kosong(values.province),
        postal_code: kosong(values.postal_code),
        nib: kosong(values.nib),
        npwp: kosong(values.npwp),
        source: kosong(values.source),
        joined_at: kosong(values.joined_at),
        status: values.status,
        notes: kosong(values.notes),
      };

      if (client) {
        const { error } = await supabase.from("clients").update(payload).eq("id", client.id);
        if (error) throw error;
        return;
      }

      const { data: kode, error: kodeError } = await supabase.rpc("next_document_number", {
        _company_id: values.company_id,
        _doc_type: "client",
      });
      if (kodeError) throw kodeError;

      const { error } = await supabase.from("clients").insert({ ...payload, client_code: kode });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(client ? "Data klien diperbarui" : "Klien baru ditambahkan");
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan data klien");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{client ? "Ubah Klien" : "Tambah Klien"}</DialogTitle>
          <DialogDescription>
            {client
              ? `Perbarui data klien ${client.client_code}.`
              : "Kode klien dibuat otomatis setelah data disimpan."}
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
                    onValueChange={field.onChange}
                    disabled={Boolean(client)}
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
                      <SelectItem value="prospek">Prospek</SelectItem>
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
              name="owner_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama pemilik</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh: Budi Santoso" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="business_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama usaha</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh: CV Sinar Jaya" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telepon</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="tel" placeholder="08xxxxxxxxxx" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" placeholder="nama@email.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Alamat</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} placeholder="Alamat lengkap" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kota</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="province"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provinsi</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="postal_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode pos</FormLabel>
                  <FormControl>
                    <Input {...field} inputMode="numeric" placeholder="55281" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="joined_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tanggal bergabung</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nib"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIB</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="npwp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NPWP</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Sumber klien</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Contoh: Instagram, makelar, referensi" />
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
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="sm:col-span-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={simpan.isPending}
              >
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
