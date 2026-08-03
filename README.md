# Maklon Hub

MASTER PROMPT — MAKLON CONTROL CENTER

Buat sebuah aplikasi web full-stack production-ready bernama sementara “Maklon Control Center”, yaitu sistem administrasi dan pengelolaan bisnis maklon untuk tiga perusahaan dalam satu aplikasi.

Aplikasi ini bukan landing page dan bukan sekadar UI mockup. Bangun sebagai aplikasi operasional yang benar-benar berfungsi, memiliki autentikasi, database, CRUD, kalkulasi keuangan, upload dokumen, dashboard, filter, pencarian, laporan, dan pemisahan data berdasarkan perusahaan.

Gunakan bahasa Indonesia untuk seluruh antarmuka.

1. TUJUAN UTAMA APLIKASI

Aplikasi ini digunakan oleh satu admin utama untuk mengelola:

Data perusahaan.

Data klien maklon.

Data brand milik klien.

Produk yang dimaklonkan.

Spesifikasi setiap produk.

Kalkulasi HPP.

HPP per batch dan per unit.

Markup dan target margin.

Harga perusahaan kepada klien.

Harga jual rekomendasi kepada konsumen.

Makelar, agen, atau pihak ketiga.

Fee makelar.

Penawaran harga.

Pesanan klien.

Status pengembangan produk.

Persetujuan sampel.

Jadwal dan progres produksi.

Quality control.

Invoice.

Pembayaran DP dan pelunasan.

Piutang.

Dokumen produk dan legalitas.

Laporan penjualan dan keuntungan.

Riwayat aktivitas admin.

Alur utama bisnis:

Klien → Brand → Produk → Kalkulasi HPP → Penawaran → Pesanan → Sampel → Produksi → QC → Pembayaran → Pengiriman → Selesai

2. TEKNOLOGI DAN ARSITEKTUR

Gunakan arsitektur yang rapi, modular, scalable, dan mudah dikembangkan.

Frontend

Gunakan:

React.

TypeScript.

Tailwind CSS.

Komponen reusable.

Responsive layout.

Form validation yang kuat.

Grafik dashboard yang ringan.

Professional outline icons.

Tidak membuat seluruh aplikasi dalam satu file atau satu komponen besar.

Pisahkan:

Pages.

Layouts.

Components.

Hooks.

Services.

Utilities.

Types.

Form schemas.

Theme configuration.

Backend

Gunakan integrasi Supabase untuk:

PostgreSQL database.

Authentication.

Row Level Security.

Storage.

Realtime bila dibutuhkan.

Database functions atau Edge Functions untuk proses sensitif.

Audit trail.

Aturan teknis

Jangan menyimpan secret key di frontend.

Jangan menggunakan service role key di browser.

Gunakan environment variables.

Gunakan migration yang jelas.

Gunakan foreign key.

Gunakan database indexes.

Gunakan unique constraint.

Gunakan soft delete untuk data penting.

Jangan menghapus data transaksi secara permanen dari UI.

Semua transaksi wajib memiliki company_id.

Semua nominal uang disimpan sebagai tipe numerik, bukan formatted string.

Format mata uang di tampilan menggunakan Rupiah.

Gunakan zona waktu Asia/Jakarta.

Gunakan format tanggal Indonesia.

Hindari data dummy berupa lorem ipsum.

Gunakan realistic sample data.

3. AUTENTIKASI DAN AKSES

Aplikasi hanya memiliki satu flow utama, yaitu admin.

Login

Buat halaman login dengan:

Email.

Password.

Tombol masuk.

Tampilkan atau sembunyikan password.

Lupa password.

Loading state.

Error message yang jelas.

Session persistence.

Auto logout jika session tidak valid.

Tidak perlu halaman pendaftaran publik.

Admin dibuat melalui Supabase atau invitation. Pengunjung umum tidak dapat mendaftar sendiri.

Struktur akses

Walaupun sekarang hanya satu admin, siapkan fondasi untuk kemungkinan multi-user pada masa depan.

Role awal:

super_admin

admin

Buat tabel akses perusahaan agar setiap user nantinya dapat dibatasi hanya ke perusahaan tertentu.

Admin utama mendapatkan akses ke seluruh perusahaan.

Keamanan

Aktifkan Row Level Security pada seluruh tabel bisnis.

Kebijakan akses:

User yang belum login tidak dapat membaca data.

User hanya dapat mengakses perusahaan yang terdaftar di tabel aksesnya.

File dokumen bersifat private.

File dibuka menggunakan signed URL.

Setiap perubahan data penting dicatat dalam activity log.

Tidak ada data sensitif yang dapat diakses melalui public API tanpa autentikasi.

4. STRUKTUR MULTI-PERUSAHAAN

Aplikasi mengelola tiga perusahaan:

A. CV. Shenjuu

Bidang:

Kosmetik.

Personal care.

Skincare.

Body care.

Hair care.

Parfum.

Kode perusahaan:

SHJ

Tema warna:

Pink tua: #9F1853

Pink utama: #D64284

Pink muda: #F5A8CE

Pink sangat muda: #FFF4F9

Putih: #FFFFFF

Teks gelap: #24151D

Nuansa:

Premium.

Feminin.

Modern.

Bersih.

Elegan.

Tidak kekanak-kanakan.

B. CV. Dairy Nutrition Alami

Bidang:

Permen susu.

Pressed candy.

Vitamin candy.

Beauty candy.

Permen herbal.

Permen anak.

Permen pelega tenggorokan.

Produk low sugar.

Produk no sugar.

Minuman serbuk.

Produk berbasis susu.

Kode perusahaan:

DNA

Tema warna:

Biru tua: #124A9C

Biru utama: #2F80ED

Biru muda: #91C9FF

Biru sangat muda: #F3F9FF

Putih: #FFFFFF

Teks gelap: #14253A

Nuansa:

Higienis.

Sehat.

Profesional.

Ilmiah.

Tepercaya.

Modern.

C. CV. Berkah Mandiri Merapi Farm

Bidang:

Susu kambing etawa bubuk.

Minuman susu.

Minuman serbuk.

Produk peternakan dan nutrisi berbasis susu.

Kode perusahaan:

BMMF

Tema warna:

Hijau tua: #176547

Hijau utama: #2A966A

Hijau muda: #92D9B9

Hijau sangat muda: #F3FBF7

Putih: #FFFFFF

Teks gelap: #173329

Nuansa:

Alami.

Segar.

Sehat.

Bersih.

Terpercaya.

Tidak terlihat seperti aplikasi pertanian tradisional.

Company switcher

Tambahkan company switcher pada topbar.

Pilihan:

Semua Perusahaan.

CV. Shenjuu.

CV. Dairy Nutrition Alami.

CV. Berkah Mandiri Merapi Farm.

Ketika perusahaan dipilih:

Tema warna berubah otomatis.

Logo berubah.

Data dashboard berubah.

Data klien berubah.

Produk berubah.

Pesanan berubah.

Laporan berubah.

Warna grafik berubah.

Warna badge dan tombol berubah.

Pilihan tersimpan ketika halaman di-refresh.

Mode “Semua Perusahaan” menggunakan tema netral:

Putih.

Hitam lembut.

Abu-abu.

Sedikit gradient biru gelap.

Mode Semua Perusahaan hanya digunakan untuk laporan dan ringkasan gabungan.

5. KONSEP DESAIN

Gunakan desain yang terinspirasi dari aplikasi modern macOS dan iOS, tetapi tidak menyalin secara mentah.

Gaya utama

Latar belakang putih bersih.

Gradient sangat tipis.

Banyak ruang yang cukup, tetapi jangan membuat halaman terasa kosong.

