-- Pengamanan dokumen, notifikasi, dan audit trail.
-- Migrasi ini hanya menambah/mengganti policy dan trigger; tidak menghapus data bisnis atau file.

CREATE OR REPLACE FUNCTION public.storage_company_id(_object_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN split_part(_object_name, '/', 1)::uuid;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.storage_company_id(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_company_id(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "dokumen_select" ON storage.objects;
DROP POLICY IF EXISTS "dokumen_insert" ON storage.objects;
DROP POLICY IF EXISTS "dokumen_update" ON storage.objects;
DROP POLICY IF EXISTS "dokumen_delete" ON storage.objects;

CREATE POLICY "dokumen_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'dokumen'
    AND public.has_company_access(public.storage_company_id(name))
  );

CREATE POLICY "dokumen_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'dokumen'
    AND public.has_company_access(public.storage_company_id(name))
  );

CREATE POLICY "dokumen_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'dokumen'
    AND public.has_company_access(public.storage_company_id(name))
  )
  WITH CHECK (
    bucket_id = 'dokumen'
    AND public.has_company_access(public.storage_company_id(name))
  );

CREATE POLICY "dokumen_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'dokumen'
    AND public.has_company_access(public.storage_company_id(name))
  );

-- Pengguna baru tidak lagi otomatis menjadi admin seluruh perusahaan. Akun pertama
-- pada instalasi kosong tetap menjadi super admin agar sistem dapat di-bootstrap.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _has_super boolean;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  ) INTO _has_super;

  IF NOT _has_super THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'super_admin')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_company_access (user_id, company_id, role)
    SELECT NEW.id, company.id, 'super_admin'
    FROM public.companies AS company
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Daftar perusahaan dan profil pengguna tidak lagi terbuka untuk semua akun login.
DROP POLICY IF EXISTS companies_select ON public.companies;
CREATE POLICY companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (public.has_company_access(id));

DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Notifikasi harus menjadi milik pengguna dan tetap berada dalam perusahaan yang boleh ia akses.
DROP POLICY IF EXISTS notifications_rw ON public.notifications;
DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
DROP POLICY IF EXISTS notifications_update_own ON public.notifications;

CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    AND (company_id IS NULL OR public.has_company_access(company_id))
  );

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND (company_id IS NULL OR public.has_company_access(company_id))
  )
  WITH CHECK (
    user_id = auth.uid()
    AND (company_id IS NULL OR public.has_company_access(company_id))
  );

CREATE OR REPLACE FUNCTION public.create_business_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title text;
  _message text;
  _type text;
  _priority text := 'informasi';
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN
      _type := 'order_created';
      _title := 'Pesanan baru';
      _message := COALESCE(NEW.order_number, 'Pesanan') || ' telah dibuat.';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      _type := 'order_status';
      _title := 'Status pesanan berubah';
      _message := COALESCE(NEW.order_number, 'Pesanan') || ': ' || COALESCE(OLD.status, '-') || ' → ' || COALESCE(NEW.status, '-');
      IF NEW.status IN ('dibatalkan', 'terlambat') THEN _priority := 'penting'; END IF;
    ELSIF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
      _type := 'order_payment';
      _title := 'Status pembayaran pesanan berubah';
      _message := COALESCE(NEW.order_number, 'Pesanan') || ': ' || COALESCE(OLD.payment_status, '-') || ' → ' || COALESCE(NEW.payment_status, '-');
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'invoices' AND OLD.status IS DISTINCT FROM NEW.status THEN
    _type := 'invoice_payment';
    _title := 'Status pembayaran berubah';
    _message := COALESCE(NEW.invoice_number, 'Invoice') || ': ' || COALESCE(OLD.status, '-') || ' → ' || COALESCE(NEW.status, '-');
    IF NEW.status IN ('jatuh_tempo', 'terlambat') THEN _priority := 'penting'; END IF;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (
    company_id, user_id, type, priority, title, message, entity_type, entity_id
  )
  SELECT DISTINCT NEW.company_id, recipients.user_id, _type, _priority, _title, _message, TG_TABLE_NAME, NEW.id
  FROM (
    SELECT user_id FROM public.user_company_access WHERE company_id = NEW.company_id
    UNION
    SELECT user_id FROM public.user_roles WHERE role = 'super_admin'
  ) AS recipients
  WHERE recipients.user_id IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_notifications ON public.orders;
CREATE TRIGGER trg_orders_notifications
  AFTER INSERT OR UPDATE OF status, payment_status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.create_business_notification();

DROP TRIGGER IF EXISTS trg_invoices_notifications ON public.invoices;
CREATE TRIGGER trg_invoices_notifications
  AFTER UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.create_business_notification();

-- Audit trail generik untuk perubahan data bisnis ke depan. Tidak melakukan backfill
-- agar riwayat asli dan timestamp existing tidak direkayasa.
CREATE OR REPLACE FUNCTION public.capture_activity_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _old jsonb := CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END;
  _new jsonb := CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END;
  _row jsonb := COALESCE(_new, _old);
  _company_id uuid;
  _entity_id uuid;
BEGIN
  _company_id := NULLIF(_row->>'company_id', '')::uuid;
  _entity_id := NULLIF(_row->>'id', '')::uuid;

  INSERT INTO public.activity_logs (
    company_id, user_id, action, entity_type, entity_id, old_data, new_data, notes
  ) VALUES (
    _company_id,
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    _entity_id,
    _old,
    _new,
    CASE TG_OP
      WHEN 'INSERT' THEN 'Data dibuat'
      WHEN 'UPDATE' THEN 'Data diperbarui'
      ELSE 'Data dihapus'
    END
  );
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  _table text;
BEGIN
  FOREACH _table IN ARRAY ARRAY[
    'clients', 'brokers', 'brands', 'products', 'costing_versions',
    'costing_ingredients', 'costing_packaging_items', 'costing_operational_costs',
    'costing_moq_simulations', 'quotations', 'orders', 'samples',
    'production_batches', 'quality_checks', 'invoices', 'payments',
    'broker_fees', 'documents', 'suppliers', 'raw_materials',
    'material_supplier_prices', 'packaging_materials', 'packaging_prices'
  ] LOOP
    IF to_regclass('public.' || _table) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_activity ON public.%I', _table, _table);
      EXECUTE format(
        'CREATE TRIGGER trg_%I_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_activity_log()',
        _table,
        _table
      );
    END IF;
  END LOOP;
END;
$$;
