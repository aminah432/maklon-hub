
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','admin');

-- UTIL
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- COMPANIES
CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  business_type text,
  logo_url text,
  address text,
  phone text,
  email text,
  tax_number text,
  bank_name text,
  bank_account text,
  bank_account_name text,
  theme_key text NOT NULL DEFAULT 'neutral',
  primary_color text,
  secondary_color text,
  soft_color text,
  minimum_margin numeric NOT NULL DEFAULT 15,
  default_payment_terms text,
  default_quotation_validity_days integer NOT NULL DEFAULT 14,
  invoice_footer_note text,
  quotation_footer_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  email text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.user_company_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.has_company_access(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.user_company_access a WHERE a.user_id = auth.uid() AND a.company_id = _company_id)
  );
$$;

-- new user bootstrap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE has_super boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'super_admin') INTO has_super;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN has_super THEN 'admin'::public.app_role ELSE 'super_admin'::public.app_role END)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_company_access (user_id, company_id, role)
  SELECT NEW.id, c.id, CASE WHEN has_super THEN 'admin'::public.app_role ELSE 'super_admin'::public.app_role END
  FROM public.companies c
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BUSINESS TABLES
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  client_code text NOT NULL UNIQUE,
  owner_name text NOT NULL,
  business_name text,
  phone text,
  email text,
  address text,
  city text,
  province text,
  postal_code text,
  nib text,
  npwp text,
  source text,
  broker_id uuid,
  joined_at date DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  status text NOT NULL DEFAULT 'aktif',
  notes text,
  logo_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL,
  business_name text,
  phone text,
  email text,
  address text,
  city text,
  bank_name text,
  bank_account text,
  bank_account_name text,
  default_fee_type text NOT NULL DEFAULT 'persentase',
  default_fee_value numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aktif',
  agreement_file_url text,
  joined_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

ALTER TABLE public.clients ADD CONSTRAINT clients_broker_fk FOREIGN KEY (broker_id) REFERENCES public.brokers(id) ON DELETE SET NULL;

CREATE TABLE public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  brand_code text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  description text,
  main_category text,
  target_market text,
  status text NOT NULL DEFAULT 'aktif',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  icon text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE RESTRICT,
  brand_id uuid REFERENCES public.brands(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sku text NOT NULL UNIQUE,
  name text NOT NULL,
  subcategory text,
  variant text,
  description text,
  net_content numeric,
  unit text NOT NULL DEFAULT 'pcs',
  moq integer NOT NULL DEFAULT 100,
  standard_batch_quantity integer,
  shelf_life_months integer,
  packaging_type text,
  status text NOT NULL DEFAULT 'draft',
  first_produced_at date,
  main_image_url text,
  specifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  regulatory_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.product_formula_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  version_name text,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  file_url text,
  effective_at date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, version_number)
);

CREATE TABLE public.costing_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  formula_version_id uuid REFERENCES public.product_formula_versions(id) ON DELETE SET NULL,
  version_number integer NOT NULL,
  version_name text,
  planned_quantity numeric NOT NULL DEFAULT 0,
  good_units numeric NOT NULL DEFAULT 0,
  rejected_units numeric NOT NULL DEFAULT 0,
  shrinkage_units numeric NOT NULL DEFAULT 0,
  total_batch_cost numeric NOT NULL DEFAULT 0,
  unit_hpp numeric NOT NULL DEFAULT 0,
  is_estimated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  effective_at date,
  change_reason text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, version_number)
);

