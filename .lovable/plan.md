## Ringkasan

Aplikasi web operasional **Maklon Control Center**: satu admin mengelola tiga perusahaan maklon (CV. Shenjuu / SHJ, CV. Dairy Nutrition Alami / DNA, CV. Berkah Mandiri Merapi Farm / BMMF) mulai dari klien → brand → produk → HPP → penawaran → pesanan → sampel → produksi → QC → invoice → pembayaran → laporan. Antarmuka 100% bahasa Indonesia, Rupiah, zona waktu Asia/Jakarta.

## Arsitektur

- Frontend: React + TypeScript + Tailwind, TanStack Router (file-based), TanStack Query, Recharts, react-hook-form + zod.
- Backend: Lovable Cloud (PostgreSQL, Auth, Storage privat, RLS, server functions untuk penomoran & proses sensitif).
- Struktur: `routes/` (halaman), `components/` (UI reusable), `features/<modul>/`, `hooks/`, `lib/`, `types/`, `schemas/`.
- Tema per perusahaan lewat token CSS semantik yang di-swap oleh `CompanySwitcher` (tersimpan di localStorage), mode "Semua Perusahaan" = tema netral.

## Relasi database (inti)

```text
profiles ──< user_company_access >── companies
companies ──< clients ──< brands ──< products
products ──< product_formula_versions
products ──< costing_versions ──< costing_items
costing_versions ──< product_prices
clients ──< quotations ──< quotation_items
quotations ──> orders ──< order_items
orders ──< order_status_history, samples, production_batches, invoices
production_batches ──< production_stages, quality_checks
invoices ──< payments
brokers ──< broker_fees ──< broker_fee_payments
documents, notifications, activity_logs (polimorfik: entity_type + entity_id)
```
Semua tabel bisnis punya `company_id`, UUID PK, timestamps, FK, index, soft delete (`archived_at`), RLS berbasis `user_company_access` + fungsi security-definer `has_company_access()`.

## Komponen utama

Shell: `AppSidebar`, `Topbar`, `CompanySwitcher`, `GlobalSearch`, `NotificationCenter`, `UserMenu`, `MobileBottomNavigation`, FAB.
Data: `ResponsiveDataTable` + `MobileDataCard`, `FilterBar`, `DateRangeFilter`, `EmptyState`, `LoadingSkeleton`, `ErrorState`, `ExportMenu`.
Domain: `MetricCard`, `FloatingCard` (hover tilt + cursor glow, nonaktif di touch/reduced-motion), `StatusBadge`, `PriceBreakdown`, `ProfitSummary`, `HppComparison`, `OrderTimeline`, `ProductionStepper`, `DocumentUploader`.
Input: `CurrencyInput` (Rp, pemisah ribuan, simpan angka mentah), `PercentageInput`, `QuantityInput`, `SearchableSelect`.

## Urutan pengerjaan (bertahap, build hijau tiap fase)

1. **Fondasi** — aktifkan Cloud, skema penuh + RLS + grants, seed 3 perusahaan, login `/login`, protected layout `/app/*`, sidebar/topbar/bottom-nav, theme system, company switcher, design system di `src/styles.css`.
2. **Master data** — klien (form 3 langkah), brand, produk (field khusus per perusahaan via JSONB), kategori, makelar; list + filter + detail tabs.
3. **HPP & harga** — costing versions/items, kalkulasi batch & per unit, reject/penyusutan, markup vs target margin, product_prices, warning margin minimum, perbandingan versi.
4. **Penawaran & pesanan** — quotation + item (snapshot HPP/harga), convert ke order, status history, timeline, repeat order.
5. **Produksi & sampel** — sampel & formula version, batch, tahapan per perusahaan (list/kanban/kalender), QC.
6. **Keuangan** — invoice, pembayaran (auto-update status invoice & order), piutang, fee makelar + pembayaran fee.
7. **Dokumen & laporan** — storage privat + signed URL, document manager, laporan penjualan/laba/produksi/pembayaran/makelar, export CSV/XLSX/PDF, layout print A4, notifikasi, activity log, PWA manifest.

Setelah fase 1 saya lanjut fase berikutnya secara berurutan dalam sesi ini, sambil menjaga build tetap bersih dan responsif di 360px–1920px.

## Catatan teknis

- Penomoran dokumen (CL-/PRD-/QTN-/ORD-/BAT-/INV-) dibuat lewat database function + unique constraint agar bebas duplikasi.
- Semua nominal disimpan `numeric`, diformat Rupiah di UI saja.
- Snapshot harga & HPP disimpan di quotation_items/order_items; versi HPP lama tidak pernah ditimpa.
- Storage privat; akses file hanya lewat signed URL.
- Trigger/log aktivitas untuk aksi penting; activity log read-only di UI.
- Seed data realistis Indonesia (klien, brand Lueur De Luxe, produk susu etawa, permen susu, dll.).

Fitur di luar cakupan versi pertama (portal klien, akuntansi penuh, integrasi WA/ekspedisi, AI) tidak dibangun, tapi skema tetap terbuka untuk perluasan.