Card membulat sekitar 18–24 px.

Border tipis transparan.

Shadow lembut.

Glass effect sangat ringan.

Hierarki teks jelas.

Font tipis hingga medium.

Judul besar tetapi tetap profesional.

Tidak terlalu banyak warna.

Warna perusahaan hanya sebagai aksen.

Hindari tampilan dashboard template yang generik.

Hindari gradient pekat pada area besar.

Hindari neon.

Hindari warna yang menyilaukan.

Hindari komponen terlalu padat.

Hindari teks terlalu kecil.

Gunakan system font stack modern seperti:

Inter.

ui-sans-serif.

system-ui.

-apple-system.

BlinkMacSystemFont.

Desktop

Gunakan:

Sidebar kiri.

Topbar.

Company switcher.

Global search.

Notification button.

User menu.

Main content area.

Sidebar dapat:

Dibuka penuh.

Diperkecil menjadi ikon.

Menampilkan tooltip ketika dalam mode kecil.

Menyimpan status collapsed.

Tablet

Sidebar dapat menjadi drawer.

Data table tetap nyaman.

Card dashboard 2 kolom.

Form kompleks dapat menggunakan drawer atau modal lebar.

Mobile

Gunakan bottom navigation:

Dashboard.

Klien.

Pesanan.

Produk.

Lainnya.

Tambahkan floating action button:

+ Tambah

Ketika ditekan, tampilkan pilihan:

Tambah klien.

Tambah produk.

Buat penawaran.

Tambah pesanan.

Catat pembayaran.

Pada mobile:

Tabel berubah menjadi card list.

Tidak boleh ada horizontal overflow.

Modal besar berubah menjadi bottom sheet atau full-screen sheet.

Tombol utama memiliki tinggi minimal 44 px.

Form menggunakan satu kolom.

Filter tampil dalam bottom sheet.

Navigasi tetap mudah dijangkau ibu jari.

6. EFEK CARD DAN CURSOR

Buat setiap card terasa mengambang secara halus.

Pada desktop dengan mouse:

Card naik maksimal 3–5 px saat hover.

Shadow mengikuti posisi cursor.

Gradient cahaya tipis mengikuti cursor.

Border glow sangat lembut.

Ikon bergerak maksimal 1–2 px.

Tilt maksimal 2 derajat.

Jangan membuat card bergoyang berlebihan.

Jangan mengganggu keterbacaan.

Jangan menggunakan efek berat yang membuat aplikasi lambat.

Pada perangkat touch:

Nonaktifkan cursor tracking.

Gunakan efek press kecil.

Card mengecil ke sekitar 0.98 ketika ditekan.

Gunakan animasi ringan.

Gunakan:

Transisi sekitar 150–220 ms.

Smooth easing.

GPU-friendly transform.

Tidak mengubah layout saat hover.

Hormati:

prefers-reduced-motion.

Perangkat dengan pointer kasar.

Perangkat dengan performa rendah.

Semua animasi harus menjadi peningkatan visual, bukan kebutuhan untuk memahami data.

7. NAVIGASI UTAMA

Sidebar utama:

Dashboard.

Klien Maklon.

Brand.

Produk.

Kalkulasi HPP.

Penawaran.

Pesanan.

Produksi.

Makelar & Fee.

Keuangan.

Dokumen.

Laporan.

Aktivitas.

Pengaturan.

Submenu Keuangan:

Invoice.

Pembayaran.

Piutang.

Fee Makelar.

Submenu Pengaturan:

Profil Perusahaan.

Kategori Produk.

Komponen HPP.

Template Status.

Template Dokumen.

Nomor Dokumen.

Pengguna dan Akses.

8. ROUTE APLIKASI

Buat route berikut:

/login

/app/dashboard

/app/clients

/app/clients/new

/app/clients/:id

/app/brands

/app/brands/:id

/app/products

/app/products/new

/app/products/:id

/app/costings

/app/costings/new

/app/costings/:id

/app/quotations

/app/quotations/new

/app/quotations/:id

/app/orders

/app/orders/new

/app/orders/:id

/app/production

/app/production/:id

/app/brokers

/app/brokers/:id

/app/finance/invoices

/app/finance/invoices/:id

/app/finance/payments

/app/finance/receivables

/app/documents

/app/reports

/app/activities

/app/settings

Gunakan protected routes.

Jika user belum login, arahkan ke /login.

Jika route tidak ditemukan, tampilkan halaman 404 yang tetap menggunakan layout aplikasi.

9. DASHBOARD

Buat dashboard operasional, bukan hanya kumpulan grafik dekoratif.

Header dashboard

Tampilkan:

Sapaan berdasarkan waktu.

Nama perusahaan aktif.

Tanggal hari ini.

Company switcher.

Filter periode.

Tombol tambah cepat.

Tombol export laporan.

Contoh judul:

Ringkasan Bisnis Maklon

Subjudul:

Pantau klien, pesanan, produksi, pembayaran, dan keuntungan dalam satu tempat.

Filter periode

Sediakan:

Hari ini.

7 hari.

30 hari.

Bulan ini.

Bulan lalu.

Tahun ini.

Custom date range.

Metric cards utama

Tampilkan:

Total klien aktif.

Produk aktif.

Pesanan aktif.

Nilai pesanan.

Perkiraan laba.

Piutang belum lunas.

Fee makelar belum dibayar.

Pesanan mendekati deadline.

Setiap metric card memiliki:

Ikon.

Judul.

Nilai utama.

Perubahan dibanding periode sebelumnya.

Keterangan singkat.

Tema sesuai perusahaan.

Klik menuju halaman detail yang relevan.

Grafik

Tampilkan:

Nilai pesanan per periode.

Laba kotor dan laba setelah fee.

Jumlah pesanan berdasarkan status.

Pendapatan berdasarkan perusahaan.

Produk berdasarkan kategori.

Tren HPP.

Pembayaran masuk dan piutang.

Grafik harus:

Responsive.

Memiliki tooltip.

Memiliki empty state.

Tidak terlalu ramai.

Mengikuti tema perusahaan.

Memiliki legenda yang jelas.

Widget operasional

Tampilkan:

Pesanan terbaru.

Produksi berlangsung.

Jadwal produksi terdekat.

Tagihan jatuh tempo.

Sampel menunggu persetujuan.

Dokumen legalitas akan kedaluwarsa.

HPP yang baru berubah.

Fee makelar belum dibayar.

Produk terlaris.

Klien dengan transaksi terbesar.

Aktivitas admin terbaru.

Peringatan

Buat kartu “Perlu Perhatian” untuk:

Margin produk di bawah batas minimum.

Pesanan terlambat.

Pembayaran melewati jatuh tempo.

Sampel terlalu lama menunggu persetujuan.

Produk belum memiliki HPP.

Pesanan belum memiliki jadwal produksi.

Dokumen wajib belum lengkap.

Legalitas hampir kedaluwarsa.

Jumlah pesanan di bawah MOQ.

HPP naik signifikan.

10. MODUL KLIEN MAKLON

Daftar klien

Tampilkan:

Kode klien.

Nama klien.

Nama usaha.

Perusahaan pengelola.

Jumlah brand.

Jumlah produk.

Total pesanan.

Total transaksi.

Sisa piutang.

Makelar.

Status.

Tanggal bergabung.

Aksi.

Fitur:

Search.

Filter perusahaan.

Filter status.

Filter sumber klien.

Filter makelar.

Sort.

Pagination.

Export.

Bulk archive.

Responsive cards di mobile.

Form tambah klien

Gunakan form bertahap:

Langkah 1 — Informasi utama

