import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Client = {
  id: string;
  company_id: string;
  client_code: string;
  owner_name: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  nib: string | null;
  npwp: string | null;
  source: string | null;
  joined_at: string | null;
  status: string;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
};

export function useClients(scopeId: string | null, archived: boolean) {
  return useQuery({
    queryKey: ["clients", scopeId, archived],
    queryFn: async () => {
      let q = supabase.from("clients").select("*").order("created_at", { ascending: false });
      q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
      if (scopeId) q = q.eq("company_id", scopeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Client[];
    },
  });
}

export function useArchiveClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await supabase
        .from("clients")
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
      return archive;
    },
    onSuccess: (archive) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success(archive ? "Klien diarsipkan" : "Klien dipulihkan");
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Gagal memperbarui status arsip");
    },
  });
}
