import { createFileRoute, Outlet, redirect, isRedirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedEmail } from "@/lib/allowed-accounts";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        // Sesi kedaluwarsa / token refresh gagal — bersihkan agar tidak looping request.
        await supabase.auth.signOut().catch(() => undefined);
        throw redirect({ to: "/auth" });
      }
      if (!isAllowedEmail(data.user.email)) {
        await supabase.auth.signOut().catch(() => undefined);
        throw redirect({ to: "/auth" });
      }
      return { user: data.user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});