Perusahaan pengelola.

Nama pemilik.

Nama usaha.

Nomor WhatsApp.

Email.

Alamat.

Kota/kabupaten.

Provinsi.

Kode pos.

Langkah 2 — Informasi bisnis

NIB.

NPWP.

Tanggal bergabung.

Sumber klien.

Makelar jika ada.

Status klien.

Catatan khusus.

Langkah 3 — Dokumen

Logo usaha.

NIB.

NPWP.

Identitas atau dokumen lain.

Kontrak kerja sama.

Sediakan:

Simpan sebagai draft.

Simpan dan tambah brand.

Simpan dan kembali.

Peringatan jika ada perubahan yang belum disimpan.

Detail klien

Header:

Avatar atau inisial.

Nama klien.

Nama usaha.

Company badge.

Status.

WhatsApp.

Email.

Tombol edit.

Tombol buat pesanan.

Tombol buat penawaran.

Tabs:

Ringkasan.

Brand.

Produk.

Pesanan.

Tagihan.

Dokumen.

Catatan.

Aktivitas.

Ringkasan klien menampilkan:

Total transaksi.

Total pesanan.

Total produk.

Total pembayaran.

Sisa piutang.

Perkiraan keuntungan.

Fee makelar terkait.

Produk terakhir.

Pesanan terakhir.

Grafik transaksi klien.

Jangan izinkan penghapusan klien jika memiliki transaksi. Sediakan fungsi arsip.

11. MODUL BRAND

Satu klien dapat mempunyai lebih dari satu brand.

Data brand:

company_id

client_id

Nama brand.

Kode brand.

Logo.

Deskripsi.

Kategori utama.

Target pasar.

Status.

Tanggal dibuat.

Catatan.

Detail brand menampilkan:

Pemilik brand.

Produk.

Jumlah pesanan.

Nilai transaksi.

Dokumen.

Riwayat aktivitas.

Sediakan fungsi:

Tambah brand.

Edit brand.

Arsipkan brand.

Buat produk dari brand.

Filter berdasarkan klien.

Filter berdasarkan perusahaan.

12. MODUL PRODUK

Data umum produk

Setiap produk memiliki:

Perusahaan.

Klien.

Brand.

Nama produk.

Kode SKU.

Kategori.

Subkategori.

Varian.

Deskripsi.

Berat atau isi bersih.

Satuan.

MOQ.

Jumlah produksi standar.

Masa simpan.

Jenis kemasan.

Status produk.

Foto produk.

Desain kemasan.

Formula version.

Tanggal pertama diproduksi.

Catatan internal.

Data legalitas.

Produk aktif atau diarsipkan.

Status produk:

Draft.

Pengembangan.

Sampel.

Menunggu persetujuan.

Siap produksi.

Aktif.

Ditunda.

Diarsipkan.

Data produk CV. Shenjuu

Tampilkan field tambahan:

Jenis kosmetik.

Bentuk sediaan.

Tekstur.

Warna produk.

Aroma.

Bahan aktif utama.

Klaim produk.

Jenis kulit atau target pengguna.

Volume atau berat bersih.

Jenis wadah.

Jenis tutup.

Label atau printing.

Status formula.

Status sampel.

Status desain.

Status BPOM.

Nomor BPOM.

Status halal.

Nomor halal.

Nomor batch.

Masa kedaluwarsa.

Kategori default:

Serum.

Facial wash.

Toner.

Moisturizer.

Sunscreen.

Body lotion.

Body wash.

Shampoo.

Conditioner.

Hair tonic.

Parfum.

Lip care.

Produk lainnya.

Data produk CV. Dairy Nutrition Alami

Tampilkan field tambahan:

Jenis produk.

Bentuk candy atau tablet.

Rasa.

Warna.

Kandungan susu.

Kandungan herbal.

Bahan aktif.

Tingkat kemanisan.

Regular sugar.

Low sugar.

No sugar.

Target pengguna.

Jumlah isi per kemasan.

Berat per butir.

Berat bersih.

Jenis kemasan.

Status formula.

Status trial.

Status sampel.

Status halal.

Nomor halal.

Status PIRT atau BPOM.

Nomor izin edar.

Nomor batch.

Masa simpan.

Kategori default:

Permen susu.

Pressed candy.

Vitamin candy.

Beauty candy.

Permen anak.

Permen herbal.

Permen pelega tenggorokan.

Stevia.

Minuman serbuk.

Minuman serbuk susu.

Produk lainnya.

Data produk CV. Berkah Mandiri Merapi Farm

Tampilkan field tambahan:

Jenis produk susu.

Varian rasa.

Komposisi.

Persentase susu kambing.

Jenis pemanis.

Kandungan tambahan.

Jumlah sachet.

Berat per sachet.

Berat bersih.

Jenis kemasan.

Status formula.

Status trial.

Status sampel.

Status halal.

Nomor halal.

Status PIRT atau BPOM.

Nomor izin edar.

Nomor batch.

Masa simpan.

Kategori default:

Susu kambing etawa original.

Susu kambing etawa rasa.

Susu kambing rendah gula.

Susu kambing tanpa gula.

Minuman serbuk susu.

Minuman nutrisi.

Produk lainnya.

Detail produk

Tabs:

Ringkasan.

Spesifikasi.

HPP dan harga.

Formula dan sampel.

Pesanan.

Produksi.

Legalitas.

Dokumen.

Riwayat perubahan.

Tampilkan:

HPP terbaru.

HPP sebelumnya.

Persentase perubahan HPP.

Harga perusahaan.

Margin aktual.

MOQ.

Total produksi.

Total penjualan.

Batch terakhir.

Pesanan terakhir.

Status legalitas.

Foto dan kemasan.

Sediakan fungsi:

Duplikasi produk.

Buat versi formula.

Buat HPP baru.

Buat penawaran.

Buat repeat order.

Arsipkan produk.

13. MODUL KALKULASI HPP

Modul ini merupakan salah satu bagian paling penting.

Jangan hanya membuat satu input HPP. HPP harus dihitung dari komponen biaya yang rinci.

Struktur kalkulasi

Setiap kalkulasi HPP memiliki:

Perusahaan.

Klien.

Brand.

Produk.

Nama versi HPP.

Nomor versi.

Tanggal berlaku.

Jumlah rencana produksi.

Jumlah hasil layak jual.

Jumlah reject.

Jumlah penyusutan.

Catatan.

Status draft atau aktif.

Pembuat.

Tanggal dibuat.

Kelompok biaya

Sediakan kategori:

Bahan baku utama.

Bahan tambahan.

Bahan aktif.

Kemasan primer.

Kemasan sekunder.

Label dan printing.

Jasa produksi.

Tenaga kerja.

Pengujian dan QC.

Legalitas.

Desain.

Pengiriman internal.

Overhead.

Penyusutan mesin.

Biaya lain.

Setiap item biaya memiliki:

Nama komponen.

Kategori.

Kuantitas.

Satuan.

Harga per satuan.

Persentase waste.

Total sebelum waste.

Total setelah waste.

Supplier opsional.

Catatan.

Formula HPP

Gunakan:

total_item = quantity × unit_cost

Jika memiliki waste:

total_with_waste = total_item × (1 + waste_percentage / 100)

Total biaya batch:

total_batch_cost = jumlah seluruh total_with_waste

Jumlah layak jual:

good_units = planned_quantity - rejected_quantity - shrinkage_quantity

HPP per unit:

unit_hpp = total_batch_cost / good_units

Jangan izinkan pembagian dengan nol.

Jika jumlah layak jual belum tersedia, gunakan estimasi jumlah layak jual tetapi tampilkan status sebagai estimasi.

