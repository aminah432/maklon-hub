
CREATE TABLE public.document_counters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  period text NOT NULL DEFAULT '',
  current_value integer NOT NULL DEFAULT 0,
  UNIQUE (company_id, doc_type, period)
);
GRANT SELECT ON public.document_counters TO authenticated;
GRANT ALL ON public.document_counters TO service_role;
ALTER TABLE public.document_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY counters_select ON public.document_counters FOR SELECT TO authenticated USING (public.has_company_access(company_id));

CREATE OR REPLACE FUNCTION public.next_document_number(_company_id uuid, _doc_type text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text; v_prefix text; v_period text; v_val integer; v_uses_period boolean;
BEGIN
  IF NOT public.has_company_access(_company_id) THEN
    RAISE EXCEPTION 'Tidak memiliki akses ke perusahaan ini';
  END IF;
  SELECT code INTO v_code FROM public.companies WHERE id = _company_id;
  IF v_code IS NULL THEN RAISE EXCEPTION 'Perusahaan tidak ditemukan'; END IF;

  v_prefix := CASE _doc_type
    WHEN 'client' THEN 'CL' WHEN 'product' THEN 'PRD' WHEN 'brand' THEN 'BRD'
    WHEN 'quotation' THEN 'QTN' WHEN 'order' THEN 'ORD' WHEN 'batch' THEN 'BAT'
    WHEN 'invoice' THEN 'INV' WHEN 'sample' THEN 'SMP' ELSE 'DOC' END;
  v_uses_period := _doc_type IN ('quotation','order','batch','invoice','sample');
  v_period := CASE WHEN v_uses_period THEN to_char(now() AT TIME ZONE 'Asia/Jakarta','YYYYMM') ELSE '' END;

  INSERT INTO public.document_counters (company_id, doc_type, period, current_value)
  VALUES (_company_id, _doc_type, v_period, 1)
  ON CONFLICT (company_id, doc_type, period)
  DO UPDATE SET current_value = public.document_counters.current_value + 1
  RETURNING current_value INTO v_val;

  RETURN v_prefix || '-' || v_code || CASE WHEN v_uses_period THEN '-' || v_period ELSE '' END
         || '-' || lpad(v_val::text, 4, '0');
END; $$;
REVOKE ALL ON FUNCTION public.next_document_number(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated, service_role;

INSERT INTO public.companies (code, name, business_type, theme_key, primary_color, secondary_color, soft_color, minimum_margin, address, phone, email, bank_name, bank_account, bank_account_name, default_payment_terms, invoice_footer_note, quotation_footer_note)
VALUES
 ('SHJ','CV. Shenjuu','Kosmetik, personal care, skincare, body care, hair care, dan parfum','shj','#D64284','#9F1853','#FFF4F9',20,'Jl. Kaliurang KM 9, Ngaglik, Sleman, DI Yogyakarta','081234567801','halo@shenjuu.co.id','Bank Mandiri','1370012345678','CV. Shenjuu','DP 50%, pelunasan sebelum pengiriman','Pembayaran dianggap sah setelah dana diterima di rekening CV. Shenjuu.','Harga berlaku selama masa berlaku penawaran dan dapat berubah bila spesifikasi diubah.'),
 ('DNA','CV. Dairy Nutrition Alami','Permen susu, pressed candy, vitamin candy, permen herbal, dan minuman serbuk','dna','#2F80ED','#124A9C','#F3F9FF',18,'Jl. Raya Solo KM 12, Kalasan, Sleman, DI Yogyakarta','081234567802','halo@dairynutrisi.co.id','Bank BCA','0123456789','CV. Dairy Nutrition Alami','DP 40%, pelunasan sebelum pengiriman','Mohon konfirmasi pembayaran dengan mengirim bukti transfer.','Harga belum termasuk biaya pengiriman kecuali disebutkan lain.'),
 ('BMMF','CV. Berkah Mandiri Merapi Farm','Susu kambing etawa bubuk, minuman susu, dan minuman serbuk nutrisi','bmmf','#2A966A','#176547','#F3FBF7',17,'Jl. Merapi Golf, Cangkringan, Sleman, DI Yogyakarta','081234567803','halo@merapifarm.co.id','Bank BRI','003801000123456','CV. Berkah Mandiri Merapi Farm','DP 50%, pelunasan sebelum pengiriman','Terima kasih atas kepercayaan Anda kepada Merapi Farm.','Penawaran ini berlaku 14 hari sejak tanggal diterbitkan.');

INSERT INTO public.product_categories (company_id, name, sort_order)
SELECT c.id, x.name, x.ord FROM public.companies c
JOIN (VALUES
 ('SHJ','Serum',1),('SHJ','Facial Wash',2),('SHJ','Toner',3),('SHJ','Moisturizer',4),('SHJ','Sunscreen',5),
 ('SHJ','Body Lotion',6),('SHJ','Body Wash',7),('SHJ','Shampoo',8),('SHJ','Conditioner',9),('SHJ','Hair Tonic',10),
 ('SHJ','Parfum',11),('SHJ','Lip Care',12),('SHJ','Produk Lainnya',13),
 ('DNA','Permen Susu',1),('DNA','Pressed Candy',2),('DNA','Vitamin Candy',3),('DNA','Beauty Candy',4),
 ('DNA','Permen Anak',5),('DNA','Permen Herbal',6),('DNA','Permen Pelega Tenggorokan',7),('DNA','Stevia',8),
 ('DNA','Minuman Serbuk',9),('DNA','Minuman Serbuk Susu',10),('DNA','Produk Lainnya',11),
 ('BMMF','Susu Kambing Etawa Original',1),('BMMF','Susu Kambing Etawa Rasa',2),('BMMF','Susu Kambing Rendah Gula',3),
 ('BMMF','Susu Kambing Tanpa Gula',4),('BMMF','Minuman Serbuk Susu',5),('BMMF','Minuman Nutrisi',6),('BMMF','Produk Lainnya',7)
) AS x(code,name,ord) ON x.code = c.code;
