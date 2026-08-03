import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Brand = {
  id: string;
  company_id: string;
  client_id: string;
  brand_code: string;
  name: string;
  description: string | null;
  main_category: string | null;
  target_market: string | null;
  status: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export const BRAND_STATUSES = ["pengembangan", "aktif", "nonaktif"] as const;

export function useBrands(scopeId: string | null, archived: boolean) {
  return useQuery({
    queryKey: ["brands", scopeId, archived],
    queryFn: async () => {
      let q = supabase.from("brands").select("*").order("created_at", { ascending: false });
      q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Brand[];
    },
  });
}

export function useArchiveBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("brands")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archive) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brand-options"] });
      toast.success(archive ? "Brand diarsipkan" : "Brand dipulihkan");
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui status arsip"),
  });
}