Versi HPP

HPP lama tidak boleh ditimpa.

Ketika ada perubahan:

Buat versi baru.

Simpan HPP sebelumnya.

Simpan tanggal perubahan.

Simpan alasan perubahan.

Simpan item biaya yang berubah.

Tampilkan perbandingan versi.

Contoh:

HPP Versi 1.

HPP Versi 2.

HPP Versi 3.

Tampilkan perubahan:

Nominal naik atau turun.

Persentase naik atau turun.

Komponen penyebab perubahan terbesar.

Status HPP

Draft.

Dalam review.

Aktif.

Digantikan versi baru.

Diarsipkan.

Hanya satu versi HPP yang aktif untuk setiap varian produk pada satu waktu.

14. MARKUP, MARGIN, DAN HARGA JUAL

Bedakan markup dan margin secara jelas.

Markup

Formula:

harga_markup = unit_hpp × (1 + markup_percentage / 100)

Target margin

Formula:

harga_margin = unit_hpp / (1 - margin_percentage / 100)

Validasi:

Margin harus lebih kecil dari 100%.

Nilai negatif tidak diperbolehkan.

Tampilkan penjelasan perbedaan markup dan margin.

Tampilkan tooltip dengan contoh sederhana.

Struktur harga

Setiap produk dapat memiliki:

HPP per unit.

Markup.

Target margin.

Harga dasar perusahaan.

Harga setelah fee makelar.

Harga final kepada klien.

Harga jual rekomendasi kepada konsumen.

Minimum harga yang diperbolehkan.

Diskon maksimal.

Pajak opsional.

Ongkir atau subsidi pengiriman opsional.

Biaya tambahan.

Laba per unit.

Margin aktual.

Formula laba

Pendapatan produk:

revenue = final_unit_price × quantity

Total HPP:

total_cogs = unit_hpp × quantity

Laba kotor:

gross_profit = revenue - total_cogs

Kontribusi bersih:

net_contribution = revenue - total_cogs - broker_fee - discounts - shipping_subsidy - other_variable_costs

Margin aktual:

actual_margin = net_contribution / revenue × 100

Tampilkan:

HPP.

Harga dasar.

Fee makelar.

Diskon.

Harga akhir.

Laba per unit.

Total laba.

Margin aktual.

Berikan warning jika margin aktual berada di bawah minimum margin perusahaan.

Batas minimum margin dapat diatur melalui pengaturan setiap perusahaan.

Admin boleh override harga, tetapi wajib memasukkan alasan jika harga berada di bawah harga minimum.

15. MODUL MAKELAR DAN FEE

Makelar bersifat opsional.

Data makelar

Perusahaan terkait.

Nama lengkap.

Nama usaha.

Nomor WhatsApp.

Email.

Alamat.

Kota.

Nomor rekening.

Nama bank.

Nama pemilik rekening.

Klien yang dibawa.

Tanggal bergabung.

Status.

Catatan perjanjian.

Dokumen perjanjian.

Metode fee

Sediakan:

Persentase dari nilai pesanan.

Nominal tetap per pesanan.

Nominal per unit.

Nominal per batch.

Fee klien baru.

Fee bertingkat.

Custom fee.

Field fee:

Jenis fee.

Persentase.

Nominal.

Dasar perhitungan.

Pihak yang menanggung.

Tanggal jatuh tempo.

Status pembayaran.

Catatan.

Dasar perhitungan fee persentase:

Subtotal produk.

Total setelah diskon.

Total sebelum pajak.

Total final pesanan.

Formula:

percentage_fee = fee_base × fee_percentage / 100

per_unit_fee = fee_amount_per_unit × quantity

fixed_fee = fixed_amount

Status pembayaran fee

Belum dihitung.

Menunggu persetujuan.

Belum dibayar.

Dibayar sebagian.

Lunas.

Dibatalkan.

Simpan:

Total fee.

Pembayaran fee.

Sisa fee.

Tanggal pembayaran.

Bukti pembayaran.

Catatan.

Tampilkan laporan:

Fee per makelar.

Fee per perusahaan.

Fee per klien.

Fee per pesanan.

Fee belum dibayar.

Total klien yang dibawa.

Nilai transaksi dari setiap makelar.

16. MODUL PENAWARAN

Buat quotation atau penawaran harga profesional.

Data penawaran

Nomor penawaran.

Perusahaan.

Klien.

Brand.

Tanggal penawaran.

Masa berlaku.

Status.

Makelar.

Catatan.

Syarat dan ketentuan.

Termin pembayaran.

Pajak.

Diskon.

Biaya pengiriman.

Total.

Item penawaran

Produk.

Varian.

Deskripsi.

MOQ.

Jumlah.

HPP snapshot.

Harga satuan.

Fee makelar.

Diskon.

Subtotal.

Margin.

Catatan.

Status penawaran

Draft.

Dikirim.

Dilihat.

Revisi.

Disetujui.

Ditolak.

Kedaluwarsa.

Dikonversi menjadi pesanan.

Fitur

Buat dari produk.

Ambil HPP aktif.

Kalkulasi harga otomatis.

Override harga dengan alasan.

Duplikasi penawaran.

Revisi penawaran.

Generate PDF.

Print.

Convert menjadi order.

Simpan snapshot seluruh harga.

Jangan mengubah penawaran lama ketika HPP produk berubah.

Template PDF harus mengikuti logo dan tema perusahaan aktif.

17. MODUL PESANAN

Data pesanan

Nomor pesanan.

Perusahaan.

Klien.

Brand.

Penawaran asal.

Makelar.

Tanggal pesanan.

Target selesai.

Prioritas.

Status utama.

Status pembayaran.

Status produksi.

Alamat pengiriman.

PIC.

Catatan internal.

Catatan untuk klien.

Item pesanan

Produk.

Varian.

Jumlah.

Satuan.

HPP snapshot.

Harga satuan snapshot.

Diskon.

Fee makelar.

Pajak.

Subtotal.

Perkiraan laba.

Margin aktual.

Harga dan HPP pada order harus berupa snapshot. Perubahan HPP produk setelah order dibuat tidak boleh mengubah histori order.

Status pesanan

Draft.

Penawaran disetujui.

Menunggu DP.

DP diterima.

Pengembangan formula.

Pembuatan sampel.

Sampel dikirim.

Menunggu persetujuan sampel.

Revisi sampel.

Sampel disetujui.

Antrean produksi.

Produksi berlangsung.

Quality control.

Pengemasan.

Menunggu pelunasan.

Siap dikirim.

Dalam pengiriman.

Selesai.

Ditunda.

Dibatalkan.

Setiap perubahan status harus menghasilkan status history:

Status sebelumnya.

Status baru.

Tanggal.

User.

Catatan.

Lampiran opsional.

Detail pesanan

Header menampilkan:

Nomor pesanan.

Klien.

Brand.

Company badge.

Status.

Nilai pesanan.

Target selesai.

Tombol edit.

Tombol pembayaran.

Tombol ubah status.

Tombol export.

Tabs:

Ringkasan.

Produk.

Sampel.

Produksi.

Pembayaran.

Pengiriman.

Dokumen.

Timeline.

Aktivitas.

Timeline

Buat timeline vertikal berisi:

Pesanan dibuat.

Penawaran disetujui.

DP diterima.

Formula dibuat.

Sampel dibuat.

Sampel disetujui.

Produksi dimulai.

QC selesai.

Pelunasan diterima.

Pesanan dikirim.

Pesanan selesai.

Fitur pesanan

Duplikasi repeat order.

Convert dari quotation.

Tambah produk lebih dari satu.

Simpan draft.

