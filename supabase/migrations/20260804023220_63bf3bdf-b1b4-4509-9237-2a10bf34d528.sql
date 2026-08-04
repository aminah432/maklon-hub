
-- ============ MASTER SUPPLIER ============
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_company_access" ON public.suppliers FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));
CREATE TRIGGER trg_suppliers_updated BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ MASTER BAHAN BAKU ============
CREATE TABLE IF NOT EXISTS public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'bahan_baku_utama',
  default_unit text NOT NULL DEFAULT 'gram',
  density numeric(18,6),
  density_unit text,
  density_source text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raw_materials TO authenticated;
GRANT ALL ON public.raw_materials TO service_role;
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raw_materials_company_access" ON public.raw_materials FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));
CREATE TRIGGER trg_raw_materials_updated BEFORE UPDATE ON public.raw_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RIWAYAT HARGA BAHAN ============
CREATE TABLE IF NOT EXISTS public.material_supplier_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  material_id uuid NOT NULL REFERENCES public.raw_materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_price numeric(18,6) NOT NULL DEFAULT 0,
  purchase_quantity numeric(18,6) NOT NULL DEFAULT 1,
  purchase_unit text NOT NULL DEFAULT 'kg',
  normalized_quantity numeric(18,6) NOT NULL DEFAULT 0,
  normalized_unit text NOT NULL DEFAULT 'gram',
  normalized_unit_price numeric(18,6) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  is_override boolean NOT NULL DEFAULT false,
  override_reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_msp_material ON public.material_supplier_prices(material_id, effective_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_supplier_prices TO authenticated;
GRANT ALL ON public.material_supplier_prices TO service_role;
ALTER TABLE public.material_supplier_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msp_company_access" ON public.material_supplier_prices FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ MASTER PACKAGING ============
CREATE TABLE IF NOT EXISTS public.packaging_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'lainnya',
  default_unit text NOT NULL DEFAULT 'pcs',
  capacity_per_package numeric(18,6) NOT NULL DEFAULT 1,
  minimum_purchase numeric(18,6),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_materials TO authenticated;
GRANT ALL ON public.packaging_materials TO service_role;
ALTER TABLE public.packaging_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packaging_materials_company_access" ON public.packaging_materials FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));
CREATE TRIGGER trg_packaging_materials_updated BEFORE UPDATE ON public.packaging_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.packaging_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  packaging_material_id uuid NOT NULL REFERENCES public.packaging_materials(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id),
  purchase_price numeric(18,6) NOT NULL DEFAULT 0,
  purchase_quantity numeric(18,6) NOT NULL DEFAULT 1,
  unit_price numeric(18,6) NOT NULL DEFAULT 0,
  effective_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pkg_price_material ON public.packaging_prices(packaging_material_id, effective_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packaging_prices TO authenticated;
GRANT ALL ON public.packaging_prices TO service_role;
ALTER TABLE public.packaging_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packaging_prices_company_access" ON public.packaging_prices FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ KOLOM TAMBAHAN COSTING_VERSIONS ============
ALTER TABLE public.costing_versions
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id),
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.brands(id),
  ADD COLUMN IF NOT EXISTS net_content numeric(18,6),
  ADD COLUMN IF NOT EXISTS net_content_unit text DEFAULT 'gram',
  ADD COLUMN IF NOT EXISTS formula_basis numeric(18,6) NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS formula_basis_unit text NOT NULL DEFAULT 'gram',
  ADD COLUMN IF NOT EXISTS product_variant text,
  ADD COLUMN IF NOT EXISTS output_unit text NOT NULL DEFAULT 'pcs',
  ADD COLUMN IF NOT EXISTS estimated_reject_percentage numeric(9,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_shrinkage_percentage numeric(9,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_formula_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_packaging_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS direct_labor_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS factory_overhead_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subtotal_cost numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_hpp numeric(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overhead_mode text NOT NULL DEFAULT 'gabungan',
  ADD COLUMN IF NOT EXISTS combined_overhead_percentage numeric(9,4) NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS tax_percentage numeric(9,4) NOT NULL DEFAULT 11,
  ADD COLUMN IF NOT EXISTS rounding_method text NOT NULL DEFAULT 'tanpa',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- ============ RINCIAN BAHAN PADA VERSI HPP ============
CREATE TABLE IF NOT EXISTS public.costing_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  costing_version_id uuid NOT NULL REFERENCES public.costing_versions(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.raw_materials(id),
  supplier_price_id uuid REFERENCES public.material_supplier_prices(id),
  material_name_snapshot text NOT NULL,
  category text NOT NULL DEFAULT 'bahan_baku_utama',
  supplier_name_snapshot text,
  usage_percentage numeric(12,6) NOT NULL DEFAULT 0,
  purchase_price_snapshot numeric(18,6) NOT NULL DEFAULT 0,
  purchase_quantity_snapshot numeric(18,6) NOT NULL DEFAULT 1,
  purchase_unit_snapshot text NOT NULL DEFAULT 'kg',
  normalized_unit_price_snapshot numeric(18,6) NOT NULL DEFAULT 0,
  required_quantity numeric(18,6) NOT NULL DEFAULT 0,
  required_unit text NOT NULL DEFAULT 'gram',
  waste_percentage numeric(9,4) NOT NULL DEFAULT 0,
  base_cost numeric(18,6) NOT NULL DEFAULT 0,
  final_cost numeric(18,6) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costing_ingredients_version ON public.costing_ingredients(costing_version_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.costing_ingredients TO authenticated;
GRANT ALL ON public.costing_ingredients TO service_role;
ALTER TABLE public.costing_ingredients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costing_ingredients_company_access" ON public.costing_ingredients FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ RINCIAN PACKAGING PADA VERSI HPP ============
CREATE TABLE IF NOT EXISTS public.costing_packaging_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  costing_version_id uuid NOT NULL REFERENCES public.costing_versions(id) ON DELETE CASCADE,
  packaging_material_id uuid REFERENCES public.packaging_materials(id),
  packaging_price_id uuid REFERENCES public.packaging_prices(id),
  packaging_name_snapshot text NOT NULL,
  category text NOT NULL DEFAULT 'lainnya',
  supplier_name_snapshot text,
  usage_quantity numeric(18,6) NOT NULL DEFAULT 1,
  usage_unit text NOT NULL DEFAULT 'pcs',
  unit_price_snapshot numeric(18,6) NOT NULL DEFAULT 0,
  capacity_quantity numeric(18,6) NOT NULL DEFAULT 1,
  waste_percentage numeric(9,4) NOT NULL DEFAULT 0,
  base_cost numeric(18,6) NOT NULL DEFAULT 0,
  final_cost numeric(18,6) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costing_packaging_version ON public.costing_packaging_items(costing_version_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.costing_packaging_items TO authenticated;
GRANT ALL ON public.costing_packaging_items TO service_role;
ALTER TABLE public.costing_packaging_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costing_packaging_company_access" ON public.costing_packaging_items FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ BIAYA OPERASIONAL PADA VERSI HPP ============
CREATE TABLE IF NOT EXISTS public.costing_operational_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  costing_version_id uuid NOT NULL REFERENCES public.costing_versions(id) ON DELETE CASCADE,
  cost_name text NOT NULL,
  cost_category text NOT NULL DEFAULT 'lainnya',
  calculation_type text NOT NULL DEFAULT 'persentase',
  percentage_value numeric(9,4) NOT NULL DEFAULT 0,
  fixed_value numeric(18,6) NOT NULL DEFAULT 0,
  calculation_base text NOT NULL DEFAULT 'formula_packaging',
  amount numeric(18,6) NOT NULL DEFAULT 0,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costing_opcost_version ON public.costing_operational_costs(costing_version_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.costing_operational_costs TO authenticated;
GRANT ALL ON public.costing_operational_costs TO service_role;
ALTER TABLE public.costing_operational_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costing_opcost_company_access" ON public.costing_operational_costs FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ TEMPLATE HARGA MOQ ============
CREATE TABLE IF NOT EXISTS public.moq_pricing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text NOT NULL,
  product_category_id uuid REFERENCES public.product_categories(id),
  is_default boolean NOT NULL DEFAULT false,
  tax_percentage numeric(9,4) NOT NULL DEFAULT 11,
  rounding_method text NOT NULL DEFAULT 'tanpa',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moq_pricing_templates TO authenticated;
GRANT ALL ON public.moq_pricing_templates TO service_role;
ALTER TABLE public.moq_pricing_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moq_templates_company_access" ON public.moq_pricing_templates FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));
CREATE TRIGGER trg_moq_templates_updated BEFORE UPDATE ON public.moq_pricing_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.moq_pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  template_id uuid NOT NULL REFERENCES public.moq_pricing_templates(id) ON DELETE CASCADE,
  minimum_quantity numeric(18,4) NOT NULL DEFAULT 0,
  maximum_quantity numeric(18,4),
  pricing_method text NOT NULL DEFAULT 'markup',
  percentage_value numeric(9,4) NOT NULL DEFAULT 0,
  fixed_profit numeric(18,6) NOT NULL DEFAULT 0,
  minimum_price numeric(18,6) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.moq_pricing_tiers TO authenticated;
GRANT ALL ON public.moq_pricing_tiers TO service_role;
ALTER TABLE public.moq_pricing_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "moq_tiers_company_access" ON public.moq_pricing_tiers FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));

-- ============ SIMULASI MOQ PER VERSI HPP ============
CREATE TABLE IF NOT EXISTS public.costing_moq_simulations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  costing_version_id uuid NOT NULL REFERENCES public.costing_versions(id) ON DELETE CASCADE,
  moq_quantity numeric(18,4) NOT NULL DEFAULT 0,
  pricing_method text NOT NULL DEFAULT 'markup',
  markup_percentage numeric(9,4) NOT NULL DEFAULT 0,
  target_margin_percentage numeric(9,4) NOT NULL DEFAULT 0,
  manual_price numeric(18,6),
  hpp_snapshot numeric(18,6) NOT NULL DEFAULT 0,
  markup_amount numeric(18,6) NOT NULL DEFAULT 0,
  price_before_tax numeric(18,6) NOT NULL DEFAULT 0,
  tax_percentage numeric(9,4) NOT NULL DEFAULT 11,
  tax_amount numeric(18,6) NOT NULL DEFAULT 0,
  price_after_tax numeric(18,6) NOT NULL DEFAULT 0,
  rounding_method text NOT NULL DEFAULT 'tanpa',
  rounded_price numeric(18,6) NOT NULL DEFAULT 0,
  profit_per_unit numeric(18,6) NOT NULL DEFAULT 0,
  total_profit numeric(18,6) NOT NULL DEFAULT 0,
  actual_margin numeric(9,4) NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_costing_moq_version ON public.costing_moq_simulations(costing_version_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.costing_moq_simulations TO authenticated;
GRANT ALL ON public.costing_moq_simulations TO service_role;
ALTER TABLE public.costing_moq_simulations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "costing_moq_company_access" ON public.costing_moq_simulations FOR ALL TO authenticated
  USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id));
