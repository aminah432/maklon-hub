import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Helper query generik agar seluruh modul memakai pola yang sama. */
export type DbRow = Record<string, unknown>;

type Res<T> = { data: T; error: { message: string } | null };

export interface Q extends PromiseLike<Res<DbRow[] | null>> {
  select: (s?: string) => Q;
  eq: (c: string, v: unknown) => Q;
  neq: (c: string, v: unknown) => Q;
  in: (c: string, v: unknown[]) => Q;
  is: (c: string, v: unknown) => Q;
  not: (c: string, op: string, v: unknown) => Q;
  gte: (c: string, v: unknown) => Q;
  lte: (c: string, v: unknown) => Q;
  order: (c: string, o?: { ascending?: boolean }) => Q;
  limit: (n: number) => Q;
  insert: (v: unknown) => Q;
  update: (v: unknown) => Q;
  delete: () => Q;
  single: () => PromiseLike<Res<DbRow | null>>;
}

export const db = (table: string): Q => (supabase.from as unknown as (t: string) => Q)(table);

export async function nomorDokumen(companyId: string, docType: string): Promise<string> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<Res<string | null>>;
  const { data, error } = await rpc("next_document_number", {
    _company_id: companyId,
    _doc_type: docType,
  });
  if (error) throw new Error(error.message);
  return String(data ?? "");
}

export type RowsParams = {
  scopeId?: string | null;
  select?: string;
  orderBy?: string;
  asc?: boolean;
  /** true = hanya arsip, false = hanya aktif, undefined = abaikan */
  archived?: boolean;
  eq?: Record<string, string | number | boolean | null | undefined>;
  limit?: number;
  enabled?: boolean;
};

export function useRows<T = DbRow>(table: string, params: RowsParams = {}) {
  const {
    scopeId = null,
    select = "*",
    orderBy = "created_at",
    asc = false,
    archived,
    eq = {},
    limit,
    enabled = true,
  } = params;

  return useQuery({
    queryKey: [table, scopeId, select, orderBy, asc, archived, eq, limit],
    enabled,
    queryFn: async () => {
      let q = db(table).select(select).order(orderBy, { ascending: asc });
      if (scopeId) q = q.eq("company_id", scopeId);
      if (archived === true) q = q.not("archived_at", "is", null);
      if (archived === false) q = q.is("archived_at", null);
      for (const [k, v] of Object.entries(eq)) {
        if (v !== undefined && v !== null && v !== "" && v !== "semua") q = q.eq(k, v);
      }
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as T[];
    },
  });
}

function pesan(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

export function useSaveRow(table: string, opts: { invalidate?: string[]; label?: string } = {}) {
  const qc = useQueryClient();
  const label = opts.label ?? "Data";
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string | null; values: DbRow }) => {
      if (id) {
        const { error } = await db(table).update(values).eq("id", id);
        if (error) throw new Error(error.message);
        return { id, created: false };
      }
      const { data, error } = await db(table).insert(values).select("id");
      if (error) throw new Error(error.message);
      const first = (data ?? [])[0] as DbRow | undefined;
      return { id: String(first?.["id"] ?? ""), created: true };
    },
    onSuccess: (r) => {
      for (const k of [table, ...(opts.invalidate ?? [])]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
      toast.success(r.created ? `${label} ditambahkan` : `${label} diperbarui`);
    },
    onError: (e) => toast.error(pesan(e, `Gagal menyimpan ${label.toLowerCase()}`)),
  });
}

export function useDeleteRow(table: string, opts: { invalidate?: string[]; label?: string } = {}) {
  const qc = useQueryClient();
  const label = opts.label ?? "Data";
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: () => {
      for (const k of [table, ...(opts.invalidate ?? [])]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
      toast.success(`${label} dihapus`);
    },
    onError: (e) => toast.error(pesan(e, `Gagal menghapus ${label.toLowerCase()}`)),
  });
}

export function useArchiveRow(table: string, opts: { invalidate?: string[]; label?: string } = {}) {
  const qc = useQueryClient();
  const label = opts.label ?? "Data";
  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { error } = await db(table)
        .update({ archived_at: archive ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw new Error(error.message);
      return archive;
    },
    onSuccess: (archive) => {
      for (const k of [table, ...(opts.invalidate ?? [])]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
      toast.success(archive ? `${label} diarsipkan` : `${label} dipulihkan`);
    },
    onError: (e) => toast.error(pesan(e, "Gagal memperbarui arsip")),
  });
}

/** Mutasi bebas dengan invalidasi cache dan notifikasi. */
export function useAction<TVars>(
  fn: (vars: TVars) => Promise<unknown>,
  opts: { invalidate?: string[]; success?: string } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      for (const k of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: [k] });
      if (opts.success) toast.success(opts.success);
    },
    onError: (e) => toast.error(pesan(e, "Aksi gagal dijalankan")),
  });
}

export function teks(row: DbRow | undefined, key: string): string {
  const v = row?.[key];
  return v === null || v === undefined ? "" : String(v);
}

export function nomor(row: DbRow | undefined, key: string): number {
  const v = Number(row?.[key]);
  return Number.isFinite(v) ? v : 0;
}