Batalkan dengan alasan.

Tandai prioritas.

Generate invoice.

Generate surat jalan.

Generate ringkasan produksi.

Export PDF.

Print.

18. MODUL SAMPEL DAN FORMULA

Setiap produk dapat mempunyai beberapa versi sampel.

Data sampel:

Produk.

Pesanan.

Nomor sampel.

Formula version.

Tanggal dibuat.

Tanggal dikirim.

Status.

Penanggung jawab.

Catatan internal.

Catatan klien.

File formula.

Foto sampel.

Bukti pengiriman.

Bukti persetujuan.

Status:

Direncanakan.

Dibuat.

Dikirim.

Menunggu feedback.

Revisi.

Disetujui.

Ditolak.

Jangan izinkan pesanan masuk ke produksi jika sampel wajib tetapi belum disetujui.

Admin dapat melakukan override, tetapi wajib memasukkan alasan. Catat override di activity log.

19. MODUL PRODUKSI

Daftar produksi

Tampilkan:

Nomor batch.

Pesanan.

Produk.

Klien.

Perusahaan.

Jumlah rencana.

Jumlah aktual.

Jadwal mulai.

Target selesai.

Progres.

Status.

PIC.

Catatan.

Data batch

Nomor batch.

Order item.

Produk.

HPP version.

Formula version.

Jumlah rencana.

Jumlah aktual.

Jumlah reject.

Jumlah lolos QC.

Tanggal produksi.

Tanggal kedaluwarsa.

Status batch.

PIC.

Catatan.

Tahapan produksi

Template tahapan dapat berbeda untuk setiap perusahaan.

CV. Shenjuu

Persiapan formula.

Penimbangan bahan.

Mixing.

Homogenisasi.

Filling.

Penutupan.

Labeling.

Packing.

QC.

Selesai.

CV. Dairy Nutrition Alami

Persiapan formula.

Penimbangan.

Mixing.

Granulasi.

Pencetakan tablet atau candy.

Pendinginan.

Sortasi.

Pengemasan.

QC.

Selesai.

CV. Berkah Mandiri Merapi Farm

Persiapan bahan.

Penimbangan.

Mixing.

Pengayakan.

Pengisian sachet.

Sealing.

Packing.

QC.

Selesai.

Setiap tahapan memiliki:

Status.

Tanggal mulai.

Tanggal selesai.

PIC.

Catatan.

Foto atau lampiran.

Persentase progres.

Status produksi:

Belum dijadwalkan.

Dijadwalkan.

Antrean.

Berlangsung.

Ditunda.

QC.

Pengemasan.

Selesai.

Gagal.

Kalender produksi

Buat tampilan:

List.

Kanban.

Calendar.

Filter:

Perusahaan.

Status.

Klien.

Produk.

PIC.

Rentang tanggal.

20. QUALITY CONTROL

Data QC:

Batch.

Produk.

Tanggal pemeriksaan.

Pemeriksa.

Jumlah diperiksa.

Jumlah lolos.

Jumlah gagal.

Persentase kelulusan.

Hasil visual.

Hasil aroma.

Hasil rasa jika relevan.

Hasil berat atau volume.

Hasil kemasan.

Catatan.

Lampiran.

Keputusan akhir.

Status QC:

Belum diperiksa.

Dalam pemeriksaan.

Lulus.

Lulus bersyarat.

Gagal.

Perlu rework.

Jika QC gagal:

Jangan otomatis menyelesaikan produksi.

Tampilkan warning.

Minta tindakan lanjutan.

Catat rework atau pemusnahan.

Perbarui jumlah produk layak jual.

Perhitungkan reject dalam HPP aktual.

21. MODUL INVOICE DAN PEMBAYARAN

Invoice

Data invoice:

Nomor invoice.

Perusahaan.

Klien.

Pesanan.

Tanggal invoice.

Jatuh tempo.

Jenis invoice.

Status.

Subtotal.

Diskon.

Pajak.

Pengiriman.

Total.

Dibayar.

Sisa.

Catatan.

Rekening tujuan.

Jenis invoice:

DP.

Termin.

Pelunasan.

Invoice penuh.

Fee lain.

Status invoice:

Draft.

Dikirim.

Belum dibayar.

Dibayar sebagian.

Lunas.

Terlambat.

Dibatalkan.

Pembayaran

Data pembayaran:

Invoice.

Pesanan.

Klien.

Perusahaan.

Tanggal pembayaran.

Jumlah.

Metode.

Bank tujuan.

Nomor referensi.

Bukti pembayaran.

Status verifikasi.

Catatan.

Metode:

Transfer bank.

Tunai.

Virtual account.

Metode lainnya.

Validasi:

Jumlah pembayaran tidak boleh negatif.

Tampilkan warning jika pembayaran melebihi sisa invoice.

Jika terjadi kelebihan pembayaran, simpan sebagai overpayment.

Total pembayaran otomatis memperbarui status invoice.

Total pembayaran otomatis memperbarui status pembayaran order.

Piutang

Tampilkan:

Klien.

Invoice.

Pesanan.

Total invoice.

Sudah dibayar.

Sisa.

Jatuh tempo.

Jumlah hari terlambat.

Status.

Aksi.

Berikan warna status yang tetap memiliki teks dan ikon, bukan hanya mengandalkan warna.

22. DOKUMEN DAN FILE

Gunakan private storage.

Kategori dokumen:

Logo brand.

Foto produk.

Desain label.

Desain kemasan.

Formula.

Hasil pengujian.

Dokumen BPOM.

Dokumen halal.

Dokumen PIRT.

NIB.

NPWP.

Kontrak.

Purchase order.

Penawaran.

Invoice.

Bukti pembayaran.

Surat jalan.

Bukti persetujuan sampel.

Foto produksi.

Hasil QC.

Dokumen lainnya.

Metadata file:

Perusahaan.

Klien.

Brand.

Produk.

Pesanan.

Batch.

Jenis dokumen.

Nama file.

Ukuran.

MIME type.

Tanggal upload.

Tanggal berlaku.

Tanggal kedaluwarsa.

Catatan.

User pengunggah.

Fitur:

Drag and drop.

Upload progress.

Preview.

Download.

Rename.

Filter.

Search.

Arsip.

Tanggal kedaluwarsa.

Notification menjelang kedaluwarsa.

Batasi tipe dan ukuran file secara wajar.

Tampilkan error upload yang jelas.

23. LAPORAN

Buat halaman laporan dengan filter:

Perusahaan.

Klien.

Brand.

Produk.

Makelar.

Status.

Rentang tanggal.

Kategori.

Metode pembayaran.

Laporan penjualan

Nilai pesanan harian.

Mingguan.

Bulanan.

Tahunan.

Per perusahaan.

Per klien.

Per produk.

Per kategori.

Per brand.

Laporan laba

Laba kotor.

Laba setelah fee.

Margin per produk.

Margin per klien.

Margin per perusahaan.

Produk dengan margin tertinggi.

Produk dengan margin terendah.

Order yang berada di bawah target margin.

Laporan produksi

Total produksi.

Total unit layak jual.

Total reject.

Persentase reject.

Produksi per kategori.

Produksi per batch.

Produksi terlambat.

Rata-rata waktu produksi.

Laporan pembayaran

Pembayaran masuk.

Invoice lunas.

Invoice belum lunas.

Piutang.

Piutang terlambat.

Pembayaran per klien.

Cash-in per periode.

Laporan makelar

Nilai order dari makelar.

Total fee.

Fee dibayar.

Fee belum dibayar.

Jumlah klien yang dibawa.

Profit setelah fee.

Export

Sediakan:

CSV.

XLSX.

