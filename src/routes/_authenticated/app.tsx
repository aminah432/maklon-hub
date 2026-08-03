import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/app-shell";
import { CompanyProvider } from "@/lib/company-context";

export const Route = createFileRoute("/_authenticated/app")({
  component: () => (
    <CompanyProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </CompanyProvider>
  ),
});
