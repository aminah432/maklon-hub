import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart3, Boxes, Eye, EyeOff, Factory, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { Mascot, MascotLogo } from "@/components/common/mascot";
import { isAllowedEmail, normalizeEmail, NOT_ALLOWED_MESSAGE } from "@/lib/allowed-accounts";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Masuk — Maklon Control Center" },
      { name: "description", content: "Masuk ke sistem administrasi maklon multi perusahaan." },
      { property: "og:title", content: "Masuk — Maklon Control Center" },
      {
        property: "og:description",
        content: "Masuk ke sistem administrasi maklon multi perusahaan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const SOROTAN = [
  {
    icon: Boxes,
    title: "Master data terpusat",
    desc: "Klien, brand, produk, dan HPP dalam satu tempat.",
  },
  {
    icon: Factory,
    title: "Produksi terpantau",
    desc: "Batch, tahapan, dan quality control real-time.",
  },
  { icon: BarChart3, title: "KPI instan", desc: "Omzet, laba, piutang, dan invoice jatuh tempo." },
];

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!isAllowedEmail(email)) {
        toast.error(NOT_ALLOWED_MESSAGE);
        return;
      }
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizeEmail(email),
        password,
      });
      if (error) throw error;
      if (!isAllowedEmail(data.user?.email)) {
        await supabase.auth.signOut();
        toast.error(NOT_ALLOWED_MESSAGE);
        return;
      }
      navigate({ to: "/app/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(
        /fetch|network/i.test(message)
          ? "Koneksi ke server terputus. Periksa internet lalu coba lagi."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-primary-deep p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="mesh-layer-light" />
        <div
          aria-hidden
          className="animate-soft-float pointer-events-none absolute -left-24 -top-24 size-[26rem] rounded-full bg-primary/50 blur-3xl"
        />
        <div
          aria-hidden
          className="animate-soft-float pointer-events-none absolute -bottom-32 -right-16 size-[30rem] rounded-full bg-primary/35 blur-3xl"
          style={{ animationDelay: "-7s", animationDuration: "18s" }}
        />

        <div className="animate-rise-in relative flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-foreground/15 backdrop-blur">
            <MascotLogo size={34} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold">Maklon Control Center</p>
            <p className="text-xs opacity-70">Administrasi tiga perusahaan, satu kendali</p>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h2
            className="animate-rise-in text-4xl leading-[1.1] tracking-tight"
            style={{ animationDelay: "0.1s" }}
          >
            Kendalikan seluruh alur maklon dari satu dasbor.
          </h2>
          <p
            className="animate-rise-in mt-4 text-sm leading-relaxed opacity-80"
            style={{ animationDelay: "0.2s" }}
          >
            Dari kalkulasi HPP, penawaran, pesanan, produksi, hingga penagihan — semua rapi,
            terukur, dan terpisah per perusahaan.
          </p>

          <ul className="mt-8 space-y-3">
            {SOROTAN.map((s, i) => (
              <li
                key={s.title}
                className="animate-rise-in flex items-start gap-3 rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-4 backdrop-blur transition-transform duration-500 hover:translate-x-1"
                style={{ animationDelay: `${0.3 + i * 0.12}s` }}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary-foreground/15">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="block text-xs opacity-75">{s.desc}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Mascot className="pointer-events-none absolute bottom-4 right-4 hidden w-[min(38vw,13rem)] opacity-95 xl:block 2xl:w-[min(30vw,16rem)]" />

        <p
          className="animate-rise-in relative flex items-center gap-2 text-xs opacity-70"
          style={{ animationDelay: "0.7s" }}
        >
          <ShieldCheck className="size-4" aria-hidden />
          Data terisolasi per perusahaan dengan kontrol akses berlapis.
        </p>
      </section>

      <section className="flex items-center justify-center bg-white px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <MascotLogo size={44} />
            <span className="text-sm font-semibold text-neutral-700">Maklon Control Center</span>
          </div>

          <h1 className="text-2xl font-black tracking-tight text-neutral-900">
            Selamat datang kembali
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Masuk menggunakan akun yang telah diberikan administrator.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-neutral-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="nama@perusahaan.co.id"
                className="h-11 rounded-xl border-neutral-200 bg-white text-neutral-900"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-neutral-700">
                Kata sandi
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  placeholder="Minimal 6 karakter"
                  className="h-11 rounded-xl border-neutral-200 bg-white pr-11 text-neutral-900"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-neutral-400 transition-colors hover:text-neutral-700"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>
              {loading ? "Memproses…" : "Masuk"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Belum memiliki akses? Hubungi administrator perusahaan.
          </p>
        </div>
      </section>
    </div>
  );
}
