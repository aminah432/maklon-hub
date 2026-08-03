import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Blocks,
  Boxes,
  Building2,
  Calculator,
  ClipboardList,
  Factory,
  FileText,
  Handshake,
  LayoutDashboard,
  Package,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  children?: { label: string; to: string }[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Klien Maklon", to: "/app/clients", icon: Users },
  { label: "Brand", to: "/app/brands", icon: Blocks },
  { label: "Produk", to: "/app/products", icon: Package },
  { label: "Kalkulasi HPP", to: "/app/costings", icon: Calculator },
  { label: "Penawaran", to: "/app/quotations", icon: ClipboardList },
  { label: "Pesanan", to: "/app/orders", icon: Boxes },
  { label: "Produksi", to: "/app/production", icon: Factory },
  { label: "Makelar & Fee", to: "/app/brokers", icon: Handshake },
  {
    label: "Keuangan",
    to: "/app/finance/invoices",
    icon: Wallet,
    children: [
      { label: "Invoice", to: "/app/finance/invoices" },
      { label: "Pembayaran", to: "/app/finance/payments" },
      { label: "Piutang", to: "/app/finance/receivables" },
    ],
  },
  { label: "Dokumen", to: "/app/documents", icon: FileText },
  { label: "Laporan", to: "/app/reports", icon: Receipt },
  { label: "Aktivitas", to: "/app/activities", icon: Activity },
  { label: "Pengaturan", to: "/app/settings", icon: Settings },
];

export const MOBILE_NAV = [
  { label: "Dashboard", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "Klien", to: "/app/clients", icon: Users },
  { label: "Pesanan", to: "/app/orders", icon: Boxes },
  { label: "Produk", to: "/app/products", icon: Package },
  { label: "Lainnya", to: "/app/reports", icon: Building2 },
];

export type Tone = "netral" | "sukses" | "peringatan" | "bahaya" | "info" | "utama";

export const STATUS_TONE: Record<string, Tone> = {
  aktif: "sukses",
  lunas: "sukses",
  selesai: "sukses",
  disetujui: "sukses",
  lulus: "sukses",
  terverifikasi: "sukses",
  draft: "netral",
  belum: "netral",
  diarsipkan: "netral",
  nonaktif: "netral",
  digantikan: "netral",
  direncanakan: "netral",
  dijadwalkan: "info",
  antrean: "info",
  dikirim: "info",
  berlangsung: "info",
  produksi_berlangsung: "info",
  pengembangan: "info",
  sampel: "info",
  dibayar_sebagian: "peringatan",
  menunggu_dp: "peringatan",
  menunggu_persetujuan: "peringatan",
  revisi: "peringatan",
  ditunda: "peringatan",
  belum_dibayar: "peringatan",
  belum_dijadwalkan: "peringatan",
  terlambat: "bahaya",
  ditolak: "bahaya",
  gagal: "bahaya",
  dibatalkan: "bahaya",
  kedaluwarsa: "bahaya",
};

export const ORDER_STATUSES = [
  "draft",
  "penawaran_disetujui",
  "menunggu_dp",
  "dp_diterima",
  "pengembangan_formula",
  "pembuatan_sampel",
  "sampel_dikirim",
  "menunggu_persetujuan_sampel",
  "revisi_sampel",
  "sampel_disetujui",
  "antrean_produksi",
  "produksi_berlangsung",
  "quality_control",
  "pengemasan",
  "menunggu_pelunasan",
  "siap_dikirim",
  "dalam_pengiriman",
  "selesai",
  "ditunda",
  "dibatalkan",
] as const;

export const PRODUCT_STATUSES = [
  "draft",
  "pengembangan",
  "sampel",
  "menunggu_persetujuan",
  "siap_produksi",
  "aktif",
  "ditunda",
  "diarsipkan",
] as const;

export const QUOTATION_STATUSES = [
  "draft",
  "dikirim",
  "dilihat",
  "revisi",
  "disetujui",
  "ditolak",
  "kedaluwarsa",
  "dikonversi",
] as const;

export const COSTING_CATEGORIES = [
  "Bahan Baku Utama",
  "Bahan Tambahan",
  "Bahan Aktif",
  "Kemasan Primer",
  "Kemasan Sekunder",
  "Label dan Printing",
  "Jasa Produksi",
  "Tenaga Kerja",
  "Pengujian dan QC",
  "Legalitas",
  "Desain",
  "Pengiriman Internal",
  "Overhead",
  "Penyusutan Mesin",
  "Biaya Lain",
] as const;