PDF.

Print-friendly view.

Pastikan file hasil export mengikuti filter aktif.

24. NOTIFIKASI

Buat notification center.

Jenis notifikasi:

Pembayaran jatuh tempo.

Invoice terlambat.

Pesanan mendekati deadline.

Produksi terlambat.

Sampel menunggu persetujuan.

HPP naik.

Margin terlalu rendah.

Fee makelar belum dibayar.

Legalitas hampir kedaluwarsa.

Dokumen belum lengkap.

MOQ tidak terpenuhi.

QC gagal.

Produk belum memiliki HPP aktif.

Notifikasi memiliki:

Judul.

Deskripsi.

Jenis.

Tingkat prioritas.

Perusahaan.

Entity terkait.

Tanggal.

Status dibaca.

Link menuju detail.

Tingkat prioritas:

Informasi.

Perhatian.

Penting.

Kritis.

25. ACTIVITY LOG

Catat aktivitas penting:

Login.

Tambah klien.

Edit klien.

Arsip klien.

Tambah produk.

Ubah spesifikasi.

Buat versi HPP.

Aktifkan HPP.

Override harga.

Buat penawaran.

Setujui penawaran.

Buat pesanan.

Ubah status pesanan.

Setujui sampel.

Mulai produksi.

Hasil QC.

Tambah invoice.

Catat pembayaran.

Bayar fee makelar.

Upload atau hapus dokumen.

Activity log menyimpan:

User.

Perusahaan.

Jenis aktivitas.

Entity type.

Entity ID.

Nilai sebelum.

Nilai sesudah.

Waktu.

IP atau metadata jika tersedia.

Catatan.

Activity log tidak dapat diedit dari UI.

26. STRUKTUR DATABASE

Buat tabel berikut dengan UUID primary key, timestamp, foreign key, dan indexes yang diperlukan.

profiles

id

full_name

email

avatar_url

role

is_active

created_at

updated_at

companies

id

code

name

business_type

logo_url

address

phone

email

tax_number

bank_name

bank_account

bank_account_name

theme_key

primary_color

secondary_color

soft_color

minimum_margin

is_active

created_at

updated_at

user_company_access

id

user_id

company_id

role

created_at

Buat unique constraint untuk kombinasi user dan company.

clients

id

company_id

client_code

owner_name

business_name

phone

email

address

city

province

postal_code

nib

npwp

source

broker_id

joined_at

status

notes

created_by

created_at

updated_at

archived_at

brands

id

company_id

client_id

brand_code

name

logo_url

description

main_category

target_market

status

created_at

updated_at

archived_at

product_categories

id

company_id

name

description

icon

sort_order

is_active

products

id

company_id

client_id

brand_id

category_id

sku

name

subcategory

variant

description

net_content

unit

moq

standard_batch_quantity

shelf_life_months

packaging_type

status

first_produced_at

main_image_url

specifications

regulatory_data

notes

created_by

created_at

updated_at

archived_at

Gunakan JSONB pada specifications untuk field khusus perusahaan, tetapi field bisnis utama tetap dibuat sebagai kolom biasa.

product_formula_versions

id

company_id

product_id

version_number

version_name

status

notes

file_url

effective_at

created_by

created_at

costing_versions

id

company_id

product_id

formula_version_id

version_number

version_name

planned_quantity

good_units

rejected_units

shrinkage_units

total_batch_cost

unit_hpp

status

effective_at

change_reason

notes

created_by

created_at

updated_at

costing_items

id

company_id

costing_version_id

category

item_name

quantity

unit

unit_cost

waste_percentage

subtotal

total

supplier

notes

sort_order

product_prices

id

company_id

product_id

costing_version_id

pricing_method

markup_percentage

target_margin_percentage

base_price

minimum_price

client_price

recommended_retail_price

actual_margin

effective_at

is_active

notes

created_at

brokers

id

company_id

name

business_name

phone

email

address

city

bank_name

bank_account

bank_account_name

default_fee_type

default_fee_value

status

agreement_file_url

notes

created_at

updated_at

archived_at

quotations

id

company_id

quotation_number

client_id

brand_id

broker_id

quotation_date

valid_until

status

subtotal

discount

tax

shipping_cost

broker_fee

grand_total

payment_terms

terms

notes

created_by

created_at

updated_at

quotation_items

id

company_id

quotation_id

product_id

costing_version_id

description

quantity

unit

unit_hpp_snapshot

unit_price

discount

broker_fee

subtotal

estimated_profit

estimated_margin

notes

orders

id

company_id

order_number

quotation_id

client_id

brand_id

broker_id

order_date

target_completion_date

priority

status

production_status

payment_status

subtotal

discount

tax

shipping_cost

broker_fee

grand_total

paid_amount

remaining_amount

shipping_address

internal_notes

client_notes

created_by

created_at

updated_at

cancelled_at

cancellation_reason

order_items

id

company_id

order_id

product_id

costing_version_id

formula_version_id

quantity

unit

unit_hpp_snapshot

unit_price_snapshot

discount

broker_fee

subtotal

estimated_profit

actual_margin

notes

order_status_history

id

company_id

order_id

previous_status

new_status

notes

attachment_url

changed_by

created_at

samples

id

company_id

product_id

order_id

formula_version_id

sample_number

status

created_date

sent_date

approved_date

internal_notes

client_feedback

image_url

approval_file_url

created_by

created_at

updated_at

production_batches

id

company_id

batch_number

order_id

order_item_id

product_id

costing_version_id

formula_version_id

planned_quantity

actual_quantity

rejected_quantity

passed_quantity

production_date

expiry_date

scheduled_start

scheduled_end

actual_start

actual_end

status

progress_percentage

pic

notes

created_at

updated_at

production_stages

id

company_id

batch_id

stage_name

sort_order

status

started_at

completed_at

pic

progress_percentage

notes

attachment_url

quality_checks

id

company_id

batch_id

inspection_date

inspector

sample_size

passed_quantity

failed_quantity

result

visual_result

aroma_result

taste_result

weight_volume_result

packaging_result

decision

notes

attachment_url

created_at

invoices

id

company_id

invoice_number

order_id

client_id

invoice_type

invoice_date

due_date

status

subtotal

discount

tax

shipping_cost

grand_total

paid_amount

remaining_amount

notes

created_at

updated_at

payments

id

company_id

invoice_id

order_id

client_id

payment_date

amount

method

bank_destination

reference_number

proof_url

verification_status

notes

created_by

created_at

broker_fees

id

company_id

broker_id

client_id

order_id

fee_type

fee_base

fee_percentage

fee_amount

paid_amount

remaining_amount

due_date

status

notes

created_at

updated_at

broker_fee_payments

id

company_id

broker_fee_id

payment_date

amount

method

proof_url

notes

created_at

documents

id

company_id

client_id

brand_id

product_id

order_id

batch_id

document_type

file_name

storage_path

mime_type

file_size

valid_from

expires_at

notes

uploaded_by

created_at

archived_at

notifications

id

company_id

user_id

type

priority

title

message

entity_type

entity_id

is_read

created_at

activity_logs

id

company_id

user_id

action

entity_type

entity_id

old_data

new_data

notes

created_at

Tambahkan tabel pengaturan lain jika benar-benar diperlukan, tetapi jangan membuat duplikasi data.

27. PENOMORAN OTOMATIS

Buat nomor dokumen unik secara otomatis dan aman.

Format:

Klien: CL-SHJ-0001

Produk: PRD-DNA-0001

Penawaran: QTN-SHJ-202608-0001

Pesanan: ORD-DNA-202608-0001

Batch: BAT-BMMF-202608-0001

