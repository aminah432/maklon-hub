import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Company = {
  id: string;
  code: string;
  name: string;
  business_type: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  tax_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  theme_key: string;
  primary_color: string | null;
  minimum_margin: number;
  default_payment_terms: string | null;
  default_quotation_validity_days: number;
  invoice_footer_note: string | null;
  quotation_footer_note: string | null;
};

const STORAGE_KEY = "mcc.company";

type CompanyContextValue = {
  companies: Company[];
  isLoading: boolean;
  activeId: string | "all";
  active: Company | null;
  setActive: (id: string | "all") => void;
  /** id perusahaan untuk filter query, null berarti semua perusahaan */
  scopeId: string | null;
  companyById: (id: string | null | undefined) => Company | undefined;
};

const CompanyContext = createContext<CompanyContextValue | null>(null);

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("is_active", true)
        .order("code");
      if (error) throw error;
      return (data ?? []) as unknown as Company[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { data: companies = [], isLoading } = useCompanies();
  const [activeId, setActiveId] = useState<string | "all">("all");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (saved) setActiveId(saved);
  }, []);

  const setActive = (id: string | "all") => {
    setActiveId(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
  };

  const active = useMemo(
    () => companies.find((c) => c.id === activeId) ?? null,
    [companies, activeId],
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    const key = active?.code.toLowerCase() ?? "";
    if (key) document.documentElement.setAttribute("data-company", key);
    else document.documentElement.removeAttribute("data-company");
  }, [active]);

  const value: CompanyContextValue = {
    companies,
    isLoading,
    activeId,
    active,
    setActive,
    scopeId: activeId === "all" ? null : activeId,
    companyById: (id) => companies.find((c) => c.id === id),
  };

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany(): CompanyContextValue {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany harus dipakai di dalam CompanyProvider");
  return ctx;
}