export const PRODUCTION_STAGE_TEMPLATES: Record<string, string[]> = {
  SHJ: [
    "Persiapan formula",
    "Penimbangan bahan",
    "Mixing",
    "Homogenisasi",
    "Filling",
    "Penutupan",
    "Labeling",
    "Packing",
    "QC",
    "Selesai",
  ],
  DNA: [
    "Persiapan formula",
    "Penimbangan",
    "Mixing",
    "Granulasi",
    "Pencetakan tablet",
    "Pendinginan",
    "Sortasi",
    "Pengemasan",
    "QC",
    "Selesai",
  ],
  BMMF: [
    "Persiapan bahan",
    "Penimbangan",
    "Mixing",
    "Pengayakan",
    "Pengisian sachet",
    "Sealing",
    "Packing",
    "QC",
    "Selesai",
  ],
};

export const DOCUMENT_TYPES = [
  "Logo brand",
  "Foto produk",
  "Desain label",
  "Desain kemasan",
  "Formula",
  "Hasil pengujian",
  "Dokumen BPOM",
  "Dokumen halal",
  "Dokumen PIRT",
  "NIB",
  "NPWP",
  "Kontrak",
  "Purchase order",
  "Penawaran",
  "Invoice",
  "Bukti pembayaran",
  "Surat jalan",
  "Bukti persetujuan sampel",
  "Foto produksi",
  "Hasil QC",
  "Dokumen lainnya",
];

/** Field spesifikasi tambahan per perusahaan */
export const SPEC_FIELDS: Record<string, { key: string; label: string }[]> = {
  SHJ: [
    { key: "jenis_kosmetik", label: "Jenis kosmetik" },
    { key: "bentuk_sediaan", label: "Bentuk sediaan" },
    { key: "tekstur", label: "Tekstur" },
    { key: "warna", label: "Warna produk" },
    { key: "aroma", label: "Aroma" },
    { key: "bahan_aktif", label: "Bahan aktif utama" },
    { key: "klaim", label: "Klaim produk" },
    { key: "target_pengguna", label: "Jenis kulit / target pengguna" },
    { key: "jenis_wadah", label: "Jenis wadah" },
    { key: "jenis_tutup", label: "Jenis tutup" },
    { key: "label", label: "Label atau printing" },
  ],
  DNA: [
    { key: "jenis_produk", label: "Jenis produk" },
    { key: "bentuk", label: "Bentuk candy atau tablet" },
    { key: "rasa", label: "Rasa" },
    { key: "warna", label: "Warna" },
    { key: "kandungan_susu", label: "Kandungan susu" },
    { key: "kandungan_herbal", label: "Kandungan herbal" },
    { key: "bahan_aktif", label: "Bahan aktif" },
    { key: "tingkat_kemanisan", label: "Tingkat kemanisan" },
    { key: "target_pengguna", label: "Target pengguna" },
    { key: "isi_per_kemasan", label: "Jumlah isi per kemasan" },
    { key: "berat_per_butir", label: "Berat per butir" },
  ],
  BMMF: [
    { key: "jenis_produk", label: "Jenis produk susu" },
    { key: "varian_rasa", label: "Varian rasa" },
    { key: "komposisi", label: "Komposisi" },
    { key: "persentase_susu_kambing", label: "Persentase susu kambing" },
    { key: "jenis_pemanis", label: "Jenis pemanis" },
    { key: "kandungan_tambahan", label: "Kandungan tambahan" },
    { key: "jumlah_sachet", label: "Jumlah sachet" },
    { key: "berat_per_sachet", label: "Berat per sachet" },
  ],
};

export const REGULATORY_FIELDS: { key: string; label: string }[] = [
  { key: "status_bpom", label: "Status BPOM" },
  { key: "nomor_bpom", label: "Nomor BPOM" },
  { key: "status_izin_edar", label: "Status PIRT / izin edar" },
  { key: "nomor_izin_edar", label: "Nomor izin edar" },
  { key: "status_halal", label: "Status halal" },
  { key: "nomor_halal", label: "Nomor halal" },
  { key: "nomor_batch", label: "Nomor batch" },
  { key: "masa_kedaluwarsa", label: "Masa kedaluwarsa" },
];
