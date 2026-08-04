const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const RUPIAH_DETAIL = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("id-ID");

export function rupiah(value: number | null | undefined, detail = false): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "Rp0";
  return (detail ? RUPIAH_DETAIL : RUPIAH).format(n);
}

export function angka(value: number | null | undefined, digits = 0): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n);
}

export function persen(value: number | null | undefined, digits = 1): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "0%";
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(n)}%`;
}

export function formatNumberInput(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "";
  return NUMBER.format(value);
}

export function parseNumberInput(raw: string): number | null {
  const cleaned = raw
    .replace(/[^\d,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (cleaned === "" || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const TZ = "Asia/Jakarta";

export function tanggal(value: string | Date | null | undefined, withTime = false): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TZ,
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function tanggalPendek(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

export function hariIni(): Date {
  return new Date();
}

export function isoDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function selisihHari(from: string | null | undefined, to = new Date()): number {
  if (!from) return 0;
  const a = new Date(from).getTime();
  return Math.floor((to.getTime() - a) / 86400000);
}

export function sapaan(): string {
  const jam = Number(
    new Intl.DateTimeFormat("id-ID", { hour: "numeric", hour12: false, timeZone: TZ }).format(
      new Date(),
    ),
  );
  if (jam < 11) return "Selamat pagi";
  if (jam < 15) return "Selamat siang";
  if (jam < 18) return "Selamat sore";
  return "Selamat malam";
}

export function inisial(nama: string | null | undefined): string {
  if (!nama) return "?";
  return nama
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}

export function labelStatus(value: string | null | undefined): string {
  if (!value) return "-";
  return value
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}