Invoice: INV-SHJ-202608-0001

Nomor dibuat di server atau database function untuk mencegah duplikasi.

Tambahkan unique constraint.

Nomor tidak boleh berubah setelah transaksi dibuat.

28. KOMPONEN REUSABLE

Buat komponen reusable:

AppSidebar

MobileBottomNavigation

Topbar

CompanySwitcher

GlobalSearch

NotificationCenter

UserMenu

PageHeader

MetricCard

FloatingCard

StatusBadge

PriorityBadge

ResponsiveDataTable

MobileDataCard

FilterBar

DateRangeFilter

CurrencyInput

PercentageInput

QuantityInput

SearchableSelect

CompanyBadge

ProductBadge

PriceBreakdown

ProfitSummary

HppComparison

OrderTimeline

ProductionStepper

DocumentUploader

DocumentPreview

EmptyState

LoadingSkeleton

ErrorState

ConfirmDialog

ArchiveDialog

UnsavedChangesDialog

ExportMenu

ResponsiveModal

MobileBottomSheet

Semua tombol harus benar-benar memiliki fungsi. Jangan membuat tombol dekoratif yang tidak bekerja.

29. INPUT DAN VALIDASI

Currency input

Buat input Rupiah yang nyaman:

Menampilkan pemisah ribuan.

Menyimpan angka mentah.

Pengguna dapat menghapus seluruh nilai.

Jangan memaksa angka 0 saat pengguna sedang mengetik.

Jangan menghasilkan leading zero yang sulit dihapus.

Mendukung paste.

Tidak menerima huruf.

Mendukung nilai besar.

Percentage input

Batas minimum 0.

Batas maksimum sesuai konteks.

Margin tidak boleh 100% atau lebih.

Mendukung desimal.

Tampilkan simbol %.

Validasi umum

Field wajib diberi penanda.

Error berada dekat field.

Error tidak menggeser layout secara berlebihan.

Tombol submit memiliki loading state.

Cegah double submit.

Tampilkan toast setelah sukses.

Tampilkan pesan error yang mudah dipahami.

Pertahankan input jika penyimpanan gagal.

Tampilkan konfirmasi sebelum membatalkan perubahan.

30. SEARCH, FILTER, DAN DATA TABLE

Semua daftar utama harus memiliki:

Search.

Filter perusahaan.

Filter status.

Filter tanggal.

Sort.

Pagination.

Reset filter.

Empty state.

Loading skeleton.

Error state.

Export berdasarkan filter.

Gunakan server-side pagination untuk data besar.

Simpan filter penting di URL query parameters agar halaman dapat dibagikan atau di-refresh tanpa kehilangan filter.

Pada mobile, ubah tabel menjadi card list.

Jangan memaksakan tabel desktop kecil di layar mobile.

31. MICROCOPY

Gunakan bahasa Indonesia yang ringkas, profesional, dan mudah dipahami.

Contoh:

Tambah Klien

Buat Penawaran

Tambah Pesanan

Catat Pembayaran

Mulai Produksi

Setujui Sampel

Simpan sebagai Draft

Simpan Perubahan

Arsipkan Data

Lihat Rincian

Belum ada data

Data tidak ditemukan

Coba ubah kata kunci atau filter

Perubahan berhasil disimpan

Terjadi kesalahan. Silakan coba kembali

Jangan terlalu banyak menggunakan istilah teknis kepada pengguna.

Berikan tooltip pada:

HPP.

Markup.

Margin.

Harga minimum.

Fee makelar.

Produk layak jual.

Penyusutan.

Reject.

Snapshot harga.

32. AKSESIBILITAS

Pastikan:

Kontras warna cukup.

Informasi tidak hanya dibedakan berdasarkan warna.

Semua input memiliki label.

Ikon penting memiliki tooltip atau accessible label.

Focus state terlihat.

Navigasi keyboard bekerja.

Modal dapat ditutup dengan Escape.

Tidak ada focus trap yang rusak.

Gunakan semantic HTML.

Tombol menggunakan elemen button.

Link menggunakan elemen anchor.

Grafik memiliki ringkasan teks.

Animasi menghormati reduced motion.

33. RESPONSIVE DAN PERFORMANCE

Uji tampilan minimal pada:

Mobile 360 px.

Mobile 390 px.

Tablet 768 px.

Laptop 1024 px.

Desktop 1440 px.

Desktop lebar 1920 px.

Pastikan:

Tidak ada horizontal overflow.

Tidak ada card terpotong.

Dropdown tidak keluar layar.

Modal tidak melebihi viewport.

Sidebar tidak menutupi konten.

Bottom navigation tidak menutupi tombol.

Form dapat digunakan dengan keyboard mobile.

Grafik tidak terlalu kecil.

Teks tetap terbaca.

Optimasi:

Lazy load halaman besar.

Lazy load grafik.

Hindari rerender tidak perlu.

Gunakan pagination.

Kompres gambar.

Gunakan thumbnail.

Batasi animasi.

Gunakan skeleton.

Gunakan optimistic update hanya pada tindakan yang aman.

Jangan mengambil seluruh tabel jika hanya membutuhkan ringkasan.

34. PWA

Buat aplikasi dapat dipasang sebagai Progressive Web App.

Sediakan:

Manifest.

App icon.

Splash color.

Theme color mengikuti tema netral aplikasi.

Nama aplikasi.

Short name.

Responsive standalone mode.

Tidak perlu membuat offline mutation yang rumit pada versi pertama.

Jika koneksi terputus:

Tampilkan status offline.

Jangan mengklaim data tersimpan jika belum berhasil dikirim.

Berikan tombol coba lagi.

35. SEED DATA

Buat realistic seed data untuk demonstrasi.

CV. Shenjuu

Contoh klien dan produk:

Brand Lueur De Luxe.

Brightening Serum.

Body Lotion.

Facial Wash.

Parfum.

CV. Dairy Nutrition Alami

Contoh:

Permen Susu Original.

Beauty Candy Collagen.

Permen Pelega Tenggorokan Herbal.

Vitamin Candy Anak.

Susu Kambing Serbuk.

CV. Berkah Mandiri Merapi Farm

Contoh:

Susu Etawa Original.

Susu Etawa Cokelat.

Susu Etawa Rendah Gula.

Susu Etawa Jahe.

Tambahkan:

Beberapa klien.

Beberapa brand.

HPP versi berbeda.

Penawaran.

Pesanan berbagai status.

Invoice.

Pembayaran.

Makelar.

Fee.

Produksi.

QC.

Dokumen.

Data seed harus realistis dalam Rupiah.

Jangan menggunakan nama “John Doe” atau data asing yang tidak sesuai konteks Indonesia.

36. ATURAN BISNIS PENTING

Terapkan aturan berikut:

Semua data bisnis wajib memiliki perusahaan.

Data perusahaan tidak boleh tercampur.

HPP lama tidak boleh ditimpa.

Order menyimpan snapshot HPP dan harga.

Quotation menyimpan snapshot HPP dan harga.

Produk dengan transaksi tidak boleh dihapus, hanya diarsipkan.

Klien dengan transaksi tidak boleh dihapus, hanya diarsipkan.

Margin di bawah minimum memunculkan warning.

Override harga di bawah minimum membutuhkan alasan.

Produksi yang membutuhkan sampel tidak boleh dimulai sebelum sampel disetujui.

Override persetujuan sampel membutuhkan alasan.

Pembayaran memperbarui invoice secara otomatis.

Invoice lunas ketika total pembayaran memenuhi total tagihan.

Fee makelar mengurangi kontribusi keuntungan.

Reject produksi memengaruhi HPP aktual.

