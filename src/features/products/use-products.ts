import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Product = {
  id: string;
  company_id: string;
  client_id: string | null;
  brand_id: string | null;
  category_id: string | null;
  sku: string;
  name: string;
  subcategory: string | null;
  variant: string | null;
  description: string | null;
  net_content: number | null;
  unit: string;
  moq: number;
  standard_batch_quantity: number | null;
  shelf_life_months: number | null;
  packaging_type: string | null;
  status: string;
  main_image_url: string | null;
  specifications: Record<string, unknown>;
  regulatory_data: Record<string, unknown>;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export type ProductCategory = {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};

export type RefRow = { id: string; company_id: string; name: string };

export function useProducts(scopeId: string | null, archived: boolean) {
  return useQuery({
    queryKey: ["products", scopeId, archived],
    queryFn: async () => {
      let q = supabase.from("products").select("*").order("created_at", { ascending: false });
      q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Product[];
    },
  });
}

export function useProductCategories(scopeId: string | null) {
  return useQuery({
    queryKey: ["product_categories", scopeId],
    queryFn: async () => {
      let q = supabase.from("product_categories").select("*").order("sort_order");
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ProductCategory[];
    },
    staleTime: 60_000,
  });
}

export function useClientOptions(scopeId: string | null) {
  return useQuery({
    queryKey: ["client-options", scopeId],
    queryFn: async () => {
      let q = supabase
        .from("clients")
        .select("id, company_id, owner_name, business_name")
        .is("archived_at", null)
        .order("owner_name");
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((c) => ({
        id: c.id as string,
        company_id: c.company_id as string,
        name: (c.business_name as string | null) ?? (c.owner_name as string),
      })) as RefRow[];
    },
    staleTime: 60_000,
  });
}

export function useBrandOptions(scopeId: string | null) {
  return useQuery({
    queryKey: ["brand-options", scopeId],
    queryFn: async () => {
      let q = supabase
        .from("brands")
        .select("id, company_id, name, client_id")
        .is("archived_at", null)
        .order("name");
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as (RefRow & { client_id: string })[];
    },
    staleTime: 60_000,
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("products")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archive) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(archive ? "Produk diarsipkan" : "Produk dipulihkan");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui status arsip"),
  });
}

export function useSaveCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      company_id: string;
      name: string;
      description: string | null;
      sort_order: number;
      is_active: boolean;
    }) => {
      if (input.id) {
        const { id, ...rest } = input;
        const { error } = await supabase.from("product_categories").update(rest).eq("id", id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("product_categories").insert({
        company_id: input.company_id,
        name: input.name,
        description: input.description,
        sort_order: input.sort_order,
        is_active: input.is_active,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast.success("Kategori disimpan");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kategori"),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product_categories"] });
      toast.success("Kategori dihapus");
    },
    onError: () =>
      toast.error("Kategori tidak bisa dihapus. Nonaktifkan saja bila masih dipakai produk."),
  });
}
