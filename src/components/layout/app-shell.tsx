import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, User2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CompanySwitcher } from "@/components/layout/company-switcher";
import { GlobalSearch, NotificationCenter } from "@/components/layout/global-tools";
import { useCompany } from "@/lib/company-context";
import { logoPerusahaan, skalaLogo } from "@/lib/company-logo";
import { MascotLogo } from "@/components/common/mascot";

import { NAV_ITEMS, MOBILE_NAV } from "@/lib/constants";
import { inisial, sapaan } from "@/lib/format";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Rute pengaturan belum dibuat; string lebar agar aman saat rute ditambahkan. */
const SETTINGS_PATH: string = "/app/settings";

function NavList({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  return (
    <nav className="space-y-1" aria-label="Navigasi utama">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-primary/8 hover:text-foreground data-[status=active]:bg-primary/12 data-[status=active]:text-primary"
          activeProps={{ className: "bg-primary/12 text-primary" }}
        >
          <item.icon className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: (() => void) | undefined }) {
  const { active, activeId } = useCompany();
  const logo = activeId === "all" ? undefined : logoPerusahaan(active?.code);

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex min-w-0 items-center gap-2.5 px-1">
        {logo ? (
          <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl bg-white p-0.5">
            <img
              src={logo}
              alt={`Logo ${active?.name ?? "perusahaan"}`}
              className={cn(
                "size-full object-contain transition-transform duration-300",
                skalaLogo(active?.code),
              )}
            />
          </span>
        ) : (
          <MascotLogo size={36} />
        )}

        <span className="min-w-0">
          <span className="block truncate text-sm font-bold leading-tight">
            {activeId === "all" ? "Maklon Control" : (active?.name ?? "Maklon Control")}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {activeId === "all" ? "Center" : (active?.code ?? "Center")}
          </span>
        </span>
      </div>
      <CompanySwitcher />
      <ScrollArea className="-mx-1 flex-1 px-1">
        <NavList onNavigate={onNavigate} />
      </ScrollArea>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const nama = (user?.user_metadata?.["full_name"] as string) ?? user?.email ?? "Pengguna";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-border/70 bg-sidebar lg:block print:hidden">
        <SidebarContent />
      </aside>

      <div className="lg:pl-[264px]">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background print:hidden">
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                  <Menu className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
                <SidebarContent onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>

            <GlobalSearch />

            <div className="flex shrink-0 items-center gap-1">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu akun">
                    <span className="grid size-8 place-items-center rounded-full bg-primary/12 text-xs font-bold text-primary">
                      {inisial(nama)}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  <DropdownMenuLabel className="truncate">
                    <span className="block text-xs font-normal text-muted-foreground">
                      {sapaan()},
                    </span>
                    {nama}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="gap-2 rounded-xl">
                    <Link to={SETTINGS_PATH}>
                      <User2 className="size-4" aria-hidden /> Pengaturan
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 rounded-xl" onClick={handleSignOut}>
                    <LogOut className="size-4" aria-hidden /> Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="mesh-bg mx-auto w-full max-w-[1400px] px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div aria-hidden className="mesh-layer" />
          {children}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border/70 bg-background lg:hidden print:hidden"
        aria-label="Navigasi cepat"
      >
        {MOBILE_NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <item.icon className="size-5" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between",
      )}
    >
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export { X };
