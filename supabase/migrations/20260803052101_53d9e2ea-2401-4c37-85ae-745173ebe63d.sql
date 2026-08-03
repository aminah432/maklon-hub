
CREATE OR REPLACE FUNCTION public.next_document_number(_company_id uuid, _doc_type text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_code text; v_prefix text; v_period text; v_val integer; v_uses_period boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_company_access(_company_id) THEN
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

CREATE OR REPLACE FUNCTION public.sync_invoice_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_invoice uuid; v_order uuid; v_paid numeric; v_total numeric;
BEGIN
  v_invoice := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_invoice IS NOT NULL THEN
    SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.payments WHERE invoice_id = v_invoice;
    SELECT grand_total, order_id INTO v_total, v_order FROM public.invoices WHERE id = v_invoice;
    UPDATE public.invoices SET
      paid_amount = v_paid,
      remaining_amount = GREATEST(v_total - v_paid, 0),
      status = CASE WHEN v_paid <= 0 THEN 'belum_dibayar'
                    WHEN v_paid >= v_total THEN 'lunas'
                    ELSE 'dibayar_sebagian' END
    WHERE id = v_invoice;
  ELSE
    v_order := COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  IF v_order IS NOT NULL THEN
    SELECT COALESCE(SUM(p.amount),0) INTO v_paid FROM public.payments p WHERE p.order_id = v_order;
    SELECT grand_total INTO v_total FROM public.orders WHERE id = v_order;
    UPDATE public.orders SET
      paid_amount = v_paid,
      remaining_amount = GREATEST(v_total - v_paid, 0),
      payment_status = CASE WHEN v_paid <= 0 THEN 'belum_dibayar'
                            WHEN v_paid >= v_total THEN 'lunas'
                            ELSE 'dibayar_sebagian' END
    WHERE id = v_order;
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_invoice_payment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment();

CREATE OR REPLACE FUNCTION public.sync_broker_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_fee uuid; v_paid numeric; v_total numeric;
BEGIN
  v_fee := COALESCE(NEW.broker_fee_id, OLD.broker_fee_id);
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM public.broker_fee_payments WHERE broker_fee_id = v_fee;
  SELECT fee_amount INTO v_total FROM public.broker_fees WHERE id = v_fee;
  UPDATE public.broker_fees SET paid_amount = v_paid,
    remaining_amount = GREATEST(v_total - v_paid,0),
    status = CASE WHEN v_paid <= 0 THEN 'belum_dibayar' WHEN v_paid >= v_total THEN 'lunas' ELSE 'dibayar_sebagian' END
  WHERE id = v_fee;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.sync_broker_fee_payment() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_broker_fee_payments_sync AFTER INSERT OR UPDATE OR DELETE ON public.broker_fee_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_broker_fee_payment();

CREATE OR REPLACE FUNCTION public.log_order_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.order_status_history (company_id, order_id, previous_status, new_status, changed_by)
    VALUES (NEW.company_id, NEW.id, OLD.status, NEW.status, auth.uid());
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.order_status_history (company_id, order_id, previous_status, new_status, changed_by)
    VALUES (NEW.company_id, NEW.id, NULL, NEW.status, auth.uid());
  END IF;
  RETURN NULL;
END; $$;
REVOKE ALL ON FUNCTION public.log_order_status() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_orders_status_log AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status();

DO $seed$
DECLARE
  shj uuid; dna uuid; bmmf uuid;
  brk1 uuid; brk2 uuid;
  cl1 uuid; cl2 uuid; cl3 uuid; cl4 uuid; cl5 uuid;
  br1 uuid; br2 uuid; br3 uuid; br4 uuid; br5 uuid;
  p uuid; cv uuid; ord uuid; oi uuid; inv uuid; bat uuid; qt uuid;
BEGIN
  SELECT id INTO shj FROM public.companies WHERE code='SHJ';
  SELECT id INTO dna FROM public.companies WHERE code='DNA';
  SELECT id INTO bmmf FROM public.companies WHERE code='BMMF';

  INSERT INTO public.brokers (company_id,name,business_name,phone,email,city,bank_name,bank_account,bank_account_name,default_fee_type,default_fee_value,joined_at,notes)
  VALUES (shj,'Rizal Fahmi','Fahmi Beauty Partner','081338877221','rizal.fahmi@gmail.com','Yogyakarta','Bank BCA','8760012345','Rizal Fahmi','persentase',5,'2024-03-11','Fee 5% dari subtotal produk, dibayar setelah pelunasan klien.')
  RETURNING id INTO brk1;
  INSERT INTO public.brokers (company_id,name,business_name,phone,email,city,bank_name,bank_account,bank_account_name,default_fee_type,default_fee_value,joined_at,notes)
  VALUES (dna,'Siti Nurhaliza Putri','SNP Distribusi','081226644553','snp.distribusi@gmail.com','Surakarta','Bank Mandiri','1370099887766','Siti Nurhaliza Putri','per_unit',150,'2024-07-02','Fee Rp150 per unit untuk produk permen.')
  RETURNING id INTO brk2;

  INSERT INTO public.clients (company_id,client_code,owner_name,business_name,phone,email,address,city,province,postal_code,nib,npwp,source,broker_id,joined_at,status,notes)
  VALUES (shj, public.next_document_number(shj,'client'),'Anindya Larasati','Lueur De Luxe Beauty','081234110022','anindya@lueurdeluxe.id','Jl. Prawirotaman No. 21','Yogyakarta','DI Yogyakarta','55153','1234567890123','01.234.567.8-541.000','Instagram',brk1,'2024-04-18','aktif','Brand skincare premium, sangat memperhatikan kemasan.')
  RETURNING id INTO cl1;
  INSERT INTO public.clients (company_id,client_code,owner_name,business_name,phone,email,address,city,province,postal_code,source,joined_at,status,notes)
  VALUES (shj, public.next_document_number(shj,'client'),'Bagas Prakoso','Aroma Nusantara','081234110099','bagas@aromanusantara.id','Jl. Magelang KM 6','Sleman','DI Yogyakarta','55284','Referensi klien','2024-09-05','aktif','Fokus parfum lokal dengan aroma khas Nusantara.')
  RETURNING id INTO cl2;
  INSERT INTO public.clients (company_id,client_code,owner_name,business_name,phone,email,address,city,province,postal_code,source,broker_id,joined_at,status,notes)
  VALUES (dna, public.next_document_number(dna,'client'),'Dewi Kartika','Manis Sehat Indonesia','081577880011','dewi@manissehat.id','Jl. Slamet Riyadi No. 88','Surakarta','Jawa Tengah','57131','Pameran UMKM',brk2,'2024-06-21','aktif','Rutin repeat order permen susu setiap kuartal.')
  RETURNING id INTO cl3;
  INSERT INTO public.clients (company_id,client_code,owner_name,business_name,phone,email,address,city,province,postal_code,source,joined_at,status,notes)
  VALUES (dna, public.next_document_number(dna,'client'),'Hendra Wijaya','Vitakids Nutrisi','081266778899','hendra@vitakids.id','Jl. Ahmad Yani No. 45','Semarang','Jawa Tengah','50241','Website','2025-01-14','aktif','Segmen permen vitamin anak.')
  RETURNING id INTO cl4;
  INSERT INTO public.clients (company_id,client_code,owner_name,business_name,phone,email,address,city,province,postal_code,source,joined_at,status,notes)
  VALUES (bmmf, public.next_document_number(bmmf,'client'),'Muhammad Ridwan','Etawa Sehat Mandiri','081399002211','ridwan@etawasehat.id','Jl. Kaliurang KM 14','Sleman','DI Yogyakarta','55581','Komunitas herbal','2024-08-30','aktif','Distributor susu etawa wilayah Jawa Tengah dan DIY.')
  RETURNING id INTO cl5;

  INSERT INTO public.brands (company_id,client_id,brand_code,name,description,main_category,target_market,status)
  VALUES (shj,cl1,public.next_document_number(shj,'brand'),'Lueur De Luxe','Skincare premium dengan sentuhan mewah dan formula ringan.','Skincare','Wanita 22-40 tahun, kelas menengah atas','aktif') RETURNING id INTO br1;
  INSERT INTO public.brands (company_id,client_id,brand_code,name,description,main_category,target_market,status)
  VALUES (shj,cl2,public.next_document_number(shj,'brand'),'Aroma Nusantara','Parfum dengan karakter aroma rempah dan bunga Indonesia.','Parfum','Dewasa muda 20-35 tahun','aktif') RETURNING id INTO br2;
  INSERT INTO public.brands (company_id,client_id,brand_code,name,description,main_category,target_market,status)
  VALUES (dna,cl3,public.next_document_number(dna,'brand'),'Manis Sehat','Permen susu dan herbal rendah gula untuk keluarga.','Permen Susu','Keluarga, semua usia','aktif') RETURNING id INTO br3;
  INSERT INTO public.brands (company_id,client_id,brand_code,name,description,main_category,target_market,status)
  VALUES (dna,cl4,public.next_document_number(dna,'brand'),'Vitakids','Permen vitamin untuk anak usia sekolah.','Vitamin Candy','Anak 4-12 tahun','aktif') RETURNING id INTO br4;
  INSERT INTO public.brands (company_id,client_id,brand_code,name,description,main_category,target_market,status)
  VALUES (bmmf,cl5,public.next_document_number(bmmf,'brand'),'Etawa Sehat','Susu kambing etawa bubuk untuk kesehatan keluarga.','Susu Kambing','Dewasa dan lansia','aktif') RETURNING id INTO br5;

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (shj,cl1,br1,(SELECT id FROM public.product_categories WHERE company_id=shj AND name='Serum'),public.next_document_number(shj,'product'),'Brightening Serum Niacinamide 10%','20 ml',
   'Serum pencerah dengan niacinamide 10% dan ekstrak licorice, tekstur ringan cepat meresap.',20,'botol',500,2000,24,'Botol kaca amber + pipet','aktif',
   '{"jenis_kosmetik":"Serum wajah","bentuk_sediaan":"Cairan kental","tekstur":"Ringan, cepat meresap","warna":"Bening kekuningan","aroma":"Tanpa parfum","bahan_aktif":"Niacinamide 10%, Alpha Arbutin 2%","klaim":"Mencerahkan dan meratakan warna kulit","target_pengguna":"Semua jenis kulit","jenis_wadah":"Botol kaca amber","jenis_tutup":"Pipet karet","label":"Sticker vinyl doff"}',
   '{"status_bpom":"Terdaftar","nomor_bpom":"NA18240900123","status_halal":"Terdaftar","nomor_halal":"ID31110000123456"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (shj,p,1,'HPP Versi 1 - Batch 2.000 botol',2000,1940,40,20,50440000,26000,'digantikan','2024-11-01','Kalkulasi awal produksi perdana')
  RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,supplier,sort_order) VALUES
   (shj,cv,'Bahan Baku Utama','Niacinamide food grade',4,'kg',1250000,2,5000000,5100000,'PT Kimia Prima',1),
   (shj,cv,'Bahan Aktif','Alpha Arbutin',0.8,'kg',4500000,2,3600000,3672000,'PT Kimia Prima',2),
   (shj,cv,'Bahan Tambahan','Basis serum & humektan',40,'kg',185000,3,7400000,7622000,'CV Sumber Kimia',3),
   (shj,cv,'Kemasan Primer','Botol kaca amber 20 ml + pipet',2000,'pcs',7800,2,15600000,15912000,'PT Glass Pack',4),
   (shj,cv,'Label dan Printing','Label vinyl doff',2000,'pcs',1350,3,2700000,2781000,'Percetakan Mandiri',5),
   (shj,cv,'Kemasan Sekunder','Dus lipat art carton',2000,'pcs',2450,2,4900000,4998000,'Percetakan Mandiri',6),
   (shj,cv,'Jasa Produksi','Jasa mixing & filling',2000,'botol',3200,0,6400000,6400000,NULL,7),
   (shj,cv,'Pengujian dan QC','Uji stabilitas & mikrobiologi',1,'paket',2500000,0,2500000,2500000,'Lab Terakreditasi',8),
   (shj,cv,'Overhead','Listrik, air, dan operasional',1,'batch',1455000,0,1455000,1455000,NULL,9);
  UPDATE public.costing_versions SET total_batch_cost=50440000, unit_hpp=round(50440000/1940.0,2) WHERE id=cv;

  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (shj,p,2,'HPP Versi 2 - Kenaikan harga bahan aktif',2000,1960,30,10,52990200,0,'aktif','2025-04-01','Harga alpha arbutin dan botol kaca naik')
  RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,supplier,sort_order) VALUES
   (shj,cv,'Bahan Baku Utama','Niacinamide food grade',4,'kg',1300000,2,5200000,5304000,'PT Kimia Prima',1),
   (shj,cv,'Bahan Aktif','Alpha Arbutin',0.8,'kg',5200000,2,4160000,4243200,'PT Kimia Prima',2),
   (shj,cv,'Bahan Tambahan','Basis serum & humektan',40,'kg',190000,3,7600000,7828000,'CV Sumber Kimia',3),
   (shj,cv,'Kemasan Primer','Botol kaca amber 20 ml + pipet',2000,'pcs',8400,2,16800000,17136000,'PT Glass Pack',4),
   (shj,cv,'Label dan Printing','Label vinyl doff',2000,'pcs',1350,3,2700000,2781000,'Percetakan Mandiri',5),
   (shj,cv,'Kemasan Sekunder','Dus lipat art carton',2000,'pcs',2450,2,4900000,4998000,'Percetakan Mandiri',6),
   (shj,cv,'Jasa Produksi','Jasa mixing & filling',2000,'botol',3400,0,6800000,6800000,NULL,7),
   (shj,cv,'Pengujian dan QC','Uji stabilitas & mikrobiologi',1,'paket',2500000,0,2500000,2500000,'Lab Terakreditasi',8),
   (shj,cv,'Overhead','Listrik, air, dan operasional',1,'batch',1400000,0,1400000,1400000,NULL,9);
  UPDATE public.costing_versions SET unit_hpp=round(52990200/1960.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (shj,p,cv,'markup',60,37.5,43250,33800,43500,89000,37.8,'2025-04-01',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (shj,cl1,br1,(SELECT id FROM public.product_categories WHERE company_id=shj AND name='Body Lotion'),public.next_document_number(shj,'product'),'Body Lotion Vitamin E Rose','200 ml',
   'Body lotion pelembap dengan vitamin E dan aroma mawar lembut.',200,'botol',1000,3000,24,'Botol HDPE + pump','aktif',
   '{"jenis_kosmetik":"Body care","bentuk_sediaan":"Lotion","tekstur":"Creamy ringan","warna":"Putih","aroma":"Rose","bahan_aktif":"Vitamin E, Shea Butter","klaim":"Melembapkan hingga 24 jam","target_pengguna":"Kulit normal hingga kering"}',
   '{"status_bpom":"Terdaftar","nomor_bpom":"NA18240900456","status_halal":"Proses"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (shj,p,1,'HPP Versi 1 - Batch 3.000 botol',3000,2940,40,20,53214000,0,'aktif','2025-02-10','Kalkulasi awal') RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,sort_order) VALUES
   (shj,cv,'Bahan Baku Utama','Basis lotion',600,'kg',42000,3,25200000,25956000,1),
   (shj,cv,'Bahan Aktif','Vitamin E & shea butter',12,'kg',320000,2,3840000,3916800,2),
   (shj,cv,'Kemasan Primer','Botol HDPE 200 ml + pump',3000,'pcs',4300,2,12900000,13158000,3),
   (shj,cv,'Label dan Printing','Label full body',3000,'pcs',900,3,2700000,2781000,4),
   (shj,cv,'Jasa Produksi','Mixing & filling',3000,'botol',1900,0,5700000,5700000,5),
   (shj,cv,'Overhead','Operasional pabrik',1,'batch',1702200,0,1702200,1702200,6);
  UPDATE public.costing_versions SET unit_hpp=round(53214000/2940.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (shj,p,cv,'markup',55,35,28060,23530,28000,58000,35.4,'2025-02-10',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (shj,cl2,br2,(SELECT id FROM public.product_categories WHERE company_id=shj AND name='Parfum'),public.next_document_number(shj,'product'),'Eau de Parfum Melati Senja','50 ml',
   'Parfum dengan aroma melati, cendana, dan vanila.',50,'botol',300,1000,36,'Botol kaca + spray','sampel',
   '{"jenis_kosmetik":"Parfum","bentuk_sediaan":"Cairan","aroma":"Floral woody","konsentrasi":"EDP 18%","jenis_wadah":"Botol kaca bening","jenis_tutup":"Spray + cap magnet"}',
   '{"status_bpom":"Proses","status_halal":"Belum"}');

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (shj,cl1,br1,(SELECT id FROM public.product_categories WHERE company_id=shj AND name='Facial Wash'),public.next_document_number(shj,'product'),'Gentle Facial Wash Centella','100 ml',
   'Sabun cuci muka lembut dengan ekstrak centella asiatica.',100,'tube',1000,3000,24,'Tube laminated + flip top','aktif',
   '{"jenis_kosmetik":"Facial cleanser","bentuk_sediaan":"Gel","tekstur":"Gel bening","aroma":"Green tea","bahan_aktif":"Centella Asiatica 5%","klaim":"Membersihkan tanpa membuat kering"}',
   '{"status_bpom":"Terdaftar","nomor_bpom":"NA18240900789","status_halal":"Terdaftar","nomor_halal":"ID31110000789012"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (shj,p,1,'HPP Versi 1 - Batch 3.000 tube',3000,2950,35,15,38230500,0,'aktif','2025-03-05','Kalkulasi awal') RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,sort_order) VALUES
   (shj,cv,'Bahan Baku Utama','Basis gel pembersih',300,'kg',56000,3,16800000,17304000,1),
   (shj,cv,'Bahan Aktif','Ekstrak centella',15,'kg',285000,2,4275000,4360500,2),
   (shj,cv,'Kemasan Primer','Tube laminated 100 ml',3000,'pcs',3100,2,9300000,9486000,3),
   (shj,cv,'Kemasan Sekunder','Dus lipat',3000,'pcs',1500,2,4500000,4590000,4),
   (shj,cv,'Jasa Produksi','Mixing & filling tube',3000,'tube',830,0,2490000,2490000,5);
  UPDATE public.costing_versions SET unit_hpp=round(38230500/2950.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (shj,p,cv,'target_margin',0,35,19940,16850,20000,42000,35.2,'2025-03-05',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (dna,cl3,br3,(SELECT id FROM public.product_categories WHERE company_id=dna AND name='Permen Susu'),public.next_document_number(dna,'product'),'Permen Susu Original','Kemasan 125 g',
   'Permen susu dengan kandungan susu sapi segar 32%.',125,'pack',2000,10000,18,'Standing pouch metalized','aktif',
   '{"jenis_produk":"Permen susu","bentuk":"Pressed candy","rasa":"Susu original","warna":"Putih krem","kandungan_susu":"32%","tingkat_kemanisan":"Regular sugar","target_pengguna":"Semua usia","isi_per_kemasan":"25 butir","berat_per_butir":"5 g"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000234567","status_izin_edar":"PIRT","nomor_izin_edar":"P-IRT 2063374010123-27"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (dna,p,1,'HPP Versi 1 - Batch 10.000 pack',10000,9750,180,70,70148400,0,'aktif','2025-01-20','Kalkulasi awal') RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,sort_order) VALUES
   (dna,cv,'Bahan Baku Utama','Susu bubuk full cream',420,'kg',82000,3,34440000,35473200,1),
   (dna,cv,'Bahan Tambahan','Gula halus & glukosa',380,'kg',16500,2,6270000,6395400,2),
   (dna,cv,'Bahan Tambahan','Perisa dan lesitin',22,'kg',145000,2,3190000,3253800,3),
   (dna,cv,'Kemasan Primer','Standing pouch metalized 125 g',10000,'pcs',1250,2,12500000,12750000,4),
   (dna,cv,'Label dan Printing','Cetak kemasan',10000,'pcs',420,3,4200000,4326000,5),
   (dna,cv,'Jasa Produksi','Pencetakan & pengemasan',10000,'pack',560,0,5600000,5600000,6),
   (dna,cv,'Overhead','Operasional pabrik',1,'batch',2350000,0,2350000,2350000,7);
  UPDATE public.costing_versions SET unit_hpp=round(70148400/9750.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (dna,p,cv,'markup',45,30,10430,8640,10500,19500,31.5,'2025-01-20',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (dna,cl3,br3,(SELECT id FROM public.product_categories WHERE company_id=dna AND name='Beauty Candy'),public.next_document_number(dna,'product'),'Beauty Candy Collagen','Kemasan 60 g',
   'Permen kolagen dengan vitamin C dan ekstrak lychee.',60,'pack',2000,8000,18,'Sachet aluminium','pengembangan',
   '{"jenis_produk":"Beauty candy","bentuk":"Pressed candy","rasa":"Lychee","kandungan_susu":"0%","bahan_aktif":"Marine collagen 500 mg, Vitamin C","tingkat_kemanisan":"Low sugar","target_pengguna":"Wanita dewasa"}',
   '{"status_halal":"Proses","status_izin_edar":"BPOM proses"}');

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (dna,cl4,br4,(SELECT id FROM public.product_categories WHERE company_id=dna AND name='Vitamin Candy'),public.next_document_number(dna,'product'),'Vitamin Candy Anak Jeruk','Kemasan 80 g',
   'Permen vitamin C rasa jeruk untuk anak, rendah gula.',80,'pack',3000,12000,18,'Standing pouch','aktif',
   '{"jenis_produk":"Vitamin candy","bentuk":"Pressed candy","rasa":"Jeruk","warna":"Oranye","bahan_aktif":"Vitamin C 60 mg","tingkat_kemanisan":"Low sugar","target_pengguna":"Anak 4-12 tahun","isi_per_kemasan":"20 butir"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000345678","status_izin_edar":"BPOM","nomor_izin_edar":"BPOM RI MD 824513007011"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (dna,p,1,'HPP Versi 1 - Batch 12.000 pack',12000,11760,180,60,59277200,0,'aktif','2025-02-25','Kalkulasi awal') RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,sort_order) VALUES
   (dna,cv,'Bahan Baku Utama','Isomalt & sorbitol',480,'kg',38000,3,18240000,18787200,1),
   (dna,cv,'Bahan Aktif','Vitamin C ascorbic acid',18,'kg',420000,2,7560000,7711200,2),
   (dna,cv,'Bahan Tambahan','Perisa jeruk & pewarna alami',20,'kg',165000,2,3300000,3366000,3),
   (dna,cv,'Kemasan Primer','Standing pouch 80 g',12000,'pcs',1150,2,13800000,14076000,4),
   (dna,cv,'Label dan Printing','Cetak kemasan',12000,'pcs',380,3,4560000,4696800,5),
   (dna,cv,'Jasa Produksi','Pencetakan tablet & packing',12000,'pack',620,0,7440000,7440000,6),
   (dna,cv,'Pengujian dan QC','Uji kadar vitamin',1,'paket',3200000,0,3200000,3200000,7);
  UPDATE public.costing_versions SET unit_hpp=round(59277200/11760.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (dna,p,cv,'markup',50,32,7560,6300,7600,14500,33.7,'2025-02-25',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (dna,cl3,br3,(SELECT id FROM public.product_categories WHERE company_id=dna AND name='Permen Herbal'),public.next_document_number(dna,'product'),'Permen Pelega Tenggorokan Herbal','Kemasan 50 g',
   'Permen herbal dengan jahe, madu, dan mint untuk melegakan tenggorokan.',50,'pack',2000,8000,18,'Standing pouch','aktif',
   '{"jenis_produk":"Permen herbal","bentuk":"Hard candy","rasa":"Jahe madu mint","kandungan_herbal":"Ekstrak jahe 4%, madu 6%","tingkat_kemanisan":"Regular sugar","target_pengguna":"Dewasa"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000456789","status_izin_edar":"PIRT","nomor_izin_edar":"P-IRT 2063374010456-27"}');

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (bmmf,cl5,br5,(SELECT id FROM public.product_categories WHERE company_id=bmmf AND name='Susu Kambing Etawa Original'),public.next_document_number(bmmf,'product'),'Susu Etawa Original','Box 200 g (10 sachet)',
   'Susu kambing etawa bubuk murni tanpa tambahan perisa.',200,'box',500,4000,18,'Box + sachet aluminium','aktif',
   '{"jenis_produk":"Susu kambing bubuk","varian_rasa":"Original","persentase_susu_kambing":"92%","jenis_pemanis":"Gula tebu","jumlah_sachet":"10 sachet","berat_per_sachet":"20 g"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000567890","status_izin_edar":"BPOM","nomor_izin_edar":"BPOM RI MD 806313011022"}')
  RETURNING id INTO p;
  INSERT INTO public.costing_versions (company_id,product_id,version_number,version_name,planned_quantity,good_units,rejected_units,shrinkage_units,total_batch_cost,unit_hpp,status,effective_at,change_reason)
  VALUES (bmmf,p,1,'HPP Versi 1 - Batch 4.000 box',4000,3920,60,20,132507000,0,'aktif','2025-01-08','Kalkulasi awal') RETURNING id INTO cv;
  INSERT INTO public.costing_items (company_id,costing_version_id,category,item_name,quantity,unit,unit_cost,waste_percentage,subtotal,total,sort_order) VALUES
   (bmmf,cv,'Bahan Baku Utama','Susu kambing etawa bubuk',760,'kg',128000,3,97280000,100198400,1),
   (bmmf,cv,'Bahan Tambahan','Gula tebu halus',60,'kg',15500,2,930000,948600,2),
   (bmmf,cv,'Kemasan Primer','Sachet aluminium 20 g',40000,'pcs',310,2,12400000,12648000,3),
   (bmmf,cv,'Kemasan Sekunder','Box karton',4000,'pcs',2650,2,10600000,10812000,4),
   (bmmf,cv,'Jasa Produksi','Mixing, filling sachet, sealing',4000,'box',1450,0,5800000,5800000,5),
   (bmmf,cv,'Overhead','Operasional',1,'batch',2100000,0,2100000,2100000,6);
  UPDATE public.costing_versions SET unit_hpp=round(132507000/3920.0,2) WHERE id=cv;
  INSERT INTO public.product_prices (company_id,product_id,costing_version_id,pricing_method,markup_percentage,target_margin_percentage,base_price,minimum_price,client_price,recommended_retail_price,actual_margin,effective_at,is_active)
  VALUES (bmmf,p,cv,'markup',40,28,47320,40680,47500,89000,28.9,'2025-01-08',true);

  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (bmmf,cl5,br5,(SELECT id FROM public.product_categories WHERE company_id=bmmf AND name='Susu Kambing Etawa Rasa'),public.next_document_number(bmmf,'product'),'Susu Etawa Cokelat','Box 200 g (10 sachet)',
   'Susu kambing etawa bubuk dengan cokelat bubuk premium.',200,'box',500,4000,18,'Box + sachet aluminium','aktif',
   '{"jenis_produk":"Susu kambing bubuk","varian_rasa":"Cokelat","persentase_susu_kambing":"78%","jenis_pemanis":"Gula tebu","jumlah_sachet":"10 sachet","berat_per_sachet":"20 g"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000567891","status_izin_edar":"BPOM","nomor_izin_edar":"BPOM RI MD 806313011023"}');
  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (bmmf,cl5,br5,(SELECT id FROM public.product_categories WHERE company_id=bmmf AND name='Susu Kambing Rendah Gula'),public.next_document_number(bmmf,'product'),'Susu Etawa Rendah Gula','Box 200 g (10 sachet)',
   'Susu kambing etawa rendah gula dengan pemanis stevia.',200,'box',500,3000,18,'Box + sachet aluminium','aktif',
   '{"jenis_produk":"Susu kambing bubuk","varian_rasa":"Original rendah gula","persentase_susu_kambing":"95%","jenis_pemanis":"Stevia","jumlah_sachet":"10 sachet","berat_per_sachet":"20 g"}',
   '{"status_halal":"Terdaftar","nomor_halal":"ID00410000567892","status_izin_edar":"BPOM proses"}');
  INSERT INTO public.products (company_id,client_id,brand_id,category_id,sku,name,variant,description,net_content,unit,moq,standard_batch_quantity,shelf_life_months,packaging_type,status,specifications,regulatory_data)
  VALUES (bmmf,cl5,br5,(SELECT id FROM public.product_categories WHERE company_id=bmmf AND name='Susu Kambing Etawa Rasa'),public.next_document_number(bmmf,'product'),'Susu Etawa Jahe','Box 200 g (10 sachet)',
   'Susu kambing etawa dengan ekstrak jahe merah.',200,'box',500,3000,18,'Box + sachet aluminium','sampel',
   '{"jenis_produk":"Susu kambing bubuk","varian_rasa":"Jahe merah","persentase_susu_kambing":"80%","jenis_pemanis":"Gula aren","jumlah_sachet":"10 sachet","berat_per_sachet":"20 g"}',
   '{"status_halal":"Proses","status_izin_edar":"Belum"}');

  INSERT INTO public.quotations (company_id,quotation_number,client_id,brand_id,broker_id,quotation_date,valid_until,status,subtotal,discount,tax,shipping_cost,broker_fee,grand_total,payment_terms,terms,notes)
  VALUES (shj, public.next_document_number(shj,'quotation'), cl1, br1, brk1, '2025-05-12','2025-05-26','disetujui',218000000,2500000,0,0,10875000,215500000,'DP 50%, pelunasan sebelum pengiriman','Harga berlaku untuk kuantitas tertera. Perubahan spesifikasi dapat mengubah harga.','Penawaran repeat order serum dan facial wash.')
  RETURNING id INTO qt;
  INSERT INTO public.quotation_items (company_id,quotation_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price,discount,broker_fee,subtotal,estimated_profit,estimated_margin)
  SELECT shj, qt, pr.id, 3000,'botol',27036,43500,1500000,6525000,129000000,45867000,35.6 FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Brightening Serum%';
  INSERT INTO public.quotation_items (company_id,quotation_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price,discount,broker_fee,subtotal,estimated_profit,estimated_margin)
  SELECT shj, qt, pr.id, 4500,'tube',12959,20000,1000000,4350000,89000000,26034500,29.3 FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Gentle Facial Wash%';

  INSERT INTO public.orders (company_id,order_number,quotation_id,client_id,brand_id,broker_id,order_date,target_completion_date,priority,status,production_status,subtotal,discount,tax,shipping_cost,broker_fee,grand_total,shipping_address,pic,client_notes)
  VALUES (shj, public.next_document_number(shj,'order'), qt, cl1, br1, brk1,'2025-05-28','2025-07-10','tinggi','produksi_berlangsung','berlangsung',218000000,2500000,0,0,10875000,215500000,'Jl. Prawirotaman No. 21, Yogyakarta','Anindya Larasati','Mohon warna label sesuai revisi terakhir.')
  RETURNING id INTO ord;
  INSERT INTO public.order_items (company_id,order_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price_snapshot,discount,broker_fee,subtotal,estimated_profit,actual_margin)
  SELECT shj, ord, pr.id, 3000,'botol',27036,43500,1500000,6525000,129000000,45867000,35.6 FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Brightening Serum%'
  RETURNING id INTO oi;
  INSERT INTO public.order_items (company_id,order_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price_snapshot,discount,broker_fee,subtotal,estimated_profit,actual_margin)
  SELECT shj, ord, pr.id, 4500,'tube',12959,20000,1000000,4350000,89000000,26034500,29.3 FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Gentle Facial Wash%';

  INSERT INTO public.samples (company_id,product_id,order_id,sample_number,status,created_date,sent_date,approved_date,internal_notes,client_feedback)
  SELECT shj, pr.id, ord, public.next_document_number(shj,'sample'),'disetujui','2025-05-02','2025-05-06','2025-05-10','Sampel batch kecil 20 botol.','Tekstur sudah pas, lanjut produksi.' FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Brightening Serum%';

  INSERT INTO public.production_batches (company_id,batch_number,order_id,order_item_id,product_id,planned_quantity,actual_quantity,rejected_quantity,passed_quantity,production_date,expiry_date,scheduled_start,scheduled_end,actual_start,status,progress_percentage,pic,notes)
  SELECT shj, public.next_document_number(shj,'batch'), ord, oi, pr.id, 3000, 1800, 24, 1776,'2025-06-16','2027-06-16','2025-06-16','2025-06-27','2025-06-16','berlangsung',60,'Tim Produksi A','Produksi tahap filling.'
  FROM public.products pr WHERE pr.company_id=shj AND pr.name LIKE 'Brightening Serum%'
  RETURNING id INTO bat;
  INSERT INTO public.production_stages (company_id,batch_id,stage_name,sort_order,status,started_at,completed_at,pic,progress_percentage) VALUES
   (shj,bat,'Persiapan formula',1,'selesai','2025-06-16 08:00+07','2025-06-16 10:00+07','Tim QC',100),
   (shj,bat,'Penimbangan bahan',2,'selesai','2025-06-16 10:00+07','2025-06-16 12:00+07','Tim Produksi A',100),
   (shj,bat,'Mixing',3,'selesai','2025-06-17 08:00+07','2025-06-17 15:00+07','Tim Produksi A',100),
   (shj,bat,'Homogenisasi',4,'selesai','2025-06-18 08:00+07','2025-06-18 12:00+07','Tim Produksi A',100),
   (shj,bat,'Filling',5,'berlangsung','2025-06-19 08:00+07',NULL,'Tim Produksi B',55),
   (shj,bat,'Penutupan',6,'belum',NULL,NULL,NULL,0),
   (shj,bat,'Labeling',7,'belum',NULL,NULL,NULL,0),
   (shj,bat,'Packing',8,'belum',NULL,NULL,NULL,0),
   (shj,bat,'QC',9,'belum',NULL,NULL,NULL,0),
   (shj,bat,'Selesai',10,'belum',NULL,NULL,NULL,0);
  INSERT INTO public.quality_checks (company_id,batch_id,inspection_date,inspector,sample_size,passed_quantity,failed_quantity,result,visual_result,weight_volume_result,packaging_result,decision,notes)
  VALUES (shj,bat,'2025-06-19','Rina Kusuma',50,49,1,'lulus','Warna dan kejernihan sesuai standar','Volume rata-rata 20,2 ml','Segel rapat','Lanjut ke tahap berikutnya','Satu botol volume kurang, disisihkan.');

  INSERT INTO public.invoices (company_id,invoice_number,order_id,client_id,invoice_type,invoice_date,due_date,status,subtotal,discount,grand_total,notes)
  VALUES (shj, public.next_document_number(shj,'invoice'), ord, cl1,'dp','2025-05-28','2025-06-04','belum_dibayar',218000000,2500000,107750000,'DP 50% pesanan repeat order Mei 2025.')
  RETURNING id INTO inv;
  INSERT INTO public.payments (company_id,invoice_id,order_id,client_id,payment_date,amount,method,bank_destination,reference_number,notes)
  VALUES (shj,inv,ord,cl1,'2025-05-30',107750000,'transfer','Bank Mandiri 1370012345678','TRF/2025/05/8891','Pembayaran DP diterima.');
  INSERT INTO public.invoices (company_id,invoice_number,order_id,client_id,invoice_type,invoice_date,due_date,status,subtotal,grand_total,notes)
  VALUES (shj, public.next_document_number(shj,'invoice'), ord, cl1,'pelunasan','2025-06-20','2025-07-05','belum_dibayar',107750000,107750000,'Pelunasan sebelum pengiriman.');
  INSERT INTO public.broker_fees (company_id,broker_id,client_id,order_id,fee_type,fee_base,fee_percentage,fee_amount,remaining_amount,due_date,status,notes)
  VALUES (shj,brk1,cl1,ord,'persentase',217500000,5,10875000,10875000,'2025-07-15','belum_dibayar','Fee dibayarkan setelah pelunasan klien.');

  INSERT INTO public.orders (company_id,order_number,client_id,brand_id,broker_id,order_date,target_completion_date,priority,status,production_status,subtotal,discount,broker_fee,grand_total,shipping_address,pic)
  VALUES (dna, public.next_document_number(dna,'order'), cl3, br3, brk2,'2025-03-04','2025-04-15','normal','selesai','selesai',105000000,0,1500000,105000000,'Jl. Slamet Riyadi No. 88, Surakarta','Dewi Kartika')
  RETURNING id INTO ord;
  INSERT INTO public.order_items (company_id,order_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price_snapshot,broker_fee,subtotal,estimated_profit,actual_margin)
  SELECT dna, ord, pr.id, 10000,'pack',7194,10500,1500000,105000000,31560000,30.1 FROM public.products pr WHERE pr.company_id=dna AND pr.name='Permen Susu Original'
  RETURNING id INTO oi;
  INSERT INTO public.invoices (company_id,invoice_number,order_id,client_id,invoice_type,invoice_date,due_date,status,subtotal,grand_total,notes)
  VALUES (dna, public.next_document_number(dna,'invoice'), ord, cl3,'penuh','2025-03-05','2025-04-05','belum_dibayar',105000000,105000000,'Invoice penuh pesanan permen susu.')
  RETURNING id INTO inv;
  INSERT INTO public.payments (company_id,invoice_id,order_id,client_id,payment_date,amount,method,bank_destination,reference_number)
  VALUES (dna,inv,ord,cl3,'2025-03-07',42000000,'transfer','Bank BCA 0123456789','TRF/2025/03/1201'),
         (dna,inv,ord,cl3,'2025-04-11',63000000,'transfer','Bank BCA 0123456789','TRF/2025/04/2277');
  INSERT INTO public.broker_fees (company_id,broker_id,client_id,order_id,fee_type,fee_base,fee_percentage,fee_amount,remaining_amount,due_date,status)
  VALUES (dna,brk2,cl3,ord,'per_unit',10000,0,1500000,1500000,'2025-04-30','belum_dibayar');
  INSERT INTO public.production_batches (company_id,batch_number,order_id,order_item_id,product_id,planned_quantity,actual_quantity,rejected_quantity,passed_quantity,production_date,expiry_date,scheduled_start,scheduled_end,actual_start,actual_end,status,progress_percentage,pic)
  SELECT dna, public.next_document_number(dna,'batch'), ord, oi, pr.id, 10000,10000,180,9820,'2025-03-24','2026-09-24','2025-03-20','2025-03-28','2025-03-20','2025-03-27','selesai',100,'Tim Produksi DNA'
  FROM public.products pr WHERE pr.company_id=dna AND pr.name='Permen Susu Original' RETURNING id INTO bat;
  INSERT INTO public.production_stages (company_id,batch_id,stage_name,sort_order,status,progress_percentage) VALUES
   (dna,bat,'Persiapan formula',1,'selesai',100),(dna,bat,'Penimbangan',2,'selesai',100),(dna,bat,'Mixing',3,'selesai',100),
   (dna,bat,'Granulasi',4,'selesai',100),(dna,bat,'Pencetakan tablet',5,'selesai',100),(dna,bat,'Pendinginan',6,'selesai',100),
   (dna,bat,'Sortasi',7,'selesai',100),(dna,bat,'Pengemasan',8,'selesai',100),(dna,bat,'QC',9,'selesai',100),(dna,bat,'Selesai',10,'selesai',100);
  INSERT INTO public.quality_checks (company_id,batch_id,inspection_date,inspector,sample_size,passed_quantity,failed_quantity,result,visual_result,taste_result,packaging_result,decision)
  VALUES (dna,bat,'2025-03-26','Agus Setiawan',200,196,4,'lulus','Bentuk seragam','Rasa susu kuat, manis pas','Seal rapat','Lulus, lanjut pengiriman');

  INSERT INTO public.orders (company_id,order_number,client_id,brand_id,order_date,target_completion_date,priority,status,production_status,subtotal,discount,grand_total,shipping_address,pic)
  VALUES (bmmf, public.next_document_number(bmmf,'order'), cl5, br5,'2025-06-02','2025-07-20','normal','menunggu_dp','belum_dijadwalkan',95000000,0,95000000,'Jl. Kaliurang KM 14, Sleman','Muhammad Ridwan')
  RETURNING id INTO ord;
  INSERT INTO public.order_items (company_id,order_id,product_id,quantity,unit,unit_hpp_snapshot,unit_price_snapshot,subtotal,estimated_profit,actual_margin)
  SELECT bmmf, ord, pr.id, 2000,'box',33802,47500,95000000,27396000,28.8 FROM public.products pr WHERE pr.company_id=bmmf AND pr.name='Susu Etawa Original';
  INSERT INTO public.invoices (company_id,invoice_number,order_id,client_id,invoice_type,invoice_date,due_date,status,subtotal,grand_total,notes)
  VALUES (bmmf, public.next_document_number(bmmf,'invoice'), ord, cl5,'dp','2025-06-02','2025-06-09','belum_dibayar',47500000,47500000,'DP 50% pesanan Juni 2025.');
END $seed$;
