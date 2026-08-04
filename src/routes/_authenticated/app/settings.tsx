import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/app-shell";
import { LoadingSkeleton, ErrorState } from "@/components/common/states";
import { RecordFormDialog, type FormValues } from "@/components/common/record-form";
import { CategoryManagerDialog } from "@/features/products/category-manager";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/lib/company-context";
import { useAuth } from "@/hooks/use-auth";
import { db, useAction, useRows, useSaveRow, type DbRow } from "@/lib/db";
import { persen, rupiah } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/app/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Pengaturan — Maklon Control Center" },
      {
        name: "description",
        content:
          "Atur profil perusahaan maklon, rekening, margin minimum, dan catatan dokumen standar.",
      },
      { property: "og:title", content: "Pengaturan — Maklon Control Center" },
      { property: "og:description", content: "Konfigurasi perusahaan dan preferensi dokumen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function SettingsPage() {
  const { activeId, scopeId } = useCompany();
  const { user } = useAuth();
  const [edit, setEdit] = useState<DbRow | null>(null);
  const [kategori, setKategori] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const keluar = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const companies = useRows<DbRow>("companies", { orderBy: "code", asc: true });
  const simpan = useSaveRow("companies", { label: "Perusahaan", invalidate: ["companies"] });

  const daftar = (companies.data ?? []).filter(
    (c) => activeId === "all" || String(c["id"]) === scopeId,
  );

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Profil perusahaan, preferensi dokumen, dan data master pendukung"
        actions={
          <Button variant="outline" onClick={() => setKategori(true)}>
            Kelola kategori produk
          </Button>
        }
      />

      <section className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-5">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Akun</h2>
          <p className="mt-2 truncate text-sm text-muted-foreground">
            Masuk sebagai <span className="font-medium text-foreground">{user?.email ?? "-"}</span>
          </p>
        </div>
        <Button variant="destructive" className="gap-2 rounded-xl" onClick={() => void keluar()}>
          <LogOut className="size-4" aria-hidden /> Keluar
        </Button>
      </section>

      <CompanyAccessManager companies={companies.data ?? []} userId={user?.id ?? ""} />

      {companies.isLoading ? (
        <LoadingSkeleton rows={3} />
      ) : companies.isError ? (
        <ErrorState onRetry={() => void companies.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {daftar.map((c) => (
            <article
              key={String(c["id"])}
              className="rounded-2xl border border-border/70 bg-card p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-xs font-bold text-primary-foreground">
                    {String(c["code"])}
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{String(c["name"])}</h3>
                    <p className="truncate text-xs text-muted-foreground">
                      {String(c["business_type"] ?? "Maklon")}
                    </p>
                  </div>
                </div>
                <Badge variant={c["is_active"] ? "secondary" : "outline"} className="rounded-lg">
                  {c["is_active"] ? "Aktif" : "Nonaktif"}
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Telepon</dt>
                  <dd className="truncate">{String(c["phone"] ?? "-")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Email</dt>
                  <dd className="truncate">{String(c["email"] ?? "-")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Rekening</dt>
                  <dd className="truncate">
                    {String(c["bank_name"] ?? "-")} {String(c["bank_account"] ?? "")}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Margin minimum</dt>
                  <dd>{persen(Number(c["minimum_margin"]))}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Termin default</dt>
                  <dd className="truncate">{String(c["default_payment_terms"] ?? "-")}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Masa berlaku penawaran</dt>
                  <dd>{Number(c["default_quotation_validity_days"])} hari</dd>
                </div>
              </dl>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setEdit(c)}>
                  Ubah profil
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <RecordFormDialog
        open={edit !== null}
        onOpenChange={(v) => !v && setEdit(null)}
        title="Ubah profil perusahaan"
        description={edit ? String(edit["name"]) : ""}
        saving={simpan.isPending}
        initial={
          edit
            ? {
                name: String(edit["name"] ?? ""),
                business_type: String(edit["business_type"] ?? ""),
                phone: String(edit["phone"] ?? ""),
                email: String(edit["email"] ?? ""),
                address: String(edit["address"] ?? ""),
                tax_number: String(edit["tax_number"] ?? ""),
                bank_name: String(edit["bank_name"] ?? ""),
                bank_account: String(edit["bank_account"] ?? ""),
                bank_account_name: String(edit["bank_account_name"] ?? ""),
                minimum_margin: Number(edit["minimum_margin"] ?? 0),
                default_payment_terms: String(edit["default_payment_terms"] ?? ""),
                default_quotation_validity_days: Number(
                  edit["default_quotation_validity_days"] ?? 14,
                ),
                invoice_footer_note: String(edit["invoice_footer_note"] ?? ""),
                quotation_footer_note: String(edit["quotation_footer_note"] ?? ""),
                is_active: Boolean(edit["is_active"]),
              }
            : {}
        }
        fields={[
          { name: "name", label: "Nama perusahaan", required: true },
          { name: "business_type", label: "Jenis usaha" },
          { name: "phone", label: "Telepon" },
          { name: "email", label: "Email" },
          { name: "address", label: "Alamat", type: "textarea" },
          { name: "tax_number", label: "NPWP" },
          { name: "bank_name", label: "Bank" },
          { name: "bank_account", label: "Nomor rekening" },
          { name: "bank_account_name", label: "Atas nama" },
          { name: "minimum_margin", label: "Margin minimum", type: "percent" },
          { name: "default_payment_terms", label: "Termin pembayaran default" },
          {
            name: "default_quotation_validity_days",
            label: "Masa berlaku penawaran (hari)",
            type: "number",
          },
          { name: "invoice_footer_note", label: "Catatan kaki invoice", type: "textarea" },
          { name: "quotation_footer_note", label: "Catatan kaki penawaran", type: "textarea" },
          { name: "is_active", label: "Perusahaan aktif", type: "switch" },
        ]}
        onSubmit={(values: FormValues) => {
          if (!edit) return;
          simpan.mutate(
            {
              id: String(edit["id"]),
              values: {
                name: values["name"],
                business_type: values["business_type"] || null,
                phone: values["phone"] || null,
                email: values["email"] || null,
                address: values["address"] || null,
                tax_number: values["tax_number"] || null,
                bank_name: values["bank_name"] || null,
                bank_account: values["bank_account"] || null,
                bank_account_name: values["bank_account_name"] || null,
                minimum_margin: Number(values["minimum_margin"] ?? 0),
                default_payment_terms: values["default_payment_terms"] || null,
                default_quotation_validity_days: Number(
                  values["default_quotation_validity_days"] ?? 14,
                ),
                invoice_footer_note: values["invoice_footer_note"] || null,
                quotation_footer_note: values["quotation_footer_note"] || null,
                is_active: Boolean(values["is_active"]),
              },
            },
            { onSuccess: () => setEdit(null) },
          );
        }}
      />

      <CategoryManagerDialog open={kategori} onOpenChange={setKategori} />

      <p className="mt-6 text-xs text-muted-foreground">
        Nilai nominal ditampilkan dalam Rupiah (contoh: {rupiah(1500000)}) dengan zona waktu
        Asia/Jakarta.
      </p>
    </>
  );
}

function CompanyAccessManager({ companies, userId }: { companies: DbRow[]; userId: string }) {
  const profiles = useRows<DbRow>("profiles", { orderBy: "email", asc: true });
  const roles = useRows<DbRow>("user_roles", { orderBy: "created_at", asc: true });
  const accesses = useRows<DbRow>("user_company_access", {
    orderBy: "created_at",
    asc: true,
  });
  const isSuperAdmin = (roles.data ?? []).some(
    (role) => String(role["user_id"]) === userId && role["role"] === "super_admin",
  );
  const toggle = useAction(
    async ({
      profileId,
      companyId,
      accessId,
    }: {
      profileId: string;
      companyId: string;
      accessId?: string;
    }) => {
      if (accessId) {
        const { error } = await db("user_company_access").delete().eq("id", accessId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await db("user_company_access").insert({
          user_id: profileId,
          company_id: companyId,
          role: "admin",
        });
        if (error) throw new Error(error.message);
      }
    },
    { invalidate: ["user_company_access", "companies"], success: "Akses perusahaan diperbarui" },
  );

  if (!isSuperAdmin) return null;

  return (
    <section className="mb-6 rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Users className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-semibold">Akses pengguna per perusahaan</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktifkan hanya perusahaan yang boleh diakses akun tersebut. Perubahan ini juga membatasi
            dokumen pada Storage.
          </p>
        </div>
      </div>

      <div className="mt-4 divide-y divide-border/60 rounded-2xl border border-border/70">
        {(profiles.data ?? []).map((profile) => {
          const profileId = String(profile["id"]);
          const profileIsSuper = (roles.data ?? []).some(
            (role) => String(role["user_id"]) === profileId && role["role"] === "super_admin",
          );
          return (
            <div key={profileId} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_2fr]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {String(profile["full_name"] ?? profile["email"] ?? "Pengguna")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {String(profile["email"] ?? "-")}
                </p>
                {profileIsSuper ? (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                    <ShieldCheck className="size-3" aria-hidden /> Super admin · seluruh perusahaan
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {companies.map((company) => {
                  const access = (accesses.data ?? []).find(
                    (row) =>
                      String(row["user_id"]) === profileId &&
                      String(row["company_id"]) === String(company["id"]),
                  );
                  const active = profileIsSuper || Boolean(access);
                  return (
                    <Button
                      key={String(company["id"])}
                      type="button"
                      size="sm"
                      variant={active ? "default" : "outline"}
                      disabled={profileIsSuper || toggle.isPending}
                      aria-pressed={active}
                      onClick={() =>
                        toggle.mutate({
                          profileId,
                          companyId: String(company["id"]),
                          ...(access ? { accessId: String(access["id"]) } : {}),
                        })
                      }
                    >
                      {String(company["code"] ?? company["name"])}
                    </Button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