CREATE TABLE public.costing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  costing_version_id uuid NOT NULL REFERENCES public.costing_versions(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text,
  unit_cost numeric NOT NULL DEFAULT 0,
  waste_percentage numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  supplier text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  costing_version_id uuid REFERENCES public.costing_versions(id) ON DELETE SET NULL,
  pricing_method text NOT NULL DEFAULT 'markup',
  markup_percentage numeric NOT NULL DEFAULT 0,
  target_margin_percentage numeric NOT NULL DEFAULT 0,
  base_price numeric NOT NULL DEFAULT 0,
  minimum_price numeric NOT NULL DEFAULT 0,
  client_price numeric NOT NULL DEFAULT 0,
  recommended_retail_price numeric NOT NULL DEFAULT 0,
  broker_fee_per_unit numeric NOT NULL DEFAULT 0,
  actual_margin numeric NOT NULL DEFAULT 0,
  override_reason text,
  effective_at date,
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  quotation_number text NOT NULL UNIQUE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL,
  quotation_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  valid_until date,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  broker_fee numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  payment_terms text,
  terms text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quotation_id uuid NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  costing_version_id uuid REFERENCES public.costing_versions(id) ON DELETE SET NULL,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs',
  unit_hpp_snapshot numeric NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  broker_fee numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  estimated_profit numeric NOT NULL DEFAULT 0,
  estimated_margin numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  order_number text NOT NULL UNIQUE,
  quotation_id uuid REFERENCES public.quotations(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  brand_id uuid REFERENCES public.brands(id) ON DELETE SET NULL,
  broker_id uuid REFERENCES public.brokers(id) ON DELETE SET NULL,
  order_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  target_completion_date date,
  priority text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'draft',
  production_status text NOT NULL DEFAULT 'belum_dijadwalkan',
  payment_status text NOT NULL DEFAULT 'belum_dibayar',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  broker_fee numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  shipping_address text,
  pic text,
  internal_notes text,
  client_notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz,
  cancellation_reason text
);

CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  costing_version_id uuid REFERENCES public.costing_versions(id) ON DELETE SET NULL,
  formula_version_id uuid REFERENCES public.product_formula_versions(id) ON DELETE SET NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text DEFAULT 'pcs',
  unit_hpp_snapshot numeric NOT NULL DEFAULT 0,
  unit_price_snapshot numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  broker_fee numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  estimated_profit numeric NOT NULL DEFAULT 0,
  actual_margin numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  notes text,
  attachment_url text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  formula_version_id uuid REFERENCES public.product_formula_versions(id) ON DELETE SET NULL,
  sample_number text NOT NULL,
  status text NOT NULL DEFAULT 'direncanakan',
  created_date date,
  sent_date date,
  approved_date date,
  internal_notes text,
  client_feedback text,
  image_url text,
  approval_file_url text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  costing_version_id uuid REFERENCES public.costing_versions(id) ON DELETE SET NULL,
  formula_version_id uuid REFERENCES public.product_formula_versions(id) ON DELETE SET NULL,
  planned_quantity numeric NOT NULL DEFAULT 0,
  actual_quantity numeric NOT NULL DEFAULT 0,
  rejected_quantity numeric NOT NULL DEFAULT 0,
  passed_quantity numeric NOT NULL DEFAULT 0,
  production_date date,
  expiry_date date,
  scheduled_start date,
  scheduled_end date,
  actual_start date,
  actual_end date,
  status text NOT NULL DEFAULT 'dijadwalkan',
  progress_percentage numeric NOT NULL DEFAULT 0,
  pic text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  stage_name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'belum',
  started_at timestamptz,
  completed_at timestamptz,
  pic text,
  progress_percentage numeric NOT NULL DEFAULT 0,
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quality_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.production_batches(id) ON DELETE CASCADE,
  inspection_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  inspector text,
  sample_size numeric NOT NULL DEFAULT 0,
  passed_quantity numeric NOT NULL DEFAULT 0,
  failed_quantity numeric NOT NULL DEFAULT 0,
  result text NOT NULL DEFAULT 'belum_diperiksa',
  visual_result text,
  aroma_result text,
  taste_result text,
  weight_volume_result text,
  packaging_result text,
  decision text,
  notes text,
  attachment_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_number text NOT NULL UNIQUE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  invoice_type text NOT NULL DEFAULT 'dp',
  invoice_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  due_date date,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  shipping_cost numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  payment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'transfer',
  bank_destination text,
  reference_number text,
  proof_url text,
  verification_status text NOT NULL DEFAULT 'terverifikasi',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.broker_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL REFERENCES public.brokers(id) ON DELETE RESTRICT,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  fee_type text NOT NULL DEFAULT 'persentase',
  fee_base numeric NOT NULL DEFAULT 0,
  fee_percentage numeric NOT NULL DEFAULT 0,
  fee_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  remaining_amount numeric NOT NULL DEFAULT 0,
  due_date date,
  status text NOT NULL DEFAULT 'belum_dibayar',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.broker_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  broker_fee_id uuid NOT NULL REFERENCES public.broker_fees(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  amount numeric NOT NULL CHECK (amount >= 0),
  method text NOT NULL DEFAULT 'transfer',
  proof_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  brand_id uuid REFERENCES public.brands(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.production_batches(id) ON DELETE CASCADE,
  document_type text NOT NULL DEFAULT 'lainnya',
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size bigint,
  valid_from date,
  expires_at date,
  notes text,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL,
  priority text NOT NULL DEFAULT 'informasi',
  title text NOT NULL,
  message text,
  entity_type text,
  entity_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  old_data jsonb,
  new_data jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- INDEXES
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_clients_broker ON public.clients(broker_id);
CREATE INDEX idx_brands_company ON public.brands(company_id);
CREATE INDEX idx_brands_client ON public.brands(client_id);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_products_client ON public.products(client_id);
CREATE INDEX idx_products_brand ON public.products(brand_id);
CREATE INDEX idx_costing_versions_product ON public.costing_versions(product_id);
CREATE INDEX idx_costing_items_version ON public.costing_items(costing_version_id);
CREATE INDEX idx_product_prices_product ON public.product_prices(product_id);
CREATE INDEX idx_quotations_company ON public.quotations(company_id);
CREATE INDEX idx_quotation_items_quotation ON public.quotation_items(quotation_id);
CREATE INDEX idx_orders_company ON public.orders(company_id);
CREATE INDEX idx_orders_client ON public.orders(client_id);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
CREATE INDEX idx_order_status_history_order ON public.order_status_history(order_id);
CREATE INDEX idx_samples_order ON public.samples(order_id);
CREATE INDEX idx_batches_order ON public.production_batches(order_id);
CREATE INDEX idx_stages_batch ON public.production_stages(batch_id);
CREATE INDEX idx_qc_batch ON public.quality_checks(batch_id);
CREATE INDEX idx_invoices_company ON public.invoices(company_id);
CREATE INDEX idx_invoices_order ON public.invoices(order_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_broker_fees_broker ON public.broker_fees(broker_id);
CREATE INDEX idx_documents_company ON public.documents(company_id);
CREATE INDEX idx_activity_company ON public.activity_logs(company_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','profiles','clients','brokers','brands','products','costing_versions','quotations','orders','samples','production_batches','invoices','broker_fees'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%1$s_updated BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t);
  END LOOP;
END $$;

-- GRANTS + RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies','profiles','user_roles','user_company_access','clients','brokers','brands','product_categories','products','product_formula_versions','costing_versions','costing_items','product_prices','quotations','quotation_items','orders','order_items','order_status_history','samples','production_batches','production_stages','quality_checks','invoices','payments','broker_fees','broker_fee_payments','documents','notifications','activity_logs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- company-scoped policies
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['clients','brokers','brands','product_categories','products','product_formula_versions','costing_versions','costing_items','product_prices','quotations','quotation_items','orders','order_items','order_status_history','samples','production_batches','production_stages','quality_checks','invoices','payments','broker_fees','broker_fee_payments','documents'] LOOP
    EXECUTE format('CREATE POLICY %1$I ON public.%1$I FOR ALL TO authenticated USING (public.has_company_access(company_id)) WITH CHECK (public.has_company_access(company_id))', t);
  END LOOP;
END $$;

CREATE POLICY companies_select ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY companies_update ON public.companies FOR UPDATE TO authenticated USING (public.has_company_access(id)) WITH CHECK (public.has_company_access(id));

CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY user_roles_select ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY user_roles_manage ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY uca_select ON public.user_company_access FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY uca_manage ON public.user_company_access FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY notifications_rw ON public.notifications FOR ALL TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY activity_select ON public.activity_logs FOR SELECT TO authenticated USING (company_id IS NULL OR public.has_company_access(company_id));
CREATE POLICY activity_insert ON public.activity_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