Pesanan selesai harus memiliki timeline yang lengkap.

Pembatalan transaksi membutuhkan alasan.

Setiap perubahan penting masuk activity log.

Dokumen legalitas memiliki tanggal kedaluwarsa opsional.

Nomor dokumen harus unik.

37. EMPTY, LOADING, ERROR, DAN SUCCESS STATE

Setiap halaman harus memiliki:

Empty state

Contoh:

Belum ada klien maklon

Tambahkan klien pertama untuk mulai mencatat brand, produk, dan pesanannya.

Tombol:

Tambah Klien

Loading

Gunakan skeleton yang menyerupai konten akhir.

Jangan hanya menampilkan spinner besar pada seluruh halaman.

Error

Tampilkan:

Judul error.

Penjelasan singkat.

Tombol coba lagi.

Tombol kembali jika relevan.

Success

Gunakan toast atau inline confirmation.

Jangan menggunakan alert browser bawaan untuk pengalaman utama.

38. PENGATURAN PERUSAHAAN

Buat halaman profil perusahaan yang dapat diedit:

Nama perusahaan.

Kode.

Logo.

Bidang usaha.

Alamat.

WhatsApp.

Email.

NIB.

NPWP.

Data bank.

Tanda tangan.

Stempel.

Tema warna.

Minimum margin.

Default termin pembayaran.

Default masa berlaku penawaran.

Prefix nomor dokumen.

Catatan footer invoice.

Catatan footer quotation.

Template PDF otomatis mengambil data ini.

39. PRINT DAN PDF

Buat layout print-friendly untuk:

Penawaran.

Invoice.

Kwitansi.

Ringkasan pesanan.

Surat jalan.

Ringkasan produksi.

Laporan.

Aturan:

Ukuran A4.

Tidak memotong tabel secara buruk.

Menampilkan logo perusahaan.

Menampilkan informasi perusahaan.

Warna aksen sesuai perusahaan.

Tetap terbaca jika dicetak hitam putih.

Tidak menampilkan sidebar atau tombol aplikasi.

Nominal rata kanan.

Total mudah ditemukan.

Tanda tangan dan catatan dapat ditambahkan.

40. PRIORITAS PEMBANGUNAN

Kerjakan secara terstruktur dan jangan mencoba menaruh seluruh logika dalam satu halaman.

Fase 1 — Fondasi

Authentication.

Supabase connection.

Database schema.

RLS.

App layout.

Company switcher.

Theme system.

Routing.

Seed companies.

Responsive navigation.

Fase 2 — Master data

Klien.

Brand.

Produk.

Kategori.

Makelar.

Detail pages.

Search dan filter.

Fase 3 — HPP dan harga

Costing versions.

Costing items.

HPP calculation.

Markup.

Margin.

Product prices.

Price warning.

Version comparison.

Fase 4 — Penawaran dan pesanan

Quotation.

Quotation items.

Convert quotation to order.

Order details.

Status history.

Timeline.

Repeat order.

Fase 5 — Produksi dan sampel

Sample management.

Production batches.

Production stages.

QC.

Calendar dan kanban.

Fase 6 — Keuangan

Invoice.

Payment.

Receivables.

Broker fee.

Fee payment.

Financial summaries.

Fase 7 — Dokumen dan laporan

Storage.

Document manager.

Reports.

Export.

Print layouts.

Notifications.

Activity log.

Setelah setiap fase:

Pastikan build berhasil.

Pastikan tidak ada TypeScript error.

Pastikan tidak ada broken route.

Pastikan fitur lama tetap bekerja.

Jangan menghapus fitur yang sudah jadi.

Jangan mengganti struktur tanpa alasan kuat.

Lakukan pengecekan responsive.

Gunakan data nyata dari database, bukan hardcoded data.

41. BATASAN VERSI PERTAMA

Untuk versi pertama, jangan membangun fitur berikut secara penuh:

Portal klien.

Marketplace publik.

Akuntansi lengkap.

Payroll.

Stok bahan baku lengkap.

Purchasing lengkap.

Integrasi WhatsApp otomatis.

Integrasi ekspedisi.

Multi-cabang kompleks.

AI prediksi penjualan.

Namun struktur database dan komponen jangan dibuat buntu sehingga fitur tersebut masih dapat ditambahkan pada masa depan.

Jangan menampilkan menu kosong untuk fitur yang belum dibangun.

42. HASIL AKHIR YANG DIHARAPKAN

Hasil akhir harus berupa aplikasi yang:

Bisa login.

Bisa memilih perusahaan.

Tema berubah sesuai perusahaan.

Data antarperusahaan terpisah.

Bisa menambah dan mengedit klien.

Bisa menambah brand.

Bisa menambah produk.

Bisa membuat kalkulasi HPP.

Bisa menghitung markup dan margin.

Bisa menentukan harga perusahaan.

Bisa mencatat makelar dan fee.

Bisa membuat penawaran.

Bisa mengubah penawaran menjadi pesanan.

Bisa mengelola status pesanan.

Bisa mengelola sampel.

Bisa mengelola produksi.

Bisa mencatat QC.

Bisa membuat invoice.

Bisa mencatat pembayaran.

Bisa melihat piutang.

Bisa mengunggah dokumen.

Bisa melihat dashboard.

Bisa melihat laporan.

Bisa export.

Bisa digunakan pada mobile, tablet, laptop, dan desktop.

Tidak memiliki tombol palsu.

Tidak memiliki halaman kosong tanpa fungsi.

Tidak memiliki error TypeScript.

Tidak memiliki data hardcoded sebagai sumber utama.

Memiliki visual premium, clean, ringan, dan profesional.

43. ACCEPTANCE CRITERIA

Sebelum menganggap aplikasi selesai, periksa:

Autentikasi

User yang tidak login tidak dapat membuka aplikasi.

Session bertahan setelah refresh.

Logout bekerja.

Multi-perusahaan

Company switcher bekerja.

Tema berubah.

Data berubah.

Data tidak bocor antarperusahaan.

Semua Perusahaan menampilkan agregasi.

CRUD

Create bekerja.

Read bekerja.

Update bekerja.

Archive bekerja.

Validation bekerja.

Loading dan error state tersedia.

HPP

Item biaya dapat ditambah dan dihapus.

Total item akurat.

Total batch akurat.

HPP per unit akurat.

Reject dan penyusutan diperhitungkan.

Versi HPP tersimpan.

Versi lama tidak berubah.

Harga

Markup akurat.

Target margin akurat.

Fee akurat.

Laba akurat.

Margin aktual akurat.

Warning minimum margin bekerja.

Pesanan

Quotation dapat dikonversi.

Snapshot harga tersimpan.

Status history tersimpan.

Timeline tampil.

Repeat order bekerja.

Keuangan

Invoice dapat dibuat.

Pembayaran mengurangi saldo.

Status invoice berubah otomatis.

Piutang akurat.

Fee makelar akurat.

Responsive

Tidak ada horizontal overflow.

Mobile navigation bekerja.

Form mudah digunakan.

Card hover tidak aktif secara salah di mobile.

Table berubah menjadi card pada mobile.

Keamanan

RLS aktif.

Storage private.

Public user tidak dapat membaca data.

Service key tidak berada di frontend.

Activity penting tercatat.

44. INSTRUKSI KERJA UNTUK LOVABLE

Mulai dengan Plan Mode.

Sebelum implementasi:

Ringkas kebutuhan aplikasi.

Tampilkan arsitektur.

Tampilkan relationship database.

Identifikasi komponen utama.

Tampilkan urutan pengerjaan.

dan seterusnya

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/35c09e9f-2617-4081-b703-6cd05cdc57e7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
