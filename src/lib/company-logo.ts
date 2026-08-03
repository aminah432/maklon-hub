import shenjuu from "@/assets/shenjuu-logo.webp";
import dna from "@/assets/dna-logo.jpg";
import bmmf from "@/assets/bmmf-logo.png";

/** Logo resmi per kode perusahaan (di-bundle Vite, ikut ke repo & deploy). */
const LOGO: Record<string, string> = {
  SHJ: shenjuu,
  DNA: dna,
  BMMF: bmmf,
};

/**
 * Rasio tampilan tiap logo berbeda; nilai ini dipakai untuk menyesuaikan
 * ukuran optis agar terlihat seimbang saat berpindah perusahaan.
 */
const SKALA: Record<string, string> = {
  SHJ: "scale-[1.18]",
  DNA: "scale-[1.02]",
  BMMF: "scale-[1.1]",
};

export function logoPerusahaan(code?: string | null): string | undefined {
  return code ? LOGO[code.toUpperCase()] : undefined;
}

export function skalaLogo(code?: string | null): string {
  return (code ? SKALA[code.toUpperCase()] : undefined) ?? "scale-100";
}